import { readFileSync } from "node:fs";
import path from "node:path";

import sanitizeHtml from "sanitize-html";
import { describe, expect, it } from "vitest";

import { syncTranslator } from "@/lib/i18n/sync-dictionary";
import { LIST_STATUSES, WORK_TYPES } from "@/types/domain";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "../defaults";
import { renderProfileHtml, type ProfileEntry } from "../placeholders";
import { renderTheme } from "../render";

const t = syncTranslator("en");

function render(template: string, entries: ProfileEntry[] = []) {
  const result = renderTheme({
    template,
    css: "",
    username: "reader",
    displayName: "Reader",
    entries,
    t,
  });
  if (!result.ok) {
    throw new Error(`render failed: ${JSON.stringify(result.errors)}`);
  }
  return result.html;
}

const completedMovie: ProfileEntry = {
  title: "Arrival",
  type: "movie",
  status: "completed",
  score: 8,
  progress: "1/1",
  cover: "https://img.example/arrival.jpg",
  url: "/title/1",
};

const readingBook: ProfileEntry = {
  title: 'Dune "quoted" <b>',
  type: "book",
  status: "in_progress",
  score: null,
  progress: "10/600",
  cover: null,
  url: "/title/2",
};

describe("renderTheme sanitizes the final document (SEC-M1)", () => {
  // PoC: the raw template passes the sanitizer because `java{{…}}script:`
  // has no valid scheme; the empty placeholder then assembles one.
  it("strips schemes assembled from empty placeholders", () => {
    const html = render(
      '<a href="java{{reading_lists}}script:alert(1)">x</a>',
    );

    expect(html).not.toMatch(/href="[^"]*script:/i);
    expect(html).not.toMatch(/href="java/i);
    expect(html).toContain(">x</a>");
  });

  it("does not downgrade to http", () => {
    const html = render('<a href="ht{{reading_lists}}tp://evil.example">x</a>');

    expect(html).not.toContain('href="http:');
    expect(html).not.toContain("evil.example");
  });

  it("strips data: URLs assembled from empty placeholders", () => {
    const html = render(
      '<a href="da{{reading_lists}}ta:text/html,<b>x</b>">x</a>' +
        '<img src="da{{reading_lists}}ta:image/svg+xml,<svg></svg>" alt="" />',
    );

    expect(html).not.toMatch(/(href|src)="[^"]*data:/i);
  });

  it("renders legacy templates with placeholders in attributes safely", () => {
    // Saved before placeholders in attributes were rejected; must keep
    // rendering. Non-empty placeholders inject markup into the attribute.
    const result = renderTheme({
      template:
        '<div class="p-{{username}}"><a href="java{{reading_lists}}script:alert(1)" title="{{audiovisual_lists}}">Keep me</a></div>',
      css: "",
      username: "reader",
      displayName: "Reader",
      entries: [completedMovie, readingBook],
      t,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.html).toContain("Keep me");
    expect(result.html).not.toMatch(/(href|src)="(?!https:|\/(?![/\\]))/i);
    expect(result.html).not.toMatch(/javascript:|data:|http:/i);
    expect(result.html).not.toMatch(/<(?!\/?(?:div|a|section|h2|table|thead|tbody|tr|th|td|span|img)\b)/);
  });

  it("keeps Listae data attributes", () => {
    const html = render(
      "<main>{{lists}}{{audiovisual_lists}}{{reading_in_progress}}</main>",
      [completedMovie, readingBook],
    );

    expect(html).toContain('data-status="completed"');
    expect(html).toContain('data-status="in_progress"');
    expect(html).toContain('data-type="movie"');
    expect(html).toContain('data-type="book"');
    expect(html).toContain('data-index="1"');
    expect(html).toContain('data-domain="audiovisual"');
  });

  it("drops data attributes outside the Listae allowlist", () => {
    const html = render(
      '<div data-status="x" data-foo="y"></div><section data-status="ok" data-foo="no"></section>',
    );

    expect(html).not.toContain("data-foo");
    expect(html).not.toContain('data-status="x"');
    expect(html).toContain('<section data-status="ok">');
  });

  it("adds rel and referrerpolicy", () => {
    const html = render(
      '<a href="https://a.example" rel="opener">a</a><img src="https://img.example/x.png" alt="" />{{lists}}',
      [completedMovie],
    );

    expect(html).toContain(
      '<a href="https://a.example" rel="noopener noreferrer">a</a>',
    );
    expect(html).not.toContain('rel="opener"');
    expect(html).toMatch(
      /<a class="listae-entry-title" href="\/title\/1" rel="noopener noreferrer">/,
    );
    const images = html.match(/<img [^>]*>/g) ?? [];
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toContain('referrerpolicy="no-referrer"');
    }
  });

  it("only keeps https and root-relative links", () => {
    const html = render(
      [
        '<a href="https://ok.example/a">1</a>',
        '<a href="/title/1?x=1#y">2</a>',
        '<a href="//evil.example">3</a>',
        '<a href="/\\evil.example">4</a>',
        '<a href="/&#9;/evil.example">5</a>',
        '<a href="relative/path">6</a>',
        '<a href="#top">7</a>',
        '<a href="mailto:a@b.example">8</a>',
        '<a href=" https://ok.example/b ">9</a>',
        '<img src="/\\evil.example/x.png" alt="" />',
        '<img src="//evil.example/x.png" alt="" />',
      ].join(""),
    );

    expect(html).toContain('href="https://ok.example/a"');
    expect(html).toContain('href="/title/1?x=1#y"');
    expect(html).toContain('href="https://ok.example/b"');
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("relative/path");
    expect(html).not.toContain('href="#top"');
    expect(html).not.toContain("mailto:");
  });

  it("keeps placeholders in text working and escapes user values", () => {
    const html = render("<p>{{username}}</p>{{reading_lists}}", [readingBook]);

    expect(html).toContain("<p>reader</p>");
    expect(html).toMatch(/Dune (&quot;|")quoted(&quot;|") &lt;b&gt;/);
    expect(html).not.toContain("<b>");
  });
});

describe("renderTheme keeps bundled themes intact", () => {
  // One entry per type and status, with and without cover, internal and
  // external links, and markup/`$&`/placeholder-looking text in titles.
  const allEntries: ProfileEntry[] = WORK_TYPES.flatMap((type, typeIndex) =>
    LIST_STATUSES.map((status, statusIndex) => {
      const n = typeIndex * LIST_STATUSES.length + statusIndex + 1;
      return {
        title: `T${n} <b>&"' $& {{username}}`,
        type,
        status,
        score: n % 3 === 0 ? null : (n % 10) + 1,
        progress: `${n}/99`,
        cover: n % 2 ? `https://img.example/${n}.jpg` : null,
        url: n % 5 === 0 ? `https://ext.example/${n}` : `/title/${n}`,
      };
    }),
  );

  /** Same serializer on both sides; drops only the attributes we force. */
  function canonical(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: false,
      allowedAttributes: false,
      transformTags: {
        "*": (tagName, attribs) => {
          const next = { ...attribs };
          if (tagName === "a" && next.rel === "noopener noreferrer") {
            delete next.rel;
          }
          if (tagName === "img" && next.referrerpolicy === "no-referrer") {
            delete next.referrerpolicy;
          }
          return { tagName, attribs: next };
        },
      },
    });
  }

  const malDoc = readFileSync(
    path.resolve(process.cwd(), "docs/themes/mal-dark-sirisoto.md"),
    "utf8",
  );
  const themes = {
    default: { template: DEFAULT_HTML_TEMPLATE, css: DEFAULT_CSS },
    "mal-dark-sirisoto": {
      template: malDoc.split("```html\n")[1]!.split("```")[0]!,
      css: malDoc.split("```css\n")[1]!.split("```")[0]!,
    },
  };

  for (const [name, theme] of Object.entries(themes)) {
    for (const locale of ["en", "es"] as const) {
      it(`final sanitize only adds rel/referrerpolicy to ${name} (${locale})`, () => {
        const args = {
          template: theme.template,
          username: "reader",
          displayName: "Reader <One>",
          entries: allEntries,
          t: syncTranslator(locale),
        };
        const result = renderTheme({ ...args, css: theme.css });

        expect(result.ok).toBe(true);
        if (!result.ok) {
          return;
        }
        expect(canonical(result.html)).toBe(
          canonical(renderProfileHtml(args)),
        );
        expect(result.html).toContain('data-status="in_progress"');
        expect(result.html).toContain('data-type="anime"');
      });
    }
  }
});
