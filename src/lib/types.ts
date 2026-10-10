// Shared data shapes for FirstShift.
// A "scenario" is the fictional company + team + task that Gemini generates.
// A "session" is one graduate playing through one scenario.

export interface GraduateProfile {
  name: string;
  degree: string;
  targetRole: string;
  background: string; // optional free text / CV summary
}

export interface PrivateFact {
  id: string; // e.g. "f1"
  fact: string; // what only this persona knows
  whyItMatters: string; // why a careful new hire needs it
}

export interface Persona {
  id: string; // short slug, e.g. "sana"
  name: string;
  title: string;
  // 1 = CEO, 2 = graduate's manager / dept head, 3 = senior / lead, 4 = same level as the graduate.
  // 0 = external (client / partner, outside the company hierarchy).
  level: number;
  reportsTo: string | null; // persona id of their boss, null for CEO and externals
  department: string;
  isExternal: boolean;
  personality: string; // how they write and behave at work
  goals: string; // what they care about this week
  canApprove: string[]; // decisions this person has authority over
  privateFacts: PrivateFact[];
}

export interface Attachment {
  id: string;
  name: string; // e.g. "orders_weekly.csv"
  kind: "table" | "code" | "text";
  content: string; // CSV for tables, source for code, plain text otherwise
}

export interface ScriptedMessage {
  id: string;
  from: string; // persona id
  channel: string; // channel id
  text: string;
}

export interface Curveball extends ScriptedMessage {
  afterMessages: number; // fires after the graduate has sent this many messages
}

export interface Scenario {
  company: { name: string; industry: string; city: string; about: string };
  graduateTitle: string; // the job title the graduate holds in the simulation
  managerId: string; // persona id of the graduate's direct manager
  task: {
    title: string;
    brief: string;
    deliverable: string; // what to submit, in what format
    deadline: string;
  };
  personas: Persona[];
  attachments: Attachment[];
  attachmentIssues: string[]; // hidden flaws planted in the attachments
  kickoff: ScriptedMessage[];
  curveballs: Curveball[];
}

export type ChannelId = string; // "general" | "team" | "client" | `dm:${personaId}`

export const YOU = "you";
export const SYSTEM = "system";

export interface ChatMessage {
  id: string;
  channel: ChannelId;
  from: string; // persona id, YOU or SYSTEM
  text: string;
  at: number;
  kind?: "normal" | "curveball" | "orgEvent";
}

export interface OrgEvent {
  type: "skip_level";
  at: number;
  detail: string;
}

export const SKILLS = [
  { id: "communication", label: "Communication" },
  { id: "questions", label: "Asking the right questions" },
  { id: "collaboration", label: "Collaboration" },
  { id: "quality", label: "Quality of work" },
  { id: "adaptability", label: "Adaptability" },
  { id: "ownership", label: "Ownership & hierarchy sense" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];

export interface SkillScore {
  id: SkillId;
  score: number; // 0-10
  evidence: string; // verbatim quote from the graduate, or "No evidence in transcript"
  feedback: string;
}

export interface Report {
  overall: number; // 0-100, computed in code from the skill scores
  verdict: string; // computed in code from overall
  summary: string;
  skills: SkillScore[];
  facts: { factId: string; usedInDeliverable: boolean; comment: string }[];
  deliverable: {
    score: number; // 0-10
    strengths: string[];
    issues: string[];
    seniorVersion: string;
  };
  moments: { type: "strength" | "concern"; quote: string; why: string }[];
  roleFit: { role: string; fit: number; reason: string }[];
  plan: { week: number; focus: string; actions: string[] }[];
}

export interface Session {
  version: 1;
  id: string;
  source: "generated" | "sample";
  profile: GraduateProfile;
  scenario: Scenario;
  messages: ChatMessage[];
  revealedFactIds: string[];
  factQuotes?: Record<string, string>; // fact id -> the words a teammate used to reveal it
  firedCurveballIds: string[];
  orgEvents: OrgEvent[];
  deliverable: string;
  startedAt: number;
  submittedAt?: number;
  report?: Report;
}
