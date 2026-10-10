// Gemini provider (primary).
// - Reads GEMINI_API_KEY from the environment (never sent to the browser).
// - Tries a list of models in order, so a retired preview model or a
//   per-model rate limit doesn't take the app down.
// - Asks Gemini for JSON that matches a schema, then parses it.

import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AiError, parseJson, type Effort, type JsonRequest, type JsonResult } from "./shared";

const DEFAULT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

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

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelOrder(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const list = [workingModel, fromEnv, ...DEFAULT_MODELS].filter(
    (m): m is string => Boolean(m),
  );
  return [...new Set(list)];
}

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

export async function geminiJson<T>(req: JsonRequest): Promise<JsonResult<T>> {
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
          contents: req.files?.length
            ? [
                {
                  role: "user",
                  parts: [
                    { text: req.prompt },
                    ...req.files.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })),
                  ],
                },
              ]
            : req.prompt,
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
        return { data, model, provider: "gemini" };
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
