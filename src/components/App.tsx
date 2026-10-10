"use client";

// Top-level screen flow: setup -> (generating) -> workspace -> review conversation -> (assessing) -> report.
// The session is saved to localStorage after every change, so a refresh never loses work.

import { useCallback, useEffect, useState } from "react";
import { ApiCallError, postJson } from "@/lib/api";
import { CODE_SCENARIO } from "@/lib/code-scenario";
import { SAMPLE_SCENARIO } from "@/lib/sample-scenario";
import { attachmentsFor } from "@/lib/files";
import { createSession, loadSession, saveSession } from "@/lib/session";
import type { GraduateProfile, Report, ReviewQA, Scenario, Session } from "@/lib/types";
import Loading from "./Loading";
import ReportView from "./Report";
import ReviewChat from "./ReviewChat";
import Setup from "./Setup";
import Workspace from "./Workspace";

type Busy = null | { kind: "generating" | "preparing" | "assessing" };

export default function App() {
  // This component only renders in the browser (see ClientApp), so it can read localStorage directly.
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ session: Session; questions: string[] } | null>(null);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const update = useCallback((fn: (s: Session) => Session) => {
    setSession((prev) => (prev ? fn(prev) : prev));
  }, []);

  async function start(profile: GraduateProfile) {
    setError(null);
    setBusy({ kind: "generating" });
    try {
      const res = await postJson<{ profile: GraduateProfile; scenario: Scenario }>(
        "/api/scenario",
        profile,
      );
      setSession(createSession(res.profile, res.scenario, "generated"));
    } catch (e) {
      setError(e instanceof ApiCallError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function startSample(profile: GraduateProfile, kind: "data" | "code") {
    setError(null);
    const scenario = kind === "code" ? CODE_SCENARIO : SAMPLE_SCENARIO;
    const role = kind === "code" ? "AI/ML Engineer" : "Data Analyst";
    setSession(createSession({ ...profile, targetRole: profile.targetRole || role }, scenario, "sample"));
  }

  // Submitting opens a short review conversation first: the manager asks 3 questions
  // about the submitted work. If the questions can't be generated, grade directly.
  async function submit(current: Session) {
    setError(null);
    const submitted = { ...current, submittedAt: Date.now() };
    setBusy({ kind: "preparing" });
    try {
      const res = await postJson<{ questions: string[] }>("/api/review", submitted);
      setReviewing({ session: submitted, questions: res.questions });
      setBusy(null);
    } catch {
      await grade(submitted);
    }
  }

  async function grade(submitted: Session) {
    setError(null);
    setReviewing(null);
    setBusy({ kind: "assessing" });
    try {
      // Attached images/PDFs live in memory (not in localStorage); send them along for grading.
      const res = await postJson<{ report: Report }>("/api/assess", { ...submitted, attachments: attachmentsFor(submitted.files) });
      setSession({ ...submitted, report: res.report });
    } catch (e) {
      setError(e instanceof ApiCallError ? e.message : "Grading failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setError(null);
    setSession(null);
  }

  if (busy) return <Loading kind={busy.kind} />;

  if (reviewing) {
    return (
      <ReviewChat
        session={reviewing.session}
        questions={reviewing.questions}
        onDone={(qa: ReviewQA[]) => grade({ ...reviewing.session, reviewQA: qa })}
      />
    );
  }

  if (!session) {
    return (
      <Setup
        error={error}
        onStart={start}
        onSample={startSample}
        onLoad={(s) => setSession(s)}
      />
    );
  }

  if (session.report) {
    return <ReportView session={session} onRestart={reset} onBack={() => update((s) => ({ ...s, report: undefined }))} />;
  }

  return (
    <Workspace
      session={session}
      update={update}
      onSubmit={submit}
      onRestart={reset}
      submitError={error}
    />
  );
}
