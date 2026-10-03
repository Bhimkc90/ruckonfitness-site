// Usage limits for the explanation endpoint, enforced on the server with a shared store. Browser state plays no part.
//
// Each request counts against three fixed windows: per client per 10 minutes, per client per day, and a global
// daily cap for the whole site. A request over any limit is refused before the AI provider is called.

export type Limits = { perClientPer10Min: number; perClientPerDay: number; globalPerDay: number };

export const DEFAULT_LIMITS: Limits = { perClientPer10Min: 5, perClientPerDay: 20, globalPerDay: 200 };

export type LimitDecision = { ok: true } | { ok: false; scope: "client" | "global"; retryAfterSeconds: number };

// Increments every counter and returns the new counts in order. Each key expires after its TTL.
export type CounterStore = { incrementAll(entries: { key: string; ttlSeconds: number }[]): Promise<number[]> };

export async function checkLimits(store: CounterStore, clientId: string, limits: Limits, now = Date.now()): Promise<LimitDecision> {
  const tenMin = Math.floor(now / 600_000);
  const day = Math.floor(now / 86_400_000);
  const counts = await store.incrementAll([
    { key: `ruckon:explain:c:${clientId}:m:${tenMin}`, ttlSeconds: 660 },
    { key: `ruckon:explain:c:${clientId}:d:${day}`, ttlSeconds: 90_000 },
    { key: `ruckon:explain:g:d:${day}`, ttlSeconds: 90_000 },
  ]);
  const untilNextWindow = (size: number) => Math.ceil((size - (now % size)) / 1000);
  if (counts[2] > limits.globalPerDay) return { ok: false, scope: "global", retryAfterSeconds: untilNextWindow(86_400_000) };
  if (counts[1] > limits.perClientPerDay) return { ok: false, scope: "client", retryAfterSeconds: untilNextWindow(86_400_000) };
  if (counts[0] > limits.perClientPer10Min) return { ok: false, scope: "client", retryAfterSeconds: untilNextWindow(600_000) };
  return { ok: true };
}

// Upstash Redis over its REST API (one atomic MULTI/EXEC per request). Reads the variable names set by the Vercel
// Marketplace Upstash integration, or Upstash's own names.
export function upstashStore(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): CounterStore | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return {
    async incrementAll(entries) {
      const commands = entries.flatMap(({ key, ttlSeconds }) => [
        ["INCR", key],
        ["EXPIRE", key, String(ttlSeconds), "NX"],
      ]);
      const response = await fetchImpl(`${url.replace(/\/$/, "")}/multi-exec`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Rate-limit store returned ${response.status}`);
      const results = (await response.json()) as { result?: unknown; error?: string }[];
      if (!Array.isArray(results) || results.length !== commands.length) throw new Error("Unexpected rate-limit store response");
      return entries.map((_, i) => {
        const value = results[i * 2]?.result;
        if (typeof value !== "number") throw new Error("Unexpected rate-limit store response");
        return value;
      });
    },
  };
}

// For local development only (`next dev`). Counts live in one server process, so this is not a production control.
export function memoryStore(): CounterStore {
  const counts = new Map<string, { value: number; expires: number }>();
  return {
    async incrementAll(entries) {
      const now = Date.now();
      return entries.map(({ key, ttlSeconds }) => {
        const current = counts.get(key);
        const next = current && current.expires > now ? { ...current, value: current.value + 1 } : { value: 1, expires: now + ttlSeconds * 1000 };
        counts.set(key, next);
        return next.value;
      });
    },
  };
}

// The client key is a salted hash of the IP address, rotated daily, so the store never holds a raw address.
export async function clientKey(ip: string, salt: string, now = Date.now()): Promise<string> {
  const day = Math.floor(now / 86_400_000);
  const bytes = new TextEncoder().encode(`${salt}|${day}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
