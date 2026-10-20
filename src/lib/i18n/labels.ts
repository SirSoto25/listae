import type { ExternalSource, WorkType } from "@/types/domain";

import type { createTranslator } from "./t";

type T = ReturnType<typeof createTranslator>;

/** Display names for the `works.type` enum (the raw value is never shown). */
export function workTypeLabels(t: T): Record<WorkType, string> {
  return {
    anime: t("workType.anime"),
    series: t("workType.series"),
    movie: t("workType.movie"),
    book: t("workType.book"),
    manga: t("workType.manga"),
    comic: t("workType.comic"),
  };
}

/** Display names for the `works.externalSource` enum. */
export function sourceLabels(t: T): Record<ExternalSource, string> {
  return {
    tmdb: t("source.tmdb"),
    openlibrary: t("source.openlibrary"),
    manual: t("source.manual"),
  };
}

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
    workTypes: workTypeLabels(t),
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
    workTypes: workTypeLabels(t),
  };
}

export function usernameFieldLabels(t: T) {
  return {
    label: t("onboarding.usernameLabel"),
    hint: t("onboarding.usernameHint"),
    warning: t("onboarding.usernameWarning"),
  };
}

export function domainThemePickerLabels(t: T) {
  return {
    heading: t("customize.domainColors"),
    help: t("customize.domainColorsHelp"),
    audiovisual: t("library.domainAudiovisual"),
    reading: t("library.domainReading"),
    background: t("customize.colorBackground"),
    accent: t("customize.colorAccent"),
    text: t("customize.colorText"),
    hexInputAria: t("customize.hexInputAria"),
    apply: t("customize.applyDomainColors"),
  };
}

export function themeEditorLabels(t: T) {
  return {
    htmlTemplate: t("customize.htmlTemplate"),
    htmlTemplateHelp: t("customize.htmlTemplateHelp"),
    customCss: t("customize.customCss"),
    customCssHelp: t("customize.customCssHelp"),
    errorsHeading: t("customize.errorsHeading"),
    errorLine: t("customize.errorLine"),
    errorColumn: t("customize.errorColumn"),
    errorGeneric: t("customize.errorGeneric"),
    invalidDomainColors: t("customize.invalidDomainColors"),
    themeSaved: t("customize.themeSaved"),
    saveTheme: t("customize.saveTheme"),
    saving: t("customize.saving"),
    restoreDefaults: t("customize.restoreDefaults"),
    livePreview: t("customize.livePreview"),
    previewNote: t("customize.previewNote"),
    previewFrameTitle: t("customize.previewFrameTitle"),
    previewUnavailableTitle: t("customize.previewUnavailableTitle"),
    previewUnavailableBody: t("customize.previewUnavailableBody"),
    domainPicker: domainThemePickerLabels(t),
  };
}
