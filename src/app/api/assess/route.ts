import { errorResponse, generateJson } from "@/lib/gemini";
import { ASSESS_SCHEMA, ASSESS_SYSTEM, assessPrompt, finalizeReport, type AssessOutput } from "@/lib/prompts/assess";
import type { Session } from "@/lib/types";

export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const session = (await request.json()) as Session;
    const { data, model } = await generateJson<AssessOutput>({
      system: ASSESS_SYSTEM,
      prompt: assessPrompt(session),
      schema: ASSESS_SCHEMA,
      effort: "high",
    });
    return Response.json({ report: finalizeReport(data, session), model });
  } catch (err) {
    return errorResponse(err);
  }
}
