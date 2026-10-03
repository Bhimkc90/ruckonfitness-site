import type { AftEventCode, AftStandard, AgeGroup, Gender } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder, scoreEvent } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { columnLabel, describeRawChange, formatRaw } from "@/lib/aft/format";
import type { ExplainRequest } from "./request";
import { referencesFor, type ReferenceId } from "./references";

// Everything an explanation may state, recomputed from the raw entries with the app's scoring engine. The
// server builds these from the request rather than trusting points sent by the browser, and the page renders
// every number from them, never from AI text.

export type EventFact = {
  event: AftEventCode;
  name: string;
  raw: number;
  rawDisplay: string;
  points: number;
  meetsMinimum: boolean;
};

export type EventChange = {
  event: AftEventCode;
  pointsChange: number;
  rawChange: number;
  rawChangeText: string;
  improved: boolean | null;
};

export type Facts = {
  standard: AftStandard;
  standardLabel: string;
  ageGroup: AgeGroup;
  column: Gender;
  columnLabel: string;
  minEventPoints: number;
  minTotalPoints: number;
  events: EventFact[];
  total: number;
  passed: boolean;
  failedEvents: AftEventCode[];
  totalBelowMinimum: boolean;
  // Ties included. When every event has the same points, both lists hold all five.
  highest: { events: AftEventCode[]; points: number };
  lowest: { events: AftEventCode[]; points: number };
  allEqual: boolean;
  // Only against the previous test in the same scoring category; null when there is none.
  comparison: { totalChange: number; events: EventChange[] } | null;
  // Events an explanation should focus on: failed events, otherwise the lowest-scoring ones.
  focusEvents: AftEventCode[];
  allowedReferences: ReferenceId[];
};

export function buildFacts(request: ExplainRequest): Facts {
  const rule = aftStandardRules[request.standard];
  const score = (raw: ExplainRequest["raw"]) =>
    aftEventOrder.map((event) => ({ event, raw: raw[event], points: scoreEvent(event, raw[event], request.ageGroup, request.column) }));

  const scored = score(request.raw);
  const events: EventFact[] = scored.map((e) => ({
    event: e.event,
    name: aftEventInfo[e.event].name,
    raw: e.raw,
    rawDisplay: formatRaw(e.event, e.raw),
    points: e.points,
    meetsMinimum: e.points >= rule.minEventPoints,
  }));
  const total = events.reduce((sum, e) => sum + e.points, 0);
  const failedEvents = events.filter((e) => !e.meetsMinimum).map((e) => e.event);
  const totalBelowMinimum = total < rule.minTotalPoints;
  const high = Math.max(...events.map((e) => e.points));
  const low = Math.min(...events.map((e) => e.points));
  const lowestEvents = events.filter((e) => e.points === low).map((e) => e.event);

  let comparison: Facts["comparison"] = null;
  if (request.previousRaw) {
    const before = score(request.previousRaw);
    const beforeTotal = before.reduce((sum, e) => sum + e.points, 0);
    comparison = {
      totalChange: total - beforeTotal,
      events: scored.map((e, i) => {
        const rawChange = e.raw - before[i].raw;
        const described = describeRawChange(e.event, rawChange);
        return { event: e.event, pointsChange: e.points - before[i].points, rawChange, rawChangeText: described.text, improved: described.improved };
      }),
    };
  }

  const focusEvents = failedEvents.length > 0 ? failedEvents : lowestEvents;
  return {
    standard: request.standard,
    standardLabel: rule.label,
    ageGroup: request.ageGroup,
    column: request.column,
    columnLabel: columnLabel(request.column),
    minEventPoints: rule.minEventPoints,
    minTotalPoints: rule.minTotalPoints,
    events,
    total,
    passed: failedEvents.length === 0 && !totalBelowMinimum,
    failedEvents,
    totalBelowMinimum,
    highest: { events: events.filter((e) => e.points === high).map((e) => e.event), points: high },
    lowest: { events: lowestEvents, points: low },
    allEqual: high === low,
    comparison,
    focusEvents,
    allowedReferences: referencesFor(focusEvents).map((r) => r.id),
  };
}
