"use client";

// Code Shift editor: the graduate edits their Python file and runs the hidden
// tests. Tests run in the browser (Pyodide); results go back to the workspace,
// where the QA teammate reacts to them.

import { useState } from "react";
import { pythonIsWarm, runPythonTests } from "@/lib/pyrunner";
import type { CodeRun, Session } from "@/lib/types";

interface Props {
  session: Session;
  update: (fn: (s: Session) => Session) => void;
  onRun: (run: CodeRun) => void;
}

/** Which optional tests are switched on, based on the curveballs that have fired. */
export function testFlags(session: Session): Record<string, boolean> {
  const task = session.scenario.codeTask;
  if (!task) return {};
  return Object.fromEntries(
    Object.entries(task.testFlags).map(([curveballId, flag]) => [flag, session.firedCurveballIds.includes(curveballId)]),
  );
}

export default function CodePanel({ session, update, onRun }: Props) {
  const task = session.scenario.codeTask!;
  const [running, setRunning] = useState(false);
  const runs = session.codeRuns ?? [];
  const last = runs.at(-1);

  async function run() {
    setRunning(true);
    try {
      const result = await runPythonTests(session.code ?? "", task.tests, testFlags(session));
      update((x) => ({ ...x, codeRuns: [...(x.codeRuns ?? []), result] }));
      onRun(result);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-600">py</span>
          <span className="font-mono text-slate-700">{task.fileName}</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset your code to the starter template?")) update((x) => ({ ...x, code: task.starterCode }));
            }}
            className="ml-auto text-slate-500 hover:text-slate-800"
          >
            Reset
          </button>
        </div>
        <textarea
          value={session.code ?? ""}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            update((x) => ({ ...x, code: v }));
          }}
          onKeyDown={(e) => {
            // Tab inserts 4 spaces instead of leaving the editor.
            if (e.key !== "Tab") return;
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: a, selectionEnd: b, value } = el;
            const next = `${value.slice(0, a)}    ${value.slice(b)}`;
            update((x) => ({ ...x, code: next }));
            requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4));
          }}
          className="block h-80 w-full resize-y bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-900 outline-none"
          aria-label={`${task.fileName} editor`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-400"
        >
          {running ? (pythonIsWarm() ? "Running tests…" : "Loading Python (first run ~10s)…") : "▶ Run hidden tests"}
        </button>
        {last && (
          <span className={`text-sm font-semibold tabular-nums ${last.passed === last.total && !last.error ? "text-teal-700" : "text-slate-700"}`}>
            {last.passed}/{last.total} passing
          </span>
        )}
        {runs.length > 1 && (
          <span className="ml-auto text-xs text-slate-500">
            Runs: {runs.slice(-5).map((r) => `${r.passed}/${r.total}`).join(" → ")}
          </span>
        )}
      </div>

      {last?.error && (
        <pre className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-800">{last.error}</pre>
      )}

      {last && last.results.length > 0 && (
        <ul className="space-y-1.5">
          {last.results.map((r) => (
            <li key={r.name} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <span className={`mt-px shrink-0 text-xs font-bold ${r.passed ? "text-teal-700" : "text-red-700"}`}>
                  {r.passed ? "✓ PASS" : "✗ FAIL"}
                </span>
                <span className="text-slate-800">{r.name}</span>
              </div>
              {r.message && <p className="mt-1 pl-12 font-mono text-xs text-slate-500">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}

      {!last && (
        <p className="text-xs leading-relaxed text-slate-500">
          The tests are hidden, like a real QA suite. Your teammates know things the tests check. Ask them.
          Code runs only in your browser.
        </p>
      )}
    </div>
  );
}
