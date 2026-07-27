import type { createTranslator } from "./t";

type T = ReturnType<typeof createTranslator>;

export function entryFormLabels(t: T) {
  return {
    status: t("entryForm.status"),
    score: t("entryForm.score"),
    scorePlaceholder: t("entryForm.scorePlaceholder"),
    progress: t("entryForm.progress"),
    unit: t("entryForm.unit"),
    chapters: t("entryForm.chapters"),
    pages: t("entryForm.pages"),
    episodesSuffix: t("entryForm.episodesSuffix"),
    episodes: t("entryForm.episodes"),
    notes: t("entryForm.notes"),
    notesPlaceholder: t("entryForm.notesPlaceholder"),
    save: t("entryForm.save"),
    addToLibrary: t("entryForm.addToLibrary"),
    statusPlan: t("library.statusPlan"),
    statusInProgress: t("library.statusInProgress"),
    statusCompleted: t("library.statusCompleted"),
    statusOnHold: t("library.statusOnHold"),
    statusDropped: t("library.statusDropped"),
  };
}

export function catalogSearchLabels(t: T) {
  return {
    searchPlaceholder: t("catalog.searchPlaceholder"),
    searchAria: t("catalog.searchAria"),
    mediaTypeAria: t("catalog.mediaTypeAria"),
    allMedia: t("catalog.allMedia"),
  };
}

export function libraryDomainTabsLabels(t: T) {
  return {
    audiovisual: t("library.domainAudiovisual"),
    reading: t("library.domainReading"),
    all: t("library.domainAll"),
    aria: t("library.domainAria"),
  };
}

export function libraryFiltersLabels(t: T) {
  return {
    type: t("library.filterType"),
    allTypes: t("library.filterAllTypes"),
    status: t("library.filterStatus"),
    allStatuses: t("library.filterAllStatuses"),
    sort: t("library.filterSort"),
    sortUpdated: t("library.sortUpdated"),
    sortScore: t("library.sortScore"),
    sortTitle: t("library.sortTitle"),
    statusPlan: t("library.statusPlan"),
    statusInProgress: t("library.statusInProgress"),
    statusCompleted: t("library.statusCompleted"),
    statusOnHold: t("library.statusOnHold"),
    statusDropped: t("library.statusDropped"),
  };
}

export function usernameFieldLabels(t: T) {
  return {
    label: t("onboarding.usernameLabel"),
    hint: t("onboarding.usernameHint"),
    warning: t("onboarding.usernameWarning"),
  };
}
