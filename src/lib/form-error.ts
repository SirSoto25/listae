export type FormErrorCode =
  | "invalidScore"
  | "invalidProgress"
  | "invalidStatus"
  | "notesTooLong"
  | "invalidProgressUnit"
  | "progressExceedsEpisodes"
  | "progressExceedsChapters"
  | "progressExceedsPages"
  | "invalidWorkType"
  | "titleRequired"
  | "invalidCoverUrl"
  | "invalidNumber";

/**
 * Input the user can correct. Server actions turn it into a translated
 * message (dictionary key `formErrors.<code>`) instead of an error page.
 */
export class FormInputError extends Error {
  constructor(
    readonly code: FormErrorCode,
    message: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = "FormInputError";
  }
}

export type FormState = { error: string | null };

export const INITIAL_FORM_STATE: FormState = { error: null };
