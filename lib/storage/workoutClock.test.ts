import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { createBackup, planImport, serializeBackup, validateBackup } from "@/lib/backup/backup";
import { generatePlan } from "@/lib/training/engine";
import { PAIN_PAUSE_MESSAGE } from "@/lib/training/progress";
import { trackableSetIds } from "@/lib/training/workout";
import { TIMER_GRACE_MS, formatClock, pauseTimer, resumeTimer, timerElapsedMs, timerStale, touchTimer } from "@/lib/training/workoutTimer";
import { EMPTY_TRAINING, TRAINING_KEY, parseTrainingData, startPlan, type TrainingData } from "./trainingPlans";
import {
  completeTrackedWorkout,
  heartbeatWorkoutClock,
  pauseWorkoutClock,
  recordWorkoutSet,
  reportPain,
  resumeWorkoutClock,
  saveResumeWorkoutClock,
  saveStartOrResumeWorkout,
  saveWorkoutHeartbeat,
  startOrResumeWorkout,
} from "./workouts";

const START = "2026-10-05";
const T0 = "2026-10-05T17:00:00.000Z";
const plus = (seconds: number, from = T0) => new Date(Date.parse(from) + seconds * 1000).toISOString();

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
const started = () => ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", T0)).data;
const ids = (d: TrainingData) => trackableSetIds(d.workouts[0].snapshot);
const recordAll = (d: TrainingData, at: string) => ids(d).reduce((x, setId) => ok(recordWorkoutSet(x, "p1", "w1-s1", { setId, completedAt: at })).data, d);
const feedback = (completedAt: string) => ({ completedAt, difficulty: "about-right" as const, pain: false, notes: "" });

describe("clock arithmetic", () => {
  it("counts running time, holds while paused, and resumes from the total", () => {
    const running = { elapsedMs: 0, runningSince: T0, lastSeenAt: plus(60) };
    expect(timerElapsedMs(running, plus(60))).toBe(60_000);
    const paused = pauseTimer(running, plus(60));
    expect(paused).toEqual({ elapsedMs: 60_000 });
    expect(timerElapsedMs(paused, plus(3600))).toBe(60_000);
    const resumed = resumeTimer(paused, plus(3600));
    expect(timerElapsedMs(resumed, plus(3630))).toBe(90_000);
  });

  it("stops counting shortly after the last sign of activity", () => {
    const left = { elapsedMs: 0, runningSince: T0, lastSeenAt: plus(30) };
    expect(timerStale(left, plus(30 + TIMER_GRACE_MS / 1000 - 1))).toBe(false);
    expect(timerStale(left, plus(30 + TIMER_GRACE_MS / 1000 + 1))).toBe(true);
    // Hours later, only up to the grace period after the last heartbeat counts.
    expect(timerElapsedMs(left, plus(5 * 3600))).toBe(30_000 + TIMER_GRACE_MS);
    expect(touchTimer(left, plus(5 * 3600))).toEqual({ timer: { elapsedMs: 30_000 + TIMER_GRACE_MS }, autoPaused: true });
    expect(touchTimer(left, plus(40))).toEqual({ timer: { ...left, lastSeenAt: plus(40) }, autoPaused: false });
    expect(resumeTimer(left, plus(5 * 3600))).toEqual({ elapsedMs: 30_000 + TIMER_GRACE_MS, runningSince: plus(5 * 3600), lastSeenAt: plus(5 * 3600) });
  });

  it("formats clock times", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75_400)).toBe("1:15");
    expect(formatClock(3_725_000)).toBe("1:02:05");
    expect(formatClock(-5)).toBe("0:00");
  });
});

describe("workout clock in storage", () => {
  it("starts with the workout and keeps running while sets are recorded", () => {
    let d = started();
    expect(d.workouts[0].timer).toEqual({ elapsedMs: 0, runningSince: T0, lastSeenAt: T0 });
    d = ok(recordWorkoutSet(d, "p1", "w1-s1", { setId: ids(d)[0], completedAt: plus(60) })).data;
    expect(d.workouts[0].timer).toEqual({ elapsedMs: 0, runningSince: T0, lastSeenAt: plus(60) });
  });

  it("pauses and resumes, excluding the paused time from the saved duration", () => {
    // The page beats every 30 seconds while open; these stand in for those beats.
    const beat = (x: TrainingData, ...times: number[]) => times.reduce((y, t) => ok(heartbeatWorkoutClock(y, "p1", "w1-s1", plus(t))).data, x);
    let d = beat(started(), 100, 200, 290);
    d = ok(pauseWorkoutClock(d, "p1", "w1-s1", plus(300))).data;
    d = ok(resumeWorkoutClock(d, "p1", "w1-s1", plus(900))).data; // ten minutes paused
    d = beat(recordAll(d, plus(1000)), 1100, 1190);
    const done = ok(completeTrackedWorkout(d, "p1", "w1-s1", feedback(plus(1200))));
    expect(done.data.workouts[0]).toMatchObject({ status: "completed", durationSeconds: 600, timer: { elapsedMs: 600_000 } });
    expect(done.data.workouts[0].timer).not.toHaveProperty("runningSince");
  });

  it("doesn't count hours away from an unfinished workout", () => {
    let d = started();
    d = ok(heartbeatWorkoutClock(d, "p1", "w1-s1", plus(120))).data;
    // Back three hours later: the first beat closes the segment instead of counting the gap.
    const beat = ok(heartbeatWorkoutClock(d, "p1", "w1-s1", plus(3 * 3600)));
    expect(beat.autoPaused).toBe(true);
    expect(beat.data.workouts[0].timer).toEqual({ elapsedMs: 120_000 + TIMER_GRACE_MS });
    d = ok(resumeWorkoutClock(beat.data, "p1", "w1-s1", plus(3 * 3600 + 10))).data;
    d = recordAll(d, plus(3 * 3600 + 60));
    const done = ok(completeTrackedWorkout(d, "p1", "w1-s1", feedback(plus(3 * 3600 + 70))));
    expect(done.data.workouts[0].durationSeconds).toBe(120 + TIMER_GRACE_MS / 1000 + 60);
  });

  it("stops the clock when pain is reported and refuses clock changes while paused", () => {
    let d = started();
    d = ok(reportPain(d, "p1", "w1-s1", { reportedAt: plus(90), notes: "" })).data;
    expect(d.workouts[0].timer).toEqual({ elapsedMs: 90_000 });
    expect(errorOf(resumeWorkoutClock(d, "p1", "w1-s1", plus(100)))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(heartbeatWorkoutClock(d, "p1", "w1-s1", plus(100)))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(pauseWorkoutClock(d, "p1", "w1-s1", plus(100)))).toBe(PAIN_PAUSE_MESSAGE);
  });

  it("follows the same locking as sets: no clock for a workout out of turn, not started, or complete", () => {
    expect(errorOf(resumeWorkoutClock(fresh(), "p1", "w1-s1", T0))).toBe("This workout hasn't been started.");
    const plan = fresh();
    const outOfTurn: TrainingData = { ...plan, workouts: [{ ...started().workouts[0], sessionId: "w1-s2", snapshot: { ...started().workouts[0].snapshot } }] };
    expect(errorOf(resumeWorkoutClock(outOfTurn, "p1", "w1-s2", "2026-10-07T17:00:00.000Z"))).not.toBe("");
    const done = ok(completeTrackedWorkout(recordAll(started(), plus(60)), "p1", "w1-s1", feedback(plus(120)))).data;
    expect(errorOf(resumeWorkoutClock(done, "p1", "w1-s1", plus(130)))).toBe("This workout is already complete.");
    expect(errorOf(resumeWorkoutClock(started(), "p1", "w1-s1", "later"))).toBe("Time must be an ISO timestamp.");
  });

  it("starts a clock on a workout saved before timing existed, without inventing earlier time", () => {
    const d = started();
    const legacy: TrainingData = { ...d, workouts: [{ ...d.workouts[0], timer: undefined }] };
    delete (legacy.workouts[0] as { timer?: unknown }).timer;
    // Completing without a clock saves no duration.
    const noClock = ok(completeTrackedWorkout(recordAll(legacy, plus(60)), "p1", "w1-s1", feedback(plus(120)))).data;
    expect(noClock.workouts[0]).not.toHaveProperty("durationSeconds");
    // Resuming starts the clock from now.
    const resumed = ok(resumeWorkoutClock(legacy, "p1", "w1-s1", plus(600))).data;
    expect(resumed.workouts[0].timer).toEqual({ elapsedMs: 0, runningSince: plus(600), lastSeenAt: plus(600) });
  });

  it("never creates a second workout or completion", () => {
    let d = started();
    d = ok(resumeWorkoutClock(d, "p1", "w1-s1", plus(10))).data;
    d = ok(resumeWorkoutClock(d, "p1", "w1-s1", plus(20))).data;
    expect(d.workouts).toHaveLength(1);
    const done = ok(completeTrackedWorkout(recordAll(d, plus(60)), "p1", "w1-s1", feedback(plus(120)))).data;
    expect(errorOf(completeTrackedWorkout(done, "p1", "w1-s1", feedback(plus(130))))).toBe("This workout is already complete.");
    expect(done.completions).toHaveLength(1);
  });
});

describe("clock persistence and backups", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  let failWrites = false;
  beforeEach(() => {
    store.clear();
    failWrites = false;
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (failWrites) throw new Error("QuotaExceededError");
          store.set(k, v);
        },
        removeItem: (k: string) => void store.delete(k),
      },
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

  it("keeps accumulated time across a refresh, using the device clock", () => {
    store.set(TRAINING_KEY, JSON.stringify(fresh()));
    vi.setSystemTime(new Date(T0));
    expect(saveStartOrResumeWorkout("p1", "w1-s1").ok).toBe(true);
    vi.setSystemTime(new Date(plus(45)));
    expect(saveWorkoutHeartbeat("p1", "w1-s1").ok).toBe(true);
    const reloaded = parseTrainingData(store.get(TRAINING_KEY)!);
    expect(timerElapsedMs(reloaded.workouts[0].timer, plus(45))).toBe(45_000);
  });

  it("reports a failed clock save and leaves the stored clock unchanged", () => {
    store.set(TRAINING_KEY, JSON.stringify(started()));
    const before = store.get(TRAINING_KEY);
    vi.setSystemTime(new Date(plus(30)));
    failWrites = true;
    expect(errorOf(saveResumeWorkoutClock("p1", "w1-s1"))).toBe("Could not save on this device. Browser storage may be full or disabled.");
    expect(store.get(TRAINING_KEY)).toBe(before);
  });

  const backup = (training: TrainingData) => serializeBackup(createBackup({ aftResults: [], training, profile: null, settings: null }, { exportedAt: plus(3600), appVersion: "0.1.0" }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests write arbitrary values into parsed JSON
  const edited = (training: TrainingData, mutate: (w: Record<string, any>) => void) => {
    const b = JSON.parse(backup(training));
    mutate(b.data.trainingPlans.workouts[0]);
    return JSON.stringify(b);
  };

  it("restores running, paused, and completed clocks, and older workouts without one", () => {
    const running = started();
    const done = ok(completeTrackedWorkout(recordAll(started(), plus(60)), "p1", "w1-s1", feedback(plus(120)))).data;
    for (const d of [running, ok(pauseWorkoutClock(running, "p1", "w1-s1", plus(30))).data, done]) {
      const parsed = validateBackup(backup(d));
      expect(parsed.ok && parsed.data.training.workouts).toEqual(d.workouts);
    }
    const older = validateBackup(edited(running, (w) => delete w.timer));
    expect(older.ok).toBe(true);
  });

  it("rejects impossible clock values", () => {
    const d = started();
    const done = ok(completeTrackedWorkout(recordAll(started(), plus(60)), "p1", "w1-s1", feedback(plus(120)))).data;
    for (const t of [
      edited(d, (w) => (w.timer.elapsedMs = -1)),
      edited(d, (w) => (w.timer.elapsedMs = 25 * 3600_000)),
      edited(d, (w) => (w.timer.runningSince = "2026-10-01T00:00:00.000Z")), // before the workout started
      edited(d, (w) => (w.timer.lastSeenAt = "2026-10-05T16:00:00.000Z")), // before the segment started
      edited(d, (w) => (w.timer.extra = 1)),
      edited(d, (w) => (w.durationSeconds = 60)), // only completed workouts have a duration
      edited(done, (w) => (w.timer.runningSince = T0)), // a completed workout's clock is stopped
      edited(done, (w) => (w.durationSeconds = 1.5)),
    ]) {
      expect(validateBackup(t).ok).toBe(false);
    }
  });

  it("keeps this browser's clock when merging a backup with a different one, and still combines sets", () => {
    const mine = ok(recordWorkoutSet(started(), "p1", "w1-s1", { setId: ids(started())[0], completedAt: plus(10) })).data;
    const theirs = ok(pauseWorkoutClock(ok(recordWorkoutSet(started(), "p1", "w1-s1", { setId: ids(started())[1], completedAt: plus(20) })).data, "p1", "w1-s1", plus(25))).data;
    const parsed = validateBackup(backup(theirs));
    if (!parsed.ok) throw new Error(parsed.error);
    const plan = planImport({ aftResults: [], training: mine, profile: null, settings: null }, parsed.data, "merge", plus(3600));
    expect(plan.next.training.workouts[0].timer).toEqual(mine.workouts[0].timer);
    expect(plan.changes.find((c) => c.section === "workouts")!.notes.join(" ")).toMatch(/this browser's status is kept; recorded sets from both are combined/);
    expect(plan.next.training.setRecords).toHaveLength(2);
  });
});
