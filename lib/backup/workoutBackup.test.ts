import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { generatePlan } from "@/lib/training/engine";
import { trackableSetIds } from "@/lib/training/workout";
import type { BaselineSnapshot } from "@/lib/training/types";
import { EMPTY_TRAINING, completeSession, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { completeTrackedWorkout, recordWorkoutSet, reportPain, startOrResumeWorkout, trackedWorkout } from "@/lib/storage/workouts";
import { WORKOUT_LIMITS } from "@/lib/storage/workoutRecords";
import { countNewerLocal, createBackup, planImport, serializeBackup, validateBackup, type LocalData } from "./backup";

const EXPORTED = "2026-10-06T12:00:00.000Z";
const AT = "2026-10-05T17:00:00.000Z";
const LATER = "2026-10-05T18:00:00.000Z";
const WED = "2026-10-07T17:00:00.000Z"; // w1-s2's date
const WED_LATER = "2026-10-07T18:00:00.000Z";

function baseline(id: string): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 120, HRP: 40, SDC: 110, PLK: 150, "2MR": 990 } };
  return { resultId: id, testDate: "2026-09-01", input, result: scoreAft(input) };
}

function withPlan(data: TrainingData, id: string): TrainingData {
  const outcome = generatePlan({
    baseline: baseline(`r-${id}`),
    prefs: { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: ["barbell-or-hex-bar"], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] },
    screening: { currentPain: false, otherInstructions: "" },
    startDate: "2026-10-05",
  });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return startPlan(data, outcome.plan, { id, createdAt: "2026-10-01T00:00:00.000Z", startDate: "2026-10-05" });
}

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error((r as unknown as { error: string }).error);
  return r as Extract<T, { ok: true }>;
}
const ids = (data: TrainingData, sessionId: string, planId = "p1") => trackableSetIds(data.workouts.find((w) => w.planId === planId && w.sessionId === sessionId)!.snapshot);
const record = (data: TrainingData, sessionId: string, setIds: string[], planId = "p1", at = sessionId === "w1-s1" ? LATER : WED_LATER) =>
  setIds.reduce((d, setId) => ok(recordWorkoutSet(d, planId, sessionId, { setId, completedAt: at, actual: { reps: 8 } })).data, data);
const feedback = { completedAt: "2026-10-05T19:00:00.000Z", difficulty: "about-right" as const, pain: false, notes: "" };

// One plan with a completed tracked workout (w1-s1, Monday), a half-done workout (w1-s2, Wednesday), and a pain
// report on w1-s2.
function training(): TrainingData {
  let data = withPlan(EMPTY_TRAINING, "p1");
  data = ok(startOrResumeWorkout(data, "p1", "w1-s1", AT)).data;
  data = record(data, "w1-s1", ids(data, "w1-s1"));
  data = ok(completeTrackedWorkout(data, "p1", "w1-s1", feedback)).data;
  data = ok(startOrResumeWorkout(data, "p1", "w1-s2", WED)).data;
  data = record(data, "w1-s2", ids(data, "w1-s2").slice(0, 2));
  return data;
}
const withPain = (data: TrainingData) => ok(reportPain(data, "p1", "w1-s2", { reportedAt: WED_LATER, setId: ids(data, "w1-s2")[2], notes: "knee" })).data;

const local = (t: TrainingData): LocalData => ({ aftResults: [], training: t, profile: null, settings: null });
const text = (data: LocalData) => serializeBackup(createBackup(data, { exportedAt: EXPORTED, appVersion: "0.1.0" }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests write arbitrary values into parsed JSON
function edited(mutate: (tp: Record<string, any>) => void, data = withPain(training())): string {
  const b = JSON.parse(text(local(data)));
  mutate(b.data.trainingPlans);
  return JSON.stringify(b);
}
const reject = (t: string) => {
  const r = validateBackup(t);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.error;
};
function restore(t: string): LocalData {
  const r = validateBackup(t);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

describe("backup round trip with workouts", () => {
  it("restores snapshots, partial progress, actual performance, and pain reports exactly", () => {
    const data = withPain(training());
    const restored = restore(text(local(data)));
    expect(restored.training).toEqual(data);
    const view = trackedWorkout(restored.training, "p1", "w1-s2")!;
    expect(view.progress.overall.completed).toBe(2);
    expect(view.readiness.status).toBe("paused");
    expect(restored.training.setRecords[0].actual).toEqual({ reps: 8 });
  });

  it("accepts an older backup made before workout tracking", () => {
    const old = completeSession(withPlan(EMPTY_TRAINING, "p1"), { planId: "p1", sessionId: "w1-s1", ...feedback });
    const b = JSON.parse(text(local(old)));
    b.data.trainingPlans = { schemaVersion: 1, plans: old.plans, completions: old.completions };
    const restored = restore(JSON.stringify(b));
    expect(restored.training).toEqual({ ...old, workouts: [], setRecords: [], painReports: [] });
    expect(restored.training.schemaVersion).toBe(2);
  });

  it("ignores workout lists in an older-format section rather than trusting them", () => {
    const t = edited((tp) => (tp.schemaVersion = 1));
    expect(restore(t).training.workouts).toEqual([]);
  });
});

describe("invalid workout records reject the whole backup", () => {
  it("rejects missing lists and unsupported versions", () => {
    expect(reject(edited((tp) => delete tp.setRecords))).toMatch(/missing its workout records/);
    expect(reject(edited((tp) => (tp.painReports = {})))).toMatch(/missing its workout records/);
    expect(reject(edited((tp) => (tp.schemaVersion = 3)))).toMatch(/unsupported format/);
  });

  it("rejects orphaned and unknown records", () => {
    expect(reject(edited((tp) => (tp.workouts[0].planId = "p9")))).toMatch(/started workout refers to a plan/);
    expect(reject(edited((tp) => (tp.workouts = tp.workouts.slice(1))))).toMatch(/recorded set refers to a workout/);
    expect(reject(edited((tp) => (tp.setRecords[0].setId = "w1-s1/main/nope/1")))).toMatch(/recorded set is invalid/);
    expect(reject(edited((tp) => (tp.setRecords[0].planId = "p9")))).toMatch(/recorded set refers to a workout/);
    expect(reject(edited((tp) => (tp.painReports[0].sessionId = "w9-s9")))).toMatch(/pain report/);
    expect(reject(edited((tp) => (tp.painReports[0].planId = "p9")))).toMatch(/pain report/);
    expect(reject(edited((tp) => (tp.painReports[0].setId = "w1-s2/main/nope/1")))).toMatch(/pain report/);
  });

  it("rejects duplicate records instead of letting them inflate progress", () => {
    expect(reject(edited((tp) => tp.setRecords.push({ ...tp.setRecords[0] })))).toMatch(/recorded more than once/);
    expect(reject(edited((tp) => tp.setRecords.push({ ...tp.setRecords[0], completedAt: "2026-10-05T18:30:00.000Z" })))).toMatch(/recorded more than once/);
    expect(reject(edited((tp) => tp.workouts.push({ ...tp.workouts[1] })))).toMatch(/started more than once/);
  });

  it("rejects edited or oversized prescriptions in a snapshot", () => {
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.sections[1].exercises[0].prescription.sets = "20")))).toMatch(/doesn't match its plan/);
    expect(reject(edited((tp) => tp.workouts[1].snapshot.sections[1].exercises[0].sets.push({ id: "x", number: 3, target: { kind: "reps", reps: 10 } })))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.sections[1].exercises[0].sets[0].target = { kind: "reps", reps: 1e9 })))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.sections[1].exercises[0].sets = Array.from({ length: 500 }, (_, i) => ({ id: `s${i}`, number: i + 1, target: { kind: "reps", reps: 1 } })))))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.phase = "build")))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.templateVersion = "other")))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].snapshot.sections[0].title = "x".repeat(10_000))))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].extra = true)))).toMatch(/doesn't match/);
    expect(reject(edited((tp) => (tp.workouts[1].startedAt = "2026-10-05T16:00:00.000Z")))).toMatch(/doesn't match/);
  });

  it("rejects inconsistent completion states", () => {
    expect(reject(edited((tp) => (tp.completions = [])))).toMatch(/completed workout has no session record/);
    expect(reject(edited((tp) => (tp.setRecords = tp.setRecords.filter((r: { sessionId: string }) => r.sessionId !== "w1-s1").concat(tp.setRecords.find((r: { sessionId: string }) => r.sessionId === "w1-s1")))))).toMatch(
      /marked complete without every set/
    );
    expect(reject(edited((tp) => tp.completions.push({ planId: "p1", sessionId: "w1-s2", ...feedback })))).toMatch(/still in progress/);
    expect(reject(edited((tp) => (tp.workouts[0].completedAt = undefined)))).toMatch(/doesn't match/);
  });

  it("rejects bad timestamps, performance values, and oversized lists", () => {
    expect(reject(edited((tp) => (tp.setRecords[0].completedAt = "yesterday")))).toMatch(/recorded set is invalid/);
    expect(reject(edited((tp) => (tp.setRecords[0].actual = { reps: 1e6 })))).toMatch(/recorded set is invalid/);
    expect(reject(edited((tp) => (tp.setRecords[0].actual = { load: { value: 50, unit: "stone" } })))).toMatch(/recorded set is invalid/);
    expect(reject(edited((tp) => (tp.painReports[0].reportedAt = "<b>")))).toMatch(/pain report/);
    expect(reject(edited((tp) => (tp.painReports[0].notes = "x".repeat(501))))).toMatch(/pain report/);
    expect(reject(edited((tp) => (tp.completions[0].difficulty = "brutal")))).toMatch(/invalid records/);
    expect(reject(edited((tp) => (tp.painReports = Array.from({ length: WORKOUT_LIMITS.painReports + 1 }, () => tp.painReports[0]))))).toMatch(/larger than RuckOn allows/);
  });

  it("rejects malformed values without throwing", () => {
    for (const bad of [null, 1, "x", [], {}]) {
      for (const list of ["workouts", "setRecords", "painReports"]) {
        const t = edited((tp) => (tp[list] = [bad]));
        expect(() => validateBackup(t)).not.toThrow();
        expect(validateBackup(t).ok).toBe(false);
      }
    }
  });
});

describe("merging workouts", () => {
  it("adds partial progress and pain reports from a backup", () => {
    const backup = withPain(training());
    const plan = planImport(local(EMPTY_TRAINING), restore(text(local(backup))), "merge", EXPORTED);
    expect(plan.next.training).toEqual(backup);
    expect(plan.changes.find((c) => c.section === "setRecords")).toMatchObject({ added: backup.setRecords.length });
    expect(plan.changes.find((c) => c.section === "painReports")).toMatchObject({ added: 1 });
  });

  it("counts identical records as duplicates, so merging twice changes nothing", () => {
    const data = withPain(training());
    const plan = planImport(local(data), restore(text(local(data))), "merge", EXPORTED);
    expect(plan.changed).toBe(false);
    expect(plan.changes.find((c) => c.section === "setRecords")).toMatchObject({ added: 0, duplicates: data.setRecords.length });
    expect(trackedWorkout(plan.next.training, "p1", "w1-s2")!.progress.overall.completed).toBe(2);
  });

  it("combines recorded sets for the same snapshot without counting a set twice", () => {
    const base = training();
    const mine = record(base, "w1-s2", [ids(base, "w1-s2")[2]]);
    const theirs = record(base, "w1-s2", [ids(base, "w1-s2")[2], ids(base, "w1-s2")[3]]);
    const plan = planImport(local(mine), restore(text(local(theirs))), "merge", EXPORTED);
    expect(trackedWorkout(plan.next.training, "p1", "w1-s2")!.progress.overall.completed).toBe(4);
    expect(plan.changes.find((c) => c.section === "setRecords")).toMatchObject({ added: 1, duplicates: theirs.setRecords.length - 1 });
  });

  it("keeps this browser's workout when the backup's snapshot differs, and says so", () => {
    const mine = training();
    const theirs = structuredClone(mine);
    // The same session started from the backup's device at another time (a different snapshot).
    const w = theirs.workouts.find((x) => x.sessionId === "w1-s2")!;
    w.startedAt = w.snapshot.createdAt = "2026-10-07T16:00:00.000Z";
    const plan = planImport(local(mine), restore(text(local(theirs))), "merge", EXPORTED);
    const workouts = plan.changes.find((c) => c.section === "workouts")!;
    expect(workouts.conflicts).toBe(1);
    expect(workouts.notes.join(" ")).toMatch(/different prescription. This browser's workout is kept/);
    expect(plan.next.training.workouts.find((x) => x.sessionId === "w1-s2")).toEqual(mine.workouts.find((x) => x.sessionId === "w1-s2"));
    expect(plan.changes.find((c) => c.section === "setRecords")!.conflicts).toBe(0);
    expect(plan.changes.find((c) => c.section === "setRecords")!.duplicates).toBe(mine.setRecords.length);
  });

  it("never loses a pain report, even from a conflicting workout or plan", () => {
    const mine = training();
    const theirs = structuredClone(mine);
    const w = theirs.workouts.find((x) => x.sessionId === "w1-s2")!;
    w.startedAt = w.snapshot.createdAt = "2026-10-07T16:00:00.000Z";
    const theirsWithPain = withPain(theirs);
    const plan = planImport(local(mine), restore(text(local(theirsWithPain))), "merge", EXPORTED);
    expect(plan.next.training.painReports).toEqual([{ planId: "p1", sessionId: "w1-s2", reportedAt: WED_LATER, notes: "knee" }]);
    expect(plan.changes.find((c) => c.section === "painReports")!.notes.join(" ")).toMatch(/without its set/);
    expect(trackedWorkout(plan.next.training, "p1", "w1-s2")!.readiness.status).toBe("paused");

    // A conflicting plan: its painful session record isn't imported, but its pain is.
    const conflicting = completeSession(withPlan(EMPTY_TRAINING, "p1"), { planId: "p1", sessionId: "w2-s1", ...feedback, pain: true, notes: "back" });
    conflicting.plans[0] = { ...conflicting.plans[0], reschedules: { "w2-s1": "2026-10-13" } };
    const merged = planImport(local(mine), restore(text(local(conflicting))), "merge", EXPORTED);
    expect(merged.changes.find((c) => c.section === "plans")!.conflicts).toBe(1);
    expect(merged.next.training.completions.some((c) => c.sessionId === "w2-s1")).toBe(false);
    expect(merged.next.training.painReports).toEqual([{ planId: "p1", sessionId: "w2-s1", reportedAt: feedback.completedAt, notes: "back" }]);
  });

  it("does not import a workout that conflicts with this browser's session record", () => {
    // A session record for w1-s2 from before tracking, built directly (older versions recorded in any order).
    const plain = withPlan(EMPTY_TRAINING, "p1");
    const mine: TrainingData = { ...plain, completions: [{ planId: "p1", sessionId: "w1-s2", ...feedback }] };
    const theirs = training();
    const plan = planImport(local({ ...mine, completions: [...mine.completions, ...theirs.completions] }), restore(text(local(theirs))), "merge", EXPORTED);
    expect(plan.next.training.workouts.some((w) => w.sessionId === "w1-s2")).toBe(false);
    expect(plan.next.training.setRecords.some((r) => r.sessionId === "w1-s2")).toBe(false);
  });

  it("always produces data that passes backup validation", () => {
    const mine = record(training(), "w1-s2", [ids(training(), "w1-s2")[2]]);
    const theirs = withPain(withPlan(training(), "p2"));
    const plan = planImport(local(mine), restore(text(local(theirs))), "merge", EXPORTED);
    expect(validateBackup(text(plan.next)).ok).toBe(true);
    expect(plan.next.training.plans.map((p) => [p.id, p.status])).toEqual([
      ["p1", "active"],
      ["p2", "ended"],
    ]);
  });
});

describe("replacing with a backup", () => {
  it("can't lift a pause with an older backup of the same plan", () => {
    const mine = withPain(training());
    const older = restore(text(local(training()))); // the same plan, saved before the pain report
    const plan = planImport(local(mine), older, "replace", EXPORTED);
    expect(plan.next.training.painReports).toEqual(mine.painReports);
    expect(trackedWorkout(plan.next.training, "p1", "w1-s2")!.readiness.status).toBe("paused");
    const pain = plan.changes.find((c) => c.section === "painReports")!;
    expect(pain).toMatchObject({ before: 1, after: 1 });
    expect(pain.notes[0]).toMatch(/kept, because the backup has the same plan/);
    expect(plan.changes.find((c) => c.section === "setRecords")).toMatchObject({ before: mine.setRecords.length, after: mine.setRecords.length });
    expect(validateBackup(text(plan.next)).ok).toBe(true);
  });

  it("keeps a painful session record's pain when the backup's copy has none", () => {
    const painful = completeSession(withPlan(EMPTY_TRAINING, "p1"), { planId: "p1", sessionId: "w1-s1", ...feedback, pain: true, notes: "ankle" });
    const plan = planImport(local(painful), restore(text(local(withPlan(EMPTY_TRAINING, "p1")))), "replace", EXPORTED);
    expect(plan.next.training.completions).toEqual([]);
    expect(plan.next.training.painReports).toEqual([{ planId: "p1", sessionId: "w1-s1", reportedAt: feedback.completedAt, notes: "ankle" }]);
  });

  it("drops a set reference the backup's workout doesn't have, but keeps the report", () => {
    const mine = withPain(training());
    const theirs = withPlan(EMPTY_TRAINING, "p1"); // same plan, no workouts
    const plan = planImport(local(mine), restore(text(local(theirs))), "replace", EXPORTED);
    expect(plan.next.training.painReports).toEqual([{ planId: "p1", sessionId: "w1-s2", reportedAt: WED_LATER, notes: "knee" }]);
    expect(validateBackup(text(plan.next)).ok).toBe(true);
  });

  it("says so when replacing removes a plan and the pain reported for it", () => {
    const mine = withPain(training());
    const plan = planImport(local(mine), restore(text(local(withPlan(EMPTY_TRAINING, "p2")))), "replace", EXPORTED);
    expect(plan.next.training.painReports).toEqual([]);
    const pain = plan.changes.find((c) => c.section === "painReports")!;
    expect(pain).toMatchObject({ before: 1, after: 0, removed: 1 });
    expect(pain.notes[0]).toMatch(/removes the plan from 2026-09-01 and the pain reported for it/);
  });

  it("counts workout records saved after the export as newer", () => {
    const data = withPain(training());
    // Everything after 17:30 on Monday: every set, the pain report, the completion, and both workouts.
    expect(countNewerLocal(local(data), "2026-10-05T17:30:00.000Z")).toBe(data.setRecords.length + 1 + 1 + 2);
  });
});

describe("restoring into browser storage", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  let failOn: string | null = null;
  beforeEach(() => {
    store.clear();
    failOn = null;
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (k === failOn) throw new Error("QuotaExceededError");
          store.set(k, v);
        },
        removeItem: (k: string) => void store.delete(k),
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
  afterEach(() => {
    delete g.window;
  });

  it("restores partial progress, and a failed write leaves every key as it was", async () => {
    const { writeLocalData, readLocalData } = await import("@/lib/storage/localData");
    expect(writeLocalData(local(training())).ok).toBe(true);
    const before = new Map(store);
    const incoming = restore(text(local(withPain(training()))));
    failOn = "ruckon.trainingPlans";
    expect(writeLocalData(planImport(readLocalData(), incoming, "replace", EXPORTED).next).ok).toBe(false);
    expect(new Map(store)).toEqual(before);
    failOn = null;
    expect(writeLocalData(planImport(readLocalData(), incoming, "replace", EXPORTED).next).ok).toBe(true);
    expect(readLocalData().training).toEqual(incoming.training);
  });

  it("leaves storage untouched when a backup is rejected", async () => {
    const { writeLocalData } = await import("@/lib/storage/localData");
    writeLocalData(local(training()));
    const before = new Map(store);
    expect(validateBackup(edited((tp) => tp.setRecords.push({ ...tp.setRecords[0] }))).ok).toBe(false);
    expect(new Map(store)).toEqual(before);
  });
});
