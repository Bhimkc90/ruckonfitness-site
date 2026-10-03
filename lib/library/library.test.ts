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
import { filterSections, librarySections, matchingExerciseCount, viewExerciseCount } from "./sections";

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

  it("includes exactly the six verified drills and 49 unique exercises", () => {
    expect(drills.map((d) => d.id)).toEqual([
      "preparation-drill",
      "four-for-the-core",
      "military-movement-drill-1",
      "conditioning-drill-1",
      "conditioning-drill-2",
      "recovery-drill",
    ]);
    expect(exercises).toHaveLength(49);
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
          // Executions outside a library drill name their official context; exercises in no drill also need a phase.
          expect(execution.context, exercise.id).toBeTruthy();
          if (drillMemberships(exercise.id).length === 0) expect(exercise.tags.phases?.length, exercise.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses only defined starting positions", () => {
    for (const exercise of exercises) {
      for (const execution of exercise.executions) {
        // Drill executions always name a position; others may describe an unnamed start (e.g. bench-supported).
        if (execution.drillId) expect(execution.position).toBeDefined();
        if (execution.position) expect(positions[execution.position]).toBeDefined();
      }
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
    expect(filterExercises(emptyFilters)).toHaveLength(49);
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
    expect(filterExercises(f({ phase: "main" }))).toHaveLength(25);
    expect(ids(filterExercises(f({ equipment: "kettlebell" })))).toEqual([
      "back-squat",
      "bench-press",
      "bent-over-row",
      "deadlift",
      "forward-lunge",
      "front-squat",
      "heel-raise",
      "overhead-push-press",
      "single-arm-bent-over-row",
      "step-up",
      "straight-leg-deadlift",
      "sumo-squat",
      "supine-body-twist",
      "supine-chest-press",
    ]);
  });

  it("combines purpose, drill, and AFT event filters", () => {
    expect(ids(filterExercises(f({ drill: "conditioning-drill-2", purpose: "agility" })))).toEqual([
      "half-jack",
      "turn-and-lunge",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "HRP" })))).toEqual([
      "bench-press",
      "bent-over-row",
      "eight-count-t-push-up",
      "push-up",
      "single-arm-bent-over-row",
      "single-leg-push-up",
      "supine-chest-press",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "MDL" })))).toEqual([
      "back-bridge",
      "back-squat",
      "bent-over-row",
      "deadlift",
      "front-squat",
      "single-arm-bent-over-row",
      "single-leg-deadlift",
      "squat-bender",
      "straight-leg-deadlift",
      "sumo-squat",
    ]);
    expect(ids(filterExercises(f({ aftEvent: "2MR" })))).toEqual(["heel-raise"]);
    expect(ids(filterExercises(f({ aftEvent: "HRP", drill: "conditioning-drill-1" })))).toEqual(["single-leg-push-up"]);
  });

  it("returns an empty list for combinations with no match", () => {
    expect(filterExercises(f({ aftEvent: "2MR", equipment: "none" }))).toEqual([]);
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
      "supine-chest-press",
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

describe("library sections", () => {
  const sections = librarySections();
  const all = { query: "", drill: "all", purpose: "all", phase: "all", equipment: "all", aftEvent: "all" } as const;
  const military = sections.filter((s) => s.view === "military");
  const general = sections.filter((s) => s.view === "general");

  it("orders the Military view: Preparation, Conditioning 1 and 2, other drills, Recovery, then more ATP exercises", () => {
    expect(military.map((s) => s.id)).toEqual([
      "preparation-drill",
      "conditioning-drill-1",
      "conditioning-drill-2",
      "four-for-the-core",
      "military-movement-drill-1",
      "recovery-drill",
      "more-atp",
    ]);
  });

  it("groups the General Fitness view into four app categories", () => {
    expect(general.map((s) => s.id)).toEqual([
      "general-strength",
      "general-muscular-endurance",
      "general-core-stability",
      "general-conditioning-agility",
    ]);
  });

  it("keeps each drill's official exercise order and uses the official drill names", () => {
    for (const section of sections) {
      if (section.kind !== "drill") continue;
      expect(section.exerciseIds).toEqual(section.drill.sequence);
      expect(section.title).toBe(section.drill.name);
    }
  });

  it("shows every exercise in the Military view, with only non-drill exercises in the ATP section", () => {
    const shown = new Set(military.flatMap((s) => s.exerciseIds));
    expect(shown.size).toBe(exercises.length);
    const inDrills = new Set(drills.flatMap((d) => d.sequence));
    const atpIds = military.filter((s) => s.kind === "atp").flatMap((s) => s.exerciseIds);
    expect([...atpIds].sort()).toEqual(exercises.filter((e) => !inDrills.has(e.id)).map((e) => e.id).sort());
    expect(new Set(atpIds).size).toBe(atpIds.length);
  });

  it("references existing records in General Fitness, once per group, reusing drill exercises rather than copying them", () => {
    for (const section of general) {
      for (const id of section.exerciseIds) expect(getExercise(id), `${section.id} -> ${id}`).toBeDefined();
      expect(new Set(section.exerciseIds).size).toBe(section.exerciseIds.length);
    }
    const pushUps = [...filterSections({ ...all, query: "push-up" }, "military"), ...filterSections({ ...all, query: "push-up" }, "general")]
      .flatMap((v) => v.exercises.filter((e) => e.id === "push-up"));
    expect(pushUps.length).toBeGreaterThanOrEqual(2);
    expect(new Set(pushUps).size).toBe(1);
    // Rear Lunge appears in two drill sections but is the same record.
    const lunges = filterSections({ ...all, query: "rear lunge" }).flatMap((v) => v.exercises.filter((e) => e.id === "rear-lunge"));
    expect(lunges).toHaveLength(2);
    expect(lunges[0]).toBe(lunges[1]);
  });

  it("returns every section of a view with no filters", () => {
    expect(filterSections(all, "military").map((v) => v.section.id)).toEqual(military.map((s) => s.id));
    expect(matchingExerciseCount(filterSections(all, "military"))).toBe(exercises.length);
    expect(filterSections(all, "general").map((v) => v.section.id)).toEqual(general.map((s) => s.id));
    expect(matchingExerciseCount(filterSections(all, "general"))).toBe(viewExerciseCount("general"));
  });

  it("hides empty sections, keeps bodyweight drills out of loaded-equipment results, and counts distinct matches", () => {
    expect(filterSections({ ...all, equipment: "kettlebell" }, "military").map((v) => v.section.id)).toEqual(["more-atp"]);
    expect(filterSections({ ...all, equipment: "kettlebell" }, "general").map((v) => v.section.id)).toEqual([
      "general-strength",
      "general-muscular-endurance",
      "general-core-stability",
    ]);
    const jumping = filterSections({ ...all, query: "jump" });
    expect(jumping.every((v) => v.exercises.length > 0)).toBe(true);
    const lunge = filterSections({ ...all, query: "rear lunge" });
    expect(lunge.map((v) => v.section.id)).toEqual(["preparation-drill", "recovery-drill"]);
    expect(matchingExerciseCount(lunge)).toBe(1);
  });

  it("filters General Fitness by supported AFT event", () => {
    expect(filterSections({ ...all, aftEvent: "2MR" }, "general").flatMap((v) => v.exercises.map((e) => e.id))).toEqual(["heel-raise"]);
    const hrp = filterSections({ ...all, aftEvent: "HRP" }, "general");
    expect(hrp.flatMap((v) => v.exercises).every((e) => e.aft?.events.includes("HRP"))).toBe(true);
    expect(hrp.map((v) => v.section.id)).toEqual(["general-strength", "general-muscular-endurance"]);
  });

  it("combines search and filters, and a drill filter shows only that drill in order", () => {
    const cd1 = filterSections({ ...all, drill: "conditioning-drill-1" });
    expect(cd1).toHaveLength(1);
    expect(cd1[0].exercises.map((e) => e.id)).toEqual(getDrill("conditioning-drill-1")!.sequence);
    const combo = filterSections({ ...all, drill: "preparation-drill", purpose: "mobility-flexibility", query: "lunge" });
    expect(combo.flatMap((v) => v.exercises.map((e) => e.id)).every((id) => getDrill("preparation-drill")!.sequence.includes(id))).toBe(true);
    const order = combo[0]?.exercises.map((e) => getDrill("preparation-drill")!.sequence.indexOf(e.id)) ?? [];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(filterSections({ ...all, equipment: "barbell-or-hex-bar", phase: "recovery" })).toEqual([]);
    // Phase follows the section's drill: Rear Lunge is a recovery exercise only under the Recovery Drill.
    expect(filterSections({ ...all, query: "rear lunge", phase: "recovery" }).map((v) => v.section.id)).toEqual(["recovery-drill"]);
    expect(filterSections({ ...all, phase: "warm-up" }).map((v) => v.section.id)).toEqual(["preparation-drill", "four-for-the-core", "military-movement-drill-1"]);
    // The drill filter does not apply to the General Fitness view.
    expect(filterSections({ ...all, drill: "conditioning-drill-1" }, "general").length).toBe(general.length);
  });
});

describe("substitutions", () => {
  it("cite the source and link only to exercises that exist, never to themselves", () => {
    for (const exercise of exercises) {
      for (const sub of exercise.substitutions ?? []) {
        expect(sub.difference.length, `${exercise.id}: ${sub.name}`).toBeGreaterThan(20);
        expect(sub.source.paragraphs, `${exercise.id}: ${sub.name}`).toBeTruthy();
        if (sub.exerciseId) {
          expect(getExercise(sub.exerciseId), `${exercise.id} -> ${sub.exerciseId}`).toBeDefined();
          expect(sub.exerciseId).not.toBe(exercise.id);
        }
      }
    }
  });
});
