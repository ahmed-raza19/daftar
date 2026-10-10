import { errorResponse, generateJson } from "@/lib/ai";
import { REVIEW_SCHEMA, REVIEW_SYSTEM, reviewPrompt } from "@/lib/prompts/review";
import type { Session } from "@/lib/types";

export const maxDuration = 60;

// Returns the 3 questions the manager asks about the submitted work.
export async function POST(request: Request) {
  try {
    const session = (await request.json()) as Session;
    const { data } = await generateJson<{ questions: string[] }>({
      system: REVIEW_SYSTEM,
      prompt: reviewPrompt(session),
      schema: REVIEW_SCHEMA,
      effort: "medium",
    });
    const questions = (data.questions ?? [])
      .map((q) => String(q).trim())
      .filter(Boolean)
      .slice(0, 3);
    if (questions.length === 0) throw new Error("No review questions were generated.");
    return Response.json({ questions });
  } catch (err) {
    return errorResponse(err);
  }
}
