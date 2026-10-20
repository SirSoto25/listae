"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = Omit<ComponentProps<"button">, "type">;

/** Submit button that disables itself while its form's action is pending. */
export function SubmitButton({
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      aria-busy={pending || undefined}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
      disabled={disabled || pending}
      type="submit"
    />
  );
}
