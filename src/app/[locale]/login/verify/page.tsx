import Link from "next/link";

export default function LoginVerifyPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Check your inbox
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">
          Magic link sent
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Open the email and click the sign-in link. It works once and usually
          expires within about 24 hours.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted">
          In local development, the link is printed in the Next.js server
          console as{" "}
          <code className="rounded bg-background px-1.5 py-0.5 text-xs">
            [listae magic link]
          </code>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold">
          <Link className="text-accent hover:opacity-90" href="/login">
            Use a different email
          </Link>
          <Link className="text-muted hover:text-foreground" href="/">
            Back to search
          </Link>
        </div>
      </section>
    </main>
  );
}
