import {
  LIST_STATUSES,
  domainForWorkType,
  type ListStatus,
  type WorkType,
} from "@/types/domain";

export type ProfileEntry = {
  title: string;
  type: WorkType;
  status: ListStatus;
  score: number | null;
  progress: string;
  cover: string | null;
  url: string;
};

export type RenderProfileHtmlArgs = {
  template: string;
  username: string;
  displayName: string;
  entries: ProfileEntry[];
};

const STATUS_LABELS: Record<ListStatus, string> = {
  plan: "Plan to watch/read",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
};

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

function buildEntryHtml(entry: ProfileEntry): string {
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
    entry.score === null ? "Not scored" : `Score: ${entry.score}`;

  return [
    `<div class="listae-entry" data-type="${escapeHtml(entry.type)}">`,
    coverHtml,
    `<div class="listae-entry-details">`,
    titleContent,
    `<span class="listae-entry-type">${escapeHtml(entry.type)}</span>`,
    `<span class="listae-entry-score">${score}</span>`,
    `<span class="listae-entry-progress">${escapeHtml(entry.progress)}</span>`,
    "</div>",
    "</div>",
  ].join("");
}

export function buildListsHtml(entries: ProfileEntry[]): string {
  return LIST_STATUSES.map((status) => {
    const statusEntries = entries.filter((entry) => entry.status === status);
    const contents =
      statusEntries.length > 0
        ? statusEntries.map(buildEntryHtml).join("")
        : `<p class="listae-status-empty">No entries yet.</p>`;

    return [
      `<section class="listae-status" data-status="${status}">`,
      `<h2 class="listae-status-title">${STATUS_LABELS[status]}</h2>`,
      `<div class="listae-status-entries">${contents}</div>`,
      "</section>",
    ].join("");
  }).join("");
}

export function buildDomainListsHtml(
  entries: ProfileEntry[],
  domain: "audiovisual" | "reading",
): string {
  const domainEntries = entries.filter(
    (entry) => domainForWorkType(entry.type) === domain,
  );
  const inner = buildListsHtml(domainEntries);

  return [
    `<section class="listae-domain listae-domain--${domain}" data-domain="${domain}">`,
    inner,
    "</section>",
  ].join("");
}

export function renderProfileHtml({
  template,
  username,
  displayName,
  entries,
}: RenderProfileHtmlArgs): string {
  const replacements: Record<string, string> = {
    "{{username}}": escapeHtml(username),
    "{{displayName}}": escapeHtml(displayName),
    "{{lists}}": buildListsHtml(entries),
    "{{audiovisual_lists}}": buildDomainListsHtml(entries, "audiovisual"),
    "{{reading_lists}}": buildDomainListsHtml(entries, "reading"),
  };

  return Object.entries(replacements).reduce(
    (html, [placeholder, value]) => html.replaceAll(placeholder, value),
    template,
  );
}
