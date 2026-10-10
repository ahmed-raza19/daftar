import { errorResponse, generateJson } from "@/lib/ai";
import { ASSESS_SCHEMA, ASSESS_SYSTEM, assessPrompt, finalizeReport, type AssessOutput } from "@/lib/prompts/assess";
import type { Session } from "@/lib/types";

export const maxDuration = 90;

type Attachment = { name: string; mimeType: string; data: string };

export async function POST(request: Request) {
  try {
    // The session, plus any attached images/PDFs (base64) for models that can see them.
    const { attachments, ...session } = (await request.json()) as Session & { attachments?: Attachment[] };
    const files = (attachments ?? []).filter((a) => a && typeof a.data === "string" && a.data.length > 0).slice(0, 5);
    const { data, model } = await generateJson<AssessOutput>({
      system: ASSESS_SYSTEM,
      prompt: assessPrompt(session),
      schema: ASSESS_SCHEMA,
      effort: "high",
      files,
    });
    return Response.json({ report: finalizeReport(data, session), model });
  } catch (err) {
    return errorResponse(err);
  }
}
