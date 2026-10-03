import type { Facts } from "./facts";
import { validateAiOutput, type Explanation } from "./explanation";
import type { ExplainRequest } from "./request";

export type ClientOutcome =
  | { kind: "ai"; explanation: Explanation }
  | { kind: "fallback"; reason: string; retry: boolean }
  | { kind: "limited"; retryAfterSeconds: number; scope: "client" | "global" }
  | { kind: "unavailable" }
  | { kind: "error" };

export const CLIENT_TIMEOUT_MS = 25_000;

// Sends only the request object (see lib/explain/request.ts). An AI explanation is validated again here against
// facts computed in this browser before it is shown.
export async function requestExplanation(request: ExplainRequest, facts: Facts, signal: AbortSignal): Promise<ClientOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.any([signal, AbortSignal.timeout(CLIENT_TIMEOUT_MS)]),
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { kind: "fallback", reason: "network", retry: true };
  }
  let body: Record<string, unknown>;
  try {
    body = await response.json();
  } catch {
    return { kind: "fallback", reason: "provider-error", retry: true };
  }
  if (body?.status === "ai" && body.explanation && typeof body.explanation === "object") {
    const { summary, eventNotes, comparison, references } = body.explanation as Record<string, unknown>;
    const checked = validateAiOutput({ summary, eventNotes, comparison, references }, facts);
    return checked.ok ? { kind: "ai", explanation: checked.explanation } : { kind: "fallback", reason: "invalid-output", retry: true };
  }
  if (body?.status === "limited") {
    const seconds = Number(body.retryAfterSeconds);
    return { kind: "limited", retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 600, scope: body.scope === "global" ? "global" : "client" };
  }
  if (body?.status === "fallback") return { kind: "fallback", reason: String(body.reason), retry: body.reason !== "provider-quota" };
  if (body?.status === "unavailable") return { kind: "unavailable" };
  return { kind: "error" };
}
