import { PAIN_PAUSE_MESSAGE } from "@/lib/training/progress";
import { ONE_PER_DAY, localDateOf, sessionState } from "@/lib/training/sessionStatus";
import {
  planPaused,
  recordSetCompletion,
  reportWorkoutPain,
  resumeWorkout,
  startWorkout,
  undoSetCompletion,
  workoutProgress,
  workoutReadiness,
  type WorkoutProgress,
  type WorkoutReadiness,
} from "@/lib/training/workout";
import type { ActualPerformance, Difficulty, SessionCompletion, StoredWorkout, WorkoutPainReport, WorkoutSnapshot } from "@/lib/training/types";
import { commitTrainingData, safetyRecords, type TrainingData, type TrainingOperation } from "./trainingPlans";
import { WORKOUT_LIMITS, isTimestamp } from "./workoutRecords";

// Tracked-workout lifecycle on top of the training section. Each operation is pure (data in, data out) and has a
// save* wrapper that writes the result to browser storage before returning.

type Result<T extends object = object> = ({ ok: true; data: TrainingData } & T) | { ok: false; error: string };

const DIFFICULTIES: Difficulty[] = ["easy", "about-right", "hard", "too-hard"];
const ID = /^[A-Za-z0-9._~:-]{1,300}$/;
const SET_ID = /^[A-Za-z0-9._~:/-]{1,300}$/;
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

type Located = { plan: TrainingData["plans"][number]; workout?: StoredWorkout; completion?: SessionCompletion };

function locate(data: TrainingData, planId: unknown, sessionId: unknown): Located | { error: string } {
  if (typeof planId !== "string" || !ID.test(planId)) return { error: "Invalid plan ID." };
  if (typeof sessionId !== "string" || !ID.test(sessionId)) return { error: "Invalid session ID." };
  const plan = data.plans.find((p) => p.id === planId);
  if (!plan) return { error: "Plan not found." };
  if (!plan.sessions.some((s) => s.id === sessionId)) return { error: "Session not found." };
  return {
    plan,
    workout: data.workouts.find((w) => w.planId === planId && w.sessionId === sessionId),
    completion: data.completions.find((c) => c.planId === planId && c.sessionId === sessionId),
  };
}

// An open workout that can take set changes: it exists, isn't completed, the plan isn't ended or paused, and the
// session is still in turn (every earlier session completed) with a readable prescription.
function openWorkout(data: TrainingData, planId: string, sessionId: string, at: string): { found: Located & { workout: StoredWorkout } } | { error: string } {
  const found = locate(data, planId, sessionId);
  if ("error" in found) return found;
  if (planPaused(planId, safetyRecords(data))) return { error: PAIN_PAUSE_MESSAGE };
  if (found.plan.status !== "active") return { error: "This plan has ended." };
  if (!found.workout) return { error: "This workout hasn't been started." };
  if (found.workout.status === "completed" || found.completion) return { error: "This workout is already complete." };
  if (!localDateOf(at)) return { error: "Time must be an ISO timestamp." };
  const state = sessionState(found.plan, data, sessionId, at)!;
  if (state.status !== "in-progress") return { error: state.reasons.join(" ") };
  return { found: found as Located & { workout: StoredWorkout } };
}

// Starts a workout and stores its frozen snapshot, or continues the stored one. A stored snapshot is never rebuilt:
// later feedback only produces a notice. Sessions already recorded without tracking get no set records.
// Eligibility comes from sessionStatus.ts: a locked, upcoming, blocked, paused, or ended session can't start.
export function startOrResumeWorkout(data: TrainingData, planId: string, sessionId: string, at: string): Result<{ workout: WorkoutSnapshot; resumed: boolean; notice?: string }> {
  const found = locate(data, planId, sessionId);
  if ("error" in found) return fail(found.error);
  if (!isTimestamp(at)) return fail("Start time must be an ISO timestamp.");
  const safety = safetyRecords(data);
  if (planPaused(planId, safety)) return fail(PAIN_PAUSE_MESSAGE);
  if (found.plan.status !== "active") return fail("This plan has ended.");
  const state = sessionState(found.plan, data, sessionId, at)!;
  if (found.workout) {
    if (found.workout.status === "completed" || found.completion) return fail("This workout is already complete.");
    if (state.status !== "in-progress") return fail(state.reasons.join(" "));
    const resumed = resumeWorkout(found.plan, safety, found.workout.snapshot);
    if (resumed.status === "paused") return fail(resumed.message);
    if (resumed.status === "mismatch") return fail(resumed.reason);
    return { ok: true, data, workout: resumed.workout, resumed: true, ...(resumed.notice ? { notice: resumed.notice } : {}) };
  }
  if (found.completion) return fail("This session is already recorded.");
  // Starting needs the session's turn: earlier sessions completed, its date reached, nothing else trained today.
  if (!state.eligible) return fail(state.reasons.join(" "));
  const started = startWorkout(found.plan, safety, sessionId, at);
  if (started.status !== "started") return fail(started.status === "paused" ? started.message : "Session not found.");
  const stored: StoredWorkout = { planId, sessionId, status: "in-progress", startedAt: at, snapshot: started.workout };
  return { ok: true, data: { ...data, workouts: [...data.workouts, stored] }, workout: started.workout, resumed: false };
}

export function recordWorkoutSet(
  data: TrainingData,
  planId: string,
  sessionId: string,
  entry: { setId: string; completedAt: string; actual?: ActualPerformance }
): Result {
  const open = openWorkout(data, planId, sessionId, entry?.completedAt);
  if ("error" in open) return fail(open.error);
  if (typeof entry?.setId !== "string" || !SET_ID.test(entry.setId)) return fail("Invalid set ID.");
  if (data.setRecords.length >= WORKOUT_LIMITS.setRecords) return fail("RuckOn can't store more recorded sets in this browser.");
  const result = recordSetCompletion(data.setRecords, open.found.workout.snapshot, entry, safetyRecords(data));
  if (!result.ok) return fail(result.errors.join(" "));
  return { ok: true, data: { ...data, setRecords: result.records } };
}

// Undo is for a set recorded by mistake. It is refused while the plan is paused, so recorded progress is kept.
export function undoWorkoutSet(data: TrainingData, planId: string, sessionId: string, setId: string, at: string): Result {
  const open = openWorkout(data, planId, sessionId, at);
  if ("error" in open) return fail(open.error);
  if (typeof setId !== "string" || !SET_ID.test(setId)) return fail("Invalid set ID.");
  if (!data.setRecords.some((r) => r.planId === planId && r.sessionId === sessionId && r.setId === setId)) return fail("That set isn't recorded.");
  return { ok: true, data: { ...data, setRecords: undoSetCompletion(data.setRecords, planId, sessionId, setId) } };
}

// Saved on its own, with or without a started workout and even when the plan is already paused or ended, so pain
// is never lost. Nothing else changes: recorded sets stay, and no session is marked complete.
export function reportPain(data: TrainingData, planId: string, sessionId: string, entry: { reportedAt: string; setId?: string; notes: string }): Result<{ report: WorkoutPainReport; message: string }> {
  const found = locate(data, planId, sessionId);
  if ("error" in found) return fail(found.error);
  if (typeof entry?.notes !== "string") return fail("Notes must be text.");
  if (data.painReports.length >= WORKOUT_LIMITS.painReports) return fail("RuckOn can't store more pain reports in this browser. Talk to a medical provider or your unit's H2F team.");
  let report: WorkoutPainReport;
  if (found.workout) {
    const result = reportWorkoutPain(found.workout.snapshot, entry);
    if (!result.ok) return fail(result.errors.join(" "));
    report = result.report;
  } else {
    if (!isTimestamp(entry.reportedAt)) return fail("Report time must be an ISO timestamp.");
    if (entry.setId !== undefined) return fail("That set is not part of this workout.");
    report = { planId, sessionId, reportedAt: entry.reportedAt, notes: entry.notes.slice(0, WORKOUT_LIMITS.notes) };
  }
  return { ok: true, data: { ...data, painReports: [...data.painReports, report] }, report, message: PAIN_PAUSE_MESSAGE };
}

export type WorkoutFeedback = { completedAt: string; difficulty: Difficulty; pain: boolean; notes: string };

// Completes a tracked workout only when every set is recorded (readiness "complete") and the session feedback the
// plan needs is given. Blocked (unread prescriptions), incomplete, and paused workouts can't be completed here.
// Feedback with pain completes the session with pain, which pauses the plan the same way the plan view does.
export function completeTrackedWorkout(data: TrainingData, planId: string, sessionId: string, feedback: WorkoutFeedback): Result<{ completion: SessionCompletion }> {
  const open = openWorkout(data, planId, sessionId, feedback?.completedAt);
  if ("error" in open) return fail(open.error);
  if (!feedback || !DIFFICULTIES.includes(feedback.difficulty)) return fail("Choose how hard the session was.");
  if (typeof feedback.pain !== "boolean") return fail("Answer whether you had pain.");
  if (typeof feedback.notes !== "string") return fail("Notes must be text.");
  const { workout } = open.found;
  if (!isTimestamp(feedback.completedAt) || feedback.completedAt < workout.startedAt) return fail("Completion time must be an ISO timestamp after the workout started.");
  const day = localDateOf(feedback.completedAt);
  if (data.completions.some((c) => c.planId === planId && c.sessionId !== sessionId && localDateOf(c.completedAt) === day)) return fail(ONE_PER_DAY);
  // Every set recorded is not enough on its own: the session completes, and the next one unlocks, only here.
  const readiness = workoutReadiness(workout.snapshot, data.setRecords, safetyRecords(data));
  if (readiness.status === "paused") return fail(readiness.message);
  if (readiness.status === "blocked") return fail(`This workout can't be completed from set records: ${readiness.reasons.join(" ")}`);
  if (readiness.status === "incomplete") return fail(`${readiness.remaining} ${readiness.remaining === 1 ? "set is" : "sets are"} not recorded yet.`);
  const completion: SessionCompletion = {
    planId,
    sessionId,
    completedAt: feedback.completedAt,
    difficulty: feedback.difficulty,
    pain: feedback.pain,
    notes: feedback.notes.slice(0, WORKOUT_LIMITS.notes),
  };
  return {
    ok: true,
    data: {
      ...data,
      completions: [...data.completions, completion],
      workouts: data.workouts.map((w) => (w === workout ? { ...w, status: "completed" as const, completedAt: feedback.completedAt } : w)),
    },
    completion,
  };
}

export type TrackedWorkoutView = { workout: StoredWorkout; progress: WorkoutProgress; readiness: WorkoutReadiness };

// Exercise, section, and overall progress for a stored workout, from its own snapshot and recorded sets.
export function trackedWorkout(data: TrainingData, planId: string, sessionId: string): TrackedWorkoutView | null {
  const workout = data.workouts.find((w) => w.planId === planId && w.sessionId === sessionId);
  if (!workout) return null;
  const records = data.setRecords.filter((r) => r.planId === planId && r.sessionId === sessionId);
  return { workout, progress: workoutProgress(workout.snapshot, records), readiness: workoutReadiness(workout.snapshot, records, safetyRecords(data)) };
}

// ---------------------------------------------------------------------------
// Browser storage: each successful operation is saved before it returns
// ---------------------------------------------------------------------------

const save = <T extends object>(operation: TrainingOperation<T>) => commitTrainingData(operation);

// The saving operations read the device clock themselves, so a caller can't pass a later time to unlock a session.
const clock = () => new Date().toISOString();

export const saveStartOrResumeWorkout = (planId: string, sessionId: string) => save((d) => startOrResumeWorkout(d, planId, sessionId, clock()));
export const saveWorkoutSet = (planId: string, sessionId: string, entry: { setId: string; actual?: ActualPerformance }) =>
  save((d) => recordWorkoutSet(d, planId, sessionId, { ...entry, completedAt: clock() }));
export const saveUndoWorkoutSet = (planId: string, sessionId: string, setId: string) => save((d) => undoWorkoutSet(d, planId, sessionId, setId, clock()));
export const savePainReport = (planId: string, sessionId: string, entry: { setId?: string; notes: string }) => save((d) => reportPain(d, planId, sessionId, { ...entry, reportedAt: clock() }));
export const saveTrackedCompletion = (planId: string, sessionId: string, feedback: Omit<WorkoutFeedback, "completedAt">) =>
  save((d) => completeTrackedWorkout(d, planId, sessionId, { ...feedback, completedAt: clock() }));
