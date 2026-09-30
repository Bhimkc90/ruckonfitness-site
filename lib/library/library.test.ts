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
  workoutTemplates,
} from "./index";
import type { LibraryFilters } from "./index";

// Official exercise order, typed independently from ATP 7-22.02 (INCL C1):
// para 3-1 (p. 3-1), para 5-1 (p. 5-1), para 5-18 (p. 5-9), and chapter 16 headings (pp. 16-1 – 16-6).
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
    const ids = [...exercises.map((e) => e.id), ...drills.map((d) => d.id), ...workoutTemplates.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(kebab);
  });

  it("includes exactly the four verified drills and 27 unique exercises", () => {
    expect(drills.map((d) => d.id)).toEqual([
      "preparation-drill",
      "conditioning-drill-1",
      "conditioning-drill-2",
      "recovery-drill",
    ]);
    expect(exercises).toHaveLength(27);
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
        expect(getDrill(execution.drillId)?.sequence, `${exercise.id} in ${execution.drillId}`).toContain(exercise.id);
      }
    }
  });

  it("uses only defined starting positions", () => {
    for (const exercise of exercises) {
      for (const execution of exercise.executions) expect(positions[execution.position]).toBeDefined();
    }
  });

  it("references only existing drills and exercises in workout templates", () => {
    for (const template of workoutTemplates) {
      expect(template.origin).toBe("ruckon-suggestion");
      for (const block of template.blocks) {
        for (const item of block.items) {
          if (item.kind === "drill") expect(getDrill(item.drillId)).toBeDefined();
          else expect(getExercise(item.exerciseId)).toBeDefined();
        }
      }
    }
  });
});

describe("content and source coverage", () => {
  const allRefs = [
    ...exercises.flatMap((e) => e.executions.map((x) => x.source)),
    ...drills.flatMap((d) => [...d.sources, d.officialPrescription.source, ...d.officialGuidance.map((g) => g.source)]),
    ...Object.values(positions).flatMap((p) => (p.source ? [p.source] : [])),
    ...workoutTemplates.flatMap((t) => t.basis.map((b) => b.source)),
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
        expect(["slow", "moderate", "hold"]).toContain(execution.cadence);
        expect(execution.startingPosition.length).toBeGreaterThan(5);
      }
    }
  });

  it("uses held stretches only in the Recovery Drill and counted cadence elsewhere", () => {
    for (const exercise of exercises) {
      for (const execution of exercise.executions) {
        if (execution.drillId === "recovery-drill") expect(execution.cadence).toBe("hold");
        else expect(execution.cadence).not.toBe("hold");
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
    expect(filterExercises(emptyFilters)).toHaveLength(27);
    expect(filterDrills(emptyFilters)).toHaveLength(4);
    expect(hasActiveFilters(emptyFilters)).toBe(false);
    expect(hasActiveFilters(f({ query: "lunge" }))).toBe(true);
  });

  it("filters by drill and derives phases from drill membership", () => {
    expect(filterExercises(f({ drill: "conditioning-drill-1" }))).toHaveLength(5);
    expect(filterExercises(f({ drill: "recovery-drill" }))).toHaveLength(8);
    expect(exercisePhases(getExercise("rear-lunge")!).sort()).toEqual(["recovery", "warm-up"]);
    expect(filterExercises(f({ phase: "recovery" }))).toHaveLength(8);
    expect(filterExercises(f({ phase: "warm-up" }))).toHaveLength(10);
    expect(filterExercises(f({ phase: "main" }))).toHaveLength(10);
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
    expect(ids(filterExercises(f({ aftEvent: "MDL" })))).toEqual(["squat-bender"]);
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
    expect(ids(filterDrills(f({ aftEvent: "MDL" })))).toEqual(["preparation-drill"]);
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
