// AI step 1 of 3: the ORG GENERATOR.
// One Gemini call turns the graduate's profile into a fictional company,
// a 6-person hierarchy with private knowledge, a task, attachments with
// planted flaws, kickoff messages and top-down curveballs.

import type { GraduateProfile } from "../types";

export const SCENARIO_SYSTEM = `You design realistic workplace simulations for Daftar, a training tool where fresh university graduates in Pakistan experience their first day at a job before they apply. Your output is a JSON scenario that a multi-agent simulation will play out. The graduate chats with AI coworkers in a Slack-like workspace for about 15 minutes, then submits a short written deliverable.

COMPANY
- Invent a fictional but plausible Pakistani company (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Peshawar, Multan...) in an industry where the graduate's target role is genuinely needed.
- Never use the names of real companies, brands, products or real public figures. Invent everything.

PEOPLE: exactly 6 personas forming a real hierarchy
1. CEO / founder: level 1, reportsTo "".
2. The graduate's direct manager: level 2, reportsTo the CEO's id. Put this persona's id in managerId.
3. A senior / lead in the same team: level 3, reportsTo the manager's id.
4. A peer at the graduate's level: level 4, reportsTo the manager's id.
5. A colleague from ANOTHER department who owns something the graduate needs (data, budget, access, approvals): level 3, reportsTo the CEO's id.
6. An external client or partner: level 0, isExternal true, reportsTo "".
- name is a realistic Pakistani FULL name (first and last name, e.g. "Sana Malik"); for the client you may add "Mr." or "Ms.". Mixed genders.
- id is the person's first name in lowercase (e.g. "sana"). All ids must be different.
- personality: how they write on Slack (length, formality, emoji, whether they mix Roman Urdu with English such as "theek hai", "jee", "bhai") and how they act under pressure. Make all six clearly different.
- goals: what they personally care about this week. Give the peer an opinion about the task that is partly wrong. Give the client a want that conflicts with the company's interest.
- canApprove: 1-3 concrete decisions they have authority over (e.g. "deadline changes" for the manager, "spending above PKR 500,000" for the CEO). The peer approves nothing important.

PRIVATE FACTS: the heart of the simulation
- Each persona holds private facts only they know: CEO 1, manager 1, senior 2, peer 1, other-department colleague 1, client 1. Seven in total, ids "f1" to "f7".
- Every fact must matter for doing the task well. At least 4 must change what a correct deliverable says (a data-quality problem, a hidden constraint, the real decision criterion, an unmentioned cost, a confounding event...).
- Facts must NOT be guessable from the brief or attachments. whyItMatters says in one sentence how a careful new hire would use the fact.

TASK
- A realistic first-week task for the target role that the graduate completes by writing 150-300 words: e.g. an analysis summary with a recommendation, a bug diagnosis and fix plan, a campaign proposal, a reply to a client, a short spec. No files or code execution.
- brief: in the manager's voice, deliberately leaving ONE important thing ambiguous that a good new hire would ask about.
- deliverable: exactly what to submit and in what shape.
- deadline: a same-day time, e.g. "Today, 5:00 PM".

ATTACHMENTS: 1 or 2 realistic work artifacts the task depends on
- kind "table": CSV with a header row and 6-14 data rows. kind "code": at most 30 lines. kind "text": an email, ticket or spec of at most 150 words.
- Plant exactly 2 subtle flaws in the attachments (a duplicated row, a unit error, an off-by-one bug, a contradictory number...). Each flaw must be ACTUALLY PRESENT in the content you wrote: someone reading the file can point to the exact row or line. Describe each in attachmentIssues, naming that row or line. Never hint at the flaws inside the attachment.
- Code must be self-consistent (define the variables it uses) apart from the planted flaw.

KICKOFF: exactly 3 messages, in this order
1. CEO welcomes the graduate by first name in channel "general" (1-2 sentences).
2. Manager assigns the task in channel "team", mentioning the attachment file name(s) (2-4 sentences, consistent with the brief).
3. Peer sends a friendly welcome in channel "dm:<peer id>" that includes their partly-wrong opinion.

CURVEBALLS: exactly 3 scripted events that flow top-down like a real company
1. afterMessages 4, from the CEO in "general": a change (meeting moved earlier, a priority shifted).
2. afterMessages 4, from the manager in "team": what that change means for the graduate (new deadline, shorter format...).
3. afterMessages 8, from the client in "client": a scope change. A good new hire should loop in their manager before agreeing.

CHANNEL IDS: "general" (all employees), "team" (manager and their reports), "client" (client and manager), "dm:<persona id>".

TONE AND SAFETY
- Realistic, respectful Pakistani office culture. People may be busy, impatient or wrong, but never insulting, abusive, harassing or discriminatory.
- Every message is short, like a real Slack message.`;

export function scenarioPrompt(p: GraduateProfile): string {
  return `Create a Daftar scenario for this graduate.

Name: ${p.name}
Degree: ${p.degree}
Target role: ${p.targetRole}
Background (optional, written by the graduate): ${p.background.trim() || "(not provided)"}

Pitch the difficulty at a fresh graduate's first week: realistic, not trivial, achievable in 15 minutes.`;
}

const str = { type: "string" };
const strArr = { type: "array", items: str };

const message = {
  type: "object",
  properties: { id: str, from: str, channel: str, text: str },
  required: ["id", "from", "channel", "text"],
};

export const SCENARIO_SCHEMA = {
  type: "object",
  properties: {
    company: {
      type: "object",
      properties: { name: str, industry: str, city: str, about: str },
      required: ["name", "industry", "city", "about"],
    },
    graduateTitle: str,
    managerId: str,
    task: {
      type: "object",
      properties: { title: str, brief: str, deliverable: str, deadline: str },
      required: ["title", "brief", "deliverable", "deadline"],
    },
    personas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          name: str,
          title: str,
          level: { type: "integer" },
          reportsTo: str,
          department: str,
          isExternal: { type: "boolean" },
          personality: str,
          goals: str,
          canApprove: strArr,
          privateFacts: {
            type: "array",
            items: {
              type: "object",
              properties: { id: str, fact: str, whyItMatters: str },
              required: ["id", "fact", "whyItMatters"],
            },
          },
        },
        required: [
          "id", "name", "title", "level", "reportsTo", "department",
          "isExternal", "personality", "goals", "canApprove", "privateFacts",
        ],
      },
    },
    attachments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          name: str,
          kind: { type: "string", enum: ["table", "code", "text"] },
          content: str,
        },
        required: ["id", "name", "kind", "content"],
      },
    },
    attachmentIssues: strArr,
    kickoff: { type: "array", items: message },
    curveballs: {
      type: "array",
      items: {
        ...message,
        properties: { ...message.properties, afterMessages: { type: "integer" } },
        required: [...message.required, "afterMessages"],
      },
    },
  },
  required: [
    "company", "graduateTitle", "managerId", "task", "personas",
    "attachments", "attachmentIssues", "kickoff", "curveballs",
  ],
};
