"use client";

import { useEffect, useState } from "react";

// Shows what the AI is doing while a long call runs, step by step.
const STEPS = {
  generating: [
    "Founding a fictional company that needs your role…",
    "Hiring a CEO, your manager, a senior and a peer…",
    "Bringing in another department and an external client…",
    "Giving each person something only they know…",
    "Planting a few subtle flaws in the work files…",
    "Scheduling surprises for later in your shift…",
    "Getting your first day ready…",
  ],
  assessing: [
    "Reading every message you sent…",
    "Checking which hidden facts you uncovered…",
    "Seeing how you handled the curveballs…",
    "Reviewing your deliverable like a senior would…",
    "Scoring six workplace skills with evidence…",
    "Writing your 30-day plan…",
  ],
} as const;

export default function Loading({ kind }: { kind: keyof typeof STEPS }) {
  const steps = STEPS[kind];
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 3200);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-600" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">
            {kind === "generating" ? "The AI is building your workplace" : "Your shift is being reviewed"}
          </h1>
        </div>
        <ol className="space-y-3">
          {steps.map((s, n) => (
            <li
              key={s}
              className={`flex items-start gap-3 text-sm transition-opacity ${n > i ? "opacity-30" : "opacity-100"}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  n < i ? "bg-brand-600 text-white" : n === i ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-400"
                }`}
              >
                {n < i ? "✓" : n + 1}
              </span>
              <span className={n === i ? "font-medium text-slate-900" : "text-slate-600"}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-slate-500">This usually takes 15–40 seconds.</p>
      </div>
    </main>
  );
}
