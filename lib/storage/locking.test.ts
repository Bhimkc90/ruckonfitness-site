import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { createBackup, planImport, serializeBackup, validateBackup } from "@/lib/backup/backup";
import { generatePlan } from "@/lib/training/engine";
import { PAIN_PAUSE_MESSAGE, sessionDate } from "@/lib/training/progress";
import { ONE_PER_DAY, planSessionStates } from "@/lib/training/sessionStatus";
import { buildWorkout, trackableSetIds } from "@/lib/training/workout";
import type { SessionCompletion } from "@/lib/training/types";
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
  undoCompletionBlock,
  type TrainingData,
} from "./trainingPlans";
import { completeTrackedWorkout, recordWorkoutSet, reportPain, saveStartOrResumeWorkout, saveTrackedCompletion, saveWorkoutSet, startOrResumeWorkout } from "./workouts";

// Week 1: w1-s1 strength Mon 10-05, w1-s2 endurance Wed 10-07, w1-s3 strength Fri 10-09. Week 2 starts Mon 10-12.
const START = "2026-10-05";
const at = (date: string, hour = 17) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;

function fresh(): TrainingData {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 120, HRP: 40, SDC: 110, PLK: 150, "2MR": 990 } };
  const outcome = generatePlan({
    baseline: { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) },
    prefs: { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: ["barbell-or-hex-bar"], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] },
    screening: { currentPain: false, otherInstructions: "" },
    startDate: START,
  });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return startPlan(EMPTY_TRAINING, outcome.plan, { id: "p1", createdAt: "2026-10-01T00:00:00.000Z", startDate: START });
}

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error((r as unknown as { error: string }).error);
  return r as Extract<T, { ok: true }>;
}
const errorOf = (r: { ok: boolean }) => (r.ok ? "" : (r as unknown as { error: string }).error);
const record = (sessionId: string, date: string, extra: Partial<SessionCompletion> = {}) => ({
  planId: "p1",
  sessionId,
  completedAt: at(date, 18),
  difficulty: "about-right" as const,
  pain: false,
  notes: "",
  ...extra,
});
const quick = (data: TrainingData, sessionId: string, date: string, extra: Partial<SessionCompletion> = {}) => completeSession(data, record(sessionId, date, extra));
const ids = (data: TrainingData, sessionId: string) => trackableSetIds(data.workouts.find((w) => w.sessionId === sessionId)!.snapshot);

// Start, record every set, and complete a tracked workout on one day.
function track(data: TrainingData, sessionId: string, date: string): TrainingData {
  let d = ok(startOrResumeWorkout(data, "p1", sessionId, at(date, 16))).data;
  d = ids(d, sessionId).reduce((x, setId) => ok(recordWorkoutSet(x, "p1", sessionId, { setId, completedAt: at(date, 17) })).data, d);
  return ok(completeTrackedWorkout(d, "p1", sessionId, { completedAt: at(date, 18), difficulty: "about-right", pain: false, notes: "" })).data;
}

describe("starting workouts", () => {
  it("starts the first workout on its date, not before", () => {
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w1-s1", at("2026-10-04")))).toBe("Available on Oct 5.");
    expect(ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).resumed).toBe(false);
  });

  it("won't start a later workout until every earlier one is completed", () => {
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w1-s2", at("2026-10-07")))).toMatch(/^Complete Strength.*\(Oct 5\) first/);
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w2-s1", at("2026-10-12")))).toMatch(/first/);
  });

  it("keeps the next workout locked when every set is recorded but the workout isn't completed", () => {
    let data = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    data = ids(data, "w1-s1").reduce((x, setId) => ok(recordWorkoutSet(x, "p1", "w1-s1", { setId, completedAt: at(START, 18) })).data, data);
    expect(errorOf(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07")))).toMatch(/first/);
    data = ok(completeTrackedWorkout(data, "p1", "w1-s1", { completedAt: at("2026-10-06"), difficulty: "easy", pain: false, notes: "" })).data;
    expect(ok(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07"))).resumed).toBe(false);
  });

  it("unlocks across weeks only in order", () => {
    let data = track(track(fresh(), "w1-s1", START), "w1-s2", "2026-10-07");
    expect(errorOf(startOrResumeWorkout(data, "p1", "w2-s1", at("2026-10-12")))).toMatch(/first/);
    data = track(data, "w1-s3", "2026-10-09");
    expect(errorOf(startOrResumeWorkout(data, "p1", "w2-s1", at("2026-10-11")))).toBe("Available on Oct 12.");
    expect(ok(startOrResumeWorkout(data, "p1", "w2-s1", at("2026-10-12"))).resumed).toBe(false);
  });

  it("allows one workout per day", () => {
    const late = track(fresh(), "w1-s1", "2026-10-07"); // Monday's workout done on Wednesday
    expect(errorOf(startOrResumeWorkout(late, "p1", "w1-s2", at("2026-10-07", 20)))).toBe(ONE_PER_DAY);
    expect(ok(startOrResumeWorkout(late, "p1", "w1-s2", at("2026-10-08"))).resumed).toBe(false);
  });

  it("rejects invalid IDs and times, and ended plans", () => {
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w1-s1/../x", at(START)))).toBe("Invalid session ID.");
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w9-s9", at(START)))).toBe("Session not found.");
    expect(errorOf(startOrResumeWorkout(fresh(), "p1", "w1-s1", "Monday"))).toBe("Start time must be an ISO timestamp.");
    expect(errorOf(startOrResumeWorkout(endPlan(fresh(), "p1"), "p1", "w1-s1", at(START)))).toBe("This plan has ended.");
  });
});

describe("recording and completing locked workouts", () => {
  // A stored workout for w1-s2 while w1-s1 is unfinished, as an older version or a merged backup could leave it.
  function outOfTurn(): TrainingData {
    const data = fresh();
    const plan = data.plans[0];
    const snapshot = buildWorkout(plan, plan.sessions.find((s) => s.id === "w1-s2")!, { phase: "foundation", createdAt: at("2026-10-07") });
    return { ...data, workouts: [{ planId: "p1", sessionId: "w1-s2", status: "in-progress", startedAt: at("2026-10-07"), snapshot }] };
  }

  it("won't record sets or complete a workout that is out of turn, and keeps its sets", () => {
    const data = { ...outOfTurn() };
    const setId = ids(data, "w1-s2")[0];
    data.setRecords = [{ planId: "p1", sessionId: "w1-s2", setId, completedAt: at("2026-10-07") }];
    const error = errorOf(recordWorkoutSet(data, "p1", "w1-s2", { setId: ids(data, "w1-s2")[1], completedAt: at("2026-10-07") }));
    expect(error).toMatch(/first\. Workouts unlock in order\. Sets you already recorded are kept\./);
    expect(errorOf(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07")))).toMatch(/first/);
    expect(errorOf(completeTrackedWorkout(data, "p1", "w1-s2", { completedAt: at("2026-10-07", 19), difficulty: "easy", pain: false, notes: "" }))).toMatch(/first/);
    expect(planSessionStates(data.plans[0], data, at("2026-10-07")).sessions[1].status).toBe("locked");
  });

  it("won't complete a second workout on the same day", () => {
    let data = track(fresh(), "w1-s1", "2026-10-07");
    // A workout for w1-s2 started the day before, as a merged backup could leave it.
    const plan = data.plans[0];
    const snapshot = buildWorkout(plan, plan.sessions.find((s) => s.id === "w1-s2")!, { phase: "foundation", createdAt: at("2026-10-06") });
    data = { ...data, workouts: [...data.workouts, { planId: "p1", sessionId: "w1-s2", status: "in-progress", startedAt: at("2026-10-06"), snapshot }] };
    data = { ...data, setRecords: [...data.setRecords, ...ids(data, "w1-s2").map((setId) => ({ planId: "p1", sessionId: "w1-s2", setId, completedAt: at("2026-10-07") }))] };
    expect(errorOf(completeTrackedWorkout(data, "p1", "w1-s2", { completedAt: at("2026-10-07", 20), difficulty: "easy", pain: false, notes: "" }))).toBe(ONE_PER_DAY);
  });
});

describe("the plan view's quick record", () => {
  it("records only the session whose turn it is, on or after its date", () => {
    const data = fresh();
    expect(quick(data, "w1-s2", "2026-10-07")).toBe(data);
    expect(legacyCompletionBlock(data, "p1", "w1-s2", at("2026-10-07"))).toMatch(/first/);
    expect(quick(data, "w1-s1", "2026-10-04")).toBe(data);
    expect(legacyCompletionBlock(data, "p1", "w1-s1", at("2026-10-04"))).toBe("Available on Oct 5.");
    const first = quick(data, "w1-s1", START);
    expect(first.completions).toHaveLength(1);
    expect(quick(first, "w1-s2", START)).toBe(first); // its date hasn't come
    expect(quick(first, "w1-s2", "2026-10-07").completions).toHaveLength(2);
  });

  it("keeps pain from a refused out-of-turn record", () => {
    const next = quick(fresh(), "w1-s3", "2026-10-09", { pain: true, notes: "hip" });
    expect(next.completions).toEqual([]);
    expect(next.painReports).toEqual([{ planId: "p1", sessionId: "w1-s3", reportedAt: at("2026-10-09", 18), notes: "hip" }]);
  });

  it("can't complete a session that has a tracked workout, or one with an unread prescription", () => {
    const started = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    expect(quick(started, "w1-s1", START)).toBe(started);
    const unread = fresh();
    unread.plans[0].sessions.find((s) => s.id === "w1-s1")!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    expect(quick(unread, "w1-s1", START)).toBe(unread);
    expect(legacyCompletionBlock(unread, "p1", "w1-s1", at(START))).toMatch(/later workouts stay locked/);
  });

  it("can't replace an earlier record once a later session is started", () => {
    let data = quick(fresh(), "w1-s1", START);
    data = ok(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07"))).data;
    expect(quick(data, "w1-s1", "2026-10-07", { difficulty: "too-hard" })).toBe(data);
  });
});

describe("undo", () => {
  it("refuses to undo an earlier completion once a later session is completed or started", () => {
    const two = quick(quick(fresh(), "w1-s1", START), "w1-s2", "2026-10-07");
    expect(undoCompletionBlock(two, "p1", "w1-s1")).toMatch(/is already started or completed\. Changing an earlier session now would leave your history out of order/);
    expect(undoCompletion(two, "p1", "w1-s1")).toBe(two);
    const startedLater = ok(startOrResumeWorkout(quick(fresh(), "w1-s1", START), "p1", "w1-s2", at("2026-10-07"))).data;
    expect(undoCompletion(startedLater, "p1", "w1-s1")).toBe(startedLater);
    expect(startedLater.workouts).toHaveLength(1);
  });

  it("undoes the latest completion, which relocks what follows", () => {
    const two = quick(quick(fresh(), "w1-s1", START), "w1-s2", "2026-10-07");
    const undone = undoCompletion(two, "p1", "w1-s2");
    expect(undone.completions.map((c) => c.sessionId)).toEqual(["w1-s1"]);
    expect(planSessionStates(undone.plans[0], undone, at("2026-10-09")).sessions[2]).toMatchObject({ status: "locked", waitingFor: "w1-s2" });
  });

  it("explains invalid undo requests", () => {
    expect(undoCompletionBlock(fresh(), "p1", "w1-s1")).toBe("This session isn't recorded.");
    expect(undoCompletionBlock(fresh(), "p1", "w9-s9")).toBe("Session not found.");
  });
});

describe("rescheduling", () => {
  it("moves a missed workout forward explicitly, which makes the next one available", () => {
    const data = fresh();
    const moved = rescheduleSession(data, "p1", "w1-s1", "2026-10-08", at("2026-10-07"));
    expect(moved.error).toBeUndefined();
    const states = planSessionStates(moved.data.plans[0], moved.data, at("2026-10-07"));
    expect(states.earliestUnfinished).toMatchObject({ sessionId: "w1-s2", status: "available" });
    expect(states.sessions.find((s) => s.sessionId === "w1-s1")).toMatchObject({ status: "locked", date: "2026-10-08" });
    expect(moved.data.completions).toEqual([]);
  });

  it("won't move into the past, onto another session's date, or a completed or started workout", () => {
    const data = quick(fresh(), "w1-s1", START);
    expect(rescheduleSession(data, "p1", "w1-s2", "2026-10-06", at("2026-10-07")).error).toMatch(/today or a later date/);
    expect(rescheduleSession(data, "p1", "w1-s2", "2026-10-09", at("2026-10-06")).error).toMatch(/already on that date/);
    expect(rescheduleSession(data, "p1", "w1-s1", "2026-10-06", at(START)).error).toMatch(/keep their date/);
    const started = ok(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07"))).data;
    expect(rescheduleSession(started, "p1", "w1-s2", "2026-10-08", at("2026-10-07")).error).toMatch(/keep their date/);
  });

  it("won't move a session ahead of a completed one (older out-of-order history)", () => {
    // w1-s2 was recorded before w1-s1 by an older version.
    const data: TrainingData = { ...fresh(), completions: [record("w1-s2", "2026-10-07")] };
    expect(rescheduleSession(data, "p1", "w1-s1", "2026-10-06", at("2026-10-06")).error).toMatch(/before a workout you've already completed or started/);
  });

  it("keeps recorded progress and snapshots when another session moves", () => {
    let data = quick(fresh(), "w1-s1", START);
    data = ok(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07"))).data;
    data = ok(recordWorkoutSet(data, "p1", "w1-s2", { setId: ids(data, "w1-s2")[0], completedAt: at("2026-10-07") })).data;
    const before = structuredClone({ workouts: data.workouts, setRecords: data.setRecords });
    const moved = rescheduleSession(data, "p1", "w1-s3", "2026-10-10", at("2026-10-07"));
    expect(moved.error).toBeUndefined();
    expect({ workouts: moved.data.workouts, setRecords: moved.data.setRecords }).toEqual(before);
    expect(sessionDate(moved.data.plans[0], moved.data.plans[0].sessions.find((s) => s.id === "w1-s3")!)).toBe("2026-10-10");
  });

  it("still warns about the AFT day and back-to-back hard sessions", () => {
    const data = quick(fresh(), "w1-s1", START);
    const aft = { ...data, plans: [{ ...data.plans[0], preferences: { ...data.plans[0].preferences, nextAftDate: "2026-10-10" } }] };
    expect(rescheduleSession(aft, "p1", "w1-s3", "2026-10-10", at("2026-10-07")).warning).toMatch(/AFT day/);
    expect(rescheduleSession(data, "p1", "w1-s3", "2026-10-06", at("2026-10-06")).warning).toMatch(/another hard session/);
  });

  it("won't move anything on a paused or ended plan", () => {
    const paused = ok(reportPain(fresh(), "p1", "w1-s1", { reportedAt: at(START), notes: "" })).data;
    expect(rescheduleSession(paused, "p1", "w1-s2", "2026-10-08", at(START)).error).toBe(PAIN_PAUSE_MESSAGE);
    expect(rescheduleSession(endPlan(fresh(), "p1"), "p1", "w1-s2", "2026-10-08", at(START)).error).toBe("This plan has ended.");
  });
});

describe("pain overrides everything", () => {
  it("pauses an available workout, and pain is accepted whatever the session's status", () => {
    const data = ok(reportPain(fresh(), "p1", "w2-s3", { reportedAt: at(START), notes: "locked session" })).data;
    expect(errorOf(startOrResumeWorkout(data, "p1", "w1-s1", at(START)))).toBe(PAIN_PAUSE_MESSAGE);
    expect(quick(data, "w1-s1", START)).toBe(data);
    expect(planSessionStates(data.plans[0], data, at(START)).status).toBe("paused");
  });
});

describe("backups", () => {
  const text = (training: TrainingData) => serializeBackup(createBackup({ aftResults: [], training, profile: null, settings: null }, { exportedAt: at("2026-10-10"), appVersion: "0.1.0" }));

  it("restores the same session statuses", () => {
    let data = track(fresh(), "w1-s1", START);
    data = ok(startOrResumeWorkout(data, "p1", "w1-s2", at("2026-10-07"))).data;
    const parsed = validateBackup(text(data));
    if (!parsed.ok) throw new Error(parsed.error);
    const now = at("2026-10-08");
    expect(planSessionStates(parsed.data.training.plans[0], parsed.data.training, now)).toEqual(planSessionStates(data.plans[0], data, now));
  });

  it("restores older out-of-order history without skipping the missed workout", () => {
    const old = fresh();
    const b = JSON.parse(text(old));
    b.data.trainingPlans = { schemaVersion: 1, plans: old.plans, completions: [record("w1-s2", "2026-10-07")] };
    const parsed = validateBackup(JSON.stringify(b));
    if (!parsed.ok) throw new Error(parsed.error);
    const states = planSessionStates(parsed.data.training.plans[0], parsed.data.training, at("2026-10-09"));
    expect(states.earliestUnfinished).toMatchObject({ sessionId: "w1-s1", status: "overdue" });
    expect(states.sessions.find((s) => s.sessionId === "w1-s2")!.status).toBe("completed");
    expect(states.sessions.find((s) => s.sessionId === "w1-s3")).toMatchObject({ status: "locked", waitingFor: "w1-s1" });
  });

  it("can't lift a pause by replacing with an older backup of the same plan", () => {
    const older = validateBackup(text(fresh()));
    if (!older.ok) throw new Error(older.error);
    const paused = ok(reportPain(fresh(), "p1", "w1-s1", { reportedAt: at(START), notes: "" })).data;
    const next = planImport({ aftResults: [], training: paused, profile: null, settings: null }, older.data, "replace", at("2026-10-10")).next;
    expect(planSessionStates(next.training.plans[0], next.training, at(START)).status).toBe("paused");
  });
});

describe("saving operations use the device clock", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  beforeEach(() => {
    store.clear();
    g.window = {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    delete g.window;
    vi.useRealTimers();
  });

  it("can't start a workout before its date or out of turn, however it is called", () => {
    store.set(TRAINING_KEY, JSON.stringify(fresh()));
    vi.setSystemTime(new Date(at("2026-10-04")));
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s1"))).toBe("Available on Oct 5.");
    vi.setSystemTime(new Date(at("2026-10-07")));
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s2"))).toMatch(/first/);
    expect(parseTrainingData(store.get(TRAINING_KEY)!).workouts).toEqual([]);
  });

  it("completes in turn and saves each step", () => {
    store.set(TRAINING_KEY, JSON.stringify(fresh()));
    vi.setSystemTime(new Date(at(START, 16)));
    expect(saveStartOrResumeWorkout("p1", "w1-s1").ok).toBe(true);
    for (const setId of ids(parseTrainingData(store.get(TRAINING_KEY)!), "w1-s1")) expect(saveWorkoutSet("p1", "w1-s1", { setId }).ok).toBe(true);
    expect(saveTrackedCompletion("p1", "w1-s1", { difficulty: "easy", pain: false, notes: "" }).ok).toBe(true);
    vi.setSystemTime(new Date(at(START, 20)));
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s2"))).toBe("Available on Oct 7.");
    vi.setSystemTime(new Date(at("2026-10-07")));
    expect(saveStartOrResumeWorkout("p1", "w1-s2").ok).toBe(true);
  });
});
