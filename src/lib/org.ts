// Deterministic org rules. These do NOT depend on the AI:
// who is in which channel, who can see which history, who is busy,
// and when the new hire skips their manager.

import type { ChannelId, ChatMessage, Persona, Scenario } from "./types";
import { YOU } from "./types";

export interface ChannelInfo {
  id: ChannelId;
  kind: "channel" | "dm";
  name: string;
  description: string;
  members: string[]; // persona ids (the graduate is always a member)
}

export function personaById(s: Scenario, id: string): Persona | undefined {
  return s.personas.find((p) => p.id === id);
}

export function manager(s: Scenario): Persona | undefined {
  return personaById(s, s.managerId);
}

export function channels(s: Scenario): ChannelInfo[] {
  const internal = s.personas.filter((p) => !p.isExternal);
  const externals = s.personas.filter((p) => p.isExternal);
  const mgr = manager(s);

  const team = internal.filter(
    (p) => p.id === s.managerId || p.reportsTo === s.managerId,
  );

  const list: ChannelInfo[] = [
    {
      id: "general",
      kind: "channel",
      name: "general",
      description: `Company-wide announcements at ${s.company.name}`,
      members: internal.map((p) => p.id),
    },
    {
      id: "team",
      kind: "channel",
      name: "team",
      description: `${mgr?.department ?? "Your"} team`,
      members: team.map((p) => p.id),
    },
  ];

  if (externals.length > 0) {
    list.push({
      id: "client",
      kind: "channel",
      name: "client",
      description: `Shared channel with ${externals.map((p) => p.name).join(", ")}`,
      members: [...externals.map((p) => p.id), s.managerId],
    });
  }

  for (const p of s.personas) {
    list.push({
      id: `dm:${p.id}`,
      kind: "dm",
      name: p.name,
      description: `${p.title}${p.isExternal ? " (external)" : ""}`,
      members: [p.id],
    });
  }
  return list;
}

export function channelInfo(s: Scenario, id: ChannelId): ChannelInfo | undefined {
  return channels(s).find((c) => c.id === id);
}

/**
 * The history a channel's members are allowed to know about.
 * - In a channel: that channel's messages.
 * - In a DM: the DM itself, plus recent messages from the channels that
 *   persona belongs to. They never see other people's DMs.
 */
export function visibleHistory(
  s: Scenario,
  messages: ChatMessage[],
  channelId: ChannelId,
  limit = 30,
): { channel: ChatMessage[]; background: ChatMessage[] } {
  const own = messages.filter((m) => m.channel === channelId).slice(-limit);
  if (!channelId.startsWith("dm:")) return { channel: own, background: [] };

  const personaId = channelId.slice(3);
  const memberOf = channels(s)
    .filter((c) => c.kind === "channel" && c.members.includes(personaId))
    .map((c) => c.id);
  const background = messages
    .filter((m) => memberOf.includes(m.channel))
    .slice(-12);
  return { channel: own, background };
}

export type Availability = "online" | "busy" | "external";

export function availability(p: Persona): Availability {
  if (p.isExternal) return "external";
  if (p.level === 1) return "busy";
  return "online";
}

export function availabilityLabel(p: Persona): string {
  const a = availability(p);
  if (a === "busy") return "In meetings";
  if (a === "external") return "External";
  return "Online";
}

/** Simulated reply delay: senior people answer slower. */
export function replyDelayMs(p: Persona | undefined, text: string): number {
  const base = 700 + Math.min(text.length * 12, 1800);
  if (!p) return base;
  if (p.level === 1) return base + 1800;
  if (p.isExternal) return base + 900;
  if (p.level === 2) return base + 500;
  return base;
}

/**
 * Skip-level contact: the new hire messages someone above their manager
 * (e.g. the CEO) directly. Real teams expect you to loop your manager in.
 */
export function isSkipLevel(s: Scenario, channelId: ChannelId): boolean {
  if (!channelId.startsWith("dm:")) return false;
  const target = personaById(s, channelId.slice(3));
  const mgr = manager(s);
  if (!target || !mgr || target.isExternal || target.id === mgr.id) return false;
  return target.level < mgr.level;
}

export function levelLabel(p: Persona): string {
  if (p.isExternal) return "External";
  switch (p.level) {
    case 1:
      return "Leadership";
    case 2:
      return "Manager";
    case 3:
      return "Senior";
    default:
      return "Peer";
  }
}

export interface OrgNode {
  id: string; // persona id or YOU
  children: OrgNode[];
}

/** Builds the reporting tree. The graduate is inserted under their manager. */
export function orgTree(s: Scenario): OrgNode[] {
  const internal = s.personas.filter((p) => !p.isExternal);
  const build = (id: string): OrgNode => {
    const children = internal
      .filter((p) => p.reportsTo === id)
      .sort((a, b) => a.level - b.level)
      .map((p) => build(p.id));
    if (id === s.managerId) children.push({ id: YOU, children: [] });
    return { id, children };
  };
  const ids = new Set(internal.map((p) => p.id));
  return internal
    .filter((p) => !p.reportsTo || !ids.has(p.reportsTo))
    .sort((a, b) => a.level - b.level)
    .map((p) => build(p.id));
}

const AVATAR_COLORS = [
  "#0f766e",
  "#7c3aed",
  "#c2410c",
  "#2563eb",
  "#be185d",
  "#4d7c0f",
  "#b45309",
  "#0e7490",
];

export function avatarColor(s: Scenario, id: string): string {
  if (id === YOU) return "#334155";
  const i = s.personas.findIndex((p) => p.id === id);
  return AVATAR_COLORS[(i < 0 ? 0 : i) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").split(/\s+/);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}
