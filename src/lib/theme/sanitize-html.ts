import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "div",
  "span",
  "section",
  "ul",
  "li",
  "a",
  "img",
  "h1",
  "h2",
  "h3",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "p",
  "br",
];

export function sanitizeThemeHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["class", "id", "title"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
  });
}
