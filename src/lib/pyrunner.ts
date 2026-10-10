// Runs the graduate's Python code against hidden tests, entirely in the browser.
// Python is Pyodide (CPython compiled to WebAssembly) inside a Web Worker, so
// untrusted code never runs on our server, and an infinite loop can be killed
// by terminating the worker.

import type { CodeRun, TestResult } from "./types";

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";

// Python harness: loads the candidate's code into its own namespace, then runs
// the hidden tests. Tests call check(name, fn); fn raises AssertionError to fail.
const HARNESS = String.raw`
import json, traceback
_results = []
def check(name, fn):
    try:
        fn()
        _results.append({"name": name, "passed": True, "message": ""})
    except AssertionError as e:
        _results.append({"name": name, "passed": False, "message": str(e) or "Assertion failed"})
    except Exception as e:
        _results.append({"name": name, "passed": False, "message": f"{type(e).__name__}: {e}"})

_error = None
_candidate = {"__name__": "classifier"}
try:
    exec(candidate_code, _candidate)
except Exception:
    _error = traceback.format_exc(limit=0).strip()

if _error is None:
    _tests = {"check": check, "candidate": _candidate, "flags": json.loads(flags_json)}
    try:
        exec(test_code, _tests)
    except Exception:
        _error = "Test suite crashed: " + traceback.format_exc(limit=0).strip()

json.dumps({"results": _results, "error": _error})
`;

const WORKER_SOURCE = `
importScripts("${PYODIDE}pyodide.js");
const ready = loadPyodide({ indexURL: "${PYODIDE}" });
self.onmessage = async (e) => {
  const { id, code, tests, flags, harness } = e.data;
  try {
    const py = await ready;
    py.globals.set("candidate_code", code);
    py.globals.set("test_code", tests);
    py.globals.set("flags_json", JSON.stringify(flags));
    const out = await py.runPythonAsync(harness);
    self.postMessage({ id, ok: true, out });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
`;

let worker: Worker | null = null;
let warm = false;

function getWorker(): Worker {
  if (!worker) {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    worker = new Worker(url);
  }
  return worker;
}

/** True after Python has loaded once (later runs take well under a second). */
export function pythonIsWarm() {
  return warm;
}

export function runPythonTests(
  code: string,
  tests: string,
  flags: Record<string, boolean>,
  timeoutMs = 45_000,
): Promise<CodeRun> {
  const w = getWorker();
  const id = Math.random().toString(36).slice(2);

  return new Promise((resolve) => {
    const finish = (results: TestResult[], error?: string) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      const passed = results.filter((r) => r.passed).length;
      resolve({ at: Date.now(), results, passed, total: results.length, error });
    };

    const timer = setTimeout(() => {
      // Probably an infinite loop: kill the worker and start fresh next time.
      w.terminate();
      worker = null;
      warm = false;
      finish([], "Your code took too long to run (possible infinite loop). Execution was stopped.");
    }, timeoutMs);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      warm = true;
      if (!e.data.ok) return finish([], `Python error: ${e.data.error}`);
      try {
        const parsed = JSON.parse(e.data.out) as { results: TestResult[]; error: string | null };
        finish(parsed.results, parsed.error ?? undefined);
      } catch {
        finish([], "Couldn't read the test results.");
      }
    };

    w.addEventListener("message", onMessage);
    w.postMessage({ id, code, tests, flags, harness: HARNESS });
  });
}
