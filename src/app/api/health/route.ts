import { connection } from "next/server";
import { hasApiKey } from "@/lib/gemini";

// Lets the UI warn early if the Gemini key is missing.
export async function GET() {
  await connection(); // read env at request time, not at build time
  return Response.json({ hasKey: hasApiKey() });
}
