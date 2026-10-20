import { getDrill, getExercise } from "@/lib/library";
import { activities } from "./templates";
import type { PlanBlock, PlanDraft, PlanItem, Prescription } from "./types";

// What weeks 3–4 change, read from the prescriptions themselves so the explanation always matches the plan.
// Development blocks progress; maintenance blocks and drills mostly stay the same, and the text says so.

export function itemName(item: PlanItem): string {
  if (item.kind === "drill") return getDrill(item.drillId)!.name;
  if (item.kind === "exercise") return getExercise(item.exerciseId)!.name;
  return activities[item.activityId].name;
}

// Bare counts ("4", "8–10", "up to 10") get a unit; descriptive values are shown as written.
export function formatSets(sets: string): string {
  return /^\d+$/.test(sets) ? `${sets} ${sets === "1" ? "set" : "sets"}` : sets;
}

export function formatReps(reps: string): string {
  return /^(up to )?\d+(–\d+)?$/.test(reps) ? `${reps} ${reps === "1" ? "rep" : "reps"}` : reps;
}

const FIELDS: { key: keyof Prescription; format: (value: string) => string }[] = [
  { key: "sets", format: formatSets },
  { key: "reps", format: formatReps },
  { key: "time", format: (v) => v },
];

// "3 sets → 4 sets", or null when weeks 3–4 prescribe the same as weeks 1–2.
export function itemProgression(item: PlanItem): string | null {
  const { foundation, build } = item.prescription;
  const changes = FIELDS.filter(({ key }) => foundation[key] !== build[key]).map(
    ({ key, format }) => `${foundation[key] ? format(foundation[key]!) : "none"} → ${build[key] ? format(build[key]!) : "none"}`
  );
  return changes.length ? changes.join(", ") : null;
}

// One line per item that changes, e.g. "Plank practice: 2 holds → 3 holds". Empty when nothing changes.
export function blockProgression(block: PlanBlock): string[] {
  return block.items.flatMap((item) => {
    const change = itemProgression(item);
    return change ? [`${itemName(item)}: ${change}`] : [];
  });
}

export type PlanProgression = { progresses: { title: string; changes: string[] }[]; unchanged: string[] };

// Main-workout blocks across the plan, split into those that progress in weeks 3–4 and those that don't.
export function planProgression(plan: PlanDraft): PlanProgression {
  const seen = new Set<string>();
  const result: PlanProgression = { progresses: [], unchanged: [] };
  for (const session of plan.sessions) {
    for (const block of session.main) {
      const changes = blockProgression(block);
      const key = `${block.title}|${changes.join(";")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (changes.length) result.progresses.push({ title: block.title, changes });
      else if (!result.unchanged.includes(block.title)) result.unchanged.push(block.title);
    }
  }
  return result;
}
