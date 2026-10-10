// The AI provider chain: Gemini first, then Claude, then Groq.
// A provider is only tried if its key is set. If one fails or hits its
// rate limit, the same request goes to the next one, so the app keeps
// working when a single provider has a bad day.
// Override the order with AI_PROVIDERS, e.g. "claude,gemini,groq".

import "server-only";
import { claudeJson, hasClaudeKey } from "./claude";
import { geminiJson, hasGeminiKey } from "./gemini";
import { groqJson, hasGroqKey } from "./groq";
import { AiError, type JsonRequest, type JsonResult } from "./shared";

export { AiError } from "./shared";

const PROVIDERS = {
  gemini: { call: geminiJson, hasKey: hasGeminiKey },
  claude: { call: claudeJson, hasKey: hasClaudeKey },
  groq: { call: groqJson, hasKey: hasGroqKey },
} as const;

type ProviderName = keyof typeof PROVIDERS;

function providerOrder(): ProviderName[] {
  const fromEnv = (process.env.AI_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => s in PROVIDERS);
  const order = fromEnv.length > 0 ? fromEnv : (["gemini", "claude", "groq"] as ProviderName[]);
  return order.filter((name) => PROVIDERS[name].hasKey());
}

export function configuredProviders(): ProviderName[] {
  return providerOrder();
}

export async function generateJson<T>(req: JsonRequest): Promise<JsonResult<T>> {
  const order = providerOrder();
  if (order.length === 0) {
    throw new AiError(
      "NO_KEY",
      "No AI key is set. Add GEMINI_API_KEY (and optionally ANTHROPIC_API_KEY / GROQ_API_KEY) to .env.local or the Vercel settings.",
    );
  }

  const failures: AiError[] = [];
  for (const name of order) {
    try {
      return await PROVIDERS[name].call<T>(req);
    } catch (err) {
      const e = err instanceof AiError ? err : new AiError("AI_ERROR", String(err));
      console.warn(`[ai] ${name} failed: ${e.message}`);
      failures.push(e);
    }
  }

  if (failures.every((f) => f.code === "RATE_LIMIT")) {
    throw new AiError("RATE_LIMIT", "Every AI provider is rate-limited right now. Wait a minute and try again.");
  }
  throw new AiError("AI_ERROR", failures.map((f) => f.message).join(" | "));
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AiError) {
    const status = err.code === "NO_KEY" ? 503 : err.code === "RATE_LIMIT" ? 429 : 502;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  const msg = err instanceof Error ? err.message : "Unexpected error";
  return Response.json({ error: msg, code: "AI_ERROR" }, { status: 500 });
}
