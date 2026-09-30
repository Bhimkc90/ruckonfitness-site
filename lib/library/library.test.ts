import { describe, expect, it } from "vitest";
import {
  drillHref,
  drillMemberships,
  drills,
  emptyFilters,
  exerciseHref,
  exercisePhases,
  exercises,
  filterDrills,
  filterExercises,
  getDrill,
  getExercise,
  hasActiveFilters,
  positions,
  sources,
} from "./index";
import type { LibraryFilters } from "./index";

// Official exercise order, typed independently from ATP 7-22.02 (INCL C1):
// para 3-1 (p. 3-1), 4-15 – 4-18 (pp. 4-9 – 4-11), 8-3 – 8-5 (pp. 8-1 – 8-2), 5-1 (p. 5-1), 5-18 (p. 5-9),
// and chapter 16 headings (pp. 16-1 – 16-6).
const officialOrder: Record<string, string[]> = {
  "preparation-drill": [
    "Bend and Reach",
    "Rear Lunge",
    "High Jumper",
    "Rower",
    "Squat Bender",
    "Windmill",
    "Forward Lunge",
    "Prone Row",
    "Bent-Leg Body Twist",
    "Push-Up",
  ],
  "four-for-the-core": ["Bent-Leg Raise", "Side Bridge", "Back Bridge", "Quadraplex"],
  "military-movement-drill-1": ["Vertical", "Lateral", "Shuttle Sprint"],
  "conditioning-drill-1": ["Power Jump", "V-Up", "Mountain Climber", "Leg-Tuck and Twist", "Single-Leg Push-Up"],
  "conditioning-drill-2": ["Turn and Lunge", "Supine Bicycle", "Half Jack", "Swimmer", "8-Count T Push-Up"],
  "recovery-drill": [
    "Overhead Arm Pull",
    "Rear Lunge",
    "Extend and Flex",
    "Thigh Stretch",
    "Single-Leg Over",
    "Groin Stretch",
    "Calf Stretch",
    "Hamstring Stretch",
  ],
};

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("IDs and references", () => {
  it("uses unique, stable kebab-case IDs", () => {
    const ids = [...exercises.map((e) => e.id), ...drills.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(kebab);
  });

  it("includes exactly the six verified drills and 37 unique exercises", () => {
    expect(drills.map((d) => d.id)).toEqual([
      "preparation-drill",
      "four-for-the-core",
      "military-movement-drill-1",
      "conditioning-drill-1",
      "conditioning-drill-2",
      "recovery-drill",
    ]);
    expect(exercises).toHaveLength(37);
  });

  it("matches the official exercise order for every drill", () => {
    for (const drill of drills) {
      expect(drill.sequence.map((id) => getExercise(id)?.name)).toEqual(officialOrder[drill.id]);
    }
  });

  it("stores shared exercises once (Rear Lunge is in the Preparation and Recovery Drills)", () => {
    expect(exercises.filter((e) => e.name === "Rear Lunge")).toHaveLength(1);
    expect(drillMemberships("rear-lunge").map((m) => [m.drill.id, m.order])).toEqual([
      ["preparation-drill", 2],
      ["recovery-drill", 2],
    ]);
  });

  it("links every drill entry to an execution for that drill, and every execution to a drill that lists it", () => {
    for (const drill of drills) {
      for (const id of drill.sequence) {
        const exercise = getExercise(id);
        expect(exercise, `${drill.id} -> ${id}`).toBeDefined();
        expect(exercise!.executions.some((x) => x.drillId === drill.id), `${id} execution for ${drill.id}`).toBe(true);
      }
    }
    for (const exercise of exercises) {
      expect(exercise.executions.length).toBeGreaterThan(0);
      for (const execution of exercise.executions) {
        if (execution.drillId) {
          expect(getDrill(execution.drillId)?.sequence, `${exercise.id} in ${execution.drillId}`).toContain(exercise.id);
        } else {
          // Exercises outside a library drill name their official context and a session phase.
          expect(execution.context, exercise.id).toBeTruthy();
          expect(exercise.tags.phases?.length, exercise.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses only defined starting positions", () => {
    for (const exercise of exercises) {
      for (const execution of exercise.executions) expect(positions[execution.position]).toBeDefined();
    }
  });

  it("excludes suggested workout templates from the library", async () => {
    const library = await import("./index");
    expect(Object.keys(library)).not.toContain("workoutTemplates");
    expect(JSON.stringify({ drills, exercises })).not.toMatch(/ruckon-suggestion/);
  });
});

describe("content and source coverage", () => {
  const allRefs = [
    ...exercises.flatMap((e) => e.executions.map((x) => x.source)),
    ...drills.flatMap((d) => [...d.sources, d.officialPrescription.source, ...d.officialGuidance.map((g) => g.source)]),
    ...Object.values(positions).flatMap((p) => (p.source ? [p.source] : [])),
  ];

  it("cites a known source with paragraph and page for every entry", () => {
    for (const ref of allRefs) {
      expect(sources[ref.sourceId]).toBeDefined();
      expect(ref.paragraphs.trim()).not.toBe("");
      expect(ref.pages.trim()).not.toBe("");
    }
  });

  it("records official, dated sources hosted by the Army Publishing Directorate", () => {
    for (const source of Object.values(sources)) {
      expect(source.url).toMatch(/^https:\/\/armypubs\.army\.mil\//);
      expect(source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.edition).toMatch(/October 2020/);
    }
  });

  it("gives every exercise numbered steps, a cadence, tags, and a verified status", () => {
    for (const exercise of exercises) {
      expect(exercise.summary.length).toBeGreaterThan(20);
      expect(exercise.focus.length).toBeGreaterThan(0);
      expect(exercise.tags.purposes.length).toBeGreaterThan(0);
      expect(exercise.tags.equipment.length).toBeGreaterThan(0);
      expect(exercise.tags.movementPatterns.length).toBeGreaterThan(0);
      expect(exercise.verification.status).toBe("verified");
      for (const execution of exercise.executions) {
        expect(execution.steps.length).toBeGreaterThanOrEqual(3);
        expect(["slow", "moderate", "hold", "course", "controlled"]).toContain(execution.cadence);
        expect(execution.startingPosition.length).toBeGreaterThan(5);
      }
    }
  });

  it("uses held positions only in the Recovery Drill and Four for the Core, and courses only in MMD1", () => {
    for (const exercise of exercises) {
      for (const execution of exercise.executions) {
        if (execution.drillId === "recovery-drill" || execution.drillId === "four-for-the-core") expect(execution.cadence).toBe("hold");
        else expect(execution.cadence).not.toBe("hold");
        expect(execution.cadence === "course").toBe(execution.drillId === "military-movement-drill-1");
      }
    }
  });

  it("labels every AFT mapping with its basis and an explanation", () => {
    for (const exercise of exercises) {
      if (!exercise.aft) continue;
      expect(exercise.aft.events.length).toBeGreaterThan(0);
      expect(["app", "source-mention"]).toContain(exercise.aft.basis);
      expect(exercise.aft.note.length).toBeGreaterThan(20);
    }
  });

  it("does not include unverified demonstration links", () => {
    expect(exercises.filter((e) => e.demonstrationUrl)).toEqual([]);
  });
});

describe("filters", () => {
  const ids = (list: { id: string }[]) => list.map((item) => item.id).sort();
  const f = (overrides: Partial<LibraryFilters>): LibraryFilters => ({ ...emptyFilters, ...overrides });

  it("returns everything with no filters", () => {
    expect(filterExercises(emptyFilters)).toHaveLength(37);
    expect(filterDrills(emptyFilters)).toHaveLength(6);
    expect(hasActiveFilters(emptyFilters)).toBe(false);
    expect(hasActiveFilters(f({ query: "lunge" }))).toBe(true);
  });

  it("filters by drill and derives phases from drill membership", () => {
    expect(filterExercises(f({ drill: "conditioning-drill-1" }))).toHaveLength(5);
    expect(filterExercises(f({ drill: "recovery-drill" }))).toHaveLength(8);
    expect(exercisePhases(getExercise("rear-lunge")!).sort()).toEqual(["recovery", "warm-up"]);
    expect(filterExercises(f({ phase: "recovery" }))).toHaveLength(8);
    expect(filterExercises(f({ phase: "warm-up" }))).toHaveLength(17);
    expect(filterExercises(f({ phase: "main" }))).toHaveLength(13);
    expect(ids(filterExercises(f({ equipment: "kettlebell" })))).toEqual(["deadlift", "straight-leg-deadlift", "sumo-squat"]);
  });

  it("combines purpose, drill, and AFT event filters", () => {
    expect(ids(filterExercises(f({ drill: "conditioning-drill-2", purpose: "agility" })))).toEqual([
      "half-jack",
      "turn-and-lunge",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "HRP" })))).toEqual([
      "eight-count-t-push-up",
      "push-up",
      "single-leg-push-up",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "MDL" })))).toEqual([
      "back-bridge",
      "deadlift",
      "squat-bender",
      "straight-leg-deadlift",
      "sumo-squat",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "HRP", drill: "conditioning-drill-1" })))).toEqual(["single-leg-push-up"]);
  });

  it("returns an empty list for combinations with no match", () => {
    expect(filterExercises(f({ aftEvent: "2MR" }))).toEqual([]);
    expect(filterExercises(f({ phase: "recovery", purpose: "speed" }))).toEqual([]);
    expect(filterDrills(f({ phase: "recovery", aftEvent: "HRP" }))).toEqual([]);
  });

  it("searches names, descriptions, and drill names", () => {
    expect(ids(filterExercises(f({ query: "lunge" })))).toEqual(
      expect.arrayContaining(["forward-lunge", "rear-lunge", "turn-and-lunge"])
    );
    expect(ids(filterExercises(f({ query: "  PUSH up " })))).toEqual([
      "eight-count-t-push-up",
      "push-up",
      "single-leg-push-up",
    ]);
    expect(filterExercises(f({ query: "CD2" }))).toHaveLength(5);
    expect(ids(filterDrills(f({ query: "swimmer" })))).toEqual(["conditioning-drill-2"]);
    expect(filterExercises(f({ query: "zzzz" }))).toEqual([]);
  });

  it("filters drills by phase and by exercises' AFT mappings", () => {
    expect(ids(filterDrills(f({ phase: "main" })))).toEqual(["conditioning-drill-1", "conditioning-drill-2"]);
    expect(ids(filterDrills(f({ aftEvent: "MDL" })))).toEqual(["four-for-the-core", "preparation-drill"]);
  });
});

describe("internal links", () => {
  it("builds a detail link for every exercise and drill that resolves back to a record", () => {
    for (const exercise of exercises) {
      const id = exerciseHref(exercise.id).split("/").pop()!;
      expect(getExercise(id)?.id).toBe(exercise.id);
    }
    for (const drill of drills) {
      const id = drillHref(drill.id).split("/").pop()!;
      expect(getDrill(id)?.id).toBe(drill.id);
    }
  });
});
