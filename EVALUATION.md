# Evaluation: does the AI grader work?

Measured on 10 October 2026 during the build, using the sample scenario (TezTokri, Junior Data Analyst) and `gemini-3-flash-preview`.

## 1. Consistency: same shift, graded repeatedly

A strong shift (9 messages across 7 channels, all 7 hidden facts marked found, a 230-word deliverable that missed one planted flaw) was graded 4 times. One of the 7 facts was marked found by the tracking bug described in section 3 (since fixed); the deliverable used that fact anyway, so it doesn't change this test.

| Run | Overall | Communication | Questions | Collaboration | Quality | Adaptability | Ownership |
|---|---|---|---|---|---|---|---|
| 1 | 90 | 9 | 10 | 9 | 8 | 10 | 8 |
| 2 | 93 | 9 | 10 | 10 | 9 | 10 | 8 |
| 3 | 90 | 9 | 10 | 9 | 8 | 10 | 8 |
| 4 | 92 | 9 | 10 | 9 | 9 | 10 | 8 |

**Overall stayed within 90–93; every individual skill varied by at most 1 point.**

## 2. Discrimination: does a weak shift score low?

A weak shift (2 low-effort messages, no questions to anyone, a 35-word "orders went up, extend it" deliverable) was graded 3 times.

| Run | Overall | Communication | Questions | Collaboration | Quality | Adaptability | Ownership |
|---|---|---|---|---|---|---|---|
| 1 | 16 | 2 | 0 | 2 | 1 | not assessed | 3 |
| 2 | 22 | 3 | 0 | 3 | 1 | not assessed | 4 |
| 3 | 18 | 2 | 0 | 3 | 1 | not assessed | 3 |

**Weak shift: 16–22 ("Not ready yet") vs strong shift: 90–93 ("Standout").**

Adaptability is "not assessed" because no curveball fired in such a short shift. Before we added this rule, the model guessed 5 in one run and 0 in another, which doubled the spread (13–25). Excluding untested skills is both fairer and more consistent.

## 3. Grounding checks

- In the strong shift, the grader caught the planted flaw the deliverable missed (the W1 DHA basket value `31.2` instead of ~3,120), without being told which one was missed.
- Every skill score quoted the graduate's own words verbatim.
- **Fact tracking bug found and fixed:** in an early test the director model claimed a teammate had revealed a fact they never actually said. Now each claimed reveal must include the exact words from the reply, and code checks those words appear in the message before the fact counts.

## Limitations and next step

- The test transcripts were written by the team during testing, not by real graduates.
- Next step: have 3–5 other participants play a shift, have a team member grade the same transcripts by hand, and compare with the AI grades.
