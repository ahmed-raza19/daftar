import { connection } from "next/server";
import { configuredProviders } from "@/lib/ai";

// Lets the UI warn early if no AI key is set, and shows which providers are configured.
export async function GET() {
  await connection(); // read env at request time, not at build time
  const providers = configuredProviders();
  return Response.json({ hasKey: providers.length > 0, providers });
}
