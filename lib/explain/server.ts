import { buildFacts, type Facts } from "./facts";
import { validateAiOutput, type Explanation } from "./explanation";
import { MAX_EXPLAIN_REQUEST_BYTES, parseExplainRequest } from "./request";
import { checkLimits, clientKey, DEFAULT_LIMITS, type CounterStore, type Limits } from "./rateLimit";

// Request handling for POST /api/explain, separate from the route file so it can be tested without a provider.
// Nothing here logs request bodies, facts, or generated text; failures are logged by category only.

export const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
export const AI_TIMEOUT_MS = 15_000;
export const MAX_OUTPUT_TOKENS = 900;

export type ExplainResponse =
  | { status: "ai"; explanation: Explanation }
  | { status: "fallback"; reason: "invalid-output" | "provider-error" | "timeout" | "provider-quota" }
  | { status: "limited"; scope: "client" | "global"; retryAfterSeconds: number }
  | { status: "unavailable"; reason: "disabled" | "not-configured" }
  | { status: "rejected"; reason: "origin" | "content-type" | "too-large" | "invalid" };

export type GenerateFn = (facts: Facts, signal: AbortSignal) => Promise<unknown>;

export type ExplainDeps = {
  env: Record<string, string | undefined>;
  generate: GenerateFn;
  // Shared store for usage limits; null when none is configured.
  store: CounterStore | null;
  // Used only outside production, so `next dev` works without Redis.
  devStore: CounterStore;
  limits?: Limits;
  timeoutMs?: number;
  now?: () => number;
  logError?: (category: string) => void;
};

const json = (body: ExplainResponse, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function readLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin";
}

function clientIp(request: Request): string {
  // On Vercel, x-forwarded-for is set by the platform and cannot be supplied by the client.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function classify(error: unknown): "timeout" | "provider-quota" | "not-configured" | "invalid-output" | "provider-error" {
  const e = error as { name?: string; statusCode?: number; cause?: { statusCode?: number } } | null;
  const name = e?.name ?? "";
  const status = e?.statusCode ?? e?.cause?.statusCode;
  if (name === "AbortError" || name === "TimeoutError" || /Timeout/.test(name)) return "timeout";
  if (status === 429 || status === 402 || /RateLimit|Quota|Credit|Insufficient/i.test(name)) return "provider-quota";
  if (status === 401 || status === 403 || /Authentication/.test(name)) return "not-configured";
  if (/NoObjectGenerated|NoOutputGenerated|TypeValidation|JSONParse/.test(name)) return "invalid-output";
  return "provider-error";
}

export async function handleExplain(request: Request, deps: ExplainDeps): Promise<Response> {
  const { env } = deps;
  const log = deps.logError ?? ((category: string) => console.error(`[explain] ${category}`));

  if (env.AI_EXPLAIN !== "enabled") return json({ status: "unavailable", reason: "disabled" }, 404);
  if (!sameOrigin(request)) return json({ status: "rejected", reason: "origin" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ status: "rejected", reason: "content-type" }, 415);
  }

  const text = await readLimited(request, MAX_EXPLAIN_REQUEST_BYTES);
  if (text === null) return json({ status: "rejected", reason: "too-large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ status: "rejected", reason: "invalid" }, 400);
  }
  const parsed = parseExplainRequest(body);
  if (!parsed) return json({ status: "rejected", reason: "invalid" }, 400);

  // Production requires a shared store and a salt for client keys; otherwise the endpoint stays closed.
  const production = env.NODE_ENV === "production";
  const store = deps.store ?? (production ? null : deps.devStore);
  const salt = env.AI_RATE_LIMIT_SALT ?? (production ? undefined : "development");
  if (!store || !salt || (production && salt.length < 16)) return json({ status: "unavailable", reason: "not-configured" }, 503);

  const now = deps.now?.() ?? Date.now();
  const limits: Limits = { ...DEFAULT_LIMITS, ...(deps.limits ?? {}) };
  const daily = Number(env.AI_EXPLAIN_DAILY_LIMIT);
  if (Number.isInteger(daily) && daily > 0) limits.globalPerDay = daily;
  let decision;
  try {
    decision = await checkLimits(store, await clientKey(clientIp(request), salt, now), limits, now);
  } catch {
    log("rate-limit-store-error");
    return json({ status: "unavailable", reason: "not-configured" }, 503);
  }
  if (!decision.ok) {
    return json({ status: "limited", scope: decision.scope, retryAfterSeconds: decision.retryAfterSeconds }, 429, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }

  // Facts are recomputed here from the raw entries; nothing the browser says about points is used.
  const facts = buildFacts(parsed);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(deps.timeoutMs ?? AI_TIMEOUT_MS)]);
  let output: unknown;
  try {
    // Raced against the signal so the time limit holds even if the provider call ignores it.
    const aborted = new Promise<never>((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    output = await Promise.race([deps.generate(facts, signal), aborted]);
  } catch (error) {
    const category = classify(error);
    log(`provider-${category}`);
    if (category === "not-configured") return json({ status: "unavailable", reason: "not-configured" }, 503);
    return json({ status: "fallback", reason: category }, 200);
  }

  const checked = validateAiOutput(output, facts);
  if (!checked.ok) {
    log(`invalid-output-${checked.reason}`);
    return json({ status: "fallback", reason: "invalid-output" }, 200);
  }
  return json({ status: "ai", explanation: checked.explanation }, 200);
}
