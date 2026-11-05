import {
  LIST_STATUSES,
  domainForWorkType,
  type ListStatus,
  type WorkType,
} from "@/types/domain";
import type { createTranslator } from "@/lib/i18n/t";

export type ProfileEntry = {
  title: string;
  type: WorkType;
  /** Localized display name of `type`; `type` itself stays the raw `data-type`. */
  typeLabel: string;
  status: ListStatus;
  score: number | null;
  progress: string;
  cover: string | null;
  url: string;
};

export type ProfileTranslator = ReturnType<typeof createTranslator>;

export type RenderProfileHtmlArgs = {
  template: string;
  username: string;
  displayName: string;
  entries: ProfileEntry[];
  t: ProfileTranslator;
};

const PROFILE_DOMAINS = ["audiovisual", "reading"] as const;
type ProfileDomain = (typeof PROFILE_DOMAINS)[number];

export function statusLabel(
  status: ListStatus,
  t: ProfileTranslator,
): string {
  return t(`profile.status.${status}`);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function safeHref(url: string): string | null {
  if (/^\/(?!\/)/.test(url)) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}

function safeCoverUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}

function columnHeader(column: string, contentHtml: string): string {
  return `<th class="listae-col-${column}" scope="col">${contentHtml}</th>`;
}

function tableHeadHtml(t: ProfileTranslator): string {
  return [
    "<thead><tr>",
    columnHeader("index", escapeHtml(t("profile.table.index"))),
    // No visible label: the cover column is an image. Screen readers get one.
    columnHeader(
      "cover",
      `<span class="listae-sr-only">${escapeHtml(t("profile.table.cover"))}</span>`,
    ),
    columnHeader("title", escapeHtml(t("profile.table.title"))),
    columnHeader("score", escapeHtml(t("profile.table.score"))),
    columnHeader("type", escapeHtml(t("profile.table.type"))),
    columnHeader("progress", escapeHtml(t("profile.table.progress"))),
    "</tr></thead>",
  ].join("");
}

function buildEntryRowHtml(
  entry: ProfileEntry,
  index: number,
  t: ProfileTranslator,
): string {
  const href = safeHref(entry.url);
  const cover = safeCoverUrl(entry.cover);
  const title = escapeHtml(entry.title);
  const titleContent = href
    ? `<a class="listae-entry-title" href="${escapeHtml(href)}">${title}</a>`
    : `<span class="listae-entry-title">${title}</span>`;
  const coverHtml = cover
    ? `<img class="listae-entry-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" />`
    : "";
  const score =
    entry.score === null
      ? t("profile.notScored")
      : t("profile.score", { score: entry.score });

  return [
    `<tr class="listae-entry" data-type="${escapeHtml(entry.type)}" data-index="${index}">`,
    `<td class="listae-col-index">${index}</td>`,
    `<td class="listae-col-cover">${coverHtml}</td>`,
    `<td class="listae-col-title">${titleContent}</td>`,
    `<td class="listae-col-score">${escapeHtml(score)}</td>`,
    `<td class="listae-col-type">${escapeHtml(entry.typeLabel)}</td>`,
    `<td class="listae-col-progress">${escapeHtml(entry.progress)}</td>`,
    "</tr>",
  ].join("");
}

/** `h3` inside a domain block (under the template's own `h2`), `h2` elsewhere. */
export type StatusHeadingLevel = 2 | 3;

function buildStatusTableHtml(
  statusEntries: ProfileEntry[],
  status: ListStatus,
  t: ProfileTranslator,
  headingLevel: StatusHeadingLevel,
): string {
  const rows = statusEntries
    .map((entry, index) => buildEntryRowHtml(entry, index + 1, t))
    .join("");

  return [
    `<section class="listae-status" data-status="${status}">`,
    `<h${headingLevel} class="listae-status-title">${escapeHtml(statusLabel(status, t))}</h${headingLevel}>`,
    `<table class="listae-status-table">`,
    tableHeadHtml(t),
    `<tbody>${rows}</tbody>`,
    "</table>",
    "</section>",
  ].join("");
}

export function buildStatusListsHtml(
  entries: ProfileEntry[],
  status: ListStatus,
  t: ProfileTranslator,
  headingLevel: StatusHeadingLevel = 2,
): string {
  const statusEntries = entries.filter((entry) => entry.status === status);
  if (statusEntries.length === 0) {
    return "";
  }

  return buildStatusTableHtml(statusEntries, status, t, headingLevel);
}

export function buildDomainStatusListsHtml(
  entries: ProfileEntry[],
  domain: ProfileDomain,
  status: ListStatus,
  t: ProfileTranslator,
  headingLevel: StatusHeadingLevel = 2,
): string {
  const statusEntries = entries.filter(
    (entry) =>
      domainForWorkType(entry.type) === domain && entry.status === status,
  );
  if (statusEntries.length === 0) {
    return "";
  }

  return buildStatusTableHtml(statusEntries, status, t, headingLevel);
}

export function buildListsHtml(
  entries: ProfileEntry[],
  t: ProfileTranslator,
  headingLevel: StatusHeadingLevel = 2,
): string {
  return LIST_STATUSES.map((status) =>
    buildStatusListsHtml(entries, status, t, headingLevel),
  )
    .filter(Boolean)
    .join("");
}

export function buildDomainListsHtml(
  entries: ProfileEntry[],
  domain: ProfileDomain,
  t: ProfileTranslator,
): string {
  const domainEntries = entries.filter(
    (entry) => domainForWorkType(entry.type) === domain,
  );

  if (domainEntries.length === 0) {
    return "";
  }

  const inner = buildListsHtml(domainEntries, t, 3);
  if (!inner) {
    return "";
  }

  return [
    `<section class="listae-domain listae-domain--${domain}" data-domain="${domain}">`,
    inner,
    "</section>",
  ].join("");
}

function granularPlaceholderKey(
  domain: ProfileDomain,
  status: ListStatus,
): string {
  return `{{${domain}_${status}}}`;
}

export function renderProfileHtml({
  template,
  username,
  displayName,
  entries,
  t,
}: RenderProfileHtmlArgs): string {
  const replacements: Record<string, string> = {
    "{{username}}": escapeHtml(username),
    "{{displayName}}": escapeHtml(displayName),
    "{{audiovisual_heading}}": escapeHtml(t("profile.domain.audiovisual")),
    "{{reading_heading}}": escapeHtml(t("profile.domain.reading")),
    "{{lists}}": buildListsHtml(entries, t),
    "{{audiovisual_lists}}": buildDomainListsHtml(entries, "audiovisual", t),
    "{{reading_lists}}": buildDomainListsHtml(entries, "reading", t),
  };

  for (const domain of PROFILE_DOMAINS) {
    for (const status of LIST_STATUSES) {
      replacements[granularPlaceholderKey(domain, status)] =
        buildDomainStatusListsHtml(entries, domain, status, t);
    }
  }

  // Single pass: substituted values (user-controlled titles) are never
  // re-scanned for placeholders, and `$` sequences in them stay literal.
  return template.replace(/\{\{\w+\}\}/g, (placeholder) =>
    Object.hasOwn(replacements, placeholder)
      ? replacements[placeholder]!
      : placeholder,
  );
}
