# FirstShift

**Your first week on the job, before your first job.**

FirstShift is a multi-agent workplace simulation for fresh graduates. You join an AI-generated team at a fictional Pakistani company: a CEO, your manager, a senior colleague, a peer, someone from another department and an external client. Each of them has their own personality, authority and **private knowledge**. You only do the task well if you ask the right people the right questions, handle surprises, and respect the hierarchy. At the end, an AI reviewer grades six workplace skills, quoting your own messages as evidence.

Two ways to play:
- **Code Shift (AI/ML Engineer):** implement `classify_ticket()` in Python for a fictional Islamabad helpdesk startup, with an 8-person AI team. **Hidden tests really run in your browser**, and the QA bot files bugs from the real results. Each teammate's private fact maps to a hidden test, so asking the right people is how you get the tests green.
- **Any role:** Gemini generates a fresh company, team and task for the role you type in (or try the pre-written Data Analyst sample).

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
- **Real tests, not AI opinions:** in Code Shift the app runs the hidden test suite with Pyodide (Python in WebAssembly) in a Web Worker, so candidate code never runs on our server. The QA agent reports the actual results, and the assessor must treat them as ground truth.
- **Verified evidence:** a fact only counts as "discovered" if the teammate's reply really contains it, and a grading quote only counts if the candidate really wrote it. Both are checked in code.
- **Provider chain:** Gemini is primary; if it fails or hits its rate limit, the same request goes to Claude, then Groq (only providers with a key are used). See `src/lib/ai/`.
- **Prompt-injection guard:** transcript, deliverable and code are passed to the assessor as data; instructions inside them are ignored and recorded as a concern.
- **No model training.** We use a pre-trained model (Gemini) through its API. The AI work is persona design, prompt design, structured outputs and rubric-based grading.
- **Measured:** the same strong shift graded 4 times scored 90–93; a weak shift scored 16–22. Details in [EVALUATION.md](EVALUATION.md).

## Responsible AI

- All companies and people are **fictional**; the generator is told never to use real names or brands.
- Coworkers can be busy or wrong but are instructed never to be insulting, abusive or discriminatory.
- The assessor is told **not to penalise non-native English or Roman Urdu**, and to ignore name, gender and university.
- Every score must quote the graduate's own words. The overall score is computed by code, not the model.
- The report is **practice feedback, not a hiring decision**.
- The optional background field warns users not to enter phone numbers, CNIC or other personal data, because text is sent to the AI provider.

## Run it locally

Requirements: Node.js 20+ and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Optional backups: `ANTHROPIC_API_KEY` (Claude) and `GROQ_API_KEY` (Groq).

```bash
npm install
cp .env.example .env.local   # then put your key in GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Use **Code Shift** for the Python task with real tests, **Start my first shift** for a freshly generated company, or the **Data Analyst sample**. Pre-written scenarios start instantly; teammates still reply live through the AI.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at vercel.com → New Project.
3. Add the environment variable `GEMINI_API_KEY` (optionally `ANTHROPIC_API_KEY`, `GROQ_API_KEY`).
4. Deploy.

## Project structure

| Path | What it does |
|---|---|
| `src/lib/prompts/scenario.ts` | AI #1: org generator prompt + JSON schema |
| `src/lib/prompts/chat.ts` | AI #2: director agent prompt + JSON schema |
| `src/lib/prompts/assess.ts` | AI #3: assessor prompt, schema, score computation |
| `src/lib/org.ts` | Deterministic org rules: channels, visibility, availability, skip-level, org tree |
| `src/lib/ai/` | Provider chain (`index.ts`) and providers: Gemini (primary), Claude, Groq |
| `src/lib/code-scenario.ts` | Code Shift scenario: Rabta, 8 personas, hidden Python tests |
| `src/lib/pyrunner.ts` | Runs Python tests in the browser (Pyodide in a Web Worker) |
| `src/lib/scenario.ts` | Validates and repairs the generated scenario |
| `src/lib/sample-scenario.ts` | Hand-written sample scenario (TezTokri, Lahore) |
| `src/lib/session.ts` | Session creation, local saving, `.txt` transcript and `.json` export |
| `src/app/api/*` | API routes: `scenario`, `chat`, `assess`, `health` |
| `src/components/*` | UI: setup, workspace, code editor, org chart, report |

## Disclosure

- Built during AICON'26 Build With AI (10 October 2026).
- Started from the standard `create-next-app` template (Next.js 16).
- AI models via APIs: Google Gemini (`@google/genai`, primary), Anthropic Claude (`@anthropic-ai/sdk`, backup) and Groq (backup). No models were trained.
- Python tests run with [Pyodide](https://pyodide.org) loaded from the jsDelivr CDN.
- An AI coding assistant (Claude Code) helped write code; the team designed the product, reviewed the code and is responsible for it.
- Claude Code skills in `.claude/skills/` (reviewed before adding, guidance only, no scripts): `frontend-design` from [anthropics/skills](https://github.com/anthropics/skills) and `react-best-practices` from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills).
- The sample scenario and all generated companies and people are fictional.

## Limitations

- Sessions are stored in the browser only (no accounts or database).
- One director call voices all coworkers in a channel; a separate call per persona would isolate knowledge further but costs ~3× more API calls.
- Grading quality depends on the model; we recommend checking consistency by grading the same transcript several times and comparing with a human reviewer.
