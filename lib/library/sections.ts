import type { Drill, DrillId, Exercise, Purpose } from "./types";
import { drills, exercises, filterExercises, getDrill, getExercise, purposeLabels, type LibraryFilters } from "./index";

// The library's default view: official drills as sections (in the order a session uses them), then exercises
// that aren't part of a drill, grouped by RuckOn's purpose tags. Sections hold exercise IDs only, so an
// exercise shown in two sections (Rear Lunge is in the Preparation and Recovery Drills) is still one record.

export type LibrarySection =
  | { kind: "drill"; id: DrillId; title: string; description: string; drill: Drill; exerciseIds: string[] }
  | { kind: "category"; id: string; title: string; description: string; purpose: Purpose; exerciseIds: string[] };

// Preparation first and recovery last, as in a session; the activity drills in between.
const DRILL_ORDER: DrillId[] = [
  "preparation-drill",
  "conditioning-drill-1",
  "conditioning-drill-2",
  "four-for-the-core",
  "military-movement-drill-1",
  "recovery-drill",
];

// App groups for exercises outside the drills, in display order. Only groups with exercises are shown.
const CATEGORY_ORDER: { purpose: Purpose; description: string }[] = [
  { purpose: "strength", description: "Loaded exercises from the ATP's Strength Training Circuit and Free Weight Training." },
  { purpose: "muscular-endurance", description: "Exercises that build the ability to repeat a movement." },
  { purpose: "aerobic-endurance", description: "Exercises for sustained running and aerobic fitness." },
  { purpose: "speed", description: "Exercises for sprinting and acceleration." },
  { purpose: "agility", description: "Exercises for changing direction quickly." },
  { purpose: "mobility-flexibility", description: "Exercises for range of motion." },
];

export const CATEGORY_NOTE = "App category (RuckOn grouping, not an Army drill classification)";

const inAnyDrill = new Set(drills.flatMap((d) => d.sequence));

// Exercises outside the drills, each placed once under its first purpose tag that has a group.
function additionalByPurpose(): Map<Purpose, string[]> {
  const groups = new Map<Purpose, string[]>();
  for (const exercise of exercises) {
    if (inAnyDrill.has(exercise.id)) continue;
    const purpose = exercise.tags.purposes.find((p) => CATEGORY_ORDER.some((c) => c.purpose === p));
    if (!purpose) continue;
    groups.set(purpose, [...(groups.get(purpose) ?? []), exercise.id]);
  }
  return groups;
}

export function librarySections(): LibrarySection[] {
  const drillSections: LibrarySection[] = DRILL_ORDER.flatMap((id) => {
    const drill = getDrill(id);
    return drill ? [{ kind: "drill" as const, id: drill.id, title: drill.name, description: drill.summary, drill, exerciseIds: drill.sequence }] : [];
  });
  const groups = additionalByPurpose();
  const categorySections: LibrarySection[] = CATEGORY_ORDER.flatMap(({ purpose, description }) => {
    const ids = groups.get(purpose);
    return ids?.length ? [{ kind: "category" as const, id: `more-${purpose}`, title: purposeLabels[purpose], description, purpose, exerciseIds: ids }] : [];
  });
  return [...drillSections, ...categorySections];
}

export type VisibleSection = { section: LibrarySection; exercises: Exercise[] };

// Applies search and filters inside each section, keeping each drill's official order and hiding empty sections.
// The drill filter shows only that drill's section. In a drill section the phase filter uses the drill's own
// phase, so Rear Lunge shows under the Recovery Drill for "Recovery" but not under the Preparation Drill.
export function filterSections(filters: LibraryFilters, sections: LibrarySection[] = librarySections()): VisibleSection[] {
  return sections.flatMap((section) => {
    if (filters.drill !== "all" && section.id !== filters.drill) return [];
    if (section.kind === "drill" && filters.phase !== "all" && section.drill.tags.phase !== filters.phase) return [];
    const members = section.exerciseIds.map((id) => getExercise(id)).filter((e): e is Exercise => Boolean(e));
    const matched = filterExercises({ ...filters, drill: "all", phase: section.kind === "drill" ? "all" : filters.phase }, members);
    return matched.length ? [{ section, exercises: matched }] : [];
  });
}

// Distinct exercises across the visible sections.
export function matchingExerciseCount(visible: VisibleSection[]): number {
  return new Set(visible.flatMap((v) => v.exercises.map((e) => e.id))).size;
}
