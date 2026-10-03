import type { AftEventCode, AftRawScores, AftResult, AftStandard, AgeGroup, Gender } from "@/lib/aft/types";
import { aftEventOrder } from "@/lib/aft/scoring";
import { ageGroups } from "@/lib/aft/standards";
import { RAW_LIMITS, isWithin } from "@/lib/aft/limits";

// The only data "Explain my results" sends: the scoring category (standard, age band, score column) and raw
// event results for the selected test and, when there is one, the previous test in the same category.
// No exact age, birth date, test dates, record IDs, names, notes, or profile fields.

export const EXPLAIN_REQUEST_VERSION = 1;
export const MAX_EXPLAIN_REQUEST_BYTES = 2048;

export type ExplainRequest = {
  v: typeof EXPLAIN_REQUEST_VERSION;
  standard: AftStandard;
  ageGroup: AgeGroup;
  column: Gender;
  raw: AftRawScores;
  previousRaw: AftRawScores | null;
};

const rawOf = (result: AftResult): AftRawScores =>
  Object.fromEntries(aftEventOrder.map((e) => [e, result.events.find((x) => x.event === e)!.raw])) as AftRawScores;

// Keys are always written in the same order, so the serialized request doubles as a fingerprint of the result
// being explained: when an entry, the category, or the comparable test changes, so does the fingerprint.
export function buildExplainRequest(result: AftResult, previousComparable: AftResult | null): ExplainRequest {
  return {
    v: EXPLAIN_REQUEST_VERSION,
    standard: result.standard,
    ageGroup: result.ageGroup,
    column: result.column,
    raw: rawOf(result),
    previousRaw: previousComparable ? rawOf(previousComparable) : null,
  };
}

export const fingerprint = (request: ExplainRequest) => JSON.stringify(request);

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));

function parseRaw(v: unknown): AftRawScores | null {
  if (!isObject(v) || !exactKeys(v, aftEventOrder)) return null;
  for (const e of aftEventOrder) if (!isWithin(v[e], RAW_LIMITS[e].min, RAW_LIMITS[e].max)) return null;
  return Object.fromEntries(aftEventOrder.map((e) => [e, v[e]])) as Record<AftEventCode, number>;
}

// Strict: unknown keys, wrong types, out-of-range values, or a combat request on the female column are rejected.
export function parseExplainRequest(value: unknown): ExplainRequest | null {
  if (!isObject(value) || !exactKeys(value, ["v", "standard", "ageGroup", "column", "raw", "previousRaw"])) return null;
  if (value.v !== EXPLAIN_REQUEST_VERSION) return null;
  if (value.standard !== "general" && value.standard !== "combat") return null;
  if (!ageGroups.includes(value.ageGroup as AgeGroup)) return null;
  if (value.column !== "M" && value.column !== "F") return null;
  // The combat standard is sex-neutral and always uses the Male | Combat column.
  if (value.standard === "combat" && value.column !== "M") return null;
  const raw = parseRaw(value.raw);
  if (!raw) return null;
  let previousRaw: AftRawScores | null = null;
  if (value.previousRaw !== null) {
    previousRaw = parseRaw(value.previousRaw);
    if (!previousRaw) return null;
  }
  return {
    v: EXPLAIN_REQUEST_VERSION,
    standard: value.standard,
    ageGroup: value.ageGroup as AgeGroup,
    column: value.column,
    raw,
    previousRaw,
  };
}
