// AI step 3 of 3: the ASSESSOR.
// Not a character in the company. Reads the whole transcript and the
// deliverable once, and grades against a fixed six-skill rubric with
// verbatim quotes as evidence. The overall score is computed in code.

import { personaById } from "../org";
import type { Report, Session, SkillId } from "../types";
import { SKILLS, YOU } from "../types";

export const ASSESS_SYSTEM = `You are an experienced, fair hiring manager and mentor in Pakistan. You review a fresh graduate's first simulated work shift on FirstShift and write practice feedback. This is feedback for learning, not a hiring decision.

RUBRIC: score each skill from 0 to 10
- communication: clear, concise, professional messages; tone adapted to the person's seniority; useful status updates.
- questions: asks clarifying questions about ambiguity; goes to the RIGHT person for each piece of information; uncovers what others know.
- collaboration: works with teammates, shares what they learn, handles disagreement (including a peer who is partly wrong) constructively.
- quality: the deliverable is correct and complete, uses the information discovered, catches flaws in the attachments, makes a sound recommendation.
- adaptability: responds well to the curveballs (changed deadline, changed scope).
- ownership: takes responsibility, keeps the manager informed, respects the chain of command (loops in the manager before agreeing to client scope changes; does not bypass the manager to leadership without reason), meets the deadline.

SCORE ANCHORS: 9-10 exceptional for a fresh graduate; 7-8 solid and job-ready; 5-6 developing; 3-4 weak; 0-2 not demonstrated.
If there is little evidence for a skill, score conservatively and say the evidence is limited.

FAIRNESS RULES
- Do NOT penalise non-native English, grammar, spelling, Roman Urdu or informal phrasing unless it actually makes the message unclear. Judge substance, judgment and professionalism.
- Ignore the graduate's name, gender, university and background when scoring.
- Be honest but encouraging. Every criticism must come with what to do instead.

EVIDENCE RULES
- For every skill, "evidence" is a short VERBATIM quote from the new hire's own messages or deliverable. If none exists, write exactly "No evidence in transcript".
- Moments quote the new hire verbatim.
- Never invent things the new hire did not say.

OTHER OUTPUTS
- facts: for EVERY private fact listed, say whether the deliverable actually used it, with a one-line comment.
- deliverable: score 0-10, 2-3 strengths, 2-4 issues (name any planted attachment flaw that was missed), and seniorVersion: 3-5 sentences describing what a strong senior colleague would have submitted.
- moments: 2-4 key moments (strengths and concerns) with the quote and why it mattered.
- roleFit: exactly 3 roles: the target role plus 2 adjacent roles that suit the degree, each with a 0-100 fit based only on behaviour shown in this shift.
- plan: a 4-week plan (weeks 1-4) for the graduate's REAL career after this simulation, each with a focus and 2-3 concrete actions that are free or low-cost and accessible in Pakistan (free online courses, practice datasets or exercises, mock tasks with friends, LinkedIn, university career office...). Never refer to the fictional company or its people in the plan.
- summary: 2-3 sentences.`;

export function assessPrompt(session: Session): string {
  const { scenario: s, profile, messages, revealedFactIds, orgEvents } = session;
  const revealed = new Set(revealedFactIds);

  const people = s.personas
    .map((p) => `- ${p.name}, ${p.title} (level ${p.level}${p.isExternal ? ", external" : ""}${p.id === s.managerId ? ", THE NEW HIRE'S MANAGER" : ""})`)
    .join("\n");

  const facts = s.personas
    .flatMap((p) =>
      p.privateFacts.map(
        (f) =>
          `- [${f.id}] held by ${p.name}: ${f.fact} | why it matters: ${f.whyItMatters} | discovered by the new hire: ${revealed.has(f.id) ? "YES" : "NO"}`,
      ),
    )
    .join("\n");

  const transcript = messages
    .map((m) => {
      const who =
        m.from === YOU
          ? `${profile.name} (NEW HIRE)`
          : (() => {
              const p = personaById(s, m.from);
              return p ? `${p.name} (${p.title})` : "System";
            })();
      const tag = m.kind === "curveball" ? " [CURVEBALL]" : "";
      return `[#${m.channel}]${tag} ${who}: ${m.text}`;
    })
    .join("\n");

  const events = orgEvents.length
    ? orgEvents.map((e) => `- ${e.type}: ${e.detail}`).join("\n")
    : "- none";

  return [
    `NEW HIRE: ${profile.name}, degree: ${profile.degree}, target role: ${profile.targetRole}, simulated title: ${s.graduateTitle}`,
    `COMPANY: ${s.company.name} (${s.company.industry}, ${s.company.city})`,
    `PEOPLE:\n${people}`,
    `TASK: ${s.task.title}\nBrief: ${s.task.brief}\nDeliverable expected: ${s.task.deliverable}\nDeadline: ${s.task.deadline}`,
    `ATTACHMENTS:\n${s.attachments.map((a) => `--- ${a.name}\n${a.content}`).join("\n")}`,
    `PLANTED FLAWS IN THE ATTACHMENTS:\n${s.attachmentIssues.map((x) => `- ${x}`).join("\n")}`,
    `PRIVATE FACTS:\n${facts}`,
    `HIERARCHY EVENTS DETECTED BY THE APP:\n${events}`,
    `FULL TRANSCRIPT (all channels, in order):\n${transcript || "(no messages)"}`,
    `DELIVERABLE SUBMITTED BY THE NEW HIRE:\n${session.deliverable.trim() || "(empty)"}`,
  ].join("\n\n");
}

const str = { type: "string" };

export const ASSESS_SCHEMA = {
  type: "object",
  properties: {
    summary: str,
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: SKILLS.map((k) => k.id) },
          score: { type: "integer" },
          evidence: str,
          feedback: str,
        },
        required: ["id", "score", "evidence", "feedback"],
      },
    },
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: { factId: str, usedInDeliverable: { type: "boolean" }, comment: str },
        required: ["factId", "usedInDeliverable", "comment"],
      },
    },
    deliverable: {
      type: "object",
      properties: {
        score: { type: "integer" },
        strengths: { type: "array", items: str },
        issues: { type: "array", items: str },
        seniorVersion: str,
      },
      required: ["score", "strengths", "issues", "seniorVersion"],
    },
    moments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["strength", "concern"] },
          quote: str,
          why: str,
        },
        required: ["type", "quote", "why"],
      },
    },
    roleFit: {
      type: "array",
      items: {
        type: "object",
        properties: { role: str, fit: { type: "integer" }, reason: str },
        required: ["role", "fit", "reason"],
      },
    },
    plan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "integer" },
          focus: str,
          actions: { type: "array", items: str },
        },
        required: ["week", "focus", "actions"],
      },
    },
  },
  required: ["summary", "skills", "facts", "deliverable", "moments", "roleFit", "plan"],
};

export type AssessOutput = Omit<Report, "overall" | "verdict">;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

/**
 * Overall score and verdict are computed here, not by the AI, so they're consistent and explainable.
 * Skills the shift gave no chance to show (e.g. adaptability when no curveball fired) are
 * marked "not assessed" and left out of the average instead of being guessed.
 */
export function finalizeReport(raw: AssessOutput, session: Session): Report {
  const notAssessed = new Set<SkillId>();
  if (session.firedCurveballIds.length === 0) notAssessed.add("adaptability");

  const skills = SKILLS.map(({ id }) => {
    const found = raw.skills.find((k) => k.id === id);
    if (notAssessed.has(id)) {
      return {
        id: id as SkillId,
        score: 0,
        assessed: false,
        evidence: "Not assessed",
        feedback: "No curveball happened during this shift, so this skill wasn't tested. Keep going longer next time to see how you handle change.",
      };
    }
    return {
      id: id as SkillId,
      score: clamp(found?.score ?? 0, 0, 10),
      assessed: true,
      evidence: found?.evidence ?? "No evidence in transcript",
      feedback: found?.feedback ?? "",
    };
  });
  const counted = skills.filter((k) => k.assessed);
  const overall = Math.round(
    (counted.reduce((sum, k) => sum + k.score, 0) / (counted.length * 10)) * 100,
  );
  return {
    ...raw,
    skills,
    overall,
    verdict: verdictFor(overall),
    deliverable: { ...raw.deliverable, score: clamp(raw.deliverable.score, 0, 10) },
    roleFit: raw.roleFit.slice(0, 3).map((r) => ({ ...r, fit: clamp(r.fit, 0, 100) })),
    plan: [...raw.plan].sort((a, b) => a.week - b.week).slice(0, 4),
  };
}

export function verdictFor(overall: number): string {
  if (overall >= 85) return "Standout";
  if (overall >= 70) return "Job-ready";
  if (overall >= 50) return "Getting there";
  return "Not ready yet";
}
