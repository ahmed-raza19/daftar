"use client";

// Top-level screen flow: setup -> (generating) -> workspace -> (assessing) -> report.
// The session is saved to localStorage after every change, so a refresh never loses work.

import { useCallback, useEffect, useState } from "react";
import { ApiCallError, postJson } from "@/lib/api";
import { SAMPLE_SCENARIO } from "@/lib/sample-scenario";
import { createSession, loadSession, saveSession } from "@/lib/session";
import type { GraduateProfile, Report, Scenario, Session } from "@/lib/types";
import Loading from "./Loading";
import ReportView from "./Report";
import Setup from "./Setup";
import Workspace from "./Workspace";

type Busy = null | { kind: "generating" | "assessing" };

export default function App() {
  // This component only renders in the browser (see ClientApp), so it can read localStorage directly.
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

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

  function startSample(profile: GraduateProfile) {
    setError(null);
    setSession(
      createSession(
        { ...profile, targetRole: profile.targetRole || "Data Analyst" },
        SAMPLE_SCENARIO,
        "sample",
      ),
    );
  }

  async function submit(current: Session) {
    setError(null);
    setBusy({ kind: "assessing" });
    const submitted = { ...current, submittedAt: Date.now() };
    try {
      const res = await postJson<{ report: Report }>("/api/assess", submitted);
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
