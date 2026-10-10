// Browser-side helper for calling our API routes.

export class ApiCallError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiCallError("NETWORK", "Couldn't reach the server. Check your internet connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiCallError(data.code ?? "AI_ERROR", data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
