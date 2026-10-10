import { errorResponse, generateJson } from "@/lib/gemini";
import { SCENARIO_SCHEMA, SCENARIO_SYSTEM, scenarioPrompt } from "@/lib/prompts/scenario";
import { normalizeScenario } from "@/lib/scenario";
import type { GraduateProfile } from "@/lib/types";

export const maxDuration = 90;

const limit = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile: GraduateProfile = {
      name: limit(body.name, 60).trim() || "New hire",
      degree: limit(body.degree, 120).trim() || "Bachelor's degree",
      targetRole: limit(body.targetRole, 80).trim() || "Associate",
      background: limit(body.background, 2000),
    };

    const { data, model } = await generateJson<unknown>({
      system: SCENARIO_SYSTEM,
      prompt: scenarioPrompt(profile),
      schema: SCENARIO_SCHEMA,
      effort: "medium",
    });

    return Response.json({ profile, scenario: normalizeScenario(data), model });
  } catch (err) {
    return errorResponse(err);
  }
}
