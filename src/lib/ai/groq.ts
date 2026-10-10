// Groq provider (last-resort backup): fast open models through Groq's
// OpenAI-compatible chat completions endpoint.
// - Reads GROQ_API_KEY; model defaults to openai/gpt-oss-120b (override with GROQ_MODEL).
// - Uses JSON mode and puts the schema in the system prompt.

import "server-only";
import { AiError, parseJson, type JsonRequest, type JsonResult } from "./shared";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function groqJson<T>(req: JsonRequest): Promise<JsonResult<T>> {
  if (!hasGroqKey()) throw new AiError("NO_KEY", "GROQ_API_KEY is not set.");
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

  const system = `${req.system}

Respond with a single JSON object only, no prose, that matches this JSON Schema exactly (every required field present):
${JSON.stringify(req.schema)}`;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: req.prompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 16000,
      }),
    });
  } catch (err) {
    throw new AiError("AI_ERROR", `Couldn't reach Groq: ${err instanceof Error ? err.message : err}`);
  }

  if (res.status === 429) throw new AiError("RATE_LIMIT", "Groq's rate limit was reached.");
  if (res.status === 401 || res.status === 403) {
    throw new AiError("AI_ERROR", "Groq rejected the API key. Check GROQ_API_KEY.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AiError("AI_ERROR", `Groq request failed (${res.status}): ${body?.error?.message ?? "unknown error"}`);
  }
  const text: string | undefined = body?.choices?.[0]?.message?.content;
  if (!text) throw new AiError("AI_ERROR", "Groq returned an empty answer.");
  try {
    return { data: parseJson<T>(text), model: body.model ?? model, provider: "groq" };
  } catch {
    throw new AiError("AI_ERROR", "Groq returned invalid JSON.");
  }
}
