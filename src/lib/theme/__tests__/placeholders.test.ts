import { describe, expect, it } from "vitest";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "../defaults";
import {
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
    expect(DEFAULT_HTML_TEMPLATE).toContain("{{lists}}");
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
      expect(result.html).toContain('class="listae-lists"');
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
