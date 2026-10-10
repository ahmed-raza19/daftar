import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Evaluation | Daftar",
  description: "How we checked that Daftar's AI grader is consistent, discriminating and grounded.",
};

const STRONG = [90, 93, 90, 92];
const WEAK = [16, 22, 18];

const CHECKS = [
  "The grader caught a planted data flaw the deliverable missed (a basket value of 31.2 instead of about 3,120), without being told which one.",
  "Facts only count as discovered when a teammate's reply really contains them. An early test showed the model over-claiming, so we added this check in code.",
  "Evidence quotes must appear in the candidate's own messages, note or code. A quote the model attributed to the wrong person is dropped.",
  "Skills the shift never tested (for example adaptability when no surprise happened) are marked 'not assessed' instead of guessed.",
];

const STACK = ["Next.js 16", "React 19", "Tailwind CSS 4", "Google Gemini", "Groq (backup)", "Pyodide (Python in the browser)", "jsPDF", "Vercel"];

function Scores({ label, scores, tone }: { label: string; scores: number[]; tone: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-4 space-y-2">
        {scores.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-14 text-xs text-slate-500">Run {i + 1}</span>
            <div className="h-3 flex-1 rounded-r-[4px] bg-slate-100">
              <div className={`h-full rounded-r-[4px] ${tone === "good" ? "bg-brand-700" : "bg-amber-500"}`} style={{ width: `${s}%` }} />
            </div>
            <span className="w-10 text-right font-mono text-sm font-medium tabular-nums text-ink">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Evaluation() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-ink sm:text-5xl">How we measured the grader</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            An AI grader is only useful if it gives the same shift the same score and tells strong work from weak work. We
            tested both on the Data Analyst shift with Gemini.
          </p>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-6 sm:px-6 md:grid-cols-2">
          <Scores label="Same strong shift, graded 4 times" scores={STRONG} tone="good" />
          <Scores label="Same weak shift, graded 3 times" scores={WEAK} tone="bad" />
        </section>
        <p className="mx-auto max-w-6xl px-4 pb-16 text-sm text-slate-600 sm:px-6">
          Strong: 90 to 93, every individual skill within 1 point. Weak: 16 to 22. The gap between them is over 65 points.
        </p>

        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold">Grounding checks</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {CHECKS.map((c) => (
                <li key={c} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-slate-300">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-ink">Limitations</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600">
              <li>The test transcripts were written by our team, not by real graduates.</li>
              <li>Next step: have other participants play a shift, grade the same transcripts by hand, and compare.</li>
              <li>Sessions are stored in the browser only; there are no accounts yet.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">Built with</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {STACK.map((s) => (
                <li key={s} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Built during AICON&apos;26 by team nexora, starting from the standard Next.js template, with help from an AI coding
              assistant (Claude Code). Full disclosures are in the{" "}
              <a href="https://github.com/ahmed-raza19/daftar#disclosure" className="font-medium text-brand-800 underline" target="_blank" rel="noreferrer">
                README
              </a>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6">
          <Link href="/#start" className="inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            Try a shift yourself
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
