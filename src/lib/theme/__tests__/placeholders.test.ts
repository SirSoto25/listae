import { describe, expect, it } from "vitest";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "../defaults";
import {
  buildDomainListsHtml,
  buildListsHtml,
  renderProfileHtml,
  type ProfileEntry,
} from "../placeholders";
import { renderTheme } from "../render";

const entries: ProfileEntry[] = [
  {
    title: "Dune",
    type: "book",
    status: "completed",
    score: 9,
    progress: "600/600p",
    cover: "https://example.com/dune.jpg",
    url: "/title/1",
  },
  {
    title: "Frieren",
    type: "anime",
    status: "in_progress",
    score: null,
    progress: "12/28 episodes",
    cover: "https://example.com/frieren.jpg",
    url: "/title/2",
  },
];

describe("buildListsHtml", () => {
  it("groups entries by status and renders all entry fields", () => {
    const html = buildListsHtml(entries);

    expect(html.indexOf("In progress")).toBeLessThan(
      html.indexOf("Completed"),
    );
    expect(html).toContain('data-status="completed"');
    expect(html).toContain('src="https://example.com/dune.jpg"');
    expect(html).toContain('href="/title/1"');
    expect(html).toContain("Dune");
    expect(html).toContain("book");
    expect(html).toContain("Score: 9");
    expect(html).toContain("600/600p");
  });

  it("escapes entry content and rejects unsafe URLs", () => {
    const html = buildListsHtml([
      {
        ...entries[0],
        title: `<script>alert("x")</script>`,
        cover: "javascript:alert(1)",
        url: 'javascript:alert("x")',
      },
    ]);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
  });
});

describe("buildDomainListsHtml", () => {
  it("wraps audiovisual entries in a domain section", () => {
    const html = buildDomainListsHtml(entries, "audiovisual");

    expect(html).toContain(
      'class="listae-domain listae-domain--audiovisual"',
    );
    expect(html).toContain('data-domain="audiovisual"');
    expect(html).toContain("Frieren");
    expect(html).not.toContain("Dune");
    expect(html).toContain('data-status="in_progress"');
  });

  it("wraps reading entries in a domain section", () => {
    const html = buildDomainListsHtml(entries, "reading");

    expect(html).toContain(
      'class="listae-domain listae-domain--reading"',
    );
    expect(html).toContain('data-domain="reading"');
    expect(html).toContain("Dune");
    expect(html).not.toContain("Frieren");
    expect(html).toContain('data-status="completed"');
  });
});

describe("renderProfileHtml", () => {
  it("replaces the supported top-level placeholders", () => {
    const html = renderProfileHtml({
      template:
        "<h1>{{displayName}}</h1><span>@{{username}}</span>{{lists}}",
      username: "alex",
      displayName: "Alex",
      entries,
    });

    expect(html).toContain("<h1>Alex</h1>");
    expect(html).toContain("<span>@alex</span>");
    expect(html).toContain("Dune");
    expect(html).not.toContain("{{lists}}");
  });

  it("replaces domain list placeholders and keeps {{lists}}", () => {
    const html = renderProfileHtml({
      template:
        "{{audiovisual_lists}}{{reading_lists}}{{lists}}",
      username: "alex",
      displayName: "Alex",
      entries,
    });

    expect(html).toContain(
      'class="listae-domain listae-domain--audiovisual"',
    );
    expect(html).toContain(
      'class="listae-domain listae-domain--reading"',
    );
    expect(html).toContain("Frieren");
    expect(html).toContain("Dune");
    expect(html).not.toContain("{{audiovisual_lists}}");
    expect(html).not.toContain("{{reading_lists}}");
    expect(html).not.toContain("{{lists}}");
  });

  it("escapes profile values before substitution", () => {
    const html = renderProfileHtml({
      template: "<h1>{{displayName}}</h1><p>{{username}}</p>",
      username: `<img src=x onerror=alert("x")>`,
      displayName: "<script>alert(1)</script>",
      entries: [],
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("default theme", () => {
  it("provides placeholders and styles for grouped entry details", () => {
    expect(DEFAULT_HTML_TEMPLATE).toContain("{{displayName}}");
    expect(DEFAULT_HTML_TEMPLATE).toContain("{{username}}");
    expect(DEFAULT_HTML_TEMPLATE).toContain("{{audiovisual_lists}}");
    expect(DEFAULT_HTML_TEMPLATE).toContain("{{reading_lists}}");
    expect(DEFAULT_HTML_TEMPLATE).not.toContain("{{lists}}");
    expect(DEFAULT_CSS).toContain("/* listae:domain-vars:start */");
    expect(DEFAULT_CSS).toContain(".listae-domain--audiovisual");
    expect(DEFAULT_CSS).toContain(".listae-domain--reading");
    expect(DEFAULT_CSS).toContain("var(--listae-domain-bg)");
    expect(DEFAULT_CSS).toContain(".listae-entry-cover");
    expect(DEFAULT_CSS).toContain(".listae-entry-score");
    expect(DEFAULT_CSS).toContain(".listae-entry-progress");
  });

  it("retains its structural classes after sanitization", () => {
    const result = renderTheme({
      template: DEFAULT_HTML_TEMPLATE,
      css: DEFAULT_CSS,
      username: "alex",
      displayName: "Alex",
      entries,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain('class="listae-profile-header"');
      expect(result.html).toContain('class="listae-domain-block"');
      expect(result.html).toContain(
        'class="listae-domain listae-domain--audiovisual"',
      );
      expect(result.html).toContain(
        'class="listae-domain listae-domain--reading"',
      );
    }
  });
});

describe("renderTheme", () => {
  it("sanitizes the template, substitutes placeholders, and returns CSS", () => {
    const result = renderTheme({
      template:
        '<section onclick="alert(1)"><h1>{{displayName}}</h1>{{lists}}<script>alert(1)</script></section>',
      css: ".listae-profile { color: navy; }",
      username: "alex",
      displayName: "Alex",
      entries,
    });

    expect(result).toEqual({
      ok: true,
      html: expect.stringContaining("<h1>Alex</h1>"),
      css: ".listae-profile { color: navy; }",
    });
    if (result.ok) {
      expect(result.html).not.toContain("onclick");
      expect(result.html).not.toContain("<script>");
    }
  });

  it("returns CSS validation errors without rendering HTML", () => {
    const result = renderTheme({
      template: "<h1>{{displayName}}</h1>",
      css: '@import url("https://evil.example/theme.css");',
      username: "alex",
      displayName: "Alex",
      entries,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        line: 1,
        snippet: '@import url("https://evil.example/theme.css");',
      });
    }
  });
});
