"use client";

// Home page. Designed so a new visitor can start within one screen:
// type a name, pick a shift (Code Shift, Data Analyst, or any role), press start.
// Only "Any role" needs the longer form, so it expands in place.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { parseSessionFile } from "@/lib/session";
import type { GraduateProfile, Session } from "@/lib/types";
import LiveShift from "./site/LiveShift";
import ShowcaseTabs from "./site/ShowcaseTabs";
import SiteFooter from "./site/SiteFooter";
import SiteHeader from "./site/SiteHeader";

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

type Choice = "code" | "data" | "custom";

const SHIFTS: {
  id: Choice;
  title: string;
  text: string;
  tags: string[];
  company: string;
  role: string;
  cta: string;
}[] = [
  {
    id: "code",
    title: "Code Shift: AI/ML Engineer",
    text: "Build ticket triage in Python with an 8-person AI team. Hidden tests really run.",
    tags: ["Python", "Real tests", "8 teammates"],
    company: "Rabta",
    role: "Associate AI/ML Engineer",
    cta: "Start Code Shift",
  },
  {
    id: "data",
    title: "Data Analyst shift",
    text: "Find out whether a promo really worked, with a 6-person AI team at a grocery startup.",
    tags: ["Data", "6 teammates"],
    company: "TezTokri",
    role: "Junior Data Analyst",
    cta: "Start Data Analyst shift",
  },
  {
    id: "custom",
    title: "Any role you want",
    text: "The AI builds a new company, team and task for your role in about 20 seconds.",
    tags: ["Any role", "AI-generated"],
    company: "Your new company",
    role: "",
    cta: "Build my company",
  },
];

interface Props {
  error: string | null;
  onStart: (p: GraduateProfile) => void;
  onSample: (p: GraduateProfile, kind: "data" | "code") => void;
  onLoad: (s: Session) => void;
}

export default function Setup({ error, onStart, onSample, onLoad }: Props) {
  const [name, setName] = useState("");
  const [choice, setChoice] = useState<Choice>("code");
  const [degree, setDegree] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [background, setBackground] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Links like "Start a shift" on other pages point to /#start. This page renders in the
  // browser, so jump to the chooser once it exists.
  useEffect(() => {
    if (window.location.hash !== "#start") return;
    const t = setTimeout(() => document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKey)))
      .catch(() => setHasKey(null));
  }, []);

  const shift = SHIFTS.find((s) => s.id === choice)!;
  const canStart = choice !== "custom" || Boolean(degree.trim() && targetRole.trim());

  const profile = (): GraduateProfile => ({
    name: name.trim() || "Guest",
    degree: degree.trim() || "Bachelor's degree",
    targetRole: targetRole.trim(),
    background,
  });

  function start() {
    if (!canStart) return;
    if (choice === "custom") onStart(profile());
    else onSample(profile(), choice);
  }

  function pick(c: Choice) {
    setChoice(c);
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function loadFile(file: File) {
    setLoadError(null);
    try {
      onLoad(parseSessionFile(await file.text()));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        {/* Phones: headline, then the chooser, then the example. Laptops: two columns. */}
        <section className="mx-auto grid max-w-6xl items-start gap-x-14 gap-y-8 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[1fr_440px] lg:grid-rows-[auto_1fr] lg:pt-8">
          <div className="lg:col-start-1 lg:row-start-1 lg:pt-10">
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              Your first day at the office, before you&apos;re hired.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Work a real shift with an AI team at a fictional Pakistani company. Ask the right
              people, handle surprises, ship your work, and get a review built on what you
              actually did.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {["6-8 AI teammates", "Hidden information to uncover", "Real Python tests", "Review in 15 minutes"].map((c) => (
                <li key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div id="start" className="scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <IdBadge name={name} company={shift.company} role={choice === "custom" ? targetRole : shift.role} />
            <form
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                start();
              }}
            >
              {hasKey === false && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  The server has no AI key yet. Add <code className="font-mono">GEMINI_API_KEY</code> to{" "}
                  <code className="font-mono">.env.local</code> or the Vercel settings.
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">What should your team call you?</span>
                <input
                  ref={nameRef}
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                  autoComplete="given-name"
                />
              </label>

              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-medium text-slate-700">Pick your shift</legend>
                <div className="space-y-2" role="radiogroup">
                  {SHIFTS.map((s) => {
                    const on = s.id === choice;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChoice(s.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                          on
                            ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            on ? "border-brand-700" : "border-slate-300"
                          }`}
                        >
                          {on && <span className="h-2 w-2 rounded-full bg-brand-700" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{s.title}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-slate-600">{s.text}</span>
                          {on && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {s.tags.map((t) => (
                              <span
                                key={t}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  on ? "bg-white text-brand-800 ring-1 ring-brand-200" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                          </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {choice === "custom" && (
                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3.5">
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
                  <Field label="Degree">
                    <input
                      className={inputCls}
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. BS Computer Science, 2026"
                      maxLength={120}
                    />
                  </Field>
                  <Field label="About you (optional)">
                    <textarea
                      className={`${inputCls} min-h-20 resize-y`}
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="Skills, projects, internships. Used to pitch the difficulty."
                      maxLength={2000}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      No phone number, CNIC or address, please. This text is sent to our AI providers.
                    </p>
                  </Field>
                </div>
              )}

              <button
                type="submit"
                disabled={!canStart}
                className="mt-4 w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {shift.cta}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                About 15 minutes. Have a saved shift?{" "}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="font-medium text-slate-700 underline underline-offset-2 hover:text-ink"
                >
                  Open it
                </button>
              </p>
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
            </form>
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <LiveShift />
          </div>
        </section>

        <ShowcaseTabs />

        {/* Two audiences */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-xl text-3xl font-bold text-ink sm:text-4xl">One shift, two ways to use it</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Link href="/how-it-works" className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <div className="text-sm font-semibold text-brand-700">For graduates</div>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">Practise the job before the interview</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Work with a team, handle a moved deadline and a pushy client, and get honest feedback with a 30-day plan.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-800 group-hover:underline">How a shift works →</span>
            </Link>
            <Link href="/for-employers" className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <div className="text-sm font-semibold text-brand-700">For employers</div>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">See how a candidate works, not just their CV</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A trial shift with measured signals: who they asked, how they handled surprises, and whether their code passes.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-800 group-hover:underline">Daftar for employers →</span>
            </Link>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand-700 px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Your first shift takes 15 minutes.</h2>
              <p className="mt-1 text-brand-100">No sign-up. Your work stays in your browser.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => pick("code")}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
              >
                Start Code Shift
              </button>
              <Link href="/evaluation" className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                How we measured the grader
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * The first-day ID badge. It fills in live with your name and the shift you pick,
 * so the very first interaction already feels like joining a company.
 */
function IdBadge({ name, company, role }: { name: string; company: string; role: string }) {
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
    <div className="badge-in relative mx-auto mb-3 w-full max-w-[340px]" aria-label="Your ID badge preview">
      {/* lanyard clip */}
      <div className="mx-auto h-4 w-14 rounded-t-md bg-clip shadow-sm">
        <div className="mx-auto h-1.5 w-7 translate-y-1 rounded-full bg-amber-700/40" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-12px_rgba(14,94,70,0.35)]">
        <div className="flex items-center justify-between bg-brand-700 px-4 py-1.5 text-white">
          <span className="truncate font-display text-sm font-semibold">{company}</span>
          <span className="text-xs text-brand-100">Day 1</span>
        </div>
        <div className="flex items-center gap-3.5 px-4 py-2.5">
          <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-display text-lg font-bold text-brand-800 ring-1 ring-brand-200">
            {letters}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate font-display text-lg font-bold ${name.trim() ? "text-ink" : "text-slate-300"}`}>{shown}</div>
            <div className={`truncate text-sm ${role.trim() ? "text-slate-700" : "text-slate-400"}`}>{role.trim() || "The role you want"}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] text-slate-500">DF-26-{num}</span>
            <span
              aria-hidden
              className="h-4 w-16 opacity-70"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #1e2433 0 2px, transparent 2px 4px, #1e2433 4px 5px, transparent 5px 8px, #1e2433 8px 11px, transparent 11px 12px)",
              }}
            />
          </div>
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
