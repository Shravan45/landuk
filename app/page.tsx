import Link from "next/link";

const FEATURES = [
  {
    href: "/chat",
    title: "Ask LandUK",
    description:
      "Get cited answers about UK visa routes — Skilled Worker, Global Talent, Student, Youth Mobility, and Health & Care Worker — pulled from official gov.uk sources via retrieval-augmented generation.",
    icon: "💬",
  },
  {
    href: "/neighbourhoods",
    title: "Neighbourhood matcher",
    description:
      "Tell us your budget, commute tolerance, and the vibe you're after — nightlife, family-friendly, tech hub — and we'll rank UK areas that fit.",
    icon: "📍",
  },
  {
    href: "/cost-of-living",
    title: "Cost of living calculator",
    description:
      "Estimate a realistic monthly budget for rent, council tax, utilities, transport, and groceries in any of our covered neighbourhoods.",
    icon: "💷",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="text-center max-w-3xl mx-auto">
        <span className="inline-block rounded-full bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          AI Relocation Copilot
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
          Moving to the UK, made less overwhelming
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 text-balance">
          LandUK combines a retrieval-augmented assistant over official UK
          government sources with a neighbourhood matcher and cost-of-living
          calculator — so you can plan your move with real numbers, not
          guesswork.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Start asking questions
          </Link>
          <Link
            href="/neighbourhoods"
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-3 text-sm font-semibold hover:border-indigo-400 transition-colors"
          >
            Find your neighbourhood
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
          >
            <div className="text-3xl">{feature.icon}</div>
            <h2 className="mt-4 font-semibold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {feature.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {feature.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-20 rounded-2xl bg-slate-50 dark:bg-slate-900 p-8 text-sm text-slate-600 dark:text-slate-400">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          How it works
        </h3>
        <p className="mt-2">
          Curated UK government content — visa routes and cost-of-living
          reference data — is chunked, embedded, and stored in Postgres with
          pgvector. When you ask a question, LandUK retrieves the most
          relevant chunks and asks Gemini to answer using only that context,
          citing every source it used.
        </p>
      </section>
    </div>
  );
}
