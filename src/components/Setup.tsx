"use client";

// Home page. Designed so a new visitor can start within one screen:
// type a name, pick a shift (Code Shift, Data Analyst, or any role), press start.
// Only "Any role" needs the longer form, so it expands in place.

import { useEffect, useRef, useState } from "react";
import { parseSessionFile } from "@/lib/session";
import type { GraduateProfile, Session } from "@/lib/types";

const REPO = "https://github.com/ahmed-raza19/firstshift";

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

// "How it works", told as the schedule of a first day at work.
const SCHEDULE = [
  { time: "09:00", title: "Get your badge", text: "Pick a shift and tell us your name." },
  { time: "09:05", title: "Meet your team", text: "A CEO, your manager, seniors, peers, other departments and a client. All AI, each knowing something you need." },
  { time: "09:10", title: "Do the work", text: "Ask the right people, handle surprises, ship your deliverable. In Code Shift, real tests run on your Python." },
  { time: "17:00", title: "Read your review", text: "Six workplace skills scored with quotes from your own messages, plus a 30-day plan." },
];

const DIFFERENT = [
  {
    title: "Teammates with secrets",
    text: "Every AI coworker knows something the task needs. Nobody hands it to you; you have to ask the right person, the way real jobs work.",
  },
  {
    title: "Real tests, not opinions",
    text: "In Code Shift your Python runs against hidden tests in your browser, and the QA bot files bugs from the actual results.",
  },
  {
    title: "Evidence you can check",
    text: "Every score quotes your own words, and the app checks the quotes are real. Same shift, graded four times: 90 to 93.",
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
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#why" className="hover:text-ink">Why it&apos;s different</a>
            <a href={`${REPO}/blob/master/EVALUATION.md`} target="_blank" rel="noreferrer" className="hover:text-ink">
              Evaluation
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-slate-600 hover:text-ink sm:inline"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={() => {
                document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => nameRef.current?.focus(), 300);
              }}
              className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Start a shift
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[1fr_440px] lg:gap-14 lg:pt-8">
          <div className="lg:pt-10">
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              Your first week on the job, before your first job.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Work a real shift with an AI team at a fictional Pakistani company. Ask the right
              people, handle surprises, ship your work, and get a review built on what you
              actually did.
            </p>
            <ShiftPeek />
          </div>

          <div id="start" className="scroll-mt-24">
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
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">How a shift works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-4 md:gap-6">
              {SCHEDULE.map((s, i) => (
                <li key={s.time} className="relative">
                  <div className="flex items-center gap-3">
                    <time className="font-mono text-sm font-medium text-brand-700">{s.time}</time>
                    {i < SCHEDULE.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-slate-200 md:block" />}
                  </div>
                  <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why it's different */}
        <section id="why" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Why it&apos;s different from a chatbot</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {DIFFERENT.map((d) => (
                <div key={d.title} className="border-l-2 border-brand-600 pl-4">
                  <h3 className="font-semibold text-ink">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button
                type="button"
                onClick={() => pick("code")}
                className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Try Code Shift now
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-ink text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              A multi-agent workplace simulation for fresh graduates. Companies and people are
              fictional. Your review is AI-generated practice feedback, not a hiring decision.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Shifts</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><button type="button" onClick={() => pick("code")} className="hover:text-white">Code Shift: AI/ML Engineer</button></li>
              <li><button type="button" onClick={() => pick("data")} className="hover:text-white">Data Analyst shift</button></li>
              <li><button type="button" onClick={() => pick("custom")} className="hover:text-white">Any role you want</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Project</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href={REPO} target="_blank" rel="noreferrer" className="hover:text-white">Source code on GitHub</a></li>
              <li><a href={`${REPO}/blob/master/EVALUATION.md`} target="_blank" rel="noreferrer" className="hover:text-white">How we measured the grader</a></li>
              <li><a href={`${REPO}#disclosure`} target="_blank" rel="noreferrer" className="hover:text-white">Tools and disclosures</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
            Built by team nexora at AICON&apos;26 Build With AI (EdTech &amp; Workforce), NUST Islamabad.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A small, static peek at what a shift looks like, so first-time visitors get it at a glance. */
function ShiftPeek() {
  const lines = [
    { who: "Omer Farooq", tag: "Manager", color: "#7c3aed", text: "Your task: implement classify_ticket(). Hamza's hidden tests decide if it ships." },
    { who: "Hamza Qureshi", tag: "QA", color: "#be185d", text: "BUG-201: urgent tickets like 'charged twice' are marked low priority.", qa: true },
    { who: "You", tag: "", color: "#334155", text: "Asked Farah which words mean urgent. Fixed it: 9/9 tests passing." },
  ];
  return (
    <figure className="mt-8 max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Example of a shift">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700"># team</span>
        <span>Rabta, Islamabad</span>
        <span className="ml-auto">Example from Code Shift</span>
      </div>
      <ul className="space-y-3 px-4 py-4">
        {lines.map((l) => (
          <li key={l.who} className="flex gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.who === "You" ? "You" : l.who.split(" ").map((w) => w[0]).join("")}
            </span>
            <div className="min-w-0 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">{l.who}</span>
                {l.tag && <span className="text-xs text-slate-500">{l.tag}</span>}
              </div>
              <p className={`mt-0.5 leading-snug text-slate-700 ${l.qa ? "rounded-md border-l-4 border-sky-400 bg-sky-50 px-2 py-1" : ""}`}>
                {l.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </figure>
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
            <span className="font-mono text-[10px] text-slate-500">FS-26-{num}</span>
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

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
        F<span className="text-brand-200">S</span>
      </div>
      <span className={`font-display text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`}>
        FirstShift
      </span>
    </div>
  );
}
