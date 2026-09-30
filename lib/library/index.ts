import type { AftEventCode } from "@/lib/aft/types";
import type { Drill, DrillId, Equipment, Exercise, Impact, MovementPattern, Phase, Purpose } from "./types";
import { preparationExercises } from "./exercises-preparation";
import { conditioningExercises } from "./exercises-conditioning";
import { recoveryExercises } from "./exercises-recovery";
import { fourForTheCoreExercises, loadedExercises, militaryMovementExercises } from "./exercises-additional";
import { drills, workoutTemplates } from "./drills";

export { drills, workoutTemplates };
export { sources, positions, formatSourceRef } from "./sources";

export const exercises: Exercise[] = [
  ...preparationExercises,
  ...fourForTheCoreExercises,
  ...militaryMovementExercises,
  ...conditioningExercises,
  ...recoveryExercises,
  ...loadedExercises,
];

const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const drillById = new Map(drills.map((drill) => [drill.id, drill]));

export function getExercise(id: string): Exercise | undefined {
  return exerciseById.get(id);
}

export function getDrill(id: string): Drill | undefined {
  return drillById.get(id as DrillId);
}

export const exerciseHref = (id: string) => `/workouts/exercises/${id}`;
export const drillHref = (id: string) => `/workouts/drills/${id}`;

// Drills that include an exercise, with its 1-based position in each.
export function drillMemberships(exerciseId: string): { drill: Drill; order: number }[] {
  return drills.flatMap((drill) => {
    const index = drill.sequence.indexOf(exerciseId);
    return index === -1 ? [] : [{ drill, order: index + 1 }];
  });
}

// An exercise's session phases come from the official category of the drills it belongs to.
export function exercisePhases(exercise: Exercise): Phase[] {
  const phases = drillMemberships(exercise.id).map(({ drill }) => drill.tags.phase);
  return Array.from(new Set([...phases, ...(exercise.tags.phases ?? [])]));
}

// ---------------------------------------------------------------------------
// Labels for RuckOn tags
// ---------------------------------------------------------------------------

export const purposeLabels: Record<Purpose, string> = {
  strength: "Strength",
  "muscular-endurance": "Muscular endurance",
  "aerobic-endurance": "Aerobic endurance",
  "anaerobic-conditioning": "Anaerobic conditioning",
  speed: "Speed",
  agility: "Agility",
  "mobility-flexibility": "Mobility and flexibility",
  "balance-stability": "Balance and stability",
  recovery: "Recovery",
};

export const phaseLabels: Record<Phase, string> = {
  "warm-up": "Warm-up",
  main: "Main workout",
  recovery: "Recovery",
};

export const equipmentLabels: Record<Equipment, string> = {
  none: "No equipment",
  kettlebell: "Kettlebells",
  dumbbell: "Dumbbells",
  "barbell-or-hex-bar": "Barbell or hex bar",
};

export const impactLabels: Record<Impact, string> = { "no-jumping": "No jumping", jumping: "Includes jumping" };

export const movementLabels: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  push: "Push",
  pull: "Pull",
  "trunk-flexion": "Trunk flexion",
  "trunk-rotation": "Trunk rotation",
  "trunk-extension": "Trunk extension",
  jump: "Jump",
  locomotion: "Locomotion",
  run: "Running",
  "trunk-stability": "Trunk stability (hold)",
  stretch: "Stretch",
};

export const cadenceLabels = {
  slow: "Slow cadence (50 counts per minute)",
  moderate: "Moderate cadence (80 counts per minute)",
  hold: "Held position, on command",
  course: "Over a 25-meter course",
  controlled: "Controlled pace (no cadence prescribed)",
} as const;

export const aftEventLabels: Record<AftEventCode, string> = {
  MDL: "Deadlift",
  HRP: "Hand-release push-up",
  SDC: "Sprint-drag-carry",
  PLK: "Plank",
  "2MR": "2-mile run",
};

// ---------------------------------------------------------------------------
// Search and filters
// ---------------------------------------------------------------------------

export type LibraryFilters = {
  query: string;
  drill: DrillId | "all";
  purpose: Purpose | "all";
  phase: Phase | "all";
  equipment: Equipment | "all";
  aftEvent: AftEventCode | "all";
};

export const emptyFilters: LibraryFilters = {
  query: "",
  drill: "all",
  purpose: "all",
  phase: "all",
  equipment: "all",
  aftEvent: "all",
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesQuery(haystack: string[], query: string) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const text = normalize(haystack.join(" "));
  return terms.every((term) => text.includes(term));
}

export function filterExercises(filters: LibraryFilters, list: Exercise[] = exercises): Exercise[] {
  return list.filter((exercise) => {
    const memberships = drillMemberships(exercise.id);
    if (filters.drill !== "all" && !memberships.some(({ drill }) => drill.id === filters.drill)) return false;
    if (filters.purpose !== "all" && !exercise.tags.purposes.includes(filters.purpose)) return false;
    if (filters.phase !== "all" && !exercisePhases(exercise).includes(filters.phase)) return false;
    if (filters.equipment !== "all" && !exercise.tags.equipment.includes(filters.equipment)) return false;
    if (filters.aftEvent !== "all" && !exercise.aft?.events.includes(filters.aftEvent)) return false;
    return matchesQuery(
      [
        exercise.name,
        exercise.summary,
        exercise.officialPurpose,
        ...exercise.focus,
        ...memberships.flatMap(({ drill }) => [drill.name, drill.abbreviation]),
      ],
      filters.query
    );
  });
}

// A drill matches when its own tags match, or (for equipment and AFT events) when any of its exercises do.
export function filterDrills(filters: LibraryFilters, list: Drill[] = drills): Drill[] {
  return list.filter((drill) => {
    const members = drill.sequence.map((id) => exerciseById.get(id)).filter((e): e is Exercise => Boolean(e));
    if (filters.drill !== "all" && drill.id !== filters.drill) return false;
    if (filters.purpose !== "all" && !drill.tags.purposes.includes(filters.purpose)) return false;
    if (filters.phase !== "all" && drill.tags.phase !== filters.phase) return false;
    if (filters.equipment !== "all" && !members.some((e) => e.tags.equipment.includes(filters.equipment as Equipment)))
      return false;
    if (filters.aftEvent !== "all" && !members.some((e) => e.aft?.events.includes(filters.aftEvent as AftEventCode)))
      return false;
    return matchesQuery([drill.name, drill.abbreviation, drill.summary, ...members.map((e) => e.name)], filters.query);
  });
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (Object.keys(emptyFilters) as (keyof LibraryFilters)[]).some((key) => filters[key] !== emptyFilters[key]);
}
