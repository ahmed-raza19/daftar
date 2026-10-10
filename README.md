# FirstShift

**Your first week on the job, before your first job.**

FirstShift is a multi-agent workplace simulation for fresh graduates. You join an AI-generated team at a fictional Pakistani company: a CEO, your manager, a senior colleague, a peer, someone from another department and an external client. Each of them has their own personality, authority and **private knowledge**. You only do the task well if you ask the right people the right questions, handle surprises, and respect the hierarchy. At the end, an AI reviewer grades six workplace skills, quoting your own messages as evidence.

Built at **AICON'26 Build With AI** (EdTech & Workforce) by **team nexora**.

---

## Problem → Input → AI → Solution → Impact

| | |
|---|---|
| **Problem** | Fresh graduates have degrees but little real work experience. They struggle with vague instructions, messy inputs, professional communication and office hierarchy. Good internships are scarce and often depend on connections. |
| **Input** | The graduate's target role, degree and (optionally) a short background. |
| **AI** | Gemini generates the company, team and task; a director agent voices every coworker; an assessor grades the shift against a rubric. |
| **Solution** | A safe 15-minute "first shift" with a realistic team, followed by a job-readiness report and a 30-day plan. |
| **Impact** | Graduates practise the job before applying. Feedback is evidence-based (quotes, not vibes), so it can also show employers what a candidate can do beyond their CGPA. |

## How the AI works

```
 profile ──► [1] ORG GENERATOR (Gemini, 1 call)
              company · 6-person hierarchy · 7 private facts · task
              attachments with 2 planted flaws · kickoff · 3 curveballs
                         │
                         ▼
 graduate message ──► ORG RULES (code, deterministic)
                      who is in the channel, what they can see,
                      who is busy, skip-level detection
                         │
                         ▼
                     [2] DIRECTOR AGENT (Gemini, 1 call per message)
                      picks who replies, writes in-character replies,
                      reveals a private fact only when asked well
                         │
                         ▼
                     ORG RULES again (code): only channel members may speak,
                      1 reply in DMs, max 2 replies, a fact counts only if
                      its holder spoke; curveballs fire top-down
                         │
 deliverable ─────────►  ▼
                     [3] ASSESSOR (Gemini, 1 call)
                      6-skill rubric, verbatim evidence, facts used,
                      deliverable review, role fit, 30-day plan
                         │
                         ▼
                     REPORT (overall score + verdict computed in code)
```

- **Information isolation:** a persona in a DM only sees the channels they belong to, never other people's DMs. The code decides this before the prompt is built.
- **Hierarchy:** levels, reporting lines and `canApprove` lists are part of every persona. Asking a peer to approve a deadline gets redirected; messaging the CEO directly triggers your manager's reaction.
- **Structured outputs:** every Gemini call returns JSON that matches a schema, and is validated/repaired in code (`src/lib/scenario.ts`, `src/app/api/chat/route.ts`).
- **No model training.** We use a pre-trained model (Gemini) through its API. The AI work is persona design, prompt design, structured outputs and rubric-based grading.

## Responsible AI

- All companies and people are **fictional**; the generator is told never to use real names or brands.
- Coworkers can be busy or wrong but are instructed never to be insulting, abusive or discriminatory.
- The assessor is told **not to penalise non-native English or Roman Urdu**, and to ignore name, gender and university.
- Every score must quote the graduate's own words. The overall score is computed by code, not the model.
- The report is **practice feedback, not a hiring decision**.
- The optional background field warns users not to enter phone numbers, CNIC or other personal data, because text is sent to the Gemini API.

## Run it locally

Requirements: Node.js 20+ and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env.local   # then put your key in GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Use **Start my first shift** for a freshly generated company, or **Try the sample shift** for a pre-written one that starts instantly (teammates still reply live through Gemini).

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at vercel.com → New Project.
3. Add the environment variable `GEMINI_API_KEY` (optionally `GEMINI_MODEL`).
4. Deploy.

## Project structure

| Path | What it does |
|---|---|
| `src/lib/prompts/scenario.ts` | AI #1: org generator prompt + JSON schema |
| `src/lib/prompts/chat.ts` | AI #2: director agent prompt + JSON schema |
| `src/lib/prompts/assess.ts` | AI #3: assessor prompt, schema, score computation |
| `src/lib/org.ts` | Deterministic org rules: channels, visibility, availability, skip-level, org tree |
| `src/lib/gemini.ts` | Server-side Gemini client with model fallback and error handling |
| `src/lib/scenario.ts` | Validates and repairs the generated scenario |
| `src/lib/sample-scenario.ts` | Hand-written sample scenario (TezTokri, Lahore) |
| `src/lib/session.ts` | Session creation, local saving, `.txt` transcript and `.json` export |
| `src/app/api/*` | API routes: `scenario`, `chat`, `assess`, `health` |
| `src/components/*` | UI: setup, workspace, org chart, report |

## Disclosure

- Built during AICON'26 Build With AI (10 October 2026).
- Started from the standard `create-next-app` template (Next.js 16).
- Uses the Google Gemini API (`@google/genai`) for all AI features.
- An AI coding assistant (Claude) helped write code; the team designed the product, reviewed the code and is responsible for it.
- The sample scenario and all generated companies and people are fictional.

## Limitations

- Sessions are stored in the browser only (no accounts or database).
- One director call voices all coworkers in a channel; a separate call per persona would isolate knowledge further but costs ~3× more API calls.
- Grading quality depends on the model; we recommend checking consistency by grading the same transcript several times and comparing with a human reviewer.
