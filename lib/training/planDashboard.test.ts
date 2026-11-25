import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { EMPTY_TRAINING, completeSession, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { completeTrackedWorkout, recordWorkoutSet, reportPain, startOrResumeWorkout } from "@/lib/storage/workouts";
import { generatePlan } from "./engine";
import { planDashboard, pausedSince, sessionActions, workoutView } from "./planDashboard";
import { sessionState } from "./sessionStatus";
import { trackableSetIds } from "./workout";
import { actualFields, formatActual, formatDuration, formatRest, formatTarget, parseActualInput, setLabel } from "./workoutFormat";
import type { WorkoutExercise } from "./types";

// Week 1: w1-s1 strength Mon 10-05, w1-s2 endurance Wed 10-07, w1-s3 strength Fri 10-09.
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
const ids = (d: TrainingData, s: string) => trackableSetIds(d.workouts.find((w) => w.sessionId === s)!.snapshot);
const record = (d: TrainingData, s: string, setIds: string[], date: string) => setIds.reduce((x, setId) => ok(recordWorkoutSet(x, "p1", s, { setId, completedAt: at(date) })).data, d);
const complete = (d: TrainingData, s: string, date: string) => ok(completeTrackedWorkout(d, "p1", s, { completedAt: at(date, 19), difficulty: "about-right", pain: false, notes: "felt fine" })).data;
const stateOf = (d: TrainingData, s: string, now: string) => sessionState(d.plans[0], d, s, now)!;

describe("plan dashboard", () => {
  it("shows the current week, today's workout, rest days, and the next workout", () => {
    const d = fresh();
    const v = planDashboard(d.plans[0], d, at(START));
    expect(v.week).toBe(1);
    expect(v.todaySessions.map((s) => [s.sessionId, s.status])).toEqual([["w1-s1", "available"]]);
    expect(v.next).toMatchObject({ sessionId: "w1-s1", status: "available" });
    const week1 = v.weeks[0];
    expect(week1.days.map((x) => (x.kind === "rest" ? `${x.date} rest` : `${x.date} ${x.state.sessionId}`))).toEqual([
      "2026-10-05 w1-s1",
      "2026-10-06 rest",
      "2026-10-07 w1-s2",
      "2026-10-08 rest",
      "2026-10-09 w1-s3",
      "2026-10-10 rest",
      "2026-10-11 rest",
    ]);
    expect(planDashboard(d.plans[0], d, at("2026-10-06")).todaySessions).toEqual([]);
  });

  it("counts overall and weekly completion from completion records only", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = record(d, "w1-s1", ids(d, "w1-s1"), START);
    // Every set recorded but not completed: nothing counts yet.
    let v = planDashboard(d.plans[0], d, at(START, 18));
    expect(v.overall).toEqual({ completed: 0, remaining: 12, total: 12, percent: 0 });
    expect(v.weeks[0].days[0]).toMatchObject({ progress: { kind: "tracked", percent: 100 } });
    d = complete(d, "w1-s1", START);
    v = planDashboard(d.plans[0], d, at("2026-10-06"));
    expect(v.overall).toEqual({ completed: 1, remaining: 11, total: 12, percent: 8 });
    expect(v.weeks[0]).toMatchObject({ completed: 1, total: 3, percent: 33, phase: "foundation" });
    expect(v.weeks[2]).toMatchObject({ completed: 0, total: 3, percent: 0, phase: "build" });
    expect(v.next).toMatchObject({ sessionId: "w1-s2", status: "upcoming" });
  });

  it("shows partial progress for a workout in progress", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = record(d, "w1-s1", ids(d, "w1-s1").slice(0, 4), START);
    const day = planDashboard(d.plans[0], d, at(START)).weeks[0].days[0];
    expect(day).toMatchObject({ kind: "session", state: { status: "in-progress" }, progress: { kind: "tracked", completed: 4, total: ids(d, "w1-s1").length } });
  });

  it("uses the earliest unfinished workout, so an overdue one isn't skipped", () => {
    const v = planDashboard(fresh().plans[0], fresh(), at("2026-10-09"));
    expect(v.next).toMatchObject({ sessionId: "w1-s1", status: "overdue" });
    expect(v.todaySessions[0]).toMatchObject({ sessionId: "w1-s3", status: "locked" });
  });

  it("marks sessions recorded before set tracking as untracked, with no sets", () => {
    const d = completeSession(fresh(), { planId: "p1", sessionId: "w1-s1", completedAt: at(START), difficulty: "hard", pain: false, notes: "old" });
    const v = planDashboard(d.plans[0], d, at("2026-10-07"));
    expect(v.weeks[0].days[0]).toMatchObject({ progress: { kind: "untracked" }, state: { status: "completed" } });
    expect(d.setRecords).toEqual([]);
    expect(v.next).toMatchObject({ sessionId: "w1-s2", status: "available" });
  });

  it("shows a pause from either pain source and when it began", () => {
    const report = ok(reportPain(fresh(), "p1", "w1-s1", { reportedAt: at(START, 12), notes: "" })).data;
    expect(planDashboard(report.plans[0], report, at(START)).pause).toEqual({ paused: true, since: at(START, 12) });
    const painful = completeSession(fresh(), { planId: "p1", sessionId: "w1-s1", completedAt: at(START), difficulty: "easy", pain: true, notes: "" });
    expect(planDashboard(painful.plans[0], painful, at(START)).pause).toEqual({ paused: true, since: at(START) });
    expect(pausedSince(fresh().plans[0], fresh())).toBeNull();
  });

  it("marks the build weeks held after a too-hard rating", () => {
    const d = completeSession(fresh(), { planId: "p1", sessionId: "w1-s1", completedAt: at(START), difficulty: "too-hard", pain: false, notes: "" });
    expect(planDashboard(d.plans[0], d, at(START, 20)).weeks.map((w) => w.phase)).toEqual(["foundation", "foundation", "held", "held"]);
  });
});

describe("workout view and actions", () => {
  it("previews a session that hasn't started, and offers Start only when it's eligible", () => {
    const d = fresh();
    const first = stateOf(d, "w1-s1", at(START));
    const view = workoutView(d.plans[0], d, first, at(START));
    expect(view.mode).toBe("preview");
    expect(sessionActions(first, view)).toEqual({ start: true, resume: false, reschedule: true });
    const locked = stateOf(d, "w1-s2", at("2026-10-07"));
    expect(sessionActions(locked, workoutView(d.plans[0], d, locked, at("2026-10-07")))).toEqual({ start: false, resume: false, reschedule: true });
    const upcoming = stateOf(d, "w1-s1", at("2026-10-04"));
    expect(sessionActions(upcoming, workoutView(d.plans[0], d, upcoming, at("2026-10-04"))).start).toBe(false);
  });

  it("offers Resume for a workout in progress and keeps its recorded sets", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = ok(recordWorkoutSet(d, "p1", "w1-s1", { setId: ids(d, "w1-s1")[0], completedAt: at(START), actual: { reps: 9 } })).data;
    const state = stateOf(d, "w1-s1", at(START, 20));
    const view = workoutView(d.plans[0], d, state, at(START, 20));
    expect(view.mode).toBe("active");
    if (view.mode !== "active") return;
    expect(view.records.get(ids(d, "w1-s1")[0])!.actual).toEqual({ reps: 9 });
    expect(view.readiness.status).toBe("incomplete");
    expect(sessionActions(state, view)).toEqual({ start: false, resume: true, reschedule: false });
  });

  it("shows a started workout read-only once the plan is paused", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = record(d, "w1-s1", ids(d, "w1-s1").slice(0, 2), START);
    d = ok(reportPain(d, "p1", "w1-s1", { reportedAt: at(START, 18), notes: "" })).data;
    const state = stateOf(d, "w1-s1", at(START, 19));
    const view = workoutView(d.plans[0], d, state, at(START, 19));
    expect(view.mode).toBe("stored");
    expect(view.mode === "stored" && view.records.size).toBe(2);
    expect(sessionActions(state, view)).toEqual({ start: false, resume: false, reschedule: false });
  });

  it("shows completed tracked workouts as history and legacy records as untracked", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = complete(record(d, "w1-s1", ids(d, "w1-s1"), START), "w1-s1", START);
    const history = workoutView(d.plans[0], d, stateOf(d, "w1-s1", at("2026-10-06")), at("2026-10-06"));
    expect(history.mode).toBe("history");
    expect(history.mode === "history" && history.completion.notes).toBe("felt fine");
    expect(history.mode === "history" && history.progress.overall.percent).toBe(100);
    const legacy = completeSession(fresh(), { planId: "p1", sessionId: "w1-s1", completedAt: at(START), difficulty: "hard", pain: false, notes: "" });
    expect(workoutView(legacy.plans[0], legacy, stateOf(legacy, "w1-s1", at("2026-10-06")), at("2026-10-06")).mode).toBe("untracked");
  });

  it("never offers Start for a blocked session", () => {
    const d = fresh();
    d.plans[0].sessions.find((s) => s.id === "w1-s1")!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    const state = stateOf(d, "w1-s1", at(START));
    const view = workoutView(d.plans[0], d, state, at(START));
    expect(state.status).toBe("blocked");
    expect(sessionActions(state, view).start).toBe(false);
    expect(view.mode === "preview" && view.snapshot.unsupported.length).toBe(10);
  });
});

describe("workout text", () => {
  it("describes every target format", () => {
    expect(formatTarget({ kind: "reps", reps: 10 })).toBe("10 reps");
    expect(formatTarget({ kind: "reps", reps: 1 })).toBe("1 rep");
    expect(formatTarget({ kind: "reps", reps: 10, upTo: true })).toBe("Up to 10 reps");
    expect(formatTarget({ kind: "reps", reps: 6, secondsEach: 5 })).toBe("6 reps, 5 seconds each");
    expect(formatTarget({ kind: "rep-range", min: 8, max: 10 })).toBe("8–10 reps");
    expect(formatTarget({ kind: "hold", seconds: 75 })).toBe("Hold 1:15");
    expect(formatTarget({ kind: "hold", seconds: 60, upTo: true })).toBe("Hold up to 1 minute");
    expect(formatTarget({ kind: "hold-range", minSeconds: 20, maxSeconds: 30 })).toBe("Hold 20–30 seconds");
    expect(formatTarget({ kind: "duration", seconds: 1200 })).toBe("20 minutes");
    expect(formatTarget({ kind: "interval", workSeconds: 30, recoverySeconds: 60, work: "fast", recovery: "walking" })).toBe("30 seconds fast, then 1 minute walking");
    expect(formatTarget({ kind: "distance", meters: 75, description: "3 × 25 meters with two turns." })).toBe("75 meters (3 × 25 meters with two turns)");
    expect(formatTarget({ kind: "as-prescribed", text: "10 of each" })).toBe("10 of each");
    expect(formatDuration(45)).toBe("45 seconds");
    expect(setLabel("round", 2)).toBe("Round 2");
    expect(formatRest({ text: "60–90 seconds", minSeconds: 60, maxSeconds: 90, between: "sets" })).toBe("Rest 60–90 seconds between sets");
    expect(formatRest({ text: "90 seconds", minSeconds: 90, maxSeconds: 90, between: "sets" })).toBe("Rest 90 seconds between sets");
    expect(formatRest({ text: "60 seconds between rounds", minSeconds: 60, maxSeconds: 60, between: "rounds" })).toBe("Rest 60 seconds between rounds");
  });

  it("offers only the actual values a set measures, plus weight for loaded lifts", () => {
    const d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    const all: WorkoutExercise[] = d.workouts[0].snapshot.sections.flatMap((s) => s.exercises);
    const deadlift = all.find((e) => e.source.kind === "exercise" && e.source.exerciseId === "deadlift")!;
    expect(actualFields(deadlift, deadlift.sets[0].target)).toEqual(["reps", "load"]);
    const stretch = all.find((e) => e.source.kind === "drill" && e.source.drillId === "recovery-drill")!;
    expect(actualFields(stretch, stretch.sets[0].target)).toEqual(["seconds"]);
    expect(actualFields(deadlift, { kind: "interval", workSeconds: 30, recoverySeconds: 60, work: "fast", recovery: "walking" })).toEqual(["load"]);
    expect(actualFields(stretch, { kind: "as-prescribed", text: "x" })).toEqual([]);
  });

  it("reads optional actual values and rejects text", () => {
    expect(parseActualInput({ reps: " 9 ", load: "135" })).toEqual({ actual: { reps: 9, load: { value: 135, unit: "lb" } } });
    expect(parseActualInput({ reps: "", seconds: "  " })).toEqual({});
    expect(parseActualInput({ reps: "nine" })).toEqual({ error: "Enter numbers only, or leave the field blank." });
    expect(parseActualInput({ seconds: "-5" }).error).toBeDefined();
    expect(formatActual({ reps: 9, seconds: 30, meters: 50, load: { value: 60, unit: "kg" } })).toBe("9 reps · 30 seconds · 50 meters · 60 kg");
    expect(formatActual(undefined)).toBe("");
  });
});
