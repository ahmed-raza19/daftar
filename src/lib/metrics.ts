// At-a-glance scorecard for the report and the PDF.
// Most rows are MEASURED by the app from what actually happened in the shift
// (no AI involved); the rest come from the AI review. Each row gets a 0-5 star
// rating so a reader sees the performance at a glance, like an order rating.

import { manager, personaById } from "./org";
import type { Session } from "./types";
import { YOU } from "./types";

export interface Signal {
  id: string;
  label: string;
  value: string;
  stars: number | null; // 0-5 in steps of 0.5; null = informational only
  note: string;
  source: "measured" | "ai";
}

const half = (x: number) => Math.max(0, Math.min(5, Math.round(x * 2) / 2));

/** Overall star rating from the 0-100 score. */
export function overallStars(overall: number): number {
  return half(overall / 20);
}

export function tone(stars: number | null): "good" | "ok" | "bad" | "neutral" {
  if (stars === null) return "neutral";
  if (stars >= 4) return "good";
  if (stars >= 2.5) return "ok";
  return "bad";
}

export function shiftSignals(session: Session): Signal[] {
  const s = session.scenario;
  const r = session.report;
  const mine = session.messages.filter((m) => m.from === YOU);
  const signals: Signal[] = [];

  if (r) {
    signals.push({
      id: "overall",
      label: "Overall performance",
      value: `${r.overall}/100, ${r.verdict}`,
      stars: overallStars(r.overall),
      note: "Average of the AI-scored workplace skills",
      source: "ai",
    });
  }

  // Time on shift
  const end = session.submittedAt ?? session.messages.at(-1)?.at ?? session.startedAt;
  const minutes = Math.max(1, Math.round((end - session.startedAt) / 60000));
  signals.push({
    id: "time",
    label: "Time on shift",
    value: `${minutes} min`,
    stars: null,
    note: `${mine.length} messages sent`,
    source: "measured",
  });

  // Hidden facts found
  const totalFacts = s.personas.reduce((n, p) => n + p.privateFacts.length, 0);
  const found = session.revealedFactIds.length;
  signals.push({
    id: "intel",
    label: "Hidden information found",
    value: `${found} of ${totalFacts}`,
    stars: totalFacts ? half((found / totalFacts) * 5) : null,
    note: "Facts a teammate actually told you (checked by the app)",
    source: "measured",
  });

  // People consulted: DMs you sent, plus people you @mentioned
  const consulted = new Set<string>();
  for (const m of mine) {
    if (m.channel.startsWith("dm:")) consulted.add(m.channel.slice(3));
    for (const p of s.personas) {
      const first = p.name.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").split(/\s+/)[0];
      if (new RegExp(`@${first}\\b`, "i").test(m.text)) consulted.add(p.id);
    }
  }
  signals.push({
    id: "people",
    label: "People consulted",
    value: `${consulted.size} of ${s.personas.length}`,
    stars: half((consulted.size / Math.max(1, Math.min(s.personas.length, 5))) * 5),
    note: "Teammates you messaged directly or @mentioned",
    source: "measured",
  });

  // Curveballs: did you respond after each one?
  const curveballs = session.messages.filter((m) => m.kind === "curveball");
  if (curveballs.length > 0) {
    const answered = curveballs.filter((c) =>
      mine.some((m) => m.at > c.at && (m.channel === c.channel || m.channel === `dm:${c.from}`)),
    ).length;
    signals.push({
      id: "curveballs",
      label: "Surprises handled",
      value: `${answered} of ${curveballs.length} answered`,
      stars: half((answered / curveballs.length) * 5),
      note: "You replied after each mid-shift change",
      source: "measured",
    });
  }

  // Chain of command
  const skips = session.orgEvents.filter((e) => e.type === "skip_level").length;
  signals.push({
    id: "hierarchy",
    label: "Chain of command",
    value: skips === 0 ? "Respected" : `Bypassed manager ${skips === 1 ? "once" : `${skips} times`}`,
    stars: skips === 0 ? 5 : skips === 1 ? 2.5 : 1,
    note: "Messaging leadership directly without your manager",
    source: "measured",
  });

  // Client scope change: did you loop in your manager?
  const mgr = manager(s);
  const clientAsk = curveballs.find((c) => personaById(s, c.from)?.isExternal);
  if (clientAsk && mgr) {
    const loopedIn = mine.some((m) => m.at > clientAsk.at && (m.channel === "team" || m.channel === `dm:${mgr.id}`));
    const repliedClient = mine.some((m) => m.at > clientAsk.at && m.channel === clientAsk.channel);
    signals.push({
      id: "client",
      label: "Client request",
      value: loopedIn ? "Looped in manager" : repliedClient ? "Answered without manager" : "Not handled",
      stars: loopedIn ? 5 : repliedClient ? 2 : 1,
      note: `${personaById(s, clientAsk.from)?.name ?? "The client"} asked for a scope change`,
      source: "measured",
    });
  }

  // Code Shift: real tests
  const lastRun = session.codeRuns?.at(-1);
  if (s.codeTask && lastRun) {
    signals.push({
      id: "tests",
      label: "Hidden tests",
      value: `${lastRun.passed}/${lastRun.total} passing`,
      stars: half((lastRun.passed / Math.max(1, lastRun.total)) * 5),
      note: `${session.codeRuns!.length} test runs during the shift`,
      source: "measured",
    });
  }

  if (r) {
    signals.push({
      id: "deliverable",
      label: s.codeTask ? "Code & note quality" : "Deliverable quality",
      value: `${r.deliverable.score}/10`,
      stars: half(r.deliverable.score / 2),
      note: "Reviewed against what a senior would submit",
      source: "ai",
    });
  }

  return signals;
}
