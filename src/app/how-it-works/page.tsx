import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "How it works | Daftar",
  description: "How a Daftar shift works, and what the AI does at each step.",
};

const DAY = [
  { time: "09:00", title: "Get your badge", text: "Pick Code Shift, the Data Analyst shift, or any role you want. Tell us your name." },
  { time: "09:05", title: "Meet your team", text: "A fictional Pakistani company with a CEO, your manager, seniors, peers, other departments and a client." },
  { time: "09:10", title: "Do the work", text: "Ask people, read the files, handle a moved deadline and a pushy client. In Code Shift, run real tests." },
  { time: "17:00", title: "Read your review", text: "A scorecard, six skills with quotes from your own words, and a 30-day plan. Download it as a PDF." },
];

const PIPELINE = [
  {
    step: "1",
    who: "AI",
    title: "Org generator",
    text: "Builds the company, a 6-8 person hierarchy, each person's private knowledge, the task, files with planted flaws and the surprises.",
    check: "Code validates and repairs the result.",
  },
  {
    step: "2",
    who: "Code",
    title: "Org rules",
    text: "Decides who is in each channel, what each person can see, who is busy, and notices when you go over your manager's head.",
    check: "Plain rules, no AI.",
  },
  {
    step: "3",
    who: "AI",
    title: "Director agent",
    text: "Writes each teammate's reply in their own voice. A teammate shares a secret only when you ask them the right question.",
    check: "A secret counts only if the reply really contains it.",
  },
  {
    step: "4",
    who: "AI",
    title: "Assessor",
    text: "Reads the whole shift and your work, scores six skills against a fixed rubric, and must quote you as evidence.",
    check: "Quotes are verified; the overall score is computed by code.",
  },
];

const SIGNALS: [string, string, string][] = [
  ["Hidden information found", "Measured", "Counted when a teammate's reply really states the fact"],
  ["People consulted", "Measured", "Teammates you messaged directly or @mentioned"],
  ["Surprises handled", "Measured", "Whether you responded after each mid-shift change"],
  ["Chain of command", "Measured", "Messaging leadership without your manager is flagged"],
  ["Client request", "Measured", "Whether you looped in your manager before agreeing"],
  ["Hidden tests (Code Shift)", "Measured", "Your Python runs against hidden tests in your browser"],
  ["Six workplace skills", "AI", "Scored 0-10 on a fixed rubric, each with a quote from you"],
  ["Deliverable quality", "AI", "Compared with what a strong senior would submit"],
];

export default function HowItWorks() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-ink sm:text-5xl">How a shift works</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Fifteen minutes in a company where every coworker is an AI with their own job, personality and secrets. You only
            do well the way you would at a real job: by asking the right people the right questions.
          </p>
        </section>

        {/* The day */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <ol className="grid gap-4 md:grid-cols-4">
            {DAY.map((d) => (
              <li key={d.time} className="rounded-2xl border border-slate-200 bg-white p-5">
                <time className="font-mono text-sm font-medium text-brand-700">{d.time}</time>
                <h2 className="mt-2 text-lg font-bold text-ink">{d.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{d.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Inside the AI */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Inside the AI</h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Three AI steps and one set of plain rules. Every AI output is checked by code before it counts.
            </p>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {PIPELINE.map((p, i) => (
                <li key={p.step} className="relative rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clip text-sm font-bold text-ink">{p.step}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        p.who === "AI" ? "bg-violet-400/20 text-violet-200" : "bg-sky-400/20 text-sky-200"
                      }`}
                    >
                      {p.who}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{p.text}</p>
                  <p className="mt-3 border-t border-white/10 pt-3 text-xs text-brand-200">✓ {p.check}</p>
                  {i < PIPELINE.length - 1 && (
                    <span aria-hidden className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-clip md:block">
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-slate-400">
              Models: Google Gemini first, with Groq as an automatic backup if Gemini is slow or rate-limited. No model was
              trained; the work is in the personas, prompts, rules and checks.
            </p>
          </div>
        </section>

        {/* Measured vs judged */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">What&apos;s measured and what&apos;s judged</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Most of your scorecard is counted by the app from what actually happened. The AI only judges what needs judgement.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Signal</th>
                  <th className="px-3 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">How</th>
                </tr>
              </thead>
              <tbody>
                {SIGNALS.map(([signal, source, how]) => (
                  <tr key={signal} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{signal}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${
                          source === "AI" ? "bg-violet-50 text-violet-800 ring-violet-200" : "bg-sky-50 text-sky-800 ring-sky-200"
                        }`}
                      >
                        {source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/#start" className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              Start a shift
            </Link>
            <Link href="/evaluation" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
              How we measured the grader
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
