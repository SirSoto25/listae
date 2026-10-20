"use client";

import { startTransition, useActionState, type ComponentProps } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-error";

type ActionFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

/**
 * Form for server actions that return `FormState`. It submits from
 * `onSubmit` inside a transition: React then skips its automatic field reset,
 * so a returned error keeps what the user typed. `useFormStatus` still sees
 * the submission as pending.
 */
export function ActionForm({ action, children, ...props }: ActionFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);

  return (
    <form
      {...props}
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {children}
      {/* Stays mounted (visually hidden while empty) so screen readers
          announce the error when it appears. */}
      <p
        className="col-span-full text-sm font-semibold text-red-600 empty:sr-only dark:text-red-400"
        role="alert"
      >
        {state.error}
      </p>
    </form>
  );
}
