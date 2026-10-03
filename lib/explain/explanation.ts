import type { AftEventCode } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder } from "@/lib/aft/scoring";
import { aftEvents } from "@/lib/aft/events";
import { formatSignedPoints } from "@/lib/aft/format";
import type { Facts } from "./facts";
import { REFERENCES, getReference, type ReferenceId } from "./references";

// One shape for both the AI explanation and the standard (rule-based) one, so the page renders them the same way.
export type Explanation = {
  source: "ai" | "standard";
  summary: string;
  eventNotes: { event: AftEventCode; text: string }[];
  comparison: string;
  references: { id: ReferenceId; reason: string }[];
};

// Always shown with an explanation, whatever its source.
export const READINESS_NOTE =
  "Event points show how this test compares with the official score tables. On their own they don't measure overall fitness, health, or readiness to train. For training and any pain or injury, talk with your unit's H2F team or a medical provider.";

const names = (events: AftEventCode[]) => {
  const list = events.map((e) => aftEventInfo[e].name);
  return list.length <= 2 ? list.join(" and ") : `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
};

// Rule-based explanation from verified facts. Used when AI is off, not consented to, unavailable, or its output
// fails validation.
export function standardExplanation(facts: Facts): Explanation {
  const outcome = facts.passed
    ? `This test passes the ${facts.standardLabel} standard: every event has at least ${facts.minEventPoints} points and the total is at least ${facts.minTotalPoints}.`
    : `This test does not pass the ${facts.standardLabel} standard, which needs at least ${facts.minEventPoints} points on every event and ${facts.minTotalPoints} in total.`;
  const reasons: string[] = [];
  if (facts.failedEvents.length > 0) {
    reasons.push(`${names(facts.failedEvents)} ${facts.failedEvents.length === 1 ? "is" : "are"} below the ${facts.minEventPoints}-point event minimum.`);
  }
  if (facts.totalBelowMinimum) reasons.push(`The total is below ${facts.minTotalPoints}.`);

  const eventNotes: Explanation["eventNotes"] = [];
  if (facts.allEqual) {
    eventNotes.push({ event: facts.highest.events[0], text: `All five events scored the same, ${facts.highest.points} points each.` });
  } else {
    eventNotes.push({
      event: facts.highest.events[0],
      text: `Highest-scoring ${facts.highest.events.length > 1 ? "events (tied)" : "event"}: ${names(facts.highest.events)}, ${facts.highest.points} points.`,
    });
    eventNotes.push({
      event: facts.lowest.events[0],
      text: `Lowest-scoring ${facts.lowest.events.length > 1 ? "events (tied)" : "event"}: ${names(facts.lowest.events)}, ${facts.lowest.points} points.`,
    });
  }
  for (const event of facts.failedEvents) {
    const fact = facts.events.find((e) => e.event === event)!;
    eventNotes.push({ event, text: `${fact.name}: ${fact.rawDisplay} earned ${fact.points} points, below the ${facts.minEventPoints}-point minimum.` });
  }

  let comparison: string;
  if (!facts.comparison) {
    comparison = "There is no earlier saved test in the same scoring category, so points are not compared.";
  } else {
    const up = facts.comparison.events.filter((e) => e.pointsChange > 0).map((e) => e.event);
    const down = facts.comparison.events.filter((e) => e.pointsChange < 0).map((e) => e.event);
    const parts = [`Compared with your previous test in the same scoring category, your total changed by ${formatSignedPoints(facts.comparison.totalChange)} points.`];
    if (up.length) parts.push(`Points went up in ${names(up)}.`);
    if (down.length) parts.push(`Points went down in ${names(down)}.`);
    if (!up.length && !down.length) parts.push("Event points did not change.");
    comparison = parts.join(" ");
  }

  const references = facts.allowedReferences.map((id) => {
    const ref = getReference(id)!;
    return {
      id,
      reason:
        ref.kind === "guide"
          ? "Event standard, setup, and common faults."
          : `Library exercise the app relates to the ${aftEventInfo[ref.event].name}.`,
    };
  });

  return { source: "standard", summary: [outcome, ...reasons].join(" "), eventNotes, comparison, references };
}

// ---------------------------------------------------------------------------
// Validation of AI output
// ---------------------------------------------------------------------------

export const AI_LIMITS = { summary: 700, note: 400, comparison: 400, reason: 200, notes: 5, references: 4 };

// Names that may appear in AI text even though they contain digits or words that are otherwise blocked.
const ALLOWED_NAMES = Array.from(
  new Set([
    ...aftEventOrder.flatMap((e) => [aftEventInfo[e].name, aftEventInfo[e].shortName]),
    ...aftEvents.flatMap((e) => [e.name, e.shortName]),
    ...REFERENCES.map((r) => r.label.replace(/^AFT guide: /, "")),
    "AFT",
    "H2F",
  ])
).sort((a, b) => b.length - a.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAME_PATTERN = new RegExp(ALLOWED_NAMES.map(escape).join("|"), "gi");

const BLOCKED: { pattern: RegExp; reason: string }[] = [
  // Numbers are rendered from verified data; AI text carries none, so it cannot misstate a score.
  { pattern: /\d/, reason: "number" },
  { pattern: /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/i, reason: "number" },
  { pattern: /https?:|www\.|:\/\/|\]\(|\.(com|mil|org|gov|net|io)\b|\/[a-z]/i, reason: "link" },
  { pattern: /[<>]/, reason: "markup" },
  {
    pattern:
      /\b(sets?|reps?|repetitions?|rounds?|intervals?|per (week|day)|a week|each week|weekly|daily|every day|times a|schedule\w*|program\w*|routine\w*|plan\w*|regimen\w*|workouts?|sessions?|minutes?|seconds?|miles?|pounds?|lbs?|kilo\w*|kg|load|weight|increase (the|your) (load|weight|distance|reps))\b/i,
    reason: "prescription",
  },
  { pattern: /\b(rehab\w*|physical therap\w*|therap\w*|diagnos\w*|treat\w*|injur\w*|pain\w*|medic\w*|prescri\w*|supplement\w*)\b/i, reason: "medical" },
  {
    pattern: /\b(guarantee\w*|promis\w*|ensure\w*|definitely|certainly|will (improve|increase|raise|boost|help you (pass|score))|you'll (improve|pass|score)|sure to)\b/i,
    reason: "promise",
  },
  {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december|tomorrow|next (week|month)|by (the|your) next|before your (next )?test|deadline)\b/i,
    reason: "date",
  },
];

export function checkText(text: string, facts: Pick<Facts, "passed">): string | null {
  const stripped = text.replace(NAME_PATTERN, " ");
  for (const { pattern, reason } of BLOCKED) if (pattern.test(stripped)) return reason;
  // Pass/fail is shown from verified data; the text must not contradict it.
  if (facts.passed && /\b(fail\w*|did not pass|didn't pass|does not pass|doesn't pass|not passing)\b/i.test(stripped)) return "contradiction";
  if (!facts.passed && /\b(you passed|passed the|passes the|passing (score|result)|met every)\b/i.test(stripped)) return "contradiction";
  return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isText = (v: unknown, max: number, allowEmpty = false): v is string =>
  typeof v === "string" && v.length <= max && (allowEmpty || v.trim().length > 0);

export type ValidationResult = { ok: true; explanation: Explanation } | { ok: false; reason: string };

// Rejects the whole output on any problem; the caller then shows the standard explanation instead.
export function validateAiOutput(output: unknown, facts: Facts): ValidationResult {
  const fail = (reason: string): ValidationResult => ({ ok: false, reason });
  if (!isObject(output)) return fail("shape");
  const keys = Object.keys(output).sort().join(",");
  if (keys !== "comparison,eventNotes,references,summary") return fail("shape");
  const { summary, eventNotes, comparison, references } = output;

  if (!isText(summary, AI_LIMITS.summary)) return fail("summary");
  if (!isText(comparison, AI_LIMITS.comparison, true)) return fail("comparison");
  // Comparison text only when there is a comparable test.
  if (!facts.comparison && comparison.trim() !== "") return fail("comparison-without-history");

  if (!Array.isArray(eventNotes) || eventNotes.length > AI_LIMITS.notes) return fail("eventNotes");
  const seen = new Set<string>();
  const notes: Explanation["eventNotes"] = [];
  for (const n of eventNotes) {
    if (!isObject(n) || Object.keys(n).sort().join(",") !== "event,text") return fail("eventNotes");
    if (!aftEventOrder.includes(n.event as AftEventCode) || seen.has(n.event as string)) return fail("eventNotes");
    if (!isText(n.text, AI_LIMITS.note)) return fail("eventNotes");
    seen.add(n.event as string);
    notes.push({ event: n.event as AftEventCode, text: n.text });
  }

  if (!Array.isArray(references) || references.length > AI_LIMITS.references) return fail("references");
  const refs: Explanation["references"] = [];
  const seenRefs = new Set<string>();
  for (const r of references) {
    if (!isObject(r) || Object.keys(r).sort().join(",") !== "id,reason") return fail("references");
    if (typeof r.id !== "string" || !facts.allowedReferences.includes(r.id as ReferenceId) || seenRefs.has(r.id)) return fail("reference-id");
    if (!isText(r.reason, AI_LIMITS.reason)) return fail("references");
    seenRefs.add(r.id);
    refs.push({ id: r.id as ReferenceId, reason: r.reason });
  }

  for (const text of [summary, comparison, ...notes.map((n) => n.text), ...refs.map((r) => r.reason)]) {
    const problem = checkText(text, facts);
    if (problem) return fail(`text-${problem}`);
  }

  return { ok: true, explanation: { source: "ai", summary: summary.trim(), eventNotes: notes, comparison: comparison.trim(), references: refs } };
}
