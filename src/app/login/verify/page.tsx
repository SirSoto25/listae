import Link from "next/link";

export default function LoginVerifyPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f7f5f0] px-6 py-16">
      <section className="w-full max-w-md border border-stone-200 bg-white p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
          Check your inbox
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-950">
          Magic link sent
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Open the email and click the sign-in link. It works once and usually
          expires within about 24 hours.
        </p>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          In local development, the link is printed in the Next.js server
          console as{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">
            [listae magic link]
          </code>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold">
          <Link className="text-amber-800 hover:text-amber-950" href="/login">
            Use a different email
          </Link>
          <Link className="text-stone-500 hover:text-stone-800" href="/">
            Back to search
          </Link>
        </div>
      </section>
    </main>
  );
}
