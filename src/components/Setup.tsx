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

const STEPS = [
  { n: "1", title: "Pick your role", text: "Tell us your degree and the job you want." },
  { n: "2", title: "Meet your AI team", text: "A CEO, manager, senior, peer, another department and a client. Each knows something you need." },
  { n: "3", title: "Do the real work", text: "Ask the right people, handle surprises, then submit your deliverable." },
  { n: "4", title: "Get your report", text: "Six workplace skills scored with quotes from your own messages, plus a 30-day plan." },
];

interface Props {
  error: string | null;
  onStart: (p: GraduateProfile) => void;
  onSample: (p: GraduateProfile) => void;
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
        <span className="hidden text-xs text-slate-500 sm:block">AICON&apos;26 · Build With AI · Team nexora</span>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-10">
        <section>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
            Multi-agent workplace simulation for fresh graduates
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Your first week on the job,{" "}
            <span className="text-teal-700">before your first job.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Join an AI team at a fictional Pakistani company. Everyone has their own role,
            personality and private knowledge, so you only succeed by asking the right people the
            right questions, like at a real job.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lg:pt-2">
          <form
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (canStart) onStart(profile());
            }}
          >
            <h2 className="text-xl font-semibold text-slate-900">Start your first shift</h2>
            <p className="mt-1 text-sm text-slate-500">About 15 minutes. Gemini generates a new company for you.</p>

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
                  Don&apos;t include your phone number, CNIC, address or other personal details. This text is sent to Google&apos;s Gemini API.
                </p>
              </Field>
            </div>

            <button
              type="submit"
              disabled={!canStart}
              className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Start my first shift
            </button>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => onSample(profile())}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Try the sample shift: Junior Data Analyst at TezTokri
              </button>
              <p className="mt-1.5 text-center text-xs text-slate-500">
                Pre-written company, starts instantly. Your AI teammates still reply live.
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

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
        F<span className="text-teal-200">S</span>
      </div>
      <span className={`text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
        FirstShift
      </span>
    </div>
  );
}
