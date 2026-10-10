import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "For employers | Daftar",
  description: "A trial shift, not a CV: see how a candidate works with a team before you hire.",
};

const VALUE = [
  {
    title: "Evidence, not claims",
    text: "Every score quotes what the candidate actually wrote, and the app checks the quotes are real.",
  },
  {
    title: "Teamwork you can see",
    text: "Who they asked, how they handled a moved deadline, whether they went over their manager's head, how they answered a client.",
  },
  {
    title: "Real tests for technical roles",
    text: "In Code Shift the candidate's Python runs against hidden tests. Pass counts come from the code, not from AI opinion.",
  },
];

const ROWS: [string, string, number][] = [
  ["Hidden information found", "6 of 9", 3.5],
  ["People consulted", "5 of 8", 5],
  ["Surprises handled", "4 of 4", 5],
  ["Chain of command", "Respected", 5],
  ["Client request", "Looped in manager", 5],
  ["Hidden tests", "9/9 passing", 5],
  ["Deliverable quality", "8/10", 4],
];

const FAIR = [
  "Decision support, not auto-reject: the review is guidance for a human, never a hiring decision on its own.",
  "No penalty for non-native English or Roman Urdu; name, gender and university are ignored when scoring.",
  "Companies and people are fictional, and candidates are warned not to enter personal data.",
  "Prompt-injection guard: anything a candidate writes is treated as data, so they can't talk the grader into a score.",
];

const NEXT = [
  "Paste a job description and get a shift built for that exact role",
  "Compare several candidates' scorecards side by side",
  "Team shifts where real candidates work together with AI teammates",
];

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20" aria-hidden className={value - i >= 0.5 ? "text-amber-500" : "text-slate-200"} fill="currentColor">
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

export default function ForEmployers() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight text-ink sm:text-5xl">A trial shift, not a CV.</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              When AI can polish any CV, a degree and a cover letter tell you less and less. Daftar puts a candidate in a
              15-minute shift with an AI team, and shows you how they actually work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/#start" className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                Try it as a candidate
              </Link>
              <Link href="/how-it-works" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
                How a shift works
              </Link>
            </div>
          </div>

          {/* Example scorecard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg font-bold text-ink">Candidate scorecard</div>
                <div className="text-xs text-slate-500">Example, Associate AI/ML Engineer</div>
              </div>
              <div className="text-right">
                <div className="font-display text-4xl font-bold text-ink">86</div>
                <Stars value={4.5} />
              </div>
            </div>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {ROWS.map(([label, value, stars]) => (
                  <tr key={label} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-ink">{label}</td>
                    <td className="py-2 text-slate-600">{value}</td>
                    <td className="py-2 text-right">
                      <Stars value={stars} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {VALUE.map((v) => (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-ink">{v.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Fair by design</h2>
              <ul className="mt-6 space-y-4">
                {FAIR.map((f) => (
                  <li key={f} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                    <span className="mt-0.5 text-clip">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold">Coming next</h2>
              <p className="mt-2 text-sm text-slate-400">On our roadmap, not in today&apos;s build.</p>
              <ul className="mt-6 space-y-3">
                {NEXT.map((n) => (
                  <li key={n} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
