// Claude provider (first backup).
// - Reads ANTHROPIC_API_KEY; model defaults to claude-opus-5-5 (override with ANTHROPIC_MODEL).
// - Structured outputs: output_config.format with our JSON schema.
// - Server-side refusal fallback ("default") is enabled, so if Claude declines
//   for safety reasons, Anthropic re-runs the request on another Claude model.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiError, parseJson, type JsonRequest, type JsonResult } from "./shared";

let client: Anthropic | null = null;

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Claude's structured outputs need additionalProperties: false on every object. */
function strictSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) out[k] = strictSchema(v);
  if (out.type === "object") out.additionalProperties = false;
  return out;
}

export async function claudeJson<T>(req: JsonRequest): Promise<JsonResult<T>> {
  if (!hasClaudeKey()) throw new AiError("NO_KEY", "ANTHROPIC_API_KEY is not set.");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";

  try {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: req.system,
      messages: [
        {
          role: "user",
          content: [
            ...(req.files ?? []).map((f) =>
              f.mimeType === "application/pdf"
                ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } } as const)
                : ({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: f.mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                      data: f.data,
                    },
                  } as const),
            ),
            { type: "text", text: req.prompt },
          ],
        },
      ],
      output_config: {
        effort: req.effort ?? "high",
        format: { type: "json_schema", schema: strictSchema(req.schema) as Record<string, unknown> },
      },
    });

    if (res.stop_reason === "refusal") {
      throw new AiError("AI_ERROR", "Claude declined this request.");
    }
    if (res.stop_reason === "max_tokens") {
      throw new AiError("AI_ERROR", "Claude's answer was cut off.");
    }
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    return { data: parseJson<T>(text), model: res.model, provider: "claude" };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiError("RATE_LIMIT", "Claude's rate limit was reached.");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiError("AI_ERROR", "Claude rejected the API key. Check ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiError("AI_ERROR", `Claude request failed (${err.status}): ${err.message}`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new AiError("AI_ERROR", `Claude request failed: ${msg}`);
  }
}
