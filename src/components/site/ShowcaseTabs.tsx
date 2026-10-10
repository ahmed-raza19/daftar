"use client";

// "See it in action": four numbered views of a shift, each with a small preview.
// Rotates on its own until the visitor picks a tab.

import { useEffect, useState } from "react";

const TABS = [
  {
    n: "01",
    title: "Meet your team",
    text: "An AI company with a real hierarchy: a CEO, your manager, seniors, peers, other departments and a client. Each one knows something you need.",
  },
  {
    n: "02",
    title: "Ask the right person",
    text: "Nobody hands you the answer. Information only counts when a teammate actually tells you, and the app checks that.",
  },
  {
    n: "03",
    title: "Ship real work",
    text: "In Code Shift your Python runs against hidden tests in your browser. The QA bot files bugs from the actual results.",
  },
  {
    n: "04",
    title: "Get your review",
    text: "A scorecard you can read in five seconds, evidence quoted from your own words, and a PDF to keep.",
  },
];

export default function ShowcaseTabs() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((a) => (a + 1) % TABS.length), 6000);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">See a shift in action</h2>
        <p className="mt-3 max-w-xl text-slate-400">Four moments from a 15-minute shift.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div role="tablist" aria-label="Moments in a shift" className="space-y-2">
            {TABS.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.n}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setActive(i);
                    setAuto(false);
                  }}
                  className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                    on ? "border-brand-500 bg-white/5" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className={`font-mono text-sm ${on ? "text-clip" : "text-slate-500"}`}>{t.n}</span>
                    <span className="font-semibold">{t.title}</span>
                  </div>
                  {on && <p className="mt-1.5 pl-9 text-sm leading-relaxed text-slate-300">{t.text}</p>}
                  {on && auto && (
                    <div className="ml-9 mt-3 h-0.5 overflow-hidden rounded-full bg-white/10">
                      <div key={active} className="showcase-progress h-full bg-clip" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-5 text-ink shadow-2xl" role="tabpanel">
            {active === 0 && <TeamPreview />}
            {active === 1 && <IntelPreview />}
            {active === 2 && <TestsPreview />}
            {active === 3 && <ReviewPreview />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Person({ name, title, color, you = false }: { name: string; title: string; color: string; you?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${you ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>
        {you ? "You" : name.split(" ").map((w) => w[0]).join("")}
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold">{you ? "You" : name}</div>
        <div className="truncate text-[11px] text-slate-500">{title}</div>
      </div>
      {!you && <span className="ml-auto text-xs" title="Knows something you need" aria-label="Knows something you need">🔒</span>}
    </div>
  );
}

function TeamPreview() {
  return (
    <div className="msg-in space-y-2 text-sm">
      <div className="text-xs font-semibold text-slate-500">Rabta, Islamabad</div>
      <Person name="Nadia Hussain" title="CEO" color="#0f766e" />
      <div className="ml-5 space-y-2 border-l-2 border-slate-200 pl-3">
        <Person name="Omer Farooq" title="Engineering Manager" color="#7c3aed" />
        <div className="ml-5 grid gap-2 border-l-2 border-slate-200 pl-3 sm:grid-cols-2">
          <Person name="Saad Mirza" title="Tech Lead" color="#c2410c" />
          <Person name="Hamza Qureshi" title="QA Engineer" color="#be185d" />
          <Person name="Zainab Ali" title="Backend Developer" color="#2563eb" />
          <Person name="" title="Associate AI/ML Engineer" color="#334155" you />
        </div>
        <Person name="Farah Javed" title="Support Lead" color="#4d7c0f" />
      </div>
      <div className="pt-1 text-xs font-semibold text-slate-500">Outside the company</div>
      <Person name="Kashif Iqbal" title="Client, Kapra Kart" color="#b45309" />
    </div>
  );
}

function IntelPreview() {
  return (
    <div className="msg-in space-y-3 text-sm">
      <div className="text-xs font-semibold text-slate-500">Direct message with Saad Mirza, Tech Lead</div>
      <div className="rounded-lg bg-slate-50 p-3">
        <span className="font-semibold">You:</span> Anything about the input I should guard against?
      </div>
      <div className="rounded-lg border-l-4 border-clip bg-amber-50 p-3">
        <span className="font-semibold">Saad:</span> Image-only tickets arrive with text=None. classify_ticket must never crash on those.
      </div>
      <div className="inline-flex rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white">🔎 New intel from Saad Mirza · 2/9 discovered</div>
      <p className="text-xs text-slate-500">The app checks the teammate really said it before it counts.</p>
    </div>
  );
}

function TestsPreview() {
  const tests: [string, boolean][] = [
    ["Returns a dict with category and priority", true],
    ["Handles None and empty text", true],
    ["Understands Roman Urdu tickets", true],
    ["Urgent words are always high priority", true],
    ["Integrates with the backend's ticket store", true],
  ];
  return (
    <div className="msg-in space-y-2 text-sm">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
{`def classify_ticket(text):
    t = (text or "").lower()
    if any(w in t for w in URGENT):
        return {"category": cat(t), "priority": "high"}`}
      </pre>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Hidden tests, run in your browser</span>
        <span className="text-sm font-semibold text-brand-700">9/9 passing</span>
      </div>
      <ul className="space-y-1">
        {tests.map(([name]) => (
          <li key={name} className="flex gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs">
            <span className="font-bold text-brand-700">✓ PASS</span>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 20 20" aria-hidden className={value - i >= 0.5 ? "text-amber-500" : "text-slate-200"} fill="currentColor">
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewPreview() {
  const rows: [string, string, number][] = [
    ["Hidden information found", "6 of 9", 3.5],
    ["People consulted", "5 of 8", 5],
    ["Surprises handled", "4 of 4", 5],
    ["Chain of command", "Respected", 5],
    ["Hidden tests", "9/9 passing", 5],
  ];
  return (
    <div className="msg-in text-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-display text-lg font-bold">Ayesha&apos;s first-shift review</div>
          <div className="text-xs text-slate-500">Example scorecard</div>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl font-bold">86</div>
          <Stars value={4.5} />
        </div>
      </div>
      <table className="mt-3 w-full text-xs">
        <tbody>
          {rows.map(([label, value, stars]) => (
            <tr key={label} className="border-t border-slate-100">
              <td className="py-1.5 font-medium">{label}</td>
              <td className="py-1.5 text-slate-600">{value}</td>
              <td className="py-1.5 text-right">
                <Stars value={stars} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 inline-flex rounded-md border border-slate-300 px-2 py-1 text-xs font-medium">Download PDF</div>
    </div>
  );
}
