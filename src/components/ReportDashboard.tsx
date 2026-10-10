"use client";

// Dashboard-style charts for the report: KPI cards, activity over the shift
// (with surprise markers), hidden information found, who you talked to, and
// test runs (Code Shift). All numbers are measured by the app.

import { useState } from "react";
import { shiftAnalytics, type Analytics } from "@/lib/analytics";
import { avatarColor } from "@/lib/org";
import type { Session } from "@/lib/types";

export default function ReportDashboard({ session }: { session: Session }) {
  const a = shiftAnalytics(session);
  const r = session.report!;
  const lastRun = a.testRuns.at(-1);
  const consulted = a.people.filter((p) => p.count > 0).length;

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="score" tint="bg-brand-50 text-brand-700" label="Overall score" value={`${r.overall}`} sub={r.verdict} />
        <Kpi icon="clock" tint="bg-sky-50 text-sky-700" label="Time on shift" value={`${a.durationMin} min`} sub={`${a.activity.reduce((n, p) => n + p.sent, 0)} messages sent`} />
        <Kpi icon="search" tint="bg-amber-50 text-amber-700" label="Hidden info found" value={`${a.intel.found}/${a.intel.total}`} sub={`${Math.round((a.intel.found / Math.max(1, a.intel.total)) * 100)}% uncovered`} />
        {lastRun ? (
          <Kpi icon="check" tint="bg-violet-50 text-violet-700" label="Hidden tests" value={`${lastRun.passed}/${lastRun.total}`} sub={`${a.testRuns.length} test runs`} />
        ) : (
          <Kpi icon="people" tint="bg-violet-50 text-violet-700" label="People consulted" value={`${consulted}/${a.people.length}`} sub="messaged or @mentioned" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Your shift, minute by minute" sub="Messages you had sent so far. Dashed lines mark the surprises.">
          <ActivityChart a={a} />
        </Panel>
        <Panel title="Hidden information" sub="What teammates actually told you">
          <Donut found={a.intel.found} total={a.intel.total} />
        </Panel>
      </div>

      <div className={`grid gap-4 ${a.testRuns.length ? "lg:grid-cols-2" : ""}`}>
        <Panel title="Who you talked to" sub="Direct messages and @mentions per teammate">
          <PeopleBars a={a} session={session} />
        </Panel>
        {a.testRuns.length > 0 && (
          <Panel title="Hidden tests per run" sub="Run in your browser by the app">
            <TestRunsChart a={a} />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="text-xs text-slate-500">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const ICONS: Record<string, string> = {
  score: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4",
  check: "M5 12l4 4 10-10",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-6 8a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 19a6 6 0 0 0-4-5.6",
};

function Kpi({ icon, tint, label, value, sub }: { icon: string; tint: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-display text-2xl font-bold leading-tight tabular-nums text-ink">{value}</div>
        <div className="truncate text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function ActivityChart({ a }: { a: Analytics }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 230;
  const P = { l: 30, r: 14, t: 30, b: 30 };
  const pts = a.activity;
  const maxY = Math.max(2, pts.at(-1)!.total);
  const maxX = Math.max(pts.at(-1)!.minute, 1);
  const x = (m: number) => P.l + (m / maxX) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / maxY) * (H - P.t - P.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.minute).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.at(-1)!.minute)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = Array.from(new Set([0, Math.ceil(maxY / 2), maxY]));
  const step = (W - P.l - P.r) / Math.max(1, pts.length - 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Messages you sent over the shift">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {t}
            </text>
          </g>
        ))}
        {pts.map((p, i) =>
          i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1 ? (
            <text key={p.minute} x={x(p.minute)} y={H - 10} textAnchor="middle" fontSize="11" fill="#64748b">
              {p.minute}m
            </text>
          ) : null,
        )}
        <path d={area} fill="#0e5e46" opacity="0.12" />
        <path d={line} fill="none" stroke="#0e5e46" strokeWidth="2" strokeLinejoin="round" />

        {a.markers.map((m, i) => (
          <g key={i}>
            <line x1={x(Math.min(m.minute, maxX))} x2={x(Math.min(m.minute, maxX))} y1={P.t - 6} y2={H - P.b} stroke="#1e2433" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <text x={x(Math.min(m.minute, maxX)) + 4} y={P.t - 12 + (i % 2) * 12} fontSize="10.5" fill="#1e2433">
              {m.label}
            </text>
          </g>
        ))}

        <circle cx={x(pts.at(-1)!.minute)} cy={y(pts.at(-1)!.total)} r="5" fill="#0e5e46" stroke="#fff" strokeWidth="2" />

        {hover !== null && (
          <circle cx={x(pts[hover].minute)} cy={y(pts[hover].total)} r="4.5" fill="#fff" stroke="#0e5e46" strokeWidth="2" />
        )}
        {/* Hover targets, wider than the marks */}
        {pts.map((p, i) => (
          <rect
            key={p.minute}
            x={x(p.minute) - step / 2}
            y={P.t}
            width={step}
            height={H - P.t - P.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover === null && pts.at(-1)!.total > 0 && (
        <div
          className="pointer-events-none absolute -translate-x-full whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-white"
          style={{ left: `${(x(pts.at(-1)!.minute) / W) * 100}%`, top: `${((y(pts.at(-1)!.total) - 30) / H) * 100}%` }}
        >
          {pts.at(-1)!.total} messages
        </div>
      )}
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white"
          style={{ left: `${(x(pts[hover].minute) / W) * 100}%`, top: `${((y(pts[hover].total) - 38) / H) * 100}%` }}
        >
          By {pts[hover].minute + a.bucket} min: {pts[hover].total} sent ({pts[hover].sent} in this minute{a.bucket > 1 ? "s" : ""})
        </div>
      )}
    </div>
  );
}

function Donut({ found, total }: { found: number; total: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const share = total ? found / total : 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`${found} of ${total} found`}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="#0e5e46"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, share * c - (share > 0 && share < 1 ? 4 : 0))} ${c}`}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="78" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1e2433">
          {found}/{total}
        </text>
        <text x="80" y="98" textAnchor="middle" fontSize="12" fill="#64748b">
          found
        </text>
      </svg>
      <div className="flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-700" /> Found {found}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Missed {total - found}
        </span>
      </div>
    </div>
  );
}

function PeopleBars({ a, session }: { a: Analytics; session: Session }) {
  const max = Math.max(1, ...a.people.map((p) => p.count));
  return (
    <ul className="space-y-2.5">
      {a.people.map((p) => (
        <li key={p.id} className="grid grid-cols-[minmax(0,180px)_1fr_28px] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: avatarColor(session.scenario, p.id) }} />
            <span className="truncate text-sm text-ink">{p.name}</span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-slate-100" title={`${p.title}: ${p.count}`}>
            <div className="h-full rounded-r-[4px] bg-brand-700" style={{ width: `${(p.count / max) * 100}%` }} />
          </div>
          <span className={`text-right text-sm tabular-nums ${p.count ? "font-semibold text-ink" : "text-slate-400"}`}>{p.count}</span>
        </li>
      ))}
    </ul>
  );
}

function TestRunsChart({ a }: { a: Analytics }) {
  const W = 400;
  const H = 170;
  const P = { l: 28, r: 14, t: 16, b: 26 };
  const runs = a.testRuns;
  const total = Math.max(...runs.map((r) => r.total));
  const x = (i: number) => (runs.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i / (runs.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => H - P.b - (v / total) * (H - P.t - P.b);
  const line = runs.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.passed)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Passing tests per run">
      {[0, total].map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
          <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
            {t}
          </text>
        </g>
      ))}
      <path d={line} fill="none" stroke="#0e5e46" strokeWidth="2" />
      {runs.map((r, i) => (
        <g key={r.run}>
          <circle cx={x(i)} cy={y(r.passed)} r="5" fill={r.passed === r.total ? "#0e5e46" : "#fff"} stroke="#0e5e46" strokeWidth="2">
            <title>{`Run ${r.run}: ${r.passed}/${r.total} passing`}</title>
          </circle>
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">
            Run {r.run}
          </text>
          <text x={x(i)} y={y(r.passed) - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e2433">
            {r.passed}/{r.total}
          </text>
        </g>
      ))}
    </svg>
  );
}
