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

function tableHeadHtml(t: ProfileTranslator): string {
  return [
    "<thead><tr>",
    `<th class="listae-col-index">${escapeHtml(t("profile.table.index"))}</th>`,
    `<th class="listae-col-cover"></th>`,
    `<th class="listae-col-title">${escapeHtml(t("profile.table.title"))}</th>`,
    `<th class="listae-col-score">${escapeHtml(t("profile.table.score"))}</th>`,
    `<th class="listae-col-type">${escapeHtml(t("profile.table.type"))}</th>`,
    `<th class="listae-col-progress">${escapeHtml(t("profile.table.progress"))}</th>`,
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
    `<td class="listae-col-type">${escapeHtml(entry.type)}</td>`,
    `<td class="listae-col-progress">${escapeHtml(entry.progress)}</td>`,
    "</tr>",
  ].join("");
}

function buildStatusTableHtml(
  statusEntries: ProfileEntry[],
  status: ListStatus,
  t: ProfileTranslator,
): string {
  const rows = statusEntries
    .map((entry, index) => buildEntryRowHtml(entry, index + 1, t))
    .join("");

  return [
    `<section class="listae-status" data-status="${status}">`,
    `<h2 class="listae-status-title">${escapeHtml(statusLabel(status, t))}</h2>`,
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
): string {
  const statusEntries = entries.filter((entry) => entry.status === status);
  if (statusEntries.length === 0) {
    return "";
  }

  return buildStatusTableHtml(statusEntries, status, t);
}

export function buildDomainStatusListsHtml(
  entries: ProfileEntry[],
  domain: ProfileDomain,
  status: ListStatus,
  t: ProfileTranslator,
): string {
  const statusEntries = entries.filter(
    (entry) =>
      domainForWorkType(entry.type) === domain && entry.status === status,
  );
  if (statusEntries.length === 0) {
    return "";
  }

  return buildStatusTableHtml(statusEntries, status, t);
}

export function buildListsHtml(
  entries: ProfileEntry[],
  t: ProfileTranslator,
): string {
  return LIST_STATUSES.map((status) => buildStatusListsHtml(entries, status, t))
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

  const inner = buildListsHtml(domainEntries, t);
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

  return Object.entries(replacements).reduce(
    (html, [placeholder, value]) => html.replaceAll(placeholder, value),
    template,
  );
}
