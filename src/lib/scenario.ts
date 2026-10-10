// Validates and repairs a scenario returned by Gemini so the rest of the
// app can trust its shape (ids exist, channels are valid, the manager exists...).

import type { Attachment, Curveball, Persona, Scenario, ScriptedMessage } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const slug = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/^(mr|ms|mrs|dr)\.?\s+/, "")
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "");

const asString = (v: any, fallback = "") => (typeof v === "string" ? v : fallback);
const asStrings = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export function normalizeScenario(raw: any): Scenario {
  if (!raw || !Array.isArray(raw.personas) || raw.personas.length < 3) {
    throw new Error("Scenario is missing its team.");
  }

  // Personas, with unique ids
  const used = new Set<string>();
  const idMap = new Map<string, string>(); // anything the AI might use -> final id
  const personas: Persona[] = raw.personas.map((p: any, i: number) => {
    let id = slug(p.id) || slug(p.name) || `p${i + 1}`;
    while (used.has(id)) id = `${id}${i + 1}`;
    used.add(id);
    for (const key of [p.id, p.name, slug(p.name)]) {
      if (typeof key === "string" && key) idMap.set(key.toLowerCase(), id);
    }
    return {
      id,
      name: asString(p.name, `Colleague ${i + 1}`),
      title: asString(p.title, "Team member"),
      level: Number.isFinite(Number(p.level)) ? Math.round(Number(p.level)) : 4,
      reportsTo: asString(p.reportsTo) || null,
      department: asString(p.department, "General"),
      isExternal: Boolean(p.isExternal) || Number(p.level) === 0,
      personality: asString(p.personality),
      goals: asString(p.goals),
      canApprove: asStrings(p.canApprove),
      privateFacts: Array.isArray(p.privateFacts) ? p.privateFacts : [],
    };
  });

  const resolve = (ref: any): string | null => {
    if (typeof ref !== "string" || !ref) return null;
    return idMap.get(ref.toLowerCase()) ?? idMap.get(slug(ref)) ?? null;
  };

  // Fix reporting lines and levels
  for (const p of personas) {
    p.reportsTo = p.isExternal ? null : resolve(p.reportsTo);
    if (p.reportsTo === p.id) p.reportsTo = null;
    if (p.isExternal) p.level = 0;
  }

  // Private facts, with globally unique ids
  let factN = 0;
  for (const p of personas) {
    p.privateFacts = (p.privateFacts as any[])
      .filter((f) => f && typeof f.fact === "string")
      .map((f) => ({
        id: `f${++factN}`,
        fact: f.fact,
        whyItMatters: asString(f.whyItMatters),
      }));
  }

  // Manager
  let managerId = resolve(raw.managerId);
  if (!managerId || personas.find((p) => p.id === managerId)?.isExternal) {
    managerId =
      personas.find((p) => !p.isExternal && p.level === 2)?.id ??
      personas.find((p) => !p.isExternal)?.id ??
      personas[0].id;
  }

  const fixChannel = (ch: any, from: string): string => {
    const c = asString(ch).trim().replace(/^#/, "").toLowerCase();
    if (c === "general" || c === "team") return c;
    if (c === "client" && personas.some((p) => p.isExternal)) return "client";
    const dm = c.match(/^dm[:\-_ ](.+)$/);
    if (dm) {
      const target = resolve(dm[1]);
      if (target) return `dm:${target}`;
    }
    const sender = personas.find((p) => p.id === from);
    if (sender?.isExternal) return "client";
    if (sender?.id === managerId) return "team";
    return `dm:${from}`;
  };

  const fixMessage = (m: any, i: number, prefix: string): ScriptedMessage | null => {
    const from = resolve(m?.from);
    const text = asString(m?.text).trim();
    if (!from || !text) return null;
    return { id: `${prefix}${i + 1}`, from, channel: fixChannel(m.channel, from), text };
  };

  const kickoff = (Array.isArray(raw.kickoff) ? raw.kickoff : [])
    .map((m: any, i: number) => fixMessage(m, i, "k"))
    .filter(Boolean) as ScriptedMessage[];

  const curveballs = (Array.isArray(raw.curveballs) ? raw.curveballs : [])
    .map((m: any, i: number) => {
      const base = fixMessage(m, i, "c");
      if (!base) return null;
      const after = Math.max(1, Math.round(Number(m.afterMessages) || 4));
      return { ...base, afterMessages: after };
    })
    .filter(Boolean) as Curveball[];

  const attachments: Attachment[] = (Array.isArray(raw.attachments) ? raw.attachments : [])
    .filter((a: any) => a && typeof a.content === "string")
    .map((a: any, i: number) => ({
      id: `a${i + 1}`,
      name: asString(a.name, `attachment-${i + 1}.txt`),
      kind: ["table", "code", "text"].includes(a.kind) ? a.kind : "text",
      content: a.content,
    }));

  return {
    company: {
      name: asString(raw.company?.name, "Your new company"),
      industry: asString(raw.company?.industry),
      city: asString(raw.company?.city, "Lahore"),
      about: asString(raw.company?.about),
    },
    graduateTitle: asString(raw.graduateTitle, "Associate"),
    managerId,
    task: {
      title: asString(raw.task?.title, "Your first task"),
      brief: asString(raw.task?.brief),
      deliverable: asString(raw.task?.deliverable),
      deadline: asString(raw.task?.deadline, "Today, 5:00 PM"),
    },
    personas,
    attachments,
    attachmentIssues: asStrings(raw.attachmentIssues),
    kickoff,
    curveballs,
  };
}
