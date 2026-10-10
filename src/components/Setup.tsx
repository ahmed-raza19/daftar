"use client";

import { useEffect, useRef, useState } from "react";
import { parseSessionFile } from "@/lib/session";
import type { GraduateProfile, Session } from "@/lib/types";

const ROLES = [
  "Software Engineer",
  "Data Analyst",
  "Product Manager",
  "Digital Marketing Associate",
  "Business Analyst",
  "Finance Analyst",
  "UX Designer",
  "HR Associate",
  "QA Engineer",
  "Supply Chain Analyst",
  "Civil Engineer",
  "Content Writer",
];

// "How it works", told as the schedule of a first day at work.
const SCHEDULE = [
  { time: "09:00", title: "Get your badge", text: "Tell us your degree and the job you want." },
  { time: "09:05", title: "Meet your team", text: "A CEO, your manager, a senior, a peer, another department and a client. All AI, each knowing something you need." },
  { time: "09:10", title: "Do the work", text: "Ask the right people, handle surprises, ship your deliverable. In Code Shift, real tests run on your Python." },
  { time: "17:00", title: "Read your review", text: "Six workplace skills, scored with quotes from your own messages, and a 30-day plan." },
];

interface Props {
  error: string | null;
  onStart: (p: GraduateProfile) => void;
  onSample: (p: GraduateProfile, kind: "data" | "code") => void;
  onLoad: (s: Session) => void;
}

export default function Setup({ error, onStart, onSample, onLoad }: Props) {
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [background, setBackground] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKey)))
      .catch(() => setHasKey(null));
  }, []);

  const profile = (): GraduateProfile => ({
    name: name.trim() || "Guest",
    degree: degree.trim() || "Bachelor's degree",
    targetRole: targetRole.trim(),
    background,
  });

  const canStart = name.trim() && degree.trim() && targetRole.trim();

  async function loadFile(file: File) {
    setLoadError(null);
    try {
      onLoad(parseSessionFile(await file.text()));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <span className="hidden text-xs text-slate-500 sm:block">Team nexora, AICON&apos;26 Build With AI</span>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-10">
        <section>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.04] text-ink sm:text-6xl">
            Your first week on the job, before your first job.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
            Join an AI team at a fictional Pakistani company. Everyone has their own role,
            personality and private knowledge, so you only succeed the way you would at a real
            job: by asking the right people the right questions.
          </p>

          <div className="mt-12 max-w-lg">
            <h2 className="text-base font-semibold text-ink">Your first day</h2>
            <ol className="mt-4 border-l-2 border-slate-200">
              {SCHEDULE.map((s) => (
                <li key={s.time} className="relative pb-6 pl-6 last:pb-0">
                  <span className="absolute -left-[7px] top-[7px] h-3 w-3 rounded-full border-2 border-background bg-brand-700" />
                  <div className="flex items-baseline gap-3">
                    <time className="font-mono text-xs text-slate-500">{s.time}</time>
                    <h3 className="font-semibold text-ink">{s.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lg:pt-2">
          <IdBadge name={name} degree={degree} role={targetRole} />
          <form
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (canStart) onStart(profile());
            }}
          >
            <h2 className="text-xl font-semibold text-slate-900">Start your first shift</h2>
            <p className="mt-1 text-sm text-slate-500">About 15 minutes. The AI generates a new company for you.</p>

            {hasKey === false && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                The server has no <code className="font-mono">GEMINI_API_KEY</code> yet. Add it to{" "}
                <code className="font-mono">.env.local</code> (or Vercel settings) and restart.
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
            )}

            <div className="mt-5 space-y-4">
              <Field label="Your name">
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ayesha Khan"
                  maxLength={60}
                />
              </Field>
              <Field label="Degree">
                <input
                  className={inputCls}
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. BS Computer Science, 2026"
                  maxLength={120}
                />
              </Field>
              <Field label="Role you want">
                <input
                  className={inputCls}
                  list="roles"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Choose or type a role"
                  maxLength={80}
                />
                <datalist id="roles">
                  {ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
              <Field label="About you (optional)">
                <textarea
                  className={`${inputCls} min-h-24 resize-y`}
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="Skills, projects, internships… used to pitch the difficulty."
                  maxLength={2000}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Don&apos;t include your phone number, CNIC, address or other personal details. This text is sent to our AI providers (Gemini or Groq).
                </p>
              </Field>
            </div>

            <button
              type="submit"
              disabled={!canStart}
              className="mt-6 w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Start my first shift
            </button>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => onSample(profile(), "code")}
                className="w-full rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-left text-sm font-medium text-brand-900 transition hover:bg-brand-100"
              >
                <span className="block">Code Shift: AI/ML Engineer at Rabta</span>
                <span className="block text-xs font-normal text-brand-800/80">
                  Write Python with an 8-person AI team. Hidden tests really run in your browser.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSample(profile(), "data")}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <span className="block">Sample shift: Junior Data Analyst at TezTokri</span>
                <span className="block text-xs font-normal text-slate-500">Analyse a promo with a 6-person AI team.</span>
              </button>
              <p className="mt-1.5 text-center text-xs text-slate-500">
                Pre-written companies, start instantly. Your AI teammates still reply live.
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 w-full text-center text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
              >
                Open a saved session (.json)
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                  e.target.value = "";
                }}
              />
              {loadError && <p className="mt-2 text-center text-xs text-red-700">{loadError}</p>}
            </div>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
            Companies and people are fictional. Your report is AI-generated practice feedback, not a hiring decision.
          </p>
        </section>
      </div>
    </main>
  );
}

/**
 * The first-day ID badge. It fills in live as the graduate types, so the very
 * first interaction already feels like joining a company.
 */
function IdBadge({ name, degree, role }: { name: string; degree: string; role: string }) {
  const shown = name.trim() || "Your name";
  const letters = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "?";
  // A stable, made-up employee number derived from the name.
  const num = [...name.trim().toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9000, 7) + 1000;

  return (
    <div className="badge-in relative mx-auto mb-6 w-full max-w-sm" aria-label="Your FirstShift ID badge preview">
      {/* lanyard clip */}
      <div className="mx-auto h-5 w-16 rounded-t-md bg-clip shadow-sm">
        <div className="mx-auto h-1.5 w-8 translate-y-1.5 rounded-full bg-amber-700/40" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-12px_rgba(14,94,70,0.35)]">
        <div className="flex items-center justify-between bg-brand-700 px-4 py-2 text-white">
          <span className="font-display text-sm font-semibold">FirstShift</span>
          <span className="text-xs text-brand-100">Day 1</span>
        </div>
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-display text-xl font-bold text-brand-800 ring-1 ring-brand-200">
            {letters}
          </div>
          <div className="min-w-0">
            <div className={`truncate font-display text-xl font-bold ${name.trim() ? "text-ink" : "text-slate-300"}`}>{shown}</div>
            <div className={`truncate text-sm ${role.trim() ? "text-slate-700" : "text-slate-400"}`}>{role.trim() || "The role you want"}</div>
            <div className="truncate text-xs text-slate-500">{degree.trim() || "Your degree"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-4 py-2">
          <span className="font-mono text-[11px] text-slate-500">ID FS-26-{num}</span>
          {/* barcode */}
          <span
            aria-hidden
            className="h-5 w-24 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #1e2433 0 2px, transparent 2px 4px, #1e2433 4px 5px, transparent 5px 8px, #1e2433 8px 11px, transparent 11px 12px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
        F<span className="text-brand-200">S</span>
      </div>
      <span className={`text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
        FirstShift
      </span>
    </div>
  );
}
