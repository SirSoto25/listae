import { FormInputError, type FormState } from "@/lib/form-error";
import type { Locale } from "@/lib/i18n/config";
import { syncTranslator } from "@/lib/i18n/sync-dictionary";

/** Turns a correctable input error into form state; rethrows anything else. */
export function formErrorState(error: unknown, locale: Locale): FormState {
  if (!(error instanceof FormInputError)) {
    throw error;
  }
  return {
    error: syncTranslator(locale)(`formErrors.${error.code}`, error.params),
  };
}
