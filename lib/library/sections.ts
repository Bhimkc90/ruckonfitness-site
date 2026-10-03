import type { Drill, DrillId, Exercise } from "./types";
import { filterExercises, getDrill, getExercise, type LibraryFilters } from "./index";

// The library has two browsing views over one set of exercise records. Sections hold exercise IDs only, so an
// exercise shown in several sections (Rear Lunge is in two drills; Push-Up is in a drill and a General Fitness
// group) is still one record.
//
// - Military / PRT: the official drills in the order a session uses them, then the other ATP 7-22.02 exercises
//   in the library, in the publication's chapter order.
// - General Fitness: RuckOn groupings of exercises that support AFT preparation. This is an app classification,
//   not an Army program; every exercise still comes from, and cites, the Army publication.

export type LibraryView = "military" | "general";

export type GeneralCategory = "strength" | "muscular-endurance" | "core-stability" | "conditioning-agility";

export type LibrarySection =
  | { kind: "drill"; view: "military"; id: DrillId; title: string; description: string; drill: Drill; exerciseIds: string[] }
  | { kind: "atp"; view: "military"; id: string; title: string; description: string; exerciseIds: string[] }
  | { kind: "general"; view: "general"; id: string; title: string; description: string; category: GeneralCategory; exerciseIds: string[] };

// Preparation first and recovery last, as in a session; the activity drills in between.
const DRILL_ORDER: DrillId[] = [
  "preparation-drill",
  "conditioning-drill-1",
  "conditioning-drill-2",
  "four-for-the-core",
  "military-movement-drill-1",
  "recovery-drill",
];

// ATP 7-22.02 exercises outside the included drills, in chapter order: Conditioning Drill 3 (ch. 5),
// Strength Training Circuit (ch. 13), Free Weight Training (ch. 14).
const MORE_ATP: string[] = [
  "single-leg-deadlift",
  "half-squat-laterals",
  "sumo-squat",
  "straight-leg-deadlift",
  "step-up",
  "supine-chest-press",
  "bent-over-row",
  "overhead-push-press",
  "supine-body-twist",
  "front-squat",
  "back-squat",
  "deadlift",
  "bench-press",
  "heel-raise",
  "single-arm-bent-over-row",
];

export const GENERAL_NOTE = "General Fitness is a RuckOn grouping, not an official Army program or drill.";

// General Fitness groups, in display order. Lower-body lifts first, then upper body, within each group.
export const GENERAL_SECTIONS: { category: GeneralCategory; title: string; description: string; exerciseIds: string[] }[] = [
  {
    category: "strength",
    title: "Strength",
    description: "Loaded lifts for the legs, hips, back, and pushing muscles, from Free Weight Training and the Strength Training Circuit.",
    exerciseIds: ["deadlift", "straight-leg-deadlift", "front-squat", "back-squat", "sumo-squat", "bench-press", "supine-chest-press", "bent-over-row", "single-arm-bent-over-row", "overhead-push-press"],
  },
  {
    category: "muscular-endurance",
    title: "Muscular endurance",
    description: "Exercises repeated for time or repetitions, with bodyweight or light loads.",
    exerciseIds: ["push-up", "eight-count-t-push-up", "forward-lunge", "step-up", "single-leg-deadlift", "heel-raise"],
  },
  {
    category: "core-stability",
    title: "Core stability",
    description: "Holds and controlled trunk movements, including the Four for the Core exercises.",
    exerciseIds: ["side-bridge", "quadraplex", "back-bridge", "bent-leg-raise", "supine-body-twist"],
  },
  {
    category: "conditioning-agility",
    title: "Conditioning and agility",
    description: "Sprinting, changes of direction, side-to-side movement, and jumping.",
    exerciseIds: ["shuttle-sprint", "lateral", "half-squat-laterals", "mountain-climber", "power-jump"],
  },
];

export function librarySections(): LibrarySection[] {
  const drillSections: LibrarySection[] = DRILL_ORDER.flatMap((id) => {
    const drill = getDrill(id);
    return drill ? [{ kind: "drill" as const, view: "military" as const, id: drill.id, title: drill.name, description: drill.summary, drill, exerciseIds: drill.sequence }] : [];
  });
  const atpSection: LibrarySection = {
    kind: "atp",
    view: "military",
    id: "more-atp",
    title: "More ATP 7-22.02 exercises",
    description: "Exercises from Conditioning Drill 3, the Strength Training Circuit, and Free Weight Training. Each shows the drill or station it comes from.",
    exerciseIds: MORE_ATP,
  };
  const generalSections: LibrarySection[] = GENERAL_SECTIONS.map((g) => ({
    kind: "general" as const,
    view: "general" as const,
    id: `general-${g.category}`,
    title: g.title,
    description: g.description,
    category: g.category,
    exerciseIds: g.exerciseIds,
  }));
  return [...drillSections, atpSection, ...generalSections];
}

export type VisibleSection = { section: LibrarySection; exercises: Exercise[] };

// Applies search and filters inside each section of a view, keeping each section's order and hiding empty ones.
// The drill filter applies to the Military view only and shows just that drill. In a drill section the phase
// filter uses the drill's own phase, so Rear Lunge shows under the Recovery Drill for "Recovery" but not under
// the Preparation Drill, and an equipment filter other than "No equipment" hides the (bodyweight) drills.
export function filterSections(
  filters: LibraryFilters,
  view: LibraryView = "military",
  sections: LibrarySection[] = librarySections()
): VisibleSection[] {
  return sections.flatMap((section) => {
    if (section.view !== view) return [];
    if (view === "military" && filters.drill !== "all" && section.id !== filters.drill) return [];
    if (section.kind === "drill" && filters.phase !== "all" && section.drill.tags.phase !== filters.phase) return [];
    // The included drills use no equipment, so a loaded-equipment filter never shows a drill section (Forward
    // Lunge has a kettlebell version in the Strength Training Circuit, but not in the Preparation Drill).
    if (section.kind === "drill" && filters.equipment !== "all" && filters.equipment !== "none") return [];
    const members = section.exerciseIds.map((id) => getExercise(id)).filter((e): e is Exercise => Boolean(e));
    const matched = filterExercises({ ...filters, drill: "all", phase: section.kind === "drill" ? "all" : filters.phase }, members);
    return matched.length ? [{ section, exercises: matched }] : [];
  });
}

// Distinct exercises across the visible sections.
export function matchingExerciseCount(visible: VisibleSection[]): number {
  return new Set(visible.flatMap((v) => v.exercises.map((e) => e.id))).size;
}

// Distinct exercises in a view with no filters.
export function viewExerciseCount(view: LibraryView, sections: LibrarySection[] = librarySections()): number {
  return new Set(sections.filter((s) => s.view === view).flatMap((s) => s.exerciseIds)).size;
}

