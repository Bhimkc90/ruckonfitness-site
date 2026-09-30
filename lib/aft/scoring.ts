import type {
  AftEventCode,
  AftInput,
  AftResult,
  AgeGroup,
  EventScoreResult,
  Gender,
  ScoreRow,
} from "./types";
import { mdlStandards, hrpStandards, sdcStandards, plankStandards, twoMileRunStandards } from "./standards";
import { aftStandardRules } from "./rules";

export const aftEventOrder: AftEventCode[] = ["MDL", "HRP", "SDC", "PLK", "2MR"];

export const aftEventInfo: Record<
  AftEventCode,
  { name: string; shortName: string; unit: "pounds" | "repetitions" | "seconds"; higherIsBetter: boolean }
> = {
  MDL: { name: "3-Rep Max Deadlift", shortName: "Deadlift", unit: "pounds", higherIsBetter: true },
  HRP: { name: "Hand-Release Push-Up", shortName: "Push-Ups", unit: "repetitions", higherIsBetter: true },
  SDC: { name: "Sprint-Drag-Carry", shortName: "SDC", unit: "seconds", higherIsBetter: false },
  PLK: { name: "Plank", shortName: "Plank", unit: "seconds", higherIsBetter: true },
  "2MR": { name: "2-Mile Run", shortName: "2MR", unit: "seconds", higherIsBetter: false },
};

const eventTables: Record<AftEventCode, Record<AgeGroup, ScoreRow[]>> = {
  MDL: mdlStandards,
  HRP: hrpStandards,
  SDC: sdcStandards,
  PLK: plankStandards,
  "2MR": twoMileRunStandards,
};

export const MIN_AFT_AGE = 17;

export function getAgeGroup(age: number): AgeGroup {
  if (age <= 21) return "17-21";
  if (age <= 26) return "22-26";
  if (age <= 31) return "27-31";
  if (age <= 36) return "32-36";
  if (age <= 41) return "37-41";
  if (age <= 46) return "42-46";
  if (age <= 51) return "47-51";
  if (age <= 56) return "52-56";
  if (age <= 61) return "57-61";
  return "62+";
}

export function scoreHigherIsBetter(
  rawValue: number,
  rows: ScoreRow[],
  gender: Gender
): number {
  const sorted = [...rows].sort((a, b) => b.points - a.points);

  for (const row of sorted) {
    const requiredValue = row[gender];

    if (requiredValue !== null && rawValue >= requiredValue) {
      return row.points;
    }
  }

  return 0;
}

export function scoreLowerIsBetter(
  rawSeconds: number,
  rows: ScoreRow[],
  gender: Gender
): number {
  const sorted = [...rows].sort((a, b) => b.points - a.points);

  for (const row of sorted) {
    const requiredSeconds = row[gender];

    if (requiredSeconds !== null && rawSeconds <= requiredSeconds) {
      return row.points;
    }
  }

  return 0;
}

export function scoreEvent(
  event: AftEventCode,
  raw: number,
  ageGroup: AgeGroup,
  column: Gender
): number {
  const rows = eventTables[event][ageGroup];

  return aftEventInfo[event].higherIsBetter
    ? scoreHigherIsBetter(raw, rows, column)
    : scoreLowerIsBetter(raw, rows, column);
}

// The combat standard is sex-neutral and uses the Male | Combat column for everyone.
export function getScoreColumn(input: Pick<AftInput, "standard" | "gender">): Gender {
  if (input.standard === "combat") return "M";
  if (!input.gender) throw new Error("Sex is required for the general standard.");
  return input.gender;
}

export function scoreAft(input: AftInput): AftResult {
  if (!Number.isInteger(input.age) || input.age < MIN_AFT_AGE) {
    throw new Error(`Age must be a whole number of at least ${MIN_AFT_AGE}.`);
  }

  const ageGroup = getAgeGroup(input.age);
  const column = getScoreColumn(input);
  const rule = aftStandardRules[input.standard];

  const events: EventScoreResult[] = aftEventOrder.map((event) => ({
    event,
    raw: input.raw[event],
    points: scoreEvent(event, input.raw[event], ageGroup, column),
  }));

  const total = events.reduce((sum, item) => sum + item.points, 0);

  const failReasons = events
    .filter((item) => item.points < rule.minEventPoints)
    .map(
      (item) =>
        `${aftEventInfo[item.event].name} is below ${rule.minEventPoints} points (${item.points}).`
    );

  if (total < rule.minTotalPoints) {
    failReasons.push(`Total is below ${rule.minTotalPoints} points (${total}).`);
  }

  const highest = Math.max(...events.map((item) => item.points));
  const lowest = Math.min(...events.map((item) => item.points));

  return {
    ageGroup,
    standard: input.standard,
    column,
    events,
    total,
    passed: failReasons.length === 0,
    failReasons,
    strongest: events.filter((item) => item.points === highest),
    weakest: events.filter((item) => item.points === lowest),
  };
}

// Per-event helpers kept for existing callers; they use the sex-normed general-standard column.
export function calculateMdlScore({ age, gender, weight }: { age: number; gender: Gender; weight: number }) {
  return scoreEvent("MDL", weight, getAgeGroup(age), gender);
}

export function calculateHrpScore({ age, gender, reps }: { age: number; gender: Gender; reps: number }) {
  return scoreEvent("HRP", reps, getAgeGroup(age), gender);
}

export function calculateSdcScore({ age, gender, seconds }: { age: number; gender: Gender; seconds: number }) {
  return scoreEvent("SDC", seconds, getAgeGroup(age), gender);
}

export function calculatePlankScore({ age, gender, seconds }: { age: number; gender: Gender; seconds: number }) {
  return scoreEvent("PLK", seconds, getAgeGroup(age), gender);
}

export function calculateTwoMileRunScore({ age, gender, seconds }: { age: number; gender: Gender; seconds: number }) {
  return scoreEvent("2MR", seconds, getAgeGroup(age), gender);
}
