"use client";

import { useState } from "react";
import { channels } from "@/lib/org";
import { downloadFile, fileStem, sessionTranscript } from "@/lib/session";
import type { Session } from "@/lib/types";
import { SKILLS, YOU } from "@/lib/types";
import Avatar from "./Avatar";
import { Logo } from "./Setup";

interface Props {
  session: Session;
  onRestart: () => void;
  onBack: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const anchor = (score: number) =>
  score >= 9 ? "Exceptional" : score >= 7 ? "Solid, job-ready" : score >= 5 ? "Developing" : score >= 3 ? "Weak" : "Not shown";

export default function ReportView({ session, onRestart, onBack }: Props) {
  const r = session.report!;
  const s = session.scenario;
  const facts = s.personas.flatMap((p) => p.privateFacts.map((f) => ({ ...f, holder: p })));
  const foundCount = facts.filter((f) => session.revealedFactIds.includes(f.id)).length;
  const yourMessages = session.messages.filter((m) => m.from === YOU);
  const channelsUsed = new Set(yourMessages.map((m) => m.channel)).size;

  return (
    <main className="flex-1 bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Logo />
          <div className="ml-auto flex flex-wrap gap-2">
            <Btn onClick={onBack}>Back to shift</Btn>
            <Btn onClick={() => downloadFile(`${fileStem(session)}.txt`, sessionTranscript(session))}>Transcript + report .txt</Btn>
            <Btn onClick={() => downloadFile(`${fileStem(session)}.json`, JSON.stringify(session, null, 2), "application/json")}>
              Save .json
            </Btn>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              New shift
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">Job-readiness report</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">{session.profile.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {s.graduateTitle} at {s.company.name} (fictional) · {session.profile.degree}
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-slate-700">{r.summary}</p>
            <p className="mt-4 text-xs text-slate-500">
              Based on {plural(yourMessages.length, "message")} across {channelsUsed} of {channels(s).length} channels,{" "}
              {foundCount} of {facts.length} hidden facts uncovered, and your deliverable.
            </p>
          </div>
          <div className="flex flex-col items-start justify-center md:items-end">
            <div className="text-sm font-medium text-slate-500">Overall</div>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-semibold tabular-nums tracking-tight text-slate-900">{r.overall}</span>
              <span className="text-lg text-slate-400">/100</span>
            </div>
            <span className="mt-1 rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800 ring-1 ring-teal-200">
              {r.verdict}
            </span>
            <p className="mt-3 max-w-[220px] text-[11px] leading-snug text-slate-400 md:text-right">
              Average of the six skill scores. AI-generated practice feedback, not a hiring decision.
            </p>
          </div>
        </section>

        {/* Skills */}
        <Card title="Six workplace skills" subtitle="Scored 0–10 against a fixed rubric. Every score quotes you.">
          <SkillBars session={session} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Hidden intel */}
          <Card title="Hidden intel" subtitle={`You uncovered ${foundCount} of ${facts.length} things your teammates knew.`}>
            <Meter value={foundCount} max={facts.length} label={`${foundCount}/${facts.length} found`} />
            <ul className="mt-4 space-y-3">
              {facts.map((f) => {
                const found = session.revealedFactIds.includes(f.id);
                const use = r.facts.find((x) => x.factId === f.id);
                return (
                  <li key={f.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2 text-xs">
                      <span
                        className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${found ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}
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
                        <span className="font-medium">{use.usedInDeliverable ? "Used in your deliverable." : "Not used in your deliverable."}</span>{" "}
                        {use.comment}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-6">
            {/* Deliverable */}
            <Card title="Your deliverable" subtitle={`${r.deliverable.score}/10 · ${anchor(r.deliverable.score)}`}>
              <ListBlock title="What worked" items={r.deliverable.strengths} mark="+" />
              <ListBlock title="What to fix" items={r.deliverable.issues} mark="–" />
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">What a senior would have submitted</div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.deliverable.seniorVersion}</p>
              </div>
              <Collapsible label="Show what you submitted">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {session.deliverable.trim() || "(empty)"}
                </p>
              </Collapsible>
            </Card>

            {/* Role fit */}
            <Card title="Role fit" subtitle="Based only on how you worked in this shift.">
              <ul className="space-y-4">
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
            </Card>
          </div>
        </div>

        {/* Moments */}
        <Card title="Key moments" subtitle="What you actually said, and why it mattered.">
          <ul className="grid gap-3 md:grid-cols-2">
            {r.moments.map((m, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-4">
                <div
                  className={`mb-2 inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${
                    m.type === "strength" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {m.type === "strength" ? "▲ Strength" : "▼ Concern"}
                </div>
                <blockquote className="border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">“{m.quote}”</blockquote>
                <p className="mt-2 text-sm text-slate-600">{m.why}</p>
              </li>
            ))}
          </ul>
        </Card>

        {/* Plan */}
        <Card title="Your 30-day plan" subtitle="Free or low-cost steps to close the gaps.">
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {r.plan.map((w) => (
              <li key={w.week} className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">Week {w.week}</div>
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
        </Card>

        <p className="pb-6 text-center text-xs leading-relaxed text-slate-500">
          How this was scored: the app tracked which hidden facts you uncovered as you chatted. At the end, Gemini read your whole
          transcript and deliverable, scored six skills on a fixed rubric, and had to quote you as evidence. The overall score
          is computed by the app, not the AI. Non-native English and Roman Urdu are not penalised.
        </p>
      </div>
    </main>
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
        return (
          <li key={id} className="grid gap-x-6 gap-y-2 md:grid-cols-[minmax(0,260px)_1fr]">
            <div
              className="relative"
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-900">{label}</span>
                <span className="tabular-nums text-slate-600">{score}/10</span>
              </div>
              <Bar value={score} max={10} />
              {hover === id && (
                <div className="absolute left-0 top-full z-10 mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
                  {label}: {score}/10 · {anchor(score)}
                </div>
              )}
            </div>
            <div className="text-sm">
              <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-700">
                {k?.evidence && k.evidence !== "No evidence in transcript" ? `“${k.evidence}”` : "No evidence in transcript"}
              </blockquote>
              <p className="mt-1.5 text-slate-600">{k?.feedback}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Thin bar: square at the baseline, 4px rounded data end, on a light track.
function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-1.5 h-2.5 w-full rounded-r-[4px] bg-slate-100" role="img" aria-label={`${value} out of ${max}`}>
      <div className="h-full rounded-r-[4px] bg-teal-700 transition-all duration-700" style={{ width: `${pct}%` }} />
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
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
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
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-teal-800 hover:underline">
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

