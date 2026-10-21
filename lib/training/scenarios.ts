import { scoreAft } from "@/lib/aft/scoring";
import type { AftEventCode, AftInput } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder } from "@/lib/aft/scoring";
import type { BaselineSnapshot, Preferences } from "./types";

// Synthetic AFT baselines, one or more for every failure pattern, for the reviewer scenario page
// (/training-plan/scenarios). The results are made up, scored by the real scoring engine, and never saved:
// the page builds plans in memory and writes nothing to AFT history, training plans, or the dashboard.

const t = (m: number, s: number) => m * 60 + s;

// Age 25, male, general standard. Each value's points are checked by lib/training/pathways.test.ts.
const PASS: Record<AftEventCode, number> = { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30) };
// Far below the minimum (0–40 points).
const FAIL: Record<AftEventCode, number> = { MDL: 120, HRP: 8, SDC: t(3, 30), PLK: t(0, 50), "2MR": t(24, 0) };
// Just below the minimum (40–59 points).
const NEAR: Record<AftEventCode, number> = { MDL: 140, HRP: 10, SDC: t(2, 45), PLK: t(1, 15), "2MR": t(20, 0) };
// About 100 points.
const HIGH: Record<AftEventCode, number> = { MDL: 350, HRP: 60, SDC: t(1, 30), PLK: t(3, 40), "2MR": t(13, 30) };

export const SCENARIO_START = "2026-10-05"; // a Monday

export type ScenarioGroup = "No failure" | "One event failed" | "High total, one event failed" | "Total only" | "Two events failed" | "Three or more events failed";

export type Scenario = {
  id: string;
  group: ScenarioGroup;
  label: string;
  description: string;
  input: AftInput;
  prefs?: Partial<Preferences>;
};

export const DEFAULT_SCENARIO_PREFS: Preferences = {
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 45,
  equipment: ["kettlebell"],
  runningAccess: true,
  experience: "some",
  recentRunning: "31-60",
  restrictions: [],
};

const name = (e: AftEventCode) => aftEventInfo[e].shortName;

function general(base: Record<AftEventCode, number>, overrides: Partial<Record<AftEventCode, number>>): AftInput {
  return { age: 25, standard: "general", gender: "M", raw: { ...base, ...overrides } };
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]));
}

function failing(events: AftEventCode[], values = FAIL): Partial<Record<AftEventCode, number>> {
  return Object.fromEntries(events.map((e) => [e, values[e]]));
}

function build(): Scenario[] {
  const list: Scenario[] = [
    { id: "none-failed", group: "No failure", label: "Every event passed", description: "Passes everything; the two lowest-scoring events are developed.", input: general(PASS, {}) },
  ];
  for (const e of aftEventOrder) {
    list.push({ id: `single-${e}`, group: "One event failed", label: `${name(e)} only failed`, description: `${aftEventInfo[e].name} far below the minimum; every other event passes.`, input: general(PASS, failing([e])) });
  }
  for (const e of aftEventOrder) {
    list.push({
      id: `high-${e}`,
      group: "High total, one event failed",
      label: `High total, ${name(e)} failed`,
      description: `Every other event near 100 points, so the total is high, but the ${aftEventInfo[e].name.toLowerCase()} is just below the minimum.`,
      input: general(HIGH, failing([e], NEAR)),
    });
  }
  list.push({
    id: "total-only",
    group: "Total only",
    label: "Combat total below 350",
    description: "Combat standard: every event is at least 60 points but the total is below 350. (On the general standard the total can't fail if every event passes: 5 × 60 = 300.)",
    input: { age: 25, standard: "combat", gender: "M", raw: { MDL: 200, HRP: 25, SDC: t(2, 20), PLK: t(1, 40), "2MR": t(19, 30) } },
  });
  for (const pair of combinations(aftEventOrder, 2)) {
    list.push({ id: `pair-${pair.join("-")}`, group: "Two events failed", label: `${pair.map(name).join(" + ")} failed`, description: "Both far below the minimum; the other three events pass.", input: general(PASS, failing(pair)) });
  }
  for (const k of [3, 4, 5]) {
    for (const set of combinations(aftEventOrder, k)) {
      list.push({ id: `multiple-${set.join("-")}`, group: "Three or more events failed", label: `${set.map(name).join(" + ")} failed`, description: `${k} events far below the minimum.`, input: general(PASS, failing(set)) });
    }
  }
  list.push({
    id: "multiple-near-MDL-HRP-PLK",
    group: "Three or more events failed",
    label: "Deadlift + Push-Ups + Plank just below, regular trainee",
    description: "Small gaps (40–59 points) and regular training: compare with the far-below version to see that workload doesn't change yet.",
    input: general(PASS, failing(["MDL", "HRP", "PLK"], NEAR)),
    prefs: { experience: "regular", recentRunning: "61-120" },
  });
  list.push({
    id: "multiple-all-new",
    group: "Three or more events failed",
    label: "All five failed, new to training",
    description: "Every event far below the minimum, new or returning to training, little recent running.",
    input: general(PASS, failing(aftEventOrder)),
    prefs: { experience: "new", recentRunning: "up-to-30" },
  });
  return list;
}

export const SCENARIOS: Scenario[] = build();

export function scenarioBaseline(scenario: Scenario): BaselineSnapshot {
  return { resultId: `scenario-${scenario.id}`, testDate: SCENARIO_START, input: scenario.input, result: scoreAft(scenario.input) };
}

export const SCENARIO_WEEKDAYS: Record<Preferences["daysPerWeek"], Preferences["weekdays"]> = {
  2: ["tue", "sat"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "sat"],
  5: ["mon", "tue", "wed", "fri", "sat"],
};
