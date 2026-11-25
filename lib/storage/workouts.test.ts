import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { generatePlan } from "@/lib/training/engine";
import { PAIN_PAUSE_MESSAGE, sessionsByDate } from "@/lib/training/progress";
import { buildWorkout, trackableSetIds } from "@/lib/training/workout";
import type { BaselineSnapshot, Preferences } from "@/lib/training/types";
import {
  EMPTY_TRAINING,
  TRAINING_KEY,
  completeSession,
  endPlan,
  legacyCompletionBlock,
  parseTrainingData,
  rescheduleSession,
  startPlan,
  undoCompletion,
  updateTrainingData,
  type TrainingData,
} from "./trainingPlans";
import {
  completeTrackedWorkout,
  recordWorkoutSet,
  reportPain,
  saveStartOrResumeWorkout,
  saveWorkoutSet,
  savePainReport,
  startOrResumeWorkout,
  trackedWorkout,
  undoWorkoutSet,
} from "./workouts";

const t = (m: number, s: number) => m * 60 + s;
function baseline(raw: Partial<AftInput["raw"]> = {}, id = "r1"): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw } };
  return { resultId: id, testDate: "2026-09-01", input, result: scoreAft(input) };
}
const prefs: Preferences = { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: ["barbell-or-hex-bar"], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] };
const START = "2026-10-05";
const AT = "2026-10-05T17:00:00.000Z";
const LATER = "2026-10-05T18:00:00.000Z";

function withPlan(data: TrainingData, id: string, b = baseline({ MDL: 120 })): TrainingData {
  const outcome = generatePlan({ baseline: b, prefs, screening: { currentPain: false, otherInstructions: "" }, startDate: START });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return startPlan(data, outcome.plan, { id, createdAt: "2026-10-01T00:00:00.000Z", startDate: START });
}

const fresh = () => withPlan(EMPTY_TRAINING, "p1");
const strengthId = (data: TrainingData, week = 1, planId = "p1") => data.plans.find((p) => p.id === planId)!.sessions.find((s) => s.week === week && s.kind === "strength")!.id;
const S1 = strengthId(fresh());

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error((result as unknown as { error: string }).error);
  return result as Extract<T, { ok: true }>;
}
const started = (data = fresh(), sessionId = S1, planId = "p1") => ok(startOrResumeWorkout(data, planId, sessionId, AT)).data;
const setIds = (data: TrainingData, sessionId = S1, planId = "p1") => trackableSetIds(data.workouts.find((w) => w.planId === planId && w.sessionId === sessionId)!.snapshot);
function recordAll(data: TrainingData, sessionId = S1, planId = "p1", ids = setIds(data, sessionId, planId)): TrainingData {
  return ids.reduce((d, setId) => ok(recordWorkoutSet(d, planId, sessionId, { setId, completedAt: LATER })).data, data);
}
const feedback = { completedAt: "2026-10-05T19:00:00.000Z", difficulty: "about-right" as const, pain: false, notes: "" };
const on = (date: string, hour = 17) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const dateOf = (data: TrainingData, sessionId: string, planId = "p1") => sessionsByDate(data.plans.find((p) => p.id === planId)!).find((d) => d.session.id === sessionId)!.date;

// Records every session before the given one, in order, each on its own date (the plan view's quick record).
function completeEarlier(data: TrainingData, sessionId: string, planId = "p1"): TrainingData {
  let d = data;
  for (const { session, date } of sessionsByDate(data.plans.find((p) => p.id === planId)!)) {
    if (session.id === sessionId) break;
    d = completeSession(d, { planId, sessionId: session.id, completedAt: on(date, 18), difficulty: "about-right", pain: false, notes: "" });
  }
  return d;
}

// A stored workout added directly, as a backup or an older version could leave one.
function withStoredWorkout(data: TrainingData, sessionId: string): TrainingData {
  const plan = data.plans[0];
  const snapshot = buildWorkout(plan, plan.sessions.find((s) => s.id === sessionId)!, { phase: "foundation", createdAt: AT });
  return { ...data, workouts: [...data.workouts, { planId: plan.id, sessionId, status: "in-progress", startedAt: AT, snapshot }] };
}
const errorOf = (result: { ok: boolean }) => (result.ok ? "" : (result as unknown as { error: string }).error);

// ---------------------------------------------------------------------------
// Migration and reading storage
// ---------------------------------------------------------------------------

describe("migration from schema 1", () => {
  it("keeps every plan and completion and adds empty workout records", () => {
    const v1 = completeSession(fresh(), { planId: "p1", sessionId: S1, completedAt: LATER, difficulty: "hard", pain: false, notes: "legacy" });
    const raw = JSON.stringify({ schemaVersion: 1, plans: v1.plans, completions: v1.completions });
    const parsed = parseTrainingData(raw);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.plans).toEqual(v1.plans);
    expect(parsed.completions).toEqual(v1.completions);
    expect(parsed).toMatchObject({ workouts: [], setRecords: [], painReports: [] });
  });

  it("never creates set records for a legacy completed session", () => {
    const legacy = parseTrainingData(JSON.stringify({ ...completeSession(fresh(), { planId: "p1", sessionId: S1, completedAt: LATER, difficulty: "easy", pain: false, notes: "" }), schemaVersion: 1 }));
    expect(trackedWorkout(legacy, "p1", S1)).toBeNull();
    expect(errorOf(startOrResumeWorkout(legacy, "p1", S1, AT))).toBe("This session is already recorded.");
    expect(legacy.setRecords).toEqual([]);
  });

  it("ignores workout lists in a schema 1 file and still rejects unknown versions", () => {
    const data = started();
    expect(parseTrainingData(JSON.stringify({ ...data, schemaVersion: 1 })).workouts).toEqual([]);
    expect(parseTrainingData(JSON.stringify({ ...data, schemaVersion: 99 }))).toEqual(EMPTY_TRAINING);
  });

  it("round-trips schema 2 data exactly", () => {
    let data = started();
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: setIds(data)[0], completedAt: LATER, actual: { reps: 9, load: { value: 135, unit: "lb" } } })).data;
    data = ok(reportPain(withPlan(data, "p2"), "p2", "w1-s1", { reportedAt: LATER, notes: "knee" })).data;
    expect(parseTrainingData(JSON.stringify(data))).toEqual(data);
  });
});

describe("reading damaged storage", () => {
  const corrupt = (mutate: (raw: Record<string, unknown> & TrainingData) => void) => {
    const data = recordAll(started(), S1, "p1", setIds(started()).slice(0, 2));
    const raw = JSON.parse(JSON.stringify(data));
    mutate(raw);
    return parseTrainingData(JSON.stringify(raw));
  };

  it("drops a workout whose snapshot no longer matches its plan, with its set records", () => {
    const tampered = corrupt((raw) => {
      raw.workouts[0].snapshot.sections[1].exercises[0].prescription.sets = "10";
    });
    expect(tampered.workouts).toEqual([]);
    expect(tampered.setRecords).toEqual([]);
    expect(tampered.plans).toHaveLength(1);
    expect(corrupt((raw) => (raw.workouts[0].snapshot.templateVersion = "other")).workouts).toEqual([]);
    expect(corrupt((raw) => (raw.workouts[0].snapshot.phase = "build")).workouts).toEqual([]); // week 1 can't be build
    expect(corrupt((raw) => raw.workouts[0].snapshot.sections[1].exercises[0].sets.push({ ...raw.workouts[0].snapshot.sections[1].exercises[0].sets[0] }))).toMatchObject({ workouts: [] });
    expect(corrupt((raw) => ((raw as unknown as { workouts: unknown }).workouts = "nope")).workouts).toEqual([]);
  });

  it("drops set records that are unknown, malformed, or out of range, and keeps the newest of duplicates", () => {
    const parsed = corrupt((raw) => {
      raw.setRecords.push({ ...raw.setRecords[0], setId: "w1-s1/main/nope/1" });
      raw.setRecords.push({ ...raw.setRecords[0], completedAt: "yesterday" });
      raw.setRecords.push({ ...raw.setRecords[0], actual: { reps: 10_000 } });
      raw.setRecords.push({ ...raw.setRecords[0], completedAt: "2026-10-05T18:30:00.000Z", actual: { reps: 7 } });
    });
    expect(parsed.setRecords).toHaveLength(2);
    expect(parsed.setRecords.find((r) => r.setId === setIds(started())[0])!.actual).toEqual({ reps: 7 });
    expect(trackedWorkout(parsed, "p1", S1)!.progress.overall.completed).toBe(2);
  });

  it("keeps a damaged pain report so the plan stays paused", () => {
    const parsed = corrupt((raw) => {
      raw.painReports = [{ planId: "p1", sessionId: 42, reportedAt: null, notes: { x: 1 } } as never];
    });
    expect(parsed.painReports).toEqual([{ planId: "p1", sessionId: "", reportedAt: "", notes: "" }]);
    expect(errorOf(startOrResumeWorkout(parsed, "p1", strengthId(parsed, 2), AT))).toBe(PAIN_PAUSE_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("starting and resuming", () => {
  it("stores the frozen snapshot the engine builds", () => {
    const data = started();
    const plan = data.plans[0];
    const stored = data.workouts[0];
    expect(stored).toMatchObject({ planId: "p1", sessionId: S1, status: "in-progress", startedAt: AT });
    expect(stored.snapshot).toEqual(buildWorkout(plan, plan.sessions.find((s) => s.id === S1)!, { phase: "foundation", createdAt: AT }));
  });

  it("resumes the stored workout without changing data", () => {
    const data = started();
    const again = ok(startOrResumeWorkout(data, "p1", S1, "2026-10-05T20:00:00.000Z"));
    expect(again.resumed).toBe(true);
    expect(again.data).toBe(data);
    expect(again.workout).toEqual(data.workouts[0].snapshot);
    expect(again.workout.createdAt).toBe(AT);
  });

  it("keeps a week 3 build workout after later feedback would hold progression", () => {
    const week3 = strengthId(fresh(), 3);
    const ready = completeEarlier(fresh(), week3);
    let data = ok(startOrResumeWorkout(ready, "p1", week3, on(dateOf(ready, week3)))).data;
    expect(data.workouts[0].snapshot.phase).toBe("build");
    const before = structuredClone(data.workouts[0]);
    // Storage won't take new feedback on an earlier session once a later one has started...
    expect(completeSession(data, { planId: "p1", sessionId: "w1-s2", completedAt: LATER, difficulty: "too-hard", pain: false, notes: "" })).toBe(data);
    // ...and feedback that arrives anyway (merged from a backup) doesn't change the started workout.
    data = { ...data, completions: data.completions.map((c) => (c.sessionId === "w1-s2" ? { ...c, difficulty: "too-hard" as const } : c)) };
    const resumed = ok(startOrResumeWorkout(data, "p1", week3, on(dateOf(ready, week3), 19)));
    expect(resumed.workout).toEqual(before.snapshot);
    expect(resumed.notice).toMatch(/applies from your next workout/);
    expect(resumed.data.workouts[0]).toEqual(before);
  });

  it("refuses a stored workout that no longer matches the plan version", () => {
    const data = started();
    const changed: TrainingData = { ...data, plans: [{ ...data.plans[0], templateVersion: "other" }] };
    expect(errorOf(startOrResumeWorkout(changed, "p1", S1, AT))).toBe("This workout was started from a different version of the plan.");
  });

  it("rejects invalid IDs, timestamps, and ended plans", () => {
    const data = fresh();
    expect(errorOf(startOrResumeWorkout(data, "", S1, AT))).toBe("Invalid plan ID.");
    expect(errorOf(startOrResumeWorkout(data, "p1", "../w1", AT))).toBe("Invalid session ID.");
    expect(errorOf(startOrResumeWorkout(data, 42 as never, S1, AT))).toBe("Invalid plan ID.");
    expect(errorOf(startOrResumeWorkout(data, "p9", S1, AT))).toBe("Plan not found.");
    expect(errorOf(startOrResumeWorkout(data, "p1", "w9-s9", AT))).toBe("Session not found.");
    expect(errorOf(startOrResumeWorkout(data, "p1", S1, "today"))).toBe("Start time must be an ISO timestamp.");
    expect(errorOf(startOrResumeWorkout(endPlan(data, "p1"), "p1", S1, AT))).toBe("This plan has ended.");
  });
});

describe("recording sets", () => {
  it("saves partial progress with actual performance and reports it per exercise, section, and workout", () => {
    let data = started();
    const ids = setIds(data);
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: ids[0], completedAt: LATER, actual: { reps: 10 } })).data;
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: ids[1], completedAt: LATER, actual: { seconds: 45, meters: 50, load: { value: 60, unit: "kg" } } })).data;
    const view = trackedWorkout(data, "p1", S1)!;
    expect(view.progress.overall).toMatchObject({ completed: 2, total: ids.length });
    expect(view.progress.sections[0]).toMatchObject({ completed: 2 });
    expect(view.progress.exercises[0]).toMatchObject({ completed: 1, total: 1, complete: true });
    expect(view.readiness).toEqual({ status: "incomplete", remaining: ids.length - 2 });
    expect(data.setRecords[1].actual).toEqual({ seconds: 45, meters: 50, load: { value: 60, unit: "kg" } });
  });

  it("replaces a repeated record and undoes one, so progress is never inflated", () => {
    let data = started();
    const [first] = setIds(data);
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: first, completedAt: LATER, actual: { reps: 8 } })).data;
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: first, completedAt: "2026-10-05T18:01:00.000Z", actual: { reps: 9 } })).data;
    expect(data.setRecords).toHaveLength(1);
    expect(data.setRecords[0].actual).toEqual({ reps: 9 });
    data = ok(undoWorkoutSet(data, "p1", S1, first, LATER)).data;
    expect(data.setRecords).toEqual([]);
    expect(errorOf(undoWorkoutSet(data, "p1", S1, first, LATER))).toBe("That set isn't recorded.");
  });

  it("rejects unknown, untrackable, and malformed sets and impossible performance", () => {
    const data = started();
    const [first] = setIds(data);
    expect(errorOf(recordWorkoutSet(fresh(), "p1", S1, { setId: first, completedAt: LATER }))).toBe("This workout hasn't been started.");
    expect(errorOf(recordWorkoutSet(data, "p1", S1, { setId: "w1-s1/main/nope/1", completedAt: LATER }))).toBe("That set is not part of this workout.");
    expect(errorOf(recordWorkoutSet(data, "p1", S1, { setId: "<script>", completedAt: LATER }))).toBe("Invalid set ID.");
    expect(errorOf(recordWorkoutSet(data, "p1", S1, { setId: first, completedAt: "soon" }))).toBe("Time must be an ISO timestamp.");
    for (const actual of [{ reps: -1 }, { reps: 1.5 }, { reps: 5000 }, { seconds: 1e9 }, { meters: Infinity }, { load: { value: 2000, unit: "lb" } }, { load: { value: 10, unit: "stone" } }, { speed: 3 }])
      expect(errorOf(recordWorkoutSet(data, "p1", S1, { setId: first, completedAt: LATER, actual: actual as never }))).not.toBe("");
    expect(data.setRecords).toEqual([]);
  });

  it("won't start an unread prescription, or record sets on one that is stored", () => {
    const data = fresh();
    data.plans[0].sessions.find((s) => s.id === S1)!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    expect(errorOf(startOrResumeWorkout(data, "p1", S1, AT))).toMatch(/could not read "10 of each"/);
    expect(data.workouts).toEqual([]);
    const stored = withStoredWorkout(data, S1);
    const unread = stored.workouts[0].snapshot.sections[0].exercises[0].sets[0].id;
    expect(errorOf(recordWorkoutSet(stored, "p1", S1, { setId: unread, completedAt: LATER }))).toMatch(/later workouts stay locked/);
    expect(errorOf(recordWorkoutSet(stored, "p1", S1, { setId: setIds(stored)[0], completedAt: LATER }))).toMatch(/later workouts stay locked/);
  });

  it("keeps plans and sessions separate", () => {
    let data = withPlan(started(), "p2", baseline({ MDL: 120 }, "r2"));
    data = { ...data, plans: data.plans.map((p) => (p.id === "p1" ? { ...p, status: "active" as const } : p)) };
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: setIds(data)[0], completedAt: LATER })).data;
    data = started(data, S1, "p2");
    expect(trackedWorkout(data, "p1", S1)!.progress.overall.completed).toBe(1);
    expect(trackedWorkout(data, "p2", S1)!.progress.overall.completed).toBe(0);
    expect(trackedWorkout(data, "p1", "w1-s2")).toBeNull();
    expect(errorOf(recordWorkoutSet(data, "p1", "w1-s2", { setId: setIds(data)[1], completedAt: LATER }))).toBe("This workout hasn't been started.");
  });
});

describe("completing a tracked workout", () => {
  it("refuses an incomplete workout and completes once every set and the feedback are recorded", () => {
    let data = started();
    data = ok(recordWorkoutSet(data, "p1", S1, { setId: setIds(data)[0], completedAt: LATER })).data;
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, feedback))).toBe(`${setIds(data).length - 1} sets are not recorded yet.`);
    data = recordAll(data);
    const done = ok(completeTrackedWorkout(data, "p1", S1, feedback));
    expect(done.completion).toEqual({ planId: "p1", sessionId: S1, ...feedback });
    expect(done.data.workouts[0]).toMatchObject({ status: "completed", completedAt: feedback.completedAt });
    expect(done.data.completions).toContainEqual(done.completion);
    expect(errorOf(recordWorkoutSet(done.data, "p1", S1, { setId: setIds(data)[0], completedAt: LATER }))).toBe("This workout is already complete.");
    expect(errorOf(undoWorkoutSet(done.data, "p1", S1, setIds(data)[0], LATER))).toBe("This workout is already complete.");
    expect(errorOf(startOrResumeWorkout(done.data, "p1", S1, AT))).toBe("This workout is already complete.");
  });

  it("requires the session feedback", () => {
    const data = recordAll(started());
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, { ...feedback, difficulty: "fine" as never }))).toBe("Choose how hard the session was.");
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, { ...feedback, pain: undefined as never }))).toBe("Answer whether you had pain.");
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, { ...feedback, notes: 5 as never }))).toBe("Notes must be text.");
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, { ...feedback, completedAt: "2026-10-01T00:00:00.000Z" }))).toMatch(/after the workout started/);
  });

  it("never completes a workout with an unread prescription", () => {
    const data = fresh();
    data.plans[0].sessions.find((s) => s.id === S1)!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    const stored = withStoredWorkout(data, S1);
    // Every readable set recorded (as a restored backup could hold them).
    const all: TrainingData = { ...stored, setRecords: setIds(stored).map((setId) => ({ planId: "p1", sessionId: S1, setId, completedAt: LATER })) };
    expect(errorOf(completeTrackedWorkout(all, "p1", S1, feedback))).toMatch(/^Bend and Reach: RuckOn could not read/);
    expect(trackedWorkout(all, "p1", S1)!.readiness.status).toBe("blocked");
    expect(completeSession(all, { planId: "p1", sessionId: S1, ...feedback })).toBe(all);
  });

  it("pauses the plan when the feedback reports pain", () => {
    const done = ok(completeTrackedWorkout(recordAll(started()), "p1", S1, { ...feedback, pain: true }));
    expect(errorOf(startOrResumeWorkout(done.data, "p1", "w1-s2", AT))).toBe(PAIN_PAUSE_MESSAGE);
  });

  it("blocks the plan view's quick record for a tracked session, and reopens a tracked workout on undo", () => {
    let data = started();
    expect(legacyCompletionBlock(data, "p1", S1)).toMatch(/tracked workout/);
    expect(completeSession(data, { planId: "p1", sessionId: S1, ...feedback })).toBe(data);
    data = ok(completeTrackedWorkout(recordAll(data), "p1", S1, feedback)).data;
    const reopened = undoCompletion(data, "p1", S1);
    expect(reopened.completions).toEqual([]);
    expect(reopened.workouts[0].status).toBe("in-progress");
    expect(reopened.workouts[0]).not.toHaveProperty("completedAt");
    expect(trackedWorkout(reopened, "p1", S1)!.progress.overall.percent).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Pain
// ---------------------------------------------------------------------------

describe("pain during a workout", () => {
  const partial = () => recordAll(started(), S1, "p1", setIds(started()).slice(0, 2));

  it("saves the report immediately, keeps recorded sets, and completes nothing", () => {
    const data = partial();
    const result = ok(reportPain(data, "p1", S1, { reportedAt: LATER, setId: setIds(data)[2], notes: "sharp pain" }));
    expect(result.report).toEqual({ planId: "p1", sessionId: S1, reportedAt: LATER, setId: setIds(data)[2], notes: "sharp pain" });
    expect(result.message).toBe(PAIN_PAUSE_MESSAGE);
    expect(result.data.setRecords).toEqual(data.setRecords);
    expect(result.data.completions).toEqual([]);
    expect(result.data.workouts[0].status).toBe("in-progress");
    expect(trackedWorkout(result.data, "p1", S1)!.readiness).toEqual({ status: "paused", message: PAIN_PAUSE_MESSAGE });
  });

  it("pauses the whole plan: no starts, sets, undo, completion, rescheduling, or quick records", () => {
    const data = ok(reportPain(partial(), "p1", S1, { reportedAt: LATER, notes: "" })).data;
    expect(errorOf(startOrResumeWorkout(data, "p1", "w1-s2", AT))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(startOrResumeWorkout(data, "p1", S1, AT))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(recordWorkoutSet(data, "p1", S1, { setId: setIds(data)[3], completedAt: LATER }))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(undoWorkoutSet(data, "p1", S1, setIds(data)[0], LATER))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(completeTrackedWorkout(data, "p1", S1, feedback))).toBe(PAIN_PAUSE_MESSAGE);
    expect(rescheduleSession(data, "p1", "w1-s2", "2026-10-08").error).toBe(PAIN_PAUSE_MESSAGE);
    expect(completeSession(data, { planId: "p1", sessionId: "w1-s3", ...feedback })).toBe(data);
    expect(legacyCompletionBlock(data, "p1", "w1-s3")).toBe(PAIN_PAUSE_MESSAGE);
  });

  it("keeps pain from a refused quick record as a pain report", () => {
    const data = ok(reportPain(partial(), "p1", S1, { reportedAt: LATER, notes: "" })).data;
    const next = completeSession(data, { planId: "p1", sessionId: "w1-s3", ...feedback, pain: true, notes: "again" });
    expect(next.completions).toEqual([]);
    expect(next.painReports).toHaveLength(2);
    expect(next.painReports[1]).toEqual({ planId: "p1", sessionId: "w1-s3", reportedAt: feedback.completedAt, notes: "again" });
  });

  it("never lets undo lift a pause", () => {
    let data = completeSession(fresh(), { planId: "p1", sessionId: S1, ...feedback, pain: true });
    expect(undoCompletion(data, "p1", S1)).toBe(data);
    expect(completeSession(data, { planId: "p1", sessionId: S1, ...feedback, pain: false })).toBe(data);
    data = ok(reportPain(fresh(), "p1", S1, { reportedAt: LATER, notes: "" })).data;
    expect(undoCompletion(data, "p1", S1)).toBe(data);
    expect(data.painReports).toHaveLength(1);
  });

  it("accepts a report without a workout, on a paused plan, and on an ended plan", () => {
    const first = ok(reportPain(fresh(), "p1", "w2-s1", { reportedAt: LATER, notes: "" })).data;
    expect(first.painReports[0]).toEqual({ planId: "p1", sessionId: "w2-s1", reportedAt: LATER, notes: "" });
    expect(ok(reportPain(first, "p1", "w2-s2", { reportedAt: LATER, notes: "" })).data.painReports).toHaveLength(2);
    expect(ok(reportPain(endPlan(fresh(), "p1"), "p1", S1, { reportedAt: LATER, notes: "" })).data.painReports).toHaveLength(1);
  });

  it("rejects malformed reports", () => {
    expect(errorOf(reportPain(fresh(), "p1", S1, { reportedAt: "now", notes: "" }))).toBe("Report time must be an ISO timestamp.");
    expect(errorOf(reportPain(fresh(), "p1", S1, { reportedAt: LATER, setId: "w1-s1/main/x/1", notes: "" }))).toBe("That set is not part of this workout.");
    expect(errorOf(reportPain(started(), "p1", S1, { reportedAt: LATER, setId: "w1-s1/main/x/1", notes: "" }))).toBe("That set is not part of this workout.");
    expect(errorOf(reportPain(fresh(), "p1", S1, { reportedAt: LATER, notes: null as never }))).toBe("Notes must be text.");
    expect(errorOf(reportPain(fresh(), "p9", S1, { reportedAt: LATER, notes: "" }))).toBe("Plan not found.");
    expect(ok(reportPain(fresh(), "p1", S1, { reportedAt: LATER, notes: "x".repeat(900) })).report.notes).toHaveLength(500);
  });

  it("does not pause another plan", () => {
    let data = withPlan(fresh(), "p2", baseline({ MDL: 120 }, "r2"));
    data = ok(reportPain(data, "p1", S1, { reportedAt: LATER, notes: "" })).data;
    expect(ok(startOrResumeWorkout(data, "p2", S1, AT)).resumed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Browser storage
// ---------------------------------------------------------------------------

describe("saving to browser storage", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  let fail = false;

  beforeEach(() => {
    store.clear();
    fail = false;
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (fail) throw new Error("QuotaExceededError");
          store.set(k, v);
        },
        removeItem: (k: string) => void store.delete(k),
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    // The saving operations read the clock themselves.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AT));
  });
  afterEach(() => {
    delete g.window;
    vi.useRealTimers();
  });

  const stored = () => parseTrainingData(store.get(TRAINING_KEY) ?? null);

  it("saves each operation as soon as it succeeds, upgrading schema 1 data", () => {
    store.set(TRAINING_KEY, JSON.stringify({ schemaVersion: 1, plans: fresh().plans, completions: [] }));
    expect(saveStartOrResumeWorkout("p1", S1).ok).toBe(true);
    expect(JSON.parse(store.get(TRAINING_KEY)!).schemaVersion).toBe(2);
    expect(stored().workouts).toHaveLength(1);
    const [first] = setIds(stored());
    expect(saveWorkoutSet("p1", S1, { setId: first }).ok).toBe(true);
    expect(stored().setRecords).toHaveLength(1);
    expect(savePainReport("p1", S1, { notes: "" }).ok).toBe(true);
    expect(stored().painReports).toHaveLength(1);
    expect(stored().plans).toEqual(fresh().plans);
  });

  it("leaves stored data unchanged when a write fails", () => {
    store.set(TRAINING_KEY, JSON.stringify(started()));
    const before = store.get(TRAINING_KEY);
    fail = true;
    const result = saveWorkoutSet("p1", S1, { setId: setIds(started())[0] });
    expect(result).toEqual({ ok: false, error: "Could not save on this device. Browser storage may be full or disabled." });
    expect(store.get(TRAINING_KEY)).toBe(before);
    fail = false;
    expect(saveWorkoutSet("p1", S1, { setId: setIds(started())[0] }).ok).toBe(true);
  });

  it("does not save a refused operation", () => {
    store.set(TRAINING_KEY, JSON.stringify(fresh()));
    const before = store.get(TRAINING_KEY);
    expect(saveWorkoutSet("p1", S1, { setId: "x/1" }).ok).toBe(false);
    expect(store.get(TRAINING_KEY)).toBe(before);
  });

  it("never overwrites data saved by a newer version", () => {
    const newer = JSON.stringify({ schemaVersion: 3, plans: [], completions: [], future: true });
    store.set(TRAINING_KEY, newer);
    expect(savePainReport("p1", S1, { notes: "" }).ok).toBe(false);
    expect(saveStartOrResumeWorkout("p1", S1).ok).toBe(false);
    // Creating a plan succeeds on the empty data a newer file reads as, so the write itself must refuse.
    expect(updateTrainingData(() => fresh()).ok).toBe(false);
    expect(store.get(TRAINING_KEY)).toBe(newer);
  });

  it("keeps the training section when only a pain report remains", async () => {
    const { writeLocalData, readLocalData } = await import("./localData");
    const data = ok(reportPain(fresh(), "p1", S1, { reportedAt: LATER, notes: "" })).data;
    const onlyPain: TrainingData = { ...data, plans: data.plans };
    expect(writeLocalData({ aftResults: [], training: onlyPain, profile: null, settings: null }).ok).toBe(true);
    expect(readLocalData().training.painReports).toHaveLength(1);
  });
});
