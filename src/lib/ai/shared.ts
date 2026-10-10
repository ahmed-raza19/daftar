// Types and helpers shared by every AI provider (Gemini, Claude, Groq).

export class AiError extends Error {
  constructor(
    public code: "NO_KEY" | "RATE_LIMIT" | "AI_ERROR",
    message: string,
  ) {
    super(message);
  }
}

// How long the model may "think" before answering: low = fast chat replies,
// medium = scenario generation, high = careful grading.
export type Effort = "low" | "medium" | "high";

export interface JsonRequest {
  system: string;
  prompt: string;
  schema: object; // JSON Schema for the response
  effort?: Effort;
  // Images / PDFs for models that can see them (base64, no data: prefix)
  files?: { name: string; mimeType: string; data: string }[];
}

/** Note for models that cannot see attached files. */
export function unseenFilesNote(req: JsonRequest): string {
  if (!req.files?.length) return "";
  return `

NOTE: the new hire also attached ${req.files.map((f) => f.name).join(", ")}, which this reviewer cannot view. Do not guess their contents.`;
}

export interface JsonResult<T> {
  data: T;
  model: string;
  provider: "gemini" | "claude" | "groq";
}

export function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
