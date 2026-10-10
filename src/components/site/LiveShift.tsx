"use client";

// An animated example of a Code Shift: messages arrive one by one, the
// hidden-information and test counters tick up, then it loops.
// With reduced motion, it shows the finished state without animating.

import { useEffect, useState } from "react";

type Line = { who: string; tag?: string; color: string; text: string; kind?: "qa" | "intel" | "you" };

const SCRIPT: (Line & { intel: number; tests: number })[] = [
  { who: "Omer Farooq", tag: "Manager", color: "#7c3aed", text: "Your task: implement classify_ticket(). Hamza's hidden tests decide if it ships.", intel: 0, tests: 3 },
  { who: "You", color: "#334155", text: "@Farah which words make a support ticket urgent?", kind: "you", intel: 0, tests: 3 },
  { who: "Farah Javed", tag: "Support Lead", color: "#4d7c0f", text: "Fraud, hacked, chargeback, charged twice, locked out. Always high.", kind: "intel", intel: 1, tests: 3 },
  { who: "Hamza Qureshi", tag: "QA", color: "#be185d", text: "BUG-201: 'charged twice' tickets are still marked low.", kind: "qa", intel: 1, tests: 6 },
  { who: "You", color: "#334155", text: "Fixed it and re-ran the tests.", kind: "you", intel: 1, tests: 9 },
];

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function LiveShift() {
  const [shown, setShown] = useState(() => (reducedMotion() ? SCRIPT.length : 1));
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let n = 1;
    const step = () => {
      if (n >= SCRIPT.length) {
        timers.push(setTimeout(() => {
          n = 1;
          setShown(1);
          timers.push(setTimeout(step, 1400));
        }, 4500));
        return;
      }
      setTyping(true);
      timers.push(setTimeout(() => {
        setTyping(false);
        n += 1;
        setShown(n);
        timers.push(setTimeout(step, 1300));
      }, 900));
    };
    timers.push(setTimeout(step, 1200));
    return () => timers.forEach(clearTimeout);
  }, []);

  const visible = SCRIPT.slice(0, shown).slice(-3);
  const state = SCRIPT[shown - 1];
  const next = SCRIPT[shown];

  return (
    <figure className="max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Example of a Code Shift">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        <span className="font-semibold text-slate-700"># team</span>
        <span>Rabta, Islamabad</span>
        <span className="ml-auto">Example</span>
      </div>

      <ul className="h-[220px] space-y-3 overflow-hidden px-4 py-4">
        {visible.map((l, i) => (
          <li key={`${shown}-${i}-${l.text}`} className="msg-in flex gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.who === "You" ? "You" : l.who.split(" ").map((w) => w[0]).join("")}
            </span>
            <div className="min-w-0 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">{l.who}</span>
                {l.tag && <span className="text-xs text-slate-500">{l.tag}</span>}
              </div>
              <p
                className={`mt-0.5 leading-snug text-slate-700 ${
                  l.kind === "qa"
                    ? "rounded-md border-l-4 border-sky-400 bg-sky-50 px-2 py-1"
                    : l.kind === "intel"
                      ? "rounded-md border-l-4 border-clip bg-amber-50 px-2 py-1"
                      : ""
                }`}
              >
                {l.text}
              </p>
            </div>
          </li>
        ))}
        {typing && next && (
          <li className="flex items-center gap-2 pl-11 text-xs text-slate-500">
            <span className="flex gap-0.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
            </span>
            {next.who === "You" ? "You are" : `${next.who} is`} typing…
          </li>
        )}
      </ul>

      <div className="grid grid-cols-2 border-t border-slate-100 text-xs">
        <Counter label="Hidden information" value={state.intel} max={9} />
        <Counter label="Hidden tests passing" value={state.tests} max={9} />
      </div>
    </figure>
  );
}

function Counter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="px-4 py-2.5 first:border-r first:border-slate-100">
      <div className="flex items-baseline justify-between">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono font-medium tabular-nums text-ink">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
