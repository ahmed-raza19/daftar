"use client";

import { useState } from "react";
import { overallStars, shiftSignals, tone } from "@/lib/metrics";
import { downloadFile, fileStem, sessionTranscript } from "@/lib/session";
import type { Session } from "@/lib/types";
import { SKILLS } from "@/lib/types";
import Avatar from "./Avatar";
import ReportDashboard from "./ReportDashboard";
import { Logo } from "./Logo";

interface Props {
  session: Session;
  onRestart: () => void;
  onBack: () => void;
}

const anchor = (score: number) =>
  score >= 9 ? "Exceptional" : score >= 7 ? "Solid, job-ready" : score >= 5 ? "Developing" : score >= 3 ? "Weak" : "Not shown";

type Tab = "skills" | "review" | "intel" | "work" | "plan";

export default function ReportView({ session, onRestart, onBack }: Props) {
  const r = session.report!;
  const s = session.scenario;
  const facts = s.personas.flatMap((p) => p.privateFacts.map((f) => ({ ...f, holder: p })));
  const foundCount = facts.filter((f) => session.revealedFactIds.includes(f.id)).length;
  const signals = shiftSignals(session);
  const stars = overallStars(r.overall);
  const assessed = r.skills.filter((k) => k.assessed !== false);
  const best = [...assessed].sort((a, b) => b.score - a.score)[0];
  const worst = [...assessed].sort((a, b) => a.score - b.score)[0];
  const skillLabel = (id: string) => SKILLS.find((k) => k.id === id)?.label ?? id;
  const [tab, setTab] = useState<Tab>("skills");
  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const { downloadReportPdf } = await import("@/lib/pdf");
      await downloadReportPdf(session);
    } finally {
      setPdfBusy(false);
    }
  }

  const tabs: [Tab, string][] = [
    ["skills", "Skills & evidence"],
    ...(r.review ? ([["review", "Review conversation"]] as [Tab, string][]) : []),
    ["intel", `Hidden information ${foundCount}/${facts.length}`],
    ["work", s.codeTask ? "Your code & note" : "Your deliverable"],
    ["plan", "30-day plan"],
  ];

  return (
    <main className="flex-1 bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Logo />
          <div className="ml-auto flex flex-wrap gap-2">
            <Btn onClick={onBack}>Back to shift</Btn>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="rounded-lg border border-brand-700 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
            >
              {pdfBusy ? "Making PDF…" : "Download PDF"}
            </button>
            <Btn onClick={() => downloadFile(`${fileStem(session)}.txt`, sessionTranscript(session))}>.txt</Btn>
            <Btn onClick={() => downloadFile(`${fileStem(session)}.json`, JSON.stringify(session, null, 2), "application/json")}>
              Save .json
            </Btn>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New shift
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {/* Verdict */}
        <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{session.profile.name}&apos;s first-shift review</h1>
            <p className="mt-1 text-sm text-slate-500">
              {s.graduateTitle} at {s.company.name} (a fictional company)
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-slate-700">{r.summary}</p>
          </div>
          <div className="flex items-center gap-5 md:flex-col md:items-end md:gap-2">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-6xl font-bold tabular-nums text-ink">{r.overall}</span>
              <span className="text-lg text-slate-400">/100</span>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="flex items-center gap-2">
                <Stars value={stars} size={20} />
                <span className="text-sm font-semibold tabular-nums text-slate-700">{stars.toFixed(1)}</span>
              </span>
              <span className="inline-block -rotate-3 rounded-md border-2 border-brand-700 px-3 py-0.5 font-display text-base font-bold text-brand-700">
                {r.verdict}
              </span>
            </div>
          </div>
        </section>

        {/* Conduct concern */}
        {r.conduct && !r.conduct.respectful && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
            <h2 className="font-bold text-red-800">Conduct concern</h2>
            <p className="mt-1 text-sm text-red-900">
              Some of your messages to teammates were abusive or disrespectful. At a real job this could end a probation. Your
              communication, collaboration and ownership scores are capped at 2/10.
            </p>
            <ul className="mt-3 space-y-2">
              {r.conduct.incidents.map((i, n) => (
                <li key={n} className="rounded-lg bg-white/70 p-3 text-sm">
                  <blockquote className="italic text-red-900">“{i.quote}”</blockquote>
                  <p className="mt-1 text-red-800">{i.why}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Dashboard charts */}
        <ReportDashboard session={session} />

        {/* At a glance */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-5">
            <h2 className="text-lg font-bold text-ink">At a glance</h2>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <SourceTag source="measured" /> counted by the app <SourceTag source="ai" /> judged by the AI reviewer
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-5 py-2 font-medium">Criteria</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Rating</th>
                  <th className="px-5 py-2 text-right font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((sig) => (
                  <tr key={sig.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-ink">{sig.label}</div>
                      <div className="text-xs text-slate-500">{sig.note}</div>
                    </td>
                    <td className={`px-3 py-2.5 font-medium tabular-nums ${toneText[tone(sig.stars)]}`}>{sig.value}</td>
                    <td className="px-3 py-2.5">
                      {sig.stars === null ? <span className="text-slate-400">n/a</span> : <Stars value={sig.stars} />}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <SourceTag source={sig.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Highlights */}
        {best && worst && (
          <div className="grid gap-4 md:grid-cols-2">
            <Highlight
              title="Strongest skill"
              skill={skillLabel(best.id)}
              score={best.score}
              text={best.feedback}
              accent="brand"
              onMore={() => setTab("skills")}
            />
            <Highlight
              title="Work on this next"
              skill={skillLabel(worst.id)}
              score={worst.score}
              text={worst.feedback}
              accent="amber"
              onMore={() => setTab("plan")}
            />
          </div>
        )}

        {/* Details, one tab at a time */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium ${
                  tab === id ? "border-b-2 border-brand-700 text-brand-800" : "text-slate-500 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {tab === "skills" && (
              <div className="space-y-8">
                <SkillBars session={session} />
                {r.moments.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-semibold text-ink">Key moments</h3>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {r.moments.map((m, i) => (
                        <li key={i} className="rounded-xl border border-slate-200 p-4">
                          <div
                            className={`mb-2 inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${
                              m.type === "strength" ? "bg-brand-50 text-brand-800" : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {m.type === "strength" ? "▲ Strength" : "▼ Concern"}
                          </div>
                          <blockquote className="border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">“{m.quote}”</blockquote>
                          <p className="mt-2 text-sm text-slate-600">{m.why}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === "review" && r.review && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="max-w-2xl text-sm text-slate-600">{r.review.summary}</p>
                  <span className="text-sm font-semibold text-ink">Explains own work: {r.review.score}/10</span>
                </div>
                <ol className="space-y-3">
                  {r.review.items.map((item, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-ink">
                          Q{i + 1}. {item.question}
                        </p>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${VERDICT_STYLE[item.verdict]}`}>
                          {item.verdict}
                        </span>
                      </div>
                      <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">
                        {session.reviewQA?.[i]?.answer ? `“${session.reviewQA[i].answer}”` : "Skipped"}
                      </blockquote>
                      {item.comment && <p className="mt-2 text-sm text-slate-600">{item.comment}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {tab === "intel" && (
              <ul className="grid gap-3 md:grid-cols-2">
                {facts.map((f) => {
                  const found = session.revealedFactIds.includes(f.id);
                  const use = r.facts.find((x) => x.factId === f.id);
                  return (
                    <li key={f.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start gap-2 text-xs">
                        <span
                          className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${found ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-slate-600"}`}
                        >
                          {found ? "✓ Found" : "✗ Missed"}
                        </span>
                        <Avatar scenario={s} id={f.holder.id} size={18} />
                        <span className="text-slate-500">
                          {f.holder.name}, {f.holder.title}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-800">{f.fact}</p>
                      <p className="mt-1 text-xs text-slate-500">Why it mattered: {f.whyItMatters}</p>
                      {use && (
                        <p className="mt-1 text-xs text-slate-600">
                          <span className="font-medium">{use.usedInDeliverable ? "Used in your work." : "Not used in your work."}</span>{" "}
                          {use.comment}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {tab === "work" && (
              <div className="space-y-6">
                {s.codeTask && <CodeResults session={session} />}
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  <div>
                    <h3 className="font-semibold text-ink">
                      {s.codeTask ? "Your note" : "Your deliverable"}: {r.deliverable.score}/10, {anchor(r.deliverable.score).toLowerCase()}
                    </h3>
                    <ListBlock title="What worked" items={r.deliverable.strengths} mark="+" />
                    <ListBlock title="What to fix" items={r.deliverable.issues} mark="–" />
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">What a senior would have submitted</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.deliverable.seniorVersion}</p>
                    </div>
                    <Collapsible label="Show what you submitted">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{session.deliverable.trim() || "(empty)"}</p>
                    </Collapsible>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">Role fit</h3>
                    <p className="text-xs text-slate-500">Based only on how you worked in this shift.</p>
                    <ul className="mt-3 space-y-4">
                      {r.roleFit.map((f) => (
                        <li key={f.role}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-900">{f.role}</span>
                            <span className="tabular-nums text-slate-600">{f.fit}%</span>
                          </div>
                          <Bar value={f.fit} max={100} />
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {tab === "plan" && (
              <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {r.plan.map((w) => (
                  <li key={w.week} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-brand-700">Week {w.week}</div>
                    <div className="mt-1 font-medium text-slate-900">{w.focus}</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                      {w.actions.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-slate-400">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <p className="pb-6 text-center text-xs leading-relaxed text-slate-500">
          Measured rows are counted by the app. The AI reviewer read your whole shift, scored six skills on a fixed rubric and had to
          quote you; the app checks those quotes and computes the overall score. Practice feedback, not a hiring decision.
        </p>
      </div>
    </main>
  );
}

const VERDICT_STYLE = {
  clear: "bg-brand-50 text-brand-800",
  partial: "bg-amber-50 text-amber-800",
  unclear: "bg-red-50 text-red-800",
  skipped: "bg-slate-100 text-slate-600",
} as const;

const toneText = { good: "text-brand-800", ok: "text-amber-700", bad: "text-red-700", neutral: "text-slate-700" } as const;

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <StarShape size={size} className="absolute inset-0 text-slate-200" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarShape size={size} className="text-amber-500" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function StarShape({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden fill="currentColor">
      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
    </svg>
  );
}

function SourceTag({ source }: { source: "measured" | "ai" }) {
  return source === "measured" ? (
    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-sky-200">Measured</span>
  ) : (
    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">AI</span>
  );
}

function Highlight({
  title,
  skill,
  score,
  text,
  accent,
  onMore,
}: {
  title: string;
  skill: string;
  score: number;
  text: string;
  accent: "brand" | "amber";
  onMore: () => void;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 ${accent === "brand" ? "border-brand-200" : "border-amber-200"}`}>
      <div className={`text-xs font-semibold ${accent === "brand" ? "text-brand-700" : "text-amber-700"}`}>{title}</div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="font-display text-lg font-bold text-ink">{skill}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-600">{score}/10</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{text}</p>
      <button type="button" onClick={onMore} className="mt-2 text-sm font-medium text-brand-800 hover:underline">
        {accent === "brand" ? "See the evidence" : "See your plan"}
      </button>
    </div>
  );
}

function SkillBars({ session }: { session: Session }) {
  const r = session.report!;
  const [hover, setHover] = useState<string | null>(null);

  return (
    <ul className="space-y-5">
      {SKILLS.map(({ id, label }) => {
        const k = r.skills.find((x) => x.id === id);
        const score = k?.score ?? 0;
        const assessed = k?.assessed !== false;
        return (
          <li key={id} className="grid gap-x-6 gap-y-2 md:grid-cols-[minmax(0,260px)_1fr]">
            <div
              className="relative"
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-900">{label}</span>
                <span className="tabular-nums text-slate-600">{assessed ? `${score}/10` : "Not assessed"}</span>
              </div>
              {assessed ? <Bar value={score} max={10} /> : <div className="mt-1.5 h-2.5 w-full rounded-r-[4px] border border-dashed border-slate-300" />}
              {hover === id && assessed && (
                <div className="absolute left-0 top-full z-10 mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
                  {label}: {score}/10 · {anchor(score)}
                </div>
              )}
            </div>
            <div className="text-sm">
              <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-700">
                {!assessed
                  ? "Not assessed"
                  : k?.evidence && k.evidence !== "No evidence in transcript"
                    ? `“${k.evidence}”`
                    : "No evidence in transcript"}
              </blockquote>
              <p className="mt-1.5 text-slate-600">{k?.feedback}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Code Shift: hidden test results measured by the app (not the AI).
function CodeResults({ session }: { session: Session }) {
  const task = session.scenario.codeTask!;
  const runs = session.codeRuns ?? [];
  const last = runs.at(-1);
  return (
    <Card title="Code & hidden tests" subtitle={`${task.fileName}: tests run by the app in your browser, not judged by the AI.`}>
      {last ? (
        <>
          <Meter value={last.passed} max={last.total} label={`${last.passed}/${last.total} tests passing on your final code`} />
          {runs.length > 1 && (
            <p className="mt-2 text-xs text-slate-500">
              {runs.length} test runs during the shift: {runs.map((r) => `${r.passed}/${r.total}`).join(" → ")}
            </p>
          )}
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {last.results.map((r) => (
              <li key={r.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className={`mr-2 text-xs font-bold ${r.passed ? "text-brand-700" : "text-red-700"}`}>
                  {r.passed ? "✓ PASS" : "✗ FAIL"}
                </span>
                <span className="text-slate-800">{r.name}</span>
                {r.message && <p className="mt-1 font-mono text-xs text-slate-500">{r.message}</p>}
              </li>
            ))}
          </ul>
          {last.error && <p className="mt-3 font-mono text-xs text-red-700">{last.error}</p>}
        </>
      ) : (
        <p className="text-sm text-slate-600">The tests were never run.</p>
      )}
      <Collapsible label="Show your code">
        <pre className="scroll-thin overflow-x-auto font-mono text-xs leading-relaxed text-slate-800">{session.code}</pre>
      </Collapsible>
    </Card>
  );
}

// Thin bar: square at the baseline, 4px rounded data end, on a light track.
function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-1.5 h-2.5 w-full rounded-r-[4px] bg-slate-100" role="img" aria-label={`${value} out of ${max}`}>
      <div className="h-full rounded-r-[4px] bg-brand-700 transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div>
      <div className="mb-1 text-right text-xs font-medium tabular-nums text-slate-600">{label}</div>
      <Bar value={value} max={max} />
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-4 mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      {children}
    </section>
  );
}

function ListBlock({ title, items, mark }: { title: string; items: string[]; mark: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-3 shrink-0 font-semibold text-slate-400">{mark}</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-brand-800 hover:underline">
        {open ? "Hide" : label}
      </button>
      {open && <div className="mt-2 rounded-xl border border-slate-200 p-3">{children}</div>}
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

