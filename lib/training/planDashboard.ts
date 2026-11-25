import { addDays, weekWindow } from "./engine";
import { currentWeek } from "./progress";
import { planSessionStates, type PlanState, type SessionRecords, type SessionState, type SessionStatus } from "./sessionStatus";
import { PLAN_WEEKS } from "./templates";
import { buildWorkout, planPaused, workoutPhase, workoutProgress, workoutReadiness, type WorkoutProgress, type WorkoutReadiness } from "./workout";
import type { SessionCompletion, SetCompletion, StoredPlan, StoredWorkout, WorkoutSnapshot } from "./types";

// What the active-plan page shows, computed from stored records and the session status engine. Components render
// this; they never decide eligibility themselves.

export type TrainingRecords = SessionRecords & { setRecords: SetCompletion[] };

export type SessionProgress =
  | { kind: "tracked"; completed: number; total: number; percent: number | null }
  | { kind: "untracked" } // completed from the plan view before set tracking: no set records exist
  | { kind: "not-started" };

export type DayEntry = { kind: "session"; date: string; state: SessionState; progress: SessionProgress } | { kind: "rest"; date: string };

export type WeekView = {
  week: number;
  from: string;
  to: string;
  phase: "foundation" | "build" | "held";
  completed: number;
  total: number;
  percent: number;
  days: DayEntry[];
};

export type PlanDashboard = {
  state: PlanState;
  today: string;
  // 1–4, or PLAN_WEEKS + 1 once the plan's weeks are over.
  week: number;
  todaySessions: SessionState[];
  overall: { completed: number; remaining: number; total: number; percent: number };
  weeks: WeekView[];
  // The earliest unfinished session: overdue sessions are never skipped.
  next: SessionState | null;
  pause: { paused: boolean; since: string | null };
};

const percent = (n: number, d: number) => (d ? Math.floor((n * 100) / d) : 0);
const mine = <T extends { planId: string; sessionId: string }>(list: T[], planId: string, sessionId: string) => list.find((x) => x.planId === planId && x.sessionId === sessionId);

export function sessionProgress(plan: StoredPlan, records: TrainingRecords, state: SessionState): SessionProgress {
  const workout = mine(records.workouts, plan.id, state.sessionId);
  if (workout) {
    const p = workoutProgress(workout.snapshot, records.setRecords).overall;
    return { kind: "tracked", completed: p.completed, total: p.total, percent: p.percent };
  }
  return state.status === "completed" ? { kind: "untracked" } : { kind: "not-started" };
}

// The earliest pain record for the plan, from a painful session record or a separate pain report.
export function pausedSince(plan: StoredPlan, records: SessionRecords): string | null {
  const times = [
    ...records.completions.filter((c) => c.planId === plan.id && c.pain).map((c) => c.completedAt),
    ...records.painReports.filter((r) => r.planId === plan.id).map((r) => r.reportedAt),
  ].filter(Boolean);
  return times.length ? [...times].sort()[0] : null;
}

export function planDashboard(plan: StoredPlan, records: TrainingRecords, now: string): PlanDashboard {
  const state = planSessionStates(plan, records, now);
  const safety = { sessionCompletions: records.completions, painReports: records.painReports };
  const completed = state.sessions.filter((s) => s.status === "completed").length;
  const weeks: WeekView[] = Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((week) => {
    const { from, to } = weekWindow(plan.startDate, week);
    const inWeek = state.sessions.filter((s) => s.date >= from && s.date <= to);
    const days: DayEntry[] = Array.from({ length: 7 }, (_, d) => addDays(from, d)).flatMap((date): DayEntry[] => {
      const sessions = inWeek.filter((s) => s.date === date);
      return sessions.length ? sessions.map((s) => ({ kind: "session" as const, date, state: s, progress: sessionProgress(plan, records, s) })) : [{ kind: "rest" as const, date }];
    });
    const first = plan.sessions.find((s) => s.week === week);
    const held = week >= 3 && !!first && workoutPhase(plan, safety, first).progressionHeld;
    const done = inWeek.filter((s) => s.status === "completed").length;
    return { week, from, to, phase: week <= 2 ? "foundation" : held ? "held" : "build", completed: done, total: inWeek.length, percent: percent(done, inWeek.length), days };
  });
  return {
    state,
    today: state.today,
    week: currentWeek(plan, state.today),
    todaySessions: state.sessions.filter((s) => s.date === state.today),
    overall: { completed, remaining: state.sessions.length - completed, total: state.sessions.length, percent: percent(completed, state.sessions.length) },
    weeks,
    next: state.earliestUnfinished,
    pause: { paused: planPaused(plan.id, safety), since: pausedSince(plan, records) },
  };
}

// ---------------------------------------------------------------------------
// One session's workout, as the page shows it
// ---------------------------------------------------------------------------

export type WorkoutView =
  // A started workout whose sets can be recorded now.
  | { mode: "active"; workout: StoredWorkout; records: Map<string, SetCompletion>; progress: WorkoutProgress; readiness: WorkoutReadiness }
  // A started workout that can't take changes now (paused, locked, blocked, or plan ended). Its sets are kept.
  | { mode: "stored"; workout: StoredWorkout; records: Map<string, SetCompletion>; progress: WorkoutProgress; readiness: WorkoutReadiness }
  // A completed tracked workout, read-only.
  | { mode: "history"; workout: StoredWorkout; records: Map<string, SetCompletion>; progress: WorkoutProgress; completion: SessionCompletion }
  // Completed before set tracking: only the session record exists. No sets are shown or invented.
  | { mode: "untracked"; completion: SessionCompletion }
  // Not started: the prescription it would start with today, for reading only.
  | { mode: "preview"; snapshot: WorkoutSnapshot };

export function workoutView(plan: StoredPlan, records: TrainingRecords, state: SessionState, now: string): WorkoutView {
  const workout = mine(records.workouts, plan.id, state.sessionId);
  const completion = mine(records.completions, plan.id, state.sessionId);
  if (workout) {
    const own = records.setRecords.filter((r) => r.planId === plan.id && r.sessionId === state.sessionId);
    const latest = new Map<string, SetCompletion>();
    for (const r of own) if (!latest.has(r.setId) || r.completedAt > latest.get(r.setId)!.completedAt) latest.set(r.setId, r);
    const progress = workoutProgress(workout.snapshot, own);
    if (completion) return { mode: "history", workout, records: latest, progress, completion };
    const readiness = workoutReadiness(workout.snapshot, own, { sessionCompletions: records.completions, painReports: records.painReports });
    return { mode: state.status === "in-progress" ? "active" : "stored", workout, records: latest, progress, readiness };
  }
  if (completion) return { mode: "untracked", completion };
  const safety = { sessionCompletions: records.completions, painReports: records.painReports };
  return { mode: "preview", snapshot: buildWorkout(plan, state.session, { ...workoutPhase(plan, safety, state.session), createdAt: now }) };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const statusLabels: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  available: "Ready",
  "in-progress": "In progress",
  completed: "Completed",
  locked: "Locked",
  overdue: "Overdue",
  paused: "Paused",
  ended: "Ended",
  blocked: "Can't be tracked",
};

// What the page offers for a session; all of it follows from the engine's status.
export function sessionActions(state: SessionState, view: WorkoutView): { start: boolean; resume: boolean; reschedule: boolean } {
  const started = view.mode === "active" || view.mode === "stored" || view.mode === "history";
  return {
    start: state.eligible && !started && view.mode === "preview",
    resume: state.eligible && view.mode === "active",
    reschedule: !started && view.mode === "preview" && ["upcoming", "available", "overdue", "locked"].includes(state.status),
  };
}
