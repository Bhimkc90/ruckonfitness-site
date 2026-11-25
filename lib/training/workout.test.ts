import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { getDrill, getExercise } from "@/lib/library";
import { EMPTY_TRAINING, rescheduleSession, startPlan } from "@/lib/storage/trainingPlans";
import { exerciseAllowed, generatePlan } from "./engine";
import { PAIN_PAUSE_MESSAGE } from "./progress";
import { runningLimits } from "./templates";
import {
  MMD1_COURSE,
  buildWorkout,
  latestSetRecords,
  parseCount,
  parsePrescription,
  parseReps,
  parseRest,
  parseSeconds,
  recordSetCompletion,
  sessionWorkout,
  undoSetCompletion,
  workoutPhase,
  workoutProgress,
  workoutSetIds,
} from "./workout";
import type {
  BaselineSnapshot,
  EquipmentOption,
  PlanSession,
  Preferences,
  Restriction,
  RunningVolume,
  SessionCompletion,
  SetCompletion,
  StoredPlan,
  WorkoutExercise,
  WorkoutSnapshot,
} from "./types";

const t = (m: number, s: number) => m * 60 + s;

function baseline(raw: Partial<AftInput["raw"]> = {}): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw } };
  return { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) };
}

const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 45,
  equipment: [],
  runningAccess: true,
  experience: "some",
  recentRunning: "31-60",
  restrictions: [],
  ...overrides,
});

const START = "2026-10-05"; // a Monday
const CREATED = "2026-10-05T07:00:00.000Z";

function stored(p: Preferences, b = baseline()): StoredPlan {
  const outcome = generatePlan({ baseline: b, prefs: p, screening: { currentPain: false, otherInstructions: "" }, startDate: START });
  if (outcome.status !== "ready") throw new Error(`expected ready, got ${outcome.status}`);
  return startPlan(EMPTY_TRAINING, outcome.plan, { id: "plan-1", createdAt: CREATED, startDate: START }).plans[0];
}

const sessionOf = (plan: StoredPlan, id: string) => plan.sessions.find((s) => s.id === id)!;
const firstOfKind = (plan: StoredPlan, kind: PlanSession["kind"], week = 1) => plan.sessions.find((s) => s.kind === kind && s.week === week)!;
const workout = (plan: StoredPlan, session: PlanSession, phase: "foundation" | "build" = "foundation") => buildWorkout(plan, session, { phase, createdAt: CREATED });
const allExercises = (w: WorkoutSnapshot) => w.sections.flatMap((s) => s.exercises);
const section = (w: WorkoutSnapshot, blockId: string) => w.sections.find((s) => s.blockId === blockId)!;
const byExercise = (w: WorkoutSnapshot, blockId: string, exerciseId: string) =>
  section(w, blockId).exercises.find((e) => (e.source.kind === "activity" ? e.source.activityId : e.source.exerciseId) === exerciseId)!;
const memberIds = (exercises: WorkoutExercise[]) => exercises.map((e) => (e.source.kind === "activity" ? e.source.activityId : e.source.exerciseId));

const completion = (sessionId: string, extra: Partial<SessionCompletion> = {}): SessionCompletion => ({
  planId: "plan-1",
  sessionId,
  completedAt: "2026-10-06T18:00:00.000Z",
  difficulty: "about-right",
  pain: false,
  notes: "",
  ...extra,
});

const sdcFocus = baseline({ SDC: t(3, 30) });
const plankFocus = baseline({ PLK: t(0, 50) });
const hrpFocus = baseline({ HRP: 5 });
const mdlFocus = baseline({ MDL: 120 });

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

describe("prescription parsing", () => {
  it("reads times, counts, repetitions, and rest the templates write", () => {
    expect(parseSeconds("1 minute")).toBe(60);
    expect(parseSeconds("20 minutes")).toBe(1200);
    expect(parseSeconds("30 seconds")).toBe(30);
    expect(parseSeconds("1:15")).toBe(75);
    expect(parseSeconds("a while")).toBeNull();
    expect(parseCount(undefined)).toEqual({ count: 1, unit: "set" });
    expect(parseCount("3")).toEqual({ count: 3, unit: "set" });
    expect(parseCount("1 round")).toEqual({ count: 1, unit: "round" });
    expect(parseCount("2 rounds")).toEqual({ count: 2, unit: "round" });
    expect(parseCount("3 holds")).toEqual({ count: 3, unit: "hold" });
    expect(parseCount("0")).toBeNull();
    expect(parseCount("a few")).toBeNull();
    expect(parseReps("10")).toEqual({ kind: "reps", reps: 10 });
    expect(parseReps("8–10")).toEqual({ kind: "rep-range", min: 8, max: 10 });
    expect(parseReps("up to 10")).toEqual({ kind: "reps", reps: 10, upTo: true });
    expect(parseReps("6 repetitions (5 seconds each, switching legs)")).toEqual({ kind: "reps", reps: 6, secondsEach: 5 });
    expect(parseReps("10–8")).toBeNull();
    expect(parseReps("as many as possible")).toBeNull();
    expect(parseRest("90 seconds")).toEqual({ text: "90 seconds", minSeconds: 90, maxSeconds: 90, between: "sets" });
    expect(parseRest("60–90 seconds")).toMatchObject({ minSeconds: 60, maxSeconds: 90, between: "sets" });
    expect(parseRest("60 seconds between rounds")).toMatchObject({ minSeconds: 60, maxSeconds: 60, between: "rounds" });
    expect(parseRest("as needed")).toBeNull();
  });

  it("parses each supported item format", () => {
    expect(parsePrescription({ sets: "2", reps: "8–10", rest: "90 seconds" })).toEqual({ count: 2, unit: "set", target: { kind: "rep-range", min: 8, max: 10 } });
    expect(parsePrescription({ sets: "3 rounds", time: "1 minute per exercise" })).toEqual({ count: 3, unit: "round", target: { kind: "duration", seconds: 60 } });
    expect(parsePrescription({ sets: "2 holds", time: "1:15" })).toEqual({ count: 2, unit: "hold", target: { kind: "hold", seconds: 75 } });
    expect(parsePrescription({ time: "20 minutes" })).toEqual({ count: 1, unit: "set", target: { kind: "duration", seconds: 1200 } });
    expect(parsePrescription({ reps: "4 repeats", time: "30 seconds fast, 60 seconds walking" })).toEqual({
      count: 4,
      unit: "repeat",
      target: { kind: "interval", workSeconds: 30, recoverySeconds: 60, work: "fast", recovery: "walking" },
    });
  });

  it("refuses formats it does not recognize instead of guessing", () => {
    expect(parsePrescription({})).toBeNull();
    expect(parsePrescription({ sets: "2", reps: "10", time: "1 minute" })).toBeNull();
    expect(parsePrescription({ sets: "2", reps: "AMRAP" })).toBeNull();
    expect(parsePrescription({ time: "Until tired" })).toBeNull();
    expect(parsePrescription({ sets: "2", reps: "4 repeats", time: "30 seconds fast, 60 seconds walking" })).toBeNull();
    expect(parsePrescription({ reps: "a few", time: "30 seconds fast, 60 seconds walking" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Drill expansion
// ---------------------------------------------------------------------------

describe("drill expansion", () => {
  it("expands the standard Preparation Drill into its 10 exercises in official order, 10 repetitions each", () => {
    const plan = stored(prefs());
    const pd = section(workout(plan, plan.sessions[0]), "pd");
    expect(memberIds(pd.exercises)).toEqual(getDrill("preparation-drill")!.sequence);
    expect(pd.excluded).toEqual([]);
    for (const [i, e] of pd.exercises.entries()) {
      expect(e.source).toMatchObject({ kind: "drill", drillId: "preparation-drill", order: i + 1 });
      expect(e.drillName).toBe("Preparation Drill");
      expect(e.sets).toHaveLength(1);
      expect(e.sets[0].target).toEqual({ kind: "reps", reps: 10 });
      expect(e.cadence).toMatch(/cadence/);
      expect(e.supported).toBe(true);
    }
    expect(byExercise(workout(plan, plan.sessions[0]), "pd", "high-jumper").cadence).toBe("Moderate cadence (80 counts per minute)");
  });

  it("keeps the condensed Preparation Drill's own order and repetitions", () => {
    const plan = stored(prefs({ sessionMinutes: 30 }));
    const pd = section(workout(plan, plan.sessions[0]), "pd-condensed");
    expect(pd.exercises.map((e) => [e.source.kind === "drill" && e.source.exerciseId, e.sets[0].target])).toEqual([
      ["push-up", { kind: "reps", reps: 5 }],
      ["high-jumper", { kind: "reps", reps: 10 }],
      ["rower", { kind: "reps", reps: 10 }],
      ["prone-row", { kind: "reps", reps: 5 }],
      ["rear-lunge", { kind: "reps", reps: 5 }],
      ["bent-leg-body-twist", { kind: "reps", reps: 5 }],
    ]);
    // Official positions in the full drill are kept for reference.
    expect(pd.exercises[0].source).toMatchObject({ order: 10 });
    expect(pd.excluded.map((x) => x.exerciseId).sort()).toEqual(["bend-and-reach", "forward-lunge", "squat-bender", "windmill"]);
    expect(pd.excluded.every((x) => x.reason === "plan")).toBe(true);
  });

  it("drops restricted exercises from the condensed drill", () => {
    const plan = stored(prefs({ sessionMinutes: 30, restrictions: ["no-jumping", "no-weight-on-hands"] }));
    const pd = section(workout(plan, plan.sessions[0]), "pd-condensed");
    expect(memberIds(pd.exercises)).toEqual(["rower", "prone-row", "rear-lunge", "bent-leg-body-twist"]);
  });

  it("respects the plan's omissions in the standard Preparation Drill", () => {
    const plan = stored(prefs({ restrictions: ["no-jumping", "no-weight-on-hands"] }), mdlFocus);
    const pd = section(workout(plan, plan.sessions[0]), "pd");
    const omitted = (plan.sessions[0].warmUp[0].items[0] as { omit: string[] }).omit;
    expect(omitted).toEqual(expect.arrayContaining(["high-jumper", "push-up"]));
    expect(memberIds(pd.exercises)).toEqual(getDrill("preparation-drill")!.sequence.filter((id) => !omitted.includes(id)));
    expect(pd.excluded.map((x) => x.exerciseId)).toEqual(omitted);
  });

  it("expands Four for the Core into holds, both sides, and the Back Bridge repetitions", () => {
    const plan = stored(prefs({ daysPerWeek: 5, weekdays: ["mon", "tue", "wed", "fri", "sat"] }));
    const recovery = firstOfKind(plan, "recovery");
    const core = section(workout(plan, recovery), "4c-recovery");
    expect(memberIds(core.exercises)).toEqual(["bent-leg-raise", "side-bridge", "back-bridge", "quadraplex"]);
    const [raise, side, bridge, quad] = core.exercises;
    expect(raise.sets.map((s) => s.target)).toEqual([{ kind: "hold", seconds: 60, upTo: true }]);
    expect(raise.unit).toBe("hold");
    expect(side.sets).toHaveLength(2);
    expect(side.sets[0].instruction).not.toBe(side.sets[1].instruction);
    expect(side.sets[0].instruction).toBeTruthy();
    expect(bridge.sets.map((s) => s.target)).toEqual([{ kind: "reps", reps: 6, secondsEach: 5 }]);
    expect(quad.sets).toHaveLength(2);
  });

  it("leaves out the Quadraplex when weight on the hands is restricted", () => {
    const plan = stored(prefs({ daysPerWeek: 5, weekdays: ["mon", "tue", "wed", "fri", "sat"], restrictions: ["no-weight-on-hands"], equipment: ["kettlebell"] }));
    const core = section(workout(plan, firstOfKind(plan, "recovery")), "4c-recovery");
    expect(memberIds(core.exercises)).toEqual(["bent-leg-raise", "side-bridge", "back-bridge"]);
    expect(core.excluded).toEqual([{ exerciseId: "quadraplex", name: "Quadraplex", reason: "plan" }]);
  });

  it("expands the Recovery Drill into each held position, 20–30 seconds", () => {
    const plan = stored(prefs());
    const rd = section(workout(plan, plan.sessions[0]), "rd");
    expect(memberIds(rd.exercises)).toEqual(getDrill("recovery-drill")!.sequence);
    for (const e of rd.exercises) {
      expect(e.unit).toBe("hold");
      expect(e.sets.length).toBe(2);
      for (const s of e.sets) {
        expect(s.target).toEqual({ kind: "hold-range", minSeconds: 20, maxSeconds: 30 });
        expect(s.instruction).toBeTruthy();
      }
    }
  });

  it("expands Military Movement Drill 1 over the 25-meter course, without the Shuttle Sprint on non-sprint days", () => {
    const plan = stored(prefs({ daysPerWeek: 4, weekdays: ["mon", "tue", "thu", "sat"] }), sdcFocus);
    const speed = section(workout(plan, firstOfKind(plan, "speed")), "mmd1");
    expect(speed.exercises.map((e) => [memberIds([e])[0], e.sets[0].target.kind === "distance" && e.sets[0].target.meters])).toEqual([
      ["vertical", 50],
      ["lateral", 50],
      ["shuttle-sprint", 75],
    ]);
    const conditioning = plan.sessions.find((s) => s.kind === "conditioning");
    if (conditioning) {
      const mmd = section(workout(plan, conditioning), "mmd1");
      expect(memberIds(mmd.exercises)).not.toContain("shuttle-sprint");
      expect(mmd.excluded).toContainEqual({ exerciseId: "shuttle-sprint", name: "Shuttle Sprint", reason: "plan" });
    }
  });

  it("matches the course distances to the library's printed prescriptions", () => {
    for (const [id, meters] of Object.entries(MMD1_COURSE)) {
      const printed = getExercise(id)!.executions.find((x) => x.drillId === "military-movement-drill-1")!.officialPrescription!;
      const legs = /^3 × 25/.test(printed) ? 3 : /out and 25 meters back|each direction/.test(printed) ? 2 : 0;
      expect(legs * 25).toBe(meters);
    }
    expect(Object.keys(MMD1_COURSE)).toEqual(getDrill("military-movement-drill-1")!.sequence);
  });

  it("expands Conditioning Drills 1 and 2 as one round, 5 repetitions then up to 10", () => {
    const plan = stored(prefs({ runningAccess: false }), sdcFocus);
    const session = firstOfKind(plan, "conditioning");
    const foundation = section(workout(plan, session), "cd");
    const build = section(workout(plan, session, "build"), "cd");
    expect(memberIds(foundation.exercises)).toEqual([...getDrill("conditioning-drill-1")!.sequence, ...getDrill("conditioning-drill-2")!.sequence]);
    for (const e of foundation.exercises) {
      expect(e.unit).toBe("round");
      expect(e.sets.map((s) => s.target)).toEqual([{ kind: "reps", reps: 5 }]);
    }
    for (const e of build.exercises) expect(e.sets.map((s) => s.target)).toEqual([{ kind: "reps", reps: 10, upTo: true }]);
  });

  it("leaves jumping exercises out of the Conditioning Drills when jumping is restricted", () => {
    const plan = stored(prefs({ runningAccess: false, restrictions: ["no-jumping"] }), sdcFocus);
    const cd = section(workout(plan, firstOfKind(plan, "conditioning")), "cd");
    expect(memberIds(cd.exercises)).not.toContain("power-jump");
    expect(memberIds(cd.exercises)).not.toContain("half-jack");
    expect(cd.excluded.map((x) => x.exerciseId).sort()).toEqual(["half-jack", "power-jump"]);
  });

  it("gives an exercise repeated across drills a separate tracking ID in each", () => {
    const plan = stored(prefs());
    const w = workout(plan, plan.sessions[0]);
    const lunge = allExercises(w).filter((e) => e.source.kind === "drill" && e.source.exerciseId === "rear-lunge");
    expect(lunge.map((e) => e.id)).toEqual(["w1-s1/warm-up/pd/preparation-drill.rear-lunge", "w1-s1/recovery/rd/recovery-drill.rear-lunge"]);
    expect(lunge[0].sets[0].target).toEqual({ kind: "reps", reps: 10 });
    expect(lunge[1].sets[0].target).toEqual({ kind: "hold-range", minSeconds: 20, maxSeconds: 30 });
  });
});

// ---------------------------------------------------------------------------
// Main workout formats
// ---------------------------------------------------------------------------

describe("main workout formats", () => {
  it("tracks barbell deadlift sets with a repetition range, rest, intensity, and the library caution", () => {
    const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), mdlFocus);
    const strength = firstOfKind(plan, "strength");
    const deadlift = byExercise(workout(plan, strength), "mdl-deadlift", "deadlift");
    expect(deadlift.unit).toBe("set");
    expect(deadlift.sets.map((s) => s.target)).toEqual(Array(2).fill({ kind: "rep-range", min: 8, max: 10 }));
    expect(deadlift.rest).toEqual({ text: "90 seconds", minSeconds: 90, maxSeconds: 90, between: "sets" });
    expect(deadlift.intensity).toMatch(/RPE 6–7/);
    expect(deadlift.safety).toEqual(getExercise("deadlift")!.cautions);
    expect(byExercise(workout(plan, strength, "build"), "mdl-deadlift", "deadlift").sets).toHaveLength(3);
  });

  it("tracks kettlebell stations as timed rounds with rest between rounds", () => {
    const plan = stored(prefs({ equipment: ["kettlebell"] }), mdlFocus);
    const w = workout(plan, firstOfKind(plan, "strength"));
    const block = section(w, "mdl-kettlebell");
    expect(memberIds(block.exercises)).toEqual(["sumo-squat", "straight-leg-deadlift"]);
    for (const e of block.exercises) {
      expect(e.unit).toBe("round");
      expect(e.sets.map((s) => s.target)).toEqual(Array(2).fill({ kind: "duration", seconds: 60 }));
      expect(e.rest).toMatchObject({ minSeconds: 60, between: "rounds" });
    }
  });

  it("keeps maintenance work at the same sets in both phases", () => {
    const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), sdcFocus);
    const strength = firstOfKind(plan, "strength");
    expect(byExercise(workout(plan, strength), "mdl-deadlift", "deadlift").sets).toHaveLength(2);
    expect(byExercise(workout(plan, strength, "build"), "mdl-deadlift", "deadlift").sets).toHaveLength(2);
  });

  it("tracks plank holds at the plan's hold time", () => {
    const plan = stored(prefs(), plankFocus);
    const strength = firstOfKind(plan, "strength");
    const plank = byExercise(workout(plan, strength), "plk-develop", "plank-practice");
    expect(plank.unit).toBe("hold");
    expect(plank.sets.map((s) => s.target)).toEqual(Array(2).fill({ kind: "hold", seconds: 25 }));
    expect(plank.rest).toMatchObject({ minSeconds: 60 });
    expect(byExercise(workout(plan, strength, "build"), "plk-develop", "plank-practice").sets).toHaveLength(3);
  });

  it("expands Four for the Core inside plank development without mixing it with plank holds", () => {
    const plan = stored(prefs({ sessionMinutes: 60 }), plankFocus);
    const block = section(workout(plan, firstOfKind(plan, "strength")), "plk-develop");
    expect(memberIds(block.exercises)).toEqual(["bent-leg-raise", "side-bridge", "back-bridge", "quadraplex", "plank-practice"]);
  });

  it("tracks push-up practice, the 8-Count T Push-Up, and a pressing accessory with its spotter note", () => {
    const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), hrpFocus);
    const strength = firstOfKind(plan, "strength");
    const foundation = workout(plan, strength);
    const block = section(foundation, "hrp-develop");
    expect(memberIds(block.exercises)).toEqual(["hrp-practice", "eight-count-t-push-up", "bench-press"]);
    const [practice, tPushUp, bench] = block.exercises;
    expect(practice.sets.map((s) => s.target)).toEqual(Array(3).fill({ kind: "reps", reps: 3 }));
    expect(practice.rest).toMatchObject({ minSeconds: 60, maxSeconds: 90 });
    expect(tPushUp.sets.map((s) => s.target)).toEqual([{ kind: "reps", reps: 5 }]);
    expect(byExercise(workout(plan, strength, "build"), "hrp-develop", "eight-count-t-push-up").sets[0].target).toEqual({ kind: "reps", reps: 10, upTo: true });
    expect(bench.safety).toEqual(expect.arrayContaining([...getExercise("bench-press")!.cautions, "Use a spotter at the head of the bench (ATP 7-22.02 para 14-12)"]));
  });

  it("tracks sprint intervals as repeats of 30 seconds fast and 60 seconds walking", () => {
    const plan = stored(prefs({ daysPerWeek: 4, weekdays: ["mon", "tue", "thu", "sat"] }), sdcFocus);
    const speed = firstOfKind(plan, "speed");
    const intervals = byExercise(workout(plan, speed), "intervals", "intervals-30-60");
    expect(intervals.unit).toBe("repeat");
    expect(intervals.sets).toHaveLength(4);
    expect(intervals.sets[0].target).toEqual({ kind: "interval", workSeconds: 30, recoverySeconds: 60, work: "fast", recovery: "walking" });
    expect(byExercise(workout(plan, speed, "build"), "intervals", "intervals-30-60").sets).toHaveLength(6);
  });

  it("tracks runs and walks as one timed effort at the plan's minutes", () => {
    const plan = stored(prefs());
    const run = byExercise(workout(plan, firstOfKind(plan, "endurance")), "easy-run", "easy-run");
    expect(run.sets.map((s) => s.target)).toEqual([{ kind: "duration", seconds: plan.sessions.find((s) => s.kind === "endurance")!.main[0].minutes * 60 }]);
    const walkPlan = stored(prefs({ runningAccess: false }));
    const walkSession = firstOfKind(walkPlan, "endurance");
    const walk = byExercise(workout(walkPlan, walkSession), "walk", "walk");
    expect(walk.sets.map((s) => s.target)).toEqual([{ kind: "duration", seconds: walkSession.main[0].minutes * 60 }]);
    expect(walk.intensity).toBe("RPE 4: brisk");
  });

  it("tracks the Step-Up station for SDC development with its step note", () => {
    const plan = stored(prefs({ equipment: ["kettlebell"], sessionMinutes: 60, daysPerWeek: 4, weekdays: ["mon", "tue", "thu", "sat"] }), sdcFocus);
    const stepUp = byExercise(workout(plan, firstOfKind(plan, "speed")), "sdc-step-up", "step-up");
    expect(stepUp.sets).toHaveLength(2);
    expect(stepUp.safety).toContain("Needs a 12–18 inch step");
  });
});

// ---------------------------------------------------------------------------
// Progression phase and safety
// ---------------------------------------------------------------------------

describe("progression phase and the pain pause", () => {
  const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), mdlFocus);
  const week3 = plan.sessions.find((s) => s.week === 3 && s.kind === "strength")!;

  it("uses the foundation prescription in weeks 1–2 and build in weeks 3–4", () => {
    expect(workoutPhase(plan, [], plan.sessions[0])).toEqual({ phase: "foundation", progressionHeld: false });
    expect(workoutPhase(plan, [], week3)).toEqual({ phase: "build", progressionHeld: false });
  });

  it("holds weeks 3–4 at the foundation level after a session rated too hard", () => {
    const outcome = sessionWorkout(plan, [completion("w1-s1", { difficulty: "too-hard" })], week3.id, CREATED);
    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.workout.phase).toBe("foundation");
    expect(outcome.workout.progressionHeld).toBe(true);
    expect(byExercise(outcome.workout, "mdl-deadlift", "deadlift").sets).toHaveLength(2);
  });

  it("offers no workout and accepts no set records after a pain report", () => {
    const pain = [completion("w1-s1", { pain: true })];
    expect(sessionWorkout(plan, pain, "w1-s2", CREATED)).toEqual({ status: "paused", message: PAIN_PAUSE_MESSAGE });
    const w = workout(plan, sessionOf(plan, "w1-s2"));
    expect(recordSetCompletion([], w, { setId: workoutSetIds(w)[0], completedAt: CREATED }, pain)).toEqual({ ok: false, errors: [PAIN_PAUSE_MESSAGE] });
  });

  it("reports unknown sessions", () => {
    expect(sessionWorkout(plan, [], "w9-s9", CREATED)).toEqual({ status: "not-found" });
  });

  it("carries the plan's sources, assumptions, and template version", () => {
    const w = workout(plan, plan.sessions[0]);
    expect(w.templateVersion).toBe(plan.templateVersion);
    expect(w.safety).toEqual(["Stop and seek advice if you have pain."]);
    for (const [i, s] of w.sections.entries()) {
      const block = [...plan.sessions[0].warmUp, ...plan.sessions[0].main, ...plan.sessions[0].recovery][i];
      expect(s).toMatchObject({ blockId: block.id, title: block.title, minutes: block.minutes, sources: block.sources, assumptions: block.assumptions });
    }
  });
});

// ---------------------------------------------------------------------------
// Tracking IDs
// ---------------------------------------------------------------------------

describe("tracking IDs", () => {
  const plan = stored(prefs({ equipment: ["kettlebell"] }), mdlFocus);

  it("are deterministic", () => {
    expect(workout(plan, plan.sessions[0])).toEqual(workout(stored(prefs({ equipment: ["kettlebell"] }), mdlFocus), plan.sessions[0]));
  });

  it("are unique within a plan, across sessions, weeks, and repeated session types", () => {
    const ids = plan.sessions.flatMap((s) => {
      const w = workout(plan, s, "build");
      return [...w.sections.map((x) => x.id), ...allExercises(w).map((e) => e.id), ...workoutSetIds(w)];
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stay the same after rescheduling", () => {
    const data = startPlan(EMPTY_TRAINING, plan, { id: "plan-1", createdAt: CREATED, startDate: START });
    const moved = rescheduleSession(data, "plan-1", "w1-s1", "2026-10-06");
    expect(moved.error).toBeUndefined();
    const session = sessionOf(moved.data.plans[0], "w1-s1");
    expect(moved.data.plans[0].reschedules["w1-s1"]).toBeDefined();
    expect(workoutSetIds(workout(moved.data.plans[0], session))).toEqual(workoutSetIds(workout(plan, sessionOf(plan, "w1-s1"))));
  });

  it("keep the foundation sets' IDs when the build phase adds sets", () => {
    const strength = plan.sessions.find((s) => s.week === 3 && s.kind === "strength")!;
    const foundation = workoutSetIds(workout(plan, strength));
    const build = workoutSetIds(workout(plan, strength, "build"));
    expect(build.length).toBeGreaterThan(foundation.length);
    expect(build).toEqual(expect.arrayContaining(foundation));
  });

  it("number repeats of the same block or exercise within a session", () => {
    const session = structuredClone(plan.sessions[0]);
    session.main.push(structuredClone(session.main[0]));
    session.main[0].items.push(structuredClone(session.main[0].items[0]));
    const w = workout(plan, session);
    const ids = allExercises(w).map((e) => e.id);
    expect(ids).toContain("w1-s1/main/mdl-kettlebell/sumo-squat~2");
    expect(w.sections.map((s) => s.id)).toContain("w1-s1/main/mdl-kettlebell~2");
    expect(new Set(workoutSetIds(w)).size).toBe(workoutSetIds(w).length);
  });

  it("use readable paths", () => {
    const w = workout(plan, plan.sessions[0]);
    expect(byExercise(w, "mdl-kettlebell", "sumo-squat").sets.map((s) => s.id)).toEqual(["w1-s1/main/mdl-kettlebell/sumo-squat/1", "w1-s1/main/mdl-kettlebell/sumo-squat/2"]);
  });
});

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

describe("completion", () => {
  const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), mdlFocus);
  const w = workout(plan, firstOfKind(plan, "strength"));
  const ids = workoutSetIds(w);
  const rec = (setId: string, completedAt = "2026-10-05T18:00:00.000Z", extra: Partial<SetCompletion> = {}): SetCompletion => ({
    planId: "plan-1",
    sessionId: w.sessionId,
    setId,
    completedAt,
    ...extra,
  });

  it("starts at zero and reaches 100% only when every set is recorded", () => {
    expect(workoutProgress(w, []).overall).toMatchObject({ completed: 0, total: ids.length, percent: 0, exercisesCompleted: 0 });
    const all = ids.map((id) => rec(id));
    expect(workoutProgress(w, all).overall).toMatchObject({ completed: ids.length, percent: 100, exercisesCompleted: allExercises(w).length });
    expect(workoutProgress(w, all.slice(1)).overall.percent).toBeLessThan(100);
  });

  it("calculates exercise and section completion", () => {
    const deadlift = byExercise(w, "mdl-deadlift", "deadlift");
    const progress = workoutProgress(w, [rec(deadlift.sets[0].id)]);
    expect(progress.exercises.find((e) => e.id === deadlift.id)).toMatchObject({ completed: 1, total: 2, percent: 50, complete: false });
    const sectionProgress = progress.sections.find((s) => s.id === section(w, "mdl-deadlift").id)!;
    expect(sectionProgress).toMatchObject({ completed: 1, total: 2, percent: 50, exercisesCompleted: 0, exercisesTotal: 1 });
    const both = workoutProgress(w, deadlift.sets.map((s) => rec(s.id)));
    expect(both.exercises.find((e) => e.id === deadlift.id)!.complete).toBe(true);
    expect(both.sections.find((s) => s.id === section(w, "mdl-deadlift").id)).toMatchObject({ percent: 100, exercisesCompleted: 1 });
    expect(both.overall.exercisesCompleted).toBe(1);
  });

  it("ignores duplicate, unknown, and other-session records", () => {
    const records = [
      rec(ids[0]),
      rec(ids[0], "2026-10-05T18:05:00.000Z"),
      rec("w1-s1/main/made-up/1"),
      rec(ids[1], undefined, { sessionId: "w2-s1" }),
      rec(ids[1], undefined, { planId: "plan-2" }),
    ];
    const progress = workoutProgress(w, records);
    expect(progress.overall.completed).toBe(1);
    expect(progress.ignored).toEqual({ duplicate: 1, unknown: 1, otherSession: 2 });
    expect(workoutProgress(w, ids.flatMap((id) => [rec(id), rec(id)])).overall.percent).toBe(100);
  });

  it("rounds down so partial progress never shows 100%", () => {
    const total = ids.length;
    const percent = workoutProgress(w, ids.slice(1).map((id) => rec(id))).overall.percent!;
    expect(percent).toBe(Math.floor(((total - 1) * 100) / total));
    expect(percent).toBeLessThan(100);
  });

  it("returns null percentages when there is nothing to track", () => {
    const empty: WorkoutSnapshot = { ...w, sections: [] };
    expect(workoutProgress(empty, []).overall).toMatchObject({ completed: 0, total: 0, percent: null });
  });

  it("records a set once, replacing an earlier record, with optional actual performance", () => {
    const first = recordSetCompletion([], w, { setId: ids[0], completedAt: "2026-10-05T18:00:00.000Z" }, []);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.records).toEqual([{ planId: "plan-1", sessionId: w.sessionId, setId: ids[0], completedAt: "2026-10-05T18:00:00.000Z" }]);
    const second = recordSetCompletion(first.records, w, { setId: ids[0], completedAt: "2026-10-05T18:02:00.000Z", actual: { reps: 9, load: { value: 135, unit: "lb" } } }, []);
    expect(second.ok && second.records).toEqual([
      { planId: "plan-1", sessionId: w.sessionId, setId: ids[0], completedAt: "2026-10-05T18:02:00.000Z", actual: { reps: 9, load: { value: 135, unit: "lb" } } },
    ]);
    if (second.ok) {
      expect(latestSetRecords(w, second.records).get(ids[0])!.actual?.reps).toBe(9);
      expect(undoSetCompletion(second.records, "plan-1", w.sessionId, ids[0])).toEqual([]);
    }
  });

  it("keeps the newest record per set for actual performance", () => {
    const latest = latestSetRecords(w, [rec(ids[0], "2026-10-05T18:05:00.000Z", { actual: { reps: 8 } }), rec(ids[0], "2026-10-05T18:00:00.000Z", { actual: { reps: 6 } }), rec("unknown/1")]);
    expect([...latest.keys()]).toEqual([ids[0]]);
    expect(latest.get(ids[0])!.actual).toEqual({ reps: 8 });
  });

  it("rejects unknown sets, bad timestamps, and impossible performance", () => {
    expect(recordSetCompletion([], w, { setId: "w1-s1/main/nope/1", completedAt: CREATED }, [])).toEqual({ ok: false, errors: ["That set is not part of this workout."] });
    expect(recordSetCompletion([], w, { setId: ids[0], completedAt: "yesterday" }, [])).toEqual({ ok: false, errors: ["Completion time must be an ISO timestamp."] });
    const bad = recordSetCompletion([], w, { setId: ids[0], completedAt: CREATED, actual: { reps: 2.5, seconds: -1, meters: Number.NaN, load: { value: -5, unit: "lb" } } }, []);
    expect(bad.ok === false && bad.errors).toHaveLength(4);
  });

  it("does not count whole-session records as completed sets", () => {
    const progress = workoutProgress(w, [completion(w.sessionId) as unknown as SetCompletion]);
    expect(progress.overall.completed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unsupported prescriptions, safety re-checks, and older plans
// ---------------------------------------------------------------------------

describe("unsupported prescriptions and compatibility", () => {
  it("tracks an unrecognized prescription as one set as written, and lists it", () => {
    const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), mdlFocus);
    const session = structuredClone(firstOfKind(plan, "strength"));
    const item = session.main[0].items[0];
    item.prescription.foundation = { sets: "2", reps: "as many as you can", rest: "90 seconds", intensity: "Easy" };
    const w = workout(plan, session);
    const deadlift = byExercise(w, "mdl-deadlift", "deadlift");
    expect(deadlift.supported).toBe(false);
    expect(deadlift.sets).toEqual([{ id: `${deadlift.id}/1`, number: 1, target: { kind: "as-prescribed", text: "2 · as many as you can · rest 90 seconds" } }]);
    expect(deadlift.intensity).toBe("Easy");
    expect(w.unsupported).toEqual([{ id: deadlift.id, name: "Deadlift", text: "2 · as many as you can · rest 90 seconds" }]);
  });

  it("treats an unrecognized rest as unsupported rather than dropping it", () => {
    const plan = stored(prefs({ equipment: ["barbell-or-hex-bar"] }), mdlFocus);
    const session = structuredClone(firstOfKind(plan, "strength"));
    session.main[0].items[0].prescription.foundation.rest = "as needed";
    expect(byExercise(workout(plan, session), "mdl-deadlift", "deadlift").supported).toBe(false);
  });

  it("treats unrecognized drill wording from an older template as unsupported for each exercise", () => {
    const plan = stored(prefs());
    const session = structuredClone(plan.sessions[0]);
    session.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    const pd = section(workout(plan, session), "pd");
    expect(pd.exercises).toHaveLength(10);
    expect(pd.exercises.every((e) => !e.supported && e.sets.length === 1 && e.sets[0].target.kind === "as-prescribed")).toBe(true);
  });

  it("leaves out exercises and drills that are not in the library", () => {
    const plan = stored(prefs());
    const session = structuredClone(plan.sessions[0]);
    session.main[0].items.push({ kind: "exercise", exerciseId: "mystery-lift", prescription: { foundation: { sets: "3", reps: "10" }, build: { sets: "3", reps: "10" } } });
    session.main[0].items.push({ kind: "drill", drillId: "conditioning-drill-9" as never, prescription: { foundation: {}, build: {} } });
    const w = workout(plan, session);
    expect(w.sections.find((s) => s.phase === "main")!.excluded).toEqual(
      expect.arrayContaining([
        { exerciseId: "mystery-lift", name: "mystery-lift", reason: "unknown" },
        { exerciseId: "conditioning-drill-9", name: "conditioning-drill-9", reason: "unknown" },
      ])
    );
    expect(w.unsupported.map((u) => u.name)).toEqual(["mystery-lift", "conditioning-drill-9"]);
    expect(workoutSetIds(w).some((id) => id.includes("mystery"))).toBe(false);
  });

  it("never prompts an exercise the stored restrictions or equipment rule out, even if a plan lists it", () => {
    const plan = stored(prefs({ restrictions: ["no-weight-on-hands", "no-jumping"], equipment: [] }));
    const session = structuredClone(plan.sessions[0]);
    session.warmUp[0].items[0] = { ...session.warmUp[0].items[0], omit: [] } as typeof session.warmUp[0]["items"][0];
    session.main[0].items.push({ kind: "exercise", exerciseId: "bench-press", prescription: { foundation: { sets: "2", reps: "8–10" }, build: { sets: "2", reps: "8–10" } } });
    session.main[0].items.push({ kind: "activity", activityId: "hrp-practice", prescription: { foundation: { sets: "2", reps: "5" }, build: { sets: "2", reps: "5" } } });
    const w = workout(plan, session);
    const pd = section(w, "pd");
    expect(memberIds(pd.exercises)).not.toContain("push-up");
    expect(memberIds(pd.exercises)).not.toContain("high-jumper");
    expect(pd.excluded).toEqual(
      expect.arrayContaining([
        { exerciseId: "push-up", name: "Push-Up", reason: "restriction" },
        { exerciseId: "high-jumper", name: "High Jumper", reason: "restriction" },
      ])
    );
    const main = w.sections.find((s) => s.phase === "main")!;
    expect(main.excluded).toEqual(
      expect.arrayContaining([
        { exerciseId: "bench-press", name: "Bench Press", reason: "equipment" },
        { exerciseId: "hrp-practice", name: "Hand-release push-up practice", reason: "restriction" },
      ])
    );
  });

  it("never prompts running when the stored answers rule it out", () => {
    const plan = stored(prefs());
    const tampered: StoredPlan = { ...plan, preferences: { ...plan.preferences, restrictions: ["no-running"] } };
    const w = workout(tampered, firstOfKind(plan, "endurance"));
    expect(allExercises(w).some((e) => e.source.kind === "activity" && e.source.activityId === "easy-run")).toBe(false);
    expect(section(w, "easy-run").excluded).toEqual([{ exerciseId: "easy-run", name: "Easy continuous run", reason: "restriction" }]);
  });

  it("works with plans saved before pathways and timelines, and leaves session records unchanged", () => {
    const plan = stored(prefs());
    const { pathway: _pathway, timeline: _timeline, ...legacy } = plan;
    void _pathway;
    void _timeline;
    const old = { ...legacy, templateVersion: "starter-4wk-v3-draft" } as StoredPlan;
    const completions = [completion("w1-s1")];
    const before = structuredClone(completions);
    const outcome = sessionWorkout(old, completions, "w1-s2", CREATED);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.workout.templateVersion).toBe("starter-4wk-v3-draft");
      expect(outcome.workout.unsupported).toEqual([]);
    }
    expect(completions).toEqual(before);
  });

  it("does not modify the plan", () => {
    const plan = stored(prefs({ equipment: ["kettlebell"] }), mdlFocus);
    const before = structuredClone(plan);
    for (const s of plan.sessions) workout(plan, s, "build");
    expect(plan).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Generated plans across preference combinations
// ---------------------------------------------------------------------------

describe("generated plans across preferences", () => {
  const BASELINES = { balanced: baseline(), slowRun: baseline({ "2MR": t(24, 0) }), mdlFocus, sdcFocus, hrpFocus, noHrp: baseline({ HRP: 0 }), plankFocus };
  const RESTRICTIONS: Restriction[] = ["no-running", "no-jumping", "no-loaded-lifting", "no-weight-on-hands"];
  const restrictionSets = RESTRICTIONS.reduce<Restriction[][]>((all, r) => all.concat(all.map((s) => [...s, r])), [[]]).filter((s) => s.length < 4);
  const EQUIPMENT: EquipmentOption[][] = [[], ["kettlebell"], ["dumbbell"], ["barbell-or-hex-bar"], ["kettlebell", "dumbbell", "barbell-or-hex-bar"]];
  const VOLUMES = Object.keys(runningLimits) as RunningVolume[];
  const SCHEDULES: Preferences["weekdays"][] = [["mon", "thu"], ["mon", "wed", "fri"], ["mon", "tue", "thu", "sat"], ["mon", "tue", "wed", "fri", "sat"]];
  const MINUTES = [30, 45, 60] as const;

  // Every combination for every baseline would be ~45,000 plans; each dimension is covered fully and the others
  // rotate through it, which still checks every restriction set with every equipment option and schedule.
  const cases: { name: string; p: Preferences; b: BaselineSnapshot }[] = [];
  let n = 0;
  for (const [name, b] of Object.entries(BASELINES))
    for (const restrictions of restrictionSets)
      for (const equipment of EQUIPMENT)
        for (const weekdays of SCHEDULES) {
          n++;
          cases.push({
            name,
            b,
            p: prefs({
              restrictions,
              equipment,
              weekdays,
              daysPerWeek: weekdays.length as Preferences["daysPerWeek"],
              sessionMinutes: MINUTES[n % 3],
              recentRunning: VOLUMES[n % VOLUMES.length],
              runningAccess: n % 7 !== 0,
              experience: (["new", "some", "regular"] as const)[n % 3],
            }),
          });
        }

  const problems: string[] = [];
  let plans = 0;
  let sets = 0;
  const kinds = new Set<string>();
  for (const { name, p, b } of cases) {
    const outcome = generatePlan({ baseline: b, prefs: p, screening: { currentPain: false, otherInstructions: "" }, startDate: START });
    if (outcome.status !== "ready") continue;
    plans++;
    const plan = startPlan(EMPTY_TRAINING, outcome.plan, { id: "plan-1", createdAt: CREATED, startDate: START }).plans[0];
    const label = `${name} ${JSON.stringify(p)}`;
    const restrictions = new Set(p.restrictions);
    const seen = new Set<string>();
    for (const session of plan.sessions) {
      const phase = workoutPhase(plan, [], session).phase;
      const w = buildWorkout(plan, session, { phase, createdAt: CREATED });
      const foundation = phase === "build" ? buildWorkout(plan, session, { phase: "foundation", createdAt: CREATED }) : w;
      if (w.unsupported.length) problems.push(`${label} ${session.id}: unsupported ${JSON.stringify(w.unsupported)}`);
      for (const s of w.sections) {
        for (const x of s.excluded) if (x.reason !== "plan") problems.push(`${label} ${s.id}: ${x.exerciseId} excluded for ${x.reason}`);
        const block = [...session.warmUp, ...session.main, ...session.recovery].find((bl) => bl.id === s.blockId)!;
        for (const item of block.items) {
          if (item.kind !== "drill") continue;
          const tracked = s.exercises.filter((e) => e.source.kind === "drill" && e.source.drillId === item.drillId).map((e) => (e.source as { exerciseId: string }).exerciseId);
          for (const id of item.omit ?? []) if (tracked.includes(id)) problems.push(`${label} ${s.id}: omitted ${id} is tracked`);
          if (block.id !== "pd-condensed") {
            const expected = getDrill(item.drillId)!.sequence.filter((id) => !item.omit?.includes(id));
            if (JSON.stringify(tracked) !== JSON.stringify(expected)) problems.push(`${label} ${s.id}: ${item.drillId} order ${tracked} != ${expected}`);
          }
        }
        for (const e of s.exercises) {
          kinds.add(e.sets[0]?.target.kind);
          if (!e.supported || e.sets.length === 0) problems.push(`${label} ${e.id}: no trackable sets`);
          if (e.source.kind !== "activity" && !exerciseAllowed(e.source.exerciseId, restrictions)) problems.push(`${label} ${e.id}: restricted exercise tracked`);
          if (e.source.kind === "activity" && ["easy-run", "intervals-30-60"].includes(e.source.activityId) && (restrictions.has("no-running") || !p.runningAccess))
            problems.push(`${label} ${e.id}: running tracked`);
        }
      }
      for (const id of [...w.sections.map((s) => s.id), ...allExercises(w).map((e) => e.id), ...workoutSetIds(w)]) {
        if (seen.has(id)) problems.push(`${label}: duplicate ID ${id}`);
        seen.add(id);
      }
      const foundationIds = workoutSetIds(foundation);
      const ids = workoutSetIds(w);
      if (!foundationIds.every((id) => ids.includes(id))) problems.push(`${label} ${session.id}: build drops foundation sets`);
      sets += ids.length;
    }
  }

  it("generates trackable workouts for a broad set of ready plans", () => {
    expect(plans).toBeGreaterThan(1500);
    expect(sets).toBeGreaterThan(plans * 100);
  });

  it("uses every supported target format", () => {
    expect([...kinds].sort()).toEqual(["distance", "duration", "hold", "hold-range", "interval", "rep-range", "reps"]);
  });

  it("finds no unsupported prescription, safety exclusion, broken order, duplicate ID, or lost set", () => {
    expect(problems.slice(0, 10)).toEqual([]);
  });
});
