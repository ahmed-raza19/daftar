// Server-side Gemini client.
// - Reads GEMINI_API_KEY from the environment (never sent to the browser).
// - Tries a list of models in order, so a retired preview model or a
//   per-model rate limit doesn't take the app down.
// - Asks Gemini for JSON that matches a schema, then parses it.

import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

const DEFAULT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

export class AiError extends Error {
  constructor(
    public code: "NO_KEY" | "RATE_LIMIT" | "AI_ERROR",
    message: string,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
let workingModel: string | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "NO_KEY",
      "GEMINI_API_KEY is not set. Add it to .env.local (local) or the Vercel project settings.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelOrder(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const list = [workingModel, fromEnv, ...DEFAULT_MODELS].filter(
    (m): m is string => Boolean(m),
  );
  return [...new Set(list)];
}

// How long the model may "think" before answering: low = fast chat replies,
// medium = scenario generation, high = careful grading.
type Effort = "low" | "medium" | "high";

function thinkingConfig(model: string, effort: Effort) {
  if (model.startsWith("gemini-3")) {
    const level = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH }[effort];
    return { thinkingLevel: level };
  }
  if (model.startsWith("gemini-2.5-flash")) {
    return { thinkingBudget: { low: 0, medium: 2048, high: -1 }[effort] };
  }
  return undefined;
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export interface JsonRequest {
  system: string;
  prompt: string;
  schema: object; // JSON Schema for the response
  effort?: Effort;
}

export async function generateJson<T>(req: JsonRequest): Promise<{ data: T; model: string }> {
  const ai = getClient();
  const effort = req.effort ?? "high";
  let lastError: unknown = null;
  let rateLimited = false;

  for (const model of modelOrder()) {
    let thinking = thinkingConfig(model, effort);
    // Up to 2 attempts per model: the second drops the thinking config
    // (in case this model rejects it) or retries a malformed JSON reply.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: req.prompt,
          config: {
            systemInstruction: req.system,
            responseMimeType: "application/json",
            responseJsonSchema: req.schema,
            ...(thinking ? { thinkingConfig: thinking } : {}),
          },
        });
        const text = res.text;
        if (!text) throw new Error("Empty response from Gemini");
        const data = parseJson<T>(text);
        workingModel = model;
        return { data, model };
      } catch (err) {
        lastError = err;
        if (err instanceof ApiError) {
          if (err.status === 429) {
            rateLimited = true;
            break; // try the next model, it has its own quota
          }
          if (err.status === 404) break; // model retired or unknown
          if (err.status === 400 && thinking && /thinking/i.test(err.message)) {
            thinking = undefined;
            continue;
          }
          if (err.status === 401 || err.status === 403) {
            throw new AiError("AI_ERROR", "Gemini rejected the API key. Check GEMINI_API_KEY.");
          }
          if (err.status >= 500) break; // overloaded, try the next model
          break;
        }
        if (err instanceof SyntaxError) continue; // bad JSON, retry once
        break;
      }
    }
  }

  if (rateLimited) {
    throw new AiError(
      "RATE_LIMIT",
      "Gemini's rate limit was reached. Wait a minute and try again.",
    );
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new AiError("AI_ERROR", `Gemini request failed: ${msg}`);
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AiError) {
    const status = err.code === "NO_KEY" ? 503 : err.code === "RATE_LIMIT" ? 429 : 502;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  const msg = err instanceof Error ? err.message : "Unexpected error";
  return Response.json({ error: msg, code: "AI_ERROR" }, { status: 500 });
}
