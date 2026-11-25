import { formatSeconds } from "@/lib/aft/validation";
import { getExercise } from "@/lib/library";
import type { ActualPerformance, WorkoutExercise, WorkoutRest, WorkoutSetUnit, WorkoutTarget } from "./types";

// Plain-language text for tracked workouts. Everything shown comes from the frozen snapshot; nothing is added.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatDuration(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) return plural(seconds / 60, "minute");
  if (seconds < 60) return plural(seconds, "second");
  return formatSeconds(seconds);
}

export function formatTarget(t: WorkoutTarget): string {
  switch (t.kind) {
    case "reps":
      return `${t.upTo ? "Up to " : ""}${plural(t.reps, "rep")}${t.secondsEach ? `, ${t.secondsEach} seconds each` : ""}`;
    case "rep-range":
      return `${t.min}–${t.max} reps`;
    case "hold":
      return `Hold ${t.upTo ? "up to " : ""}${formatDuration(t.seconds)}`;
    case "hold-range":
      return `Hold ${t.minSeconds}–${t.maxSeconds} seconds`;
    case "duration":
      return formatDuration(t.seconds);
    case "interval":
      return `${formatDuration(t.workSeconds)} ${t.work}, then ${formatDuration(t.recoverySeconds)} ${t.recovery}`;
    case "distance":
      return `${t.meters} meters (${t.description.replace(/\.$/, "")})`;
    case "as-prescribed":
      return t.text;
  }
}

const unitWords: Record<WorkoutSetUnit, string> = { set: "Set", round: "Round", hold: "Hold", repeat: "Repeat" };
export const setLabel = (unit: WorkoutSetUnit, number: number) => `${unitWords[unit]} ${number}`;

export function formatRest(rest: WorkoutRest): string {
  // In seconds, as the plan writes rest ("90 seconds", "60–90 seconds").
  const time = rest.minSeconds === rest.maxSeconds ? plural(rest.minSeconds, "second") : `${rest.minSeconds}–${rest.maxSeconds} seconds`;
  return `Rest ${time} between ${rest.between}`;
}

export type ActualField = "reps" | "seconds" | "meters" | "load";

// Which actual values a set can record. Only what the target measures, plus weight for loaded exercises.
export function actualFields(exercise: WorkoutExercise, target: WorkoutTarget): ActualField[] {
  const fields: ActualField[] = [];
  if (target.kind === "reps" || target.kind === "rep-range") fields.push("reps");
  if (target.kind === "hold" || target.kind === "hold-range" || target.kind === "duration") fields.push("seconds");
  if (target.kind === "distance") fields.push("meters");
  const library = exercise.source.kind === "exercise" ? getExercise(exercise.source.exerciseId) : undefined;
  if (library && !library.tags.equipment.includes("none") && target.kind !== "as-prescribed") fields.push("load");
  return fields;
}

export function formatActual(actual: ActualPerformance | undefined): string {
  if (!actual) return "";
  return [
    actual.reps !== undefined && plural(actual.reps, "rep"),
    actual.seconds !== undefined && formatDuration(actual.seconds),
    actual.meters !== undefined && `${actual.meters} meters`,
    actual.load && `${actual.load.value} ${actual.load.unit}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Reads the optional actual-performance inputs. Blank fields are left out; anything else must be a number, and
// the storage layer checks the ranges.
export function parseActualInput(values: Partial<Record<ActualField, string>>, unit: "lb" | "kg" = "lb"): { actual?: ActualPerformance; error?: string } {
  const actual: ActualPerformance = {};
  for (const field of ["reps", "seconds", "meters", "load"] as const) {
    const raw = values[field]?.trim();
    if (!raw) continue;
    if (!/^\d+(\.\d+)?$/.test(raw)) return { error: "Enter numbers only, or leave the field blank." };
    const n = Number(raw);
    if (field === "load") actual.load = { value: n, unit };
    else actual[field] = n;
  }
  return Object.keys(actual).length ? { actual } : {};
}
