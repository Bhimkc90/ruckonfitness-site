import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { createBackup, planImport, serializeBackup, validateBackup } from "@/lib/backup/backup";
import { EMPTY_TRAINING, TRAINING_KEY, parseTrainingData, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { savePainReport, saveStartOrResumeWorkout, saveTrackedCompletion, saveUndoWorkoutSet, saveWorkoutSet } from "@/lib/storage/workouts";
import { generatePlan } from "./engine";
import { PAIN_PAUSE_MESSAGE } from "./progress";
import { planDashboard, workoutView } from "./planDashboard";
import { ONE_PER_DAY, sessionState } from "./sessionStatus";
import { trackableSetIds } from "./workout";

// The plan page's flow through the real save functions, browser storage (simulated), and the device clock (faked).
// Each step reads back from the stored string, as a page refresh would.

const START = "2026-10-05";
const at = (date: string, hour = 17) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const store = new Map<string, string>();
const g = globalThis as unknown as { window?: unknown };
let failWrites = false;

function seed() {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 120, HRP: 40, SDC: 110, PLK: 150, "2MR": 990 } };
  const outcome = generatePlan({
    baseline: { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) },
    prefs: { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: ["barbell-or-hex-bar"], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] },
    screening: { currentPain: false, otherInstructions: "" },
    startDate: START,
  });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  store.set(TRAINING_KEY, JSON.stringify(startPlan(EMPTY_TRAINING, outcome.plan, { id: "p1", createdAt: "2026-10-01T00:00:00.000Z", startDate: START })));
}
const reload = (): TrainingData => parseTrainingData(store.get(TRAINING_KEY) ?? null);
const clock = (iso: string) => vi.setSystemTime(new Date(iso));
const view = (sessionId: string, now: string) => {
  const d = reload();
  return workoutView(d.plans[0], d, sessionState(d.plans[0], d, sessionId, now)!, now);
};
const sets = (sessionId = "w1-s1") => trackableSetIds(reload().workouts.find((w) => w.sessionId === sessionId)!.snapshot);
const errorOf = (r: { ok: boolean }) => (r.ok ? "" : (r as unknown as { error: string }).error);

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
  seed();
});
afterEach(() => {
  delete g.window;
  vi.useRealTimers();
});

describe("a day's workout, start to finish", () => {
  it("starts, records sets with actual performance, survives a refresh, and resumes with the same prescription", () => {
    clock(at(START, 16));
    expect(saveStartOrResumeWorkout("p1", "w1-s1").ok).toBe(true);
    const snapshot = reload().workouts[0].snapshot;
    const [first, second] = sets();
    expect(saveWorkoutSet("p1", "w1-s1", { setId: first, actual: { reps: 9, load: { value: 135, unit: "lb" } } }).ok).toBe(true);
    expect(saveWorkoutSet("p1", "w1-s1", { setId: second }).ok).toBe(true);

    // Refresh: everything comes back from storage.
    clock(at(START, 20));
    const resumed = view("w1-s1", at(START, 20));
    expect(resumed.mode).toBe("active");
    if (resumed.mode !== "active") return;
    expect(resumed.workout.snapshot).toEqual(snapshot);
    expect(resumed.records.get(first)!.actual).toEqual({ reps: 9, load: { value: 135, unit: "lb" } });
    expect(resumed.progress.overall.completed).toBe(2);
    const again = saveStartOrResumeWorkout("p1", "w1-s1");
    expect(again.ok && again.resumed).toBe(true);
    expect(reload().workouts).toHaveLength(1);
  });

  it("undoes a set by mistake and never shows a set as saved when saving failed", () => {
    clock(at(START, 16));
    saveStartOrResumeWorkout("p1", "w1-s1");
    const [first, second] = sets();
    saveWorkoutSet("p1", "w1-s1", { setId: first });
    expect(saveUndoWorkoutSet("p1", "w1-s1", first).ok).toBe(true);
    expect(reload().setRecords).toEqual([]);

    failWrites = true;
    const failed = saveWorkoutSet("p1", "w1-s1", { setId: second });
    expect(errorOf(failed)).toBe("Could not save on this device. Browser storage may be full or disabled.");
    const shown = view("w1-s1", at(START, 17));
    expect(shown.mode === "active" && shown.records.has(second)).toBe(false);
    failWrites = false;
  });

  it("completes only when every set is recorded, then updates progress and the next workout", () => {
    clock(at(START, 16));
    saveStartOrResumeWorkout("p1", "w1-s1");
    const all = sets();
    for (const setId of all.slice(1)) saveWorkoutSet("p1", "w1-s1", { setId });
    expect(errorOf(saveTrackedCompletion("p1", "w1-s1", { difficulty: "about-right", pain: false, notes: "" }))).toBe("1 set is not recorded yet.");
    saveWorkoutSet("p1", "w1-s1", { setId: all[0] });
    const v = view("w1-s1", at(START, 17));
    expect(v.mode === "active" && v.readiness.status).toBe("complete");
    clock(at(START, 18));
    expect(saveTrackedCompletion("p1", "w1-s1", { difficulty: "about-right", pain: false, notes: "solid" }).ok).toBe(true);

    let d = reload();
    let dash = planDashboard(d.plans[0], d, at(START, 18));
    expect(dash.overall).toMatchObject({ completed: 1, remaining: 11, percent: 8 });
    expect(dash.weeks[0]).toMatchObject({ completed: 1, percent: 33 });
    expect(dash.next).toMatchObject({ sessionId: "w1-s2", status: "upcoming", reasons: ["Available on Oct 7."] });
    expect(view("w1-s1", at(START, 18)).mode).toBe("history");

    // The next workout opens on its own date, not before.
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s2"))).toBe("Available on Oct 7.");
    clock(at("2026-10-07"));
    d = reload();
    dash = planDashboard(d.plans[0], d, at("2026-10-07"));
    expect(dash.next).toMatchObject({ sessionId: "w1-s2", status: "available" });
  });

  it("keeps one workout per day when catching up a missed one", () => {
    clock(at("2026-10-07", 9)); // Monday's workout, done on Wednesday
    saveStartOrResumeWorkout("p1", "w1-s1");
    for (const setId of sets()) saveWorkoutSet("p1", "w1-s1", { setId });
    expect(saveTrackedCompletion("p1", "w1-s1", { difficulty: "easy", pain: false, notes: "" }).ok).toBe(true);
    clock(at("2026-10-07", 18));
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s2"))).toBe(ONE_PER_DAY);
    clock(at("2026-10-08", 9));
    expect(saveStartOrResumeWorkout("p1", "w1-s2").ok).toBe(true);
  });

  it("saves pain at once, mid-workout, keeps the sets, and pauses the plan", () => {
    clock(at(START, 16));
    saveStartOrResumeWorkout("p1", "w1-s1");
    const [first] = sets();
    saveWorkoutSet("p1", "w1-s1", { setId: first });
    clock(at(START, 16));
    const reported = savePainReport("p1", "w1-s1", { notes: "knee" });
    expect(reported.ok && reported.message).toBe(PAIN_PAUSE_MESSAGE);

    const d = reload();
    expect(d.painReports).toHaveLength(1);
    expect(d.setRecords).toHaveLength(1);
    expect(d.completions).toEqual([]);
    expect(planDashboard(d.plans[0], d, at(START, 17)).pause.paused).toBe(true);
    expect(view("w1-s1", at(START, 17)).mode).toBe("stored");
    expect(errorOf(saveWorkoutSet("p1", "w1-s1", { setId: sets()[1] }))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(saveTrackedCompletion("p1", "w1-s1", { difficulty: "easy", pain: false, notes: "" }))).toBe(PAIN_PAUSE_MESSAGE);
    expect(errorOf(saveStartOrResumeWorkout("p1", "w1-s1"))).toBe(PAIN_PAUSE_MESSAGE);
  });
});

describe("backups and the plan page", () => {
  it("shows the same plan page after restoring a backup with a workout in progress", () => {
    clock(at(START, 16));
    saveStartOrResumeWorkout("p1", "w1-s1");
    for (const setId of sets().slice(0, 3)) saveWorkoutSet("p1", "w1-s1", { setId });
    const before = reload();
    const text = serializeBackup(createBackup({ aftResults: [], training: before, profile: null, settings: null }, { exportedAt: at(START, 18), appVersion: "0.1.0" }));
    store.clear();
    const parsed = validateBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);
    const restored = planImport({ aftResults: [], training: EMPTY_TRAINING, profile: null, settings: null }, parsed.data, "replace", parsed.backup.exportedAt).next.training;
    expect(planDashboard(restored.plans[0], restored, at(START, 19))).toEqual(planDashboard(before.plans[0], before, at(START, 19)));
    const resumed = workoutView(restored.plans[0], restored, sessionState(restored.plans[0], restored, "w1-s1", at(START, 19))!, at(START, 19));
    expect(resumed.mode === "active" && resumed.progress.overall.completed).toBe(3);
  });
});
