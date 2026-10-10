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
