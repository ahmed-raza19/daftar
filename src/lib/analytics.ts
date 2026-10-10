// Shift analytics for the report dashboard and the PDF charts.
// Everything here is computed from what happened in the session (no AI).

import { personaById } from "./org";
import type { Session } from "./types";
import { YOU } from "./types";

export interface ActivityPoint {
  minute: number; // minutes since the shift started
  sent: number; // messages the graduate sent in that minute bucket
  total: number; // messages sent so far (running total)
}

export interface Marker {
  minute: number;
  label: string;
}

export interface Analytics {
  durationMin: number;
  bucket: number; // minutes per bucket
  activity: ActivityPoint[];
  peak: ActivityPoint | null;
  markers: Marker[]; // curveballs and other notable events
  people: { id: string; name: string; title: string; count: number }[];
  intel: { found: number; total: number };
  testRuns: { run: number; passed: number; total: number }[];
}

export function shiftAnalytics(session: Session): Analytics {
  const s = session.scenario;
  const start = session.startedAt;
  const end = session.submittedAt ?? session.messages.at(-1)?.at ?? start;
  const durationMin = Math.max(1, Math.ceil((end - start) / 60000));
  // Aim for 8-15 points on the chart whatever the length of the shift.
  const bucket = durationMin <= 15 ? 1 : durationMin <= 30 ? 2 : durationMin <= 60 ? 5 : 10;
  const buckets = Math.max(2, Math.ceil(durationMin / bucket) + 1);

  const mine = session.messages.filter((m) => m.from === YOU);
  const activity: ActivityPoint[] = Array.from({ length: buckets }, (_, i) => ({ minute: i * bucket, sent: 0, total: 0 }));
  for (const m of mine) {
    const i = Math.min(buckets - 1, Math.max(0, Math.floor((m.at - start) / 60000 / bucket)));
    activity[i].sent += 1;
  }
  let running = 0;
  for (const p of activity) {
    running += p.sent;
    p.total = running;
  }
  const peak = activity.reduce<ActivityPoint | null>((best, p) => (!best || p.sent > best.sent ? p : best), null);

  const markers: Marker[] = session.messages
    .filter((m) => m.kind === "curveball")
    .map((m) => {
      const who = personaById(s, m.from);
      const label = who?.isExternal ? "Client request" : who?.level === 1 ? "CEO update" : "Deadline moved";
      return { minute: Math.max(0, (m.at - start) / 60000), label };
    });
  const skip = session.orgEvents.find((e) => e.type === "skip_level");
  if (skip) markers.push({ minute: Math.max(0, (skip.at - start) / 60000), label: "Skipped manager" });

  // Who you talked to: your DMs to them, messages in #client, plus @mentions in channels.
  const counts = new Map<string, number>();
  for (const m of mine) {
    if (m.channel.startsWith("dm:")) counts.set(m.channel.slice(3), (counts.get(m.channel.slice(3)) ?? 0) + 1);
    // A message in #client is talking to the client.
    if (m.channel === "client") {
      for (const p of s.personas.filter((x) => x.isExternal)) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
    }
    for (const p of s.personas) {
      const first = p.name.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").split(/\s+/)[0];
      if (!m.channel.startsWith("dm:") && new RegExp(`@${first}\\b`, "i").test(m.text)) {
        counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
      }
    }
  }
  const people = s.personas
    .map((p) => ({ id: p.id, name: p.name, title: p.title, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const total = s.personas.reduce((n, p) => n + p.privateFacts.length, 0);
  const testRuns = (session.codeRuns ?? []).map((r, i) => ({ run: i + 1, passed: r.passed, total: r.total }));

  return {
    durationMin,
    bucket,
    activity,
    peak: peak && peak.sent > 0 ? peak : null,
    markers,
    people,
    intel: { found: session.revealedFactIds.length, total },
    testRuns,
  };
}
