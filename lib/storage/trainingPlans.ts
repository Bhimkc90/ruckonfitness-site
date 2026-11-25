import { useSyncExternalStore } from "react";
import { addDays, defaultSessionDate, weekWindow } from "@/lib/training/engine";
import { PAIN_PAUSE_MESSAGE, sessionsByDate } from "@/lib/training/progress";
import { laterActivity, localDateOf, sessionState } from "@/lib/training/sessionStatus";
import { planPaused } from "@/lib/training/workout";
import type {
  BaselineSnapshot,
  Difficulty,
  PlanDraft,
  SafetyRecords,
  SessionCompletion,
  SetCompletion,
  StoredPlan,
  StoredWorkout,
  WorkoutPainReport,
} from "@/lib/training/types";
import { sanitizeWorkoutData } from "./workoutRecords";

// Training plans live in their own key, separate from AFT history, and only in this browser.
// Schema 2 adds started workouts, set records, and pain reports; schema 1 data is read and upgraded on the next save.
export const TRAINING_KEY = "ruckon.trainingPlans";
export const TRAINING_SCHEMA_VERSION = 2;
export const LEGACY_TRAINING_SCHEMA_VERSIONS = [1] as const;
export const TRAINING_EVENT = "ruckon:training-plans-changed";
const STORAGE_KEY = TRAINING_KEY;
const SCHEMA_VERSION = TRAINING_SCHEMA_VERSION;
const CHANGE_EVENT = TRAINING_EVENT;

export type TrainingData = {
  schemaVersion: number;
  plans: StoredPlan[];
  completions: SessionCompletion[];
  workouts: StoredWorkout[];
  setRecords: SetCompletion[];
  painReports: WorkoutPainReport[];
};

export const EMPTY_TRAINING: TrainingData = { schemaVersion: SCHEMA_VERSION, plans: [], completions: [], workouts: [], setRecords: [], painReports: [] };

export function hasTrainingData(data: TrainingData): boolean {
  return data.plans.length > 0 || data.completions.length > 0 || data.workouts.length > 0 || data.setRecords.length > 0 || data.painReports.length > 0;
}

export const safetyRecords = (data: TrainingData): SafetyRecords => ({ sessionCompletions: data.completions, painReports: data.painReports });

// ---------------------------------------------------------------------------
// Pure updates (tested without a browser)
// ---------------------------------------------------------------------------

export function parseTrainingData(raw: string | null): TrainingData {
  if (!raw) return EMPTY_TRAINING;
  try {
    const data = JSON.parse(raw) as Partial<TrainingData>;
    const known = data.schemaVersion === SCHEMA_VERSION || (LEGACY_TRAINING_SCHEMA_VERSIONS as readonly unknown[]).includes(data.schemaVersion);
    if (!known || !Array.isArray(data.plans) || !Array.isArray(data.completions)) return EMPTY_TRAINING;
    const plans = data.plans.filter(
      (p): p is StoredPlan =>
        !!p && typeof p.id === "string" && typeof p.startDate === "string" && Array.isArray(p.sessions) && !!p.baseline && typeof p.templateVersion === "string"
    );
    const completions = data.completions.filter(
      (c): c is SessionCompletion => !!c && typeof c.planId === "string" && typeof c.sessionId === "string" && typeof c.completedAt === "string"
    );
    // Schema 1 has no workout records. Legacy completed sessions get none: set records are never inferred.
    const workouts = data.schemaVersion === SCHEMA_VERSION ? sanitizeWorkoutData(data as Record<string, unknown>, plans) : { workouts: [], setRecords: [], painReports: [] };
    return { schemaVersion: SCHEMA_VERSION, plans, completions, ...workouts };
  } catch {
    return EMPTY_TRAINING;
  }
}

export function startPlan(data: TrainingData, draft: PlanDraft, meta: { id: string; createdAt: string; startDate: string }): TrainingData {
  const plan: StoredPlan = {
    // A deep copy keeps the baseline snapshot and prescriptions fixed even if templates or AFT history change later.
    ...(JSON.parse(JSON.stringify(draft)) as PlanDraft),
    id: meta.id,
    createdAt: meta.createdAt,
    startDate: meta.startDate,
    status: "active",
    reschedules: {},
  };
  return { ...data, plans: [...data.plans.map((p) => (p.status === "active" ? { ...p, status: "ended" as const } : p)), plan] };
}

export function endPlan(data: TrainingData, planId: string): TrainingData {
  return { ...data, plans: data.plans.map((p) => (p.id === planId ? { ...p, status: "ended" as const } : p)) };
}

const sameSession = (x: { planId: string; sessionId: string }, planId: string, sessionId: string) => x.planId === planId && x.sessionId === sessionId;

// Why the plan view's quick "record session" can't be used for a session at the given time, or null when it can.
// A paused plan takes no new records; a session with a tracked workout is completed only through that workout's
// checks; and a new record needs the session to be eligible (in order, on or after its date, one per day). An
// existing record can be replaced only while nothing later has been started or completed.
export function legacyCompletionBlock(data: TrainingData, planId: string, sessionId: string, at: string = new Date().toISOString()): string | null {
  const plan = data.plans.find((p) => p.id === planId);
  if (!plan || !plan.sessions.some((s) => s.id === sessionId)) return "Session not found.";
  if (planPaused(planId, safetyRecords(data))) return PAIN_PAUSE_MESSAGE;
  if (data.workouts.some((w) => sameSession(w, planId, sessionId))) return "This session has a tracked workout. Finish it from the workout so every set is checked.";
  if (!localDateOf(at)) return "Completion time must be an ISO timestamp.";
  if (data.completions.some((c) => sameSession(c, planId, sessionId))) return laterActivity(plan, data, sessionId);
  const state = sessionState(plan, data, sessionId, at)!;
  return state.eligible ? null : state.reasons.join(" ");
}

// Why a completion can't be undone, or null when it can.
export function undoCompletionBlock(data: TrainingData, planId: string, sessionId: string): string | null {
  const plan = data.plans.find((p) => p.id === planId);
  if (!plan || !plan.sessions.some((s) => s.id === sessionId)) return "Session not found.";
  if (planPaused(planId, safetyRecords(data))) return PAIN_PAUSE_MESSAGE;
  if (!data.completions.some((c) => sameSession(c, planId, sessionId))) return "This session isn't recorded.";
  return laterActivity(plan, data, sessionId);
}

// Records a session without set tracking (the existing plan view). Blocked as legacyCompletionBlock describes, and
// a record with pain can never be replaced. Pain is never dropped: if the record itself is refused, the pain is
// kept as a pain report.
export function completeSession(
  data: TrainingData,
  entry: { planId: string; sessionId: string; completedAt: string; difficulty: Difficulty; pain: boolean; notes: string }
): TrainingData {
  const plan = data.plans.find((p) => p.id === entry.planId);
  if (!plan || !plan.sessions.some((s) => s.id === entry.sessionId)) return data;
  if (legacyCompletionBlock(data, entry.planId, entry.sessionId, entry.completedAt)) {
    if (!entry.pain) return data;
    const report: WorkoutPainReport = { planId: entry.planId, sessionId: entry.sessionId, reportedAt: entry.completedAt, notes: entry.notes.slice(0, 500) };
    return { ...data, painReports: [...data.painReports, report] };
  }
  const others = data.completions.filter((c) => !sameSession(c, entry.planId, entry.sessionId));
  return { ...data, completions: [...others, { ...entry, notes: entry.notes.slice(0, 500) }] };
}

// Undo never lifts a pause: nothing is undone while the plan is paused, so a painful record stays. Nor does it
// rewrite history: once a later session is started or completed, earlier records stay (undoCompletionBlock says
// why). Undoing a tracked workout's completion reopens the workout with its recorded sets.
export function undoCompletion(data: TrainingData, planId: string, sessionId: string): TrainingData {
  if (undoCompletionBlock(data, planId, sessionId)) return data;
  return {
    ...data,
    completions: data.completions.filter((c) => !sameSession(c, planId, sessionId)),
    workouts: data.workouts.map((w) => {
      if (!sameSession(w, planId, sessionId) || w.status !== "completed") return w;
      const { completedAt: _done, ...rest } = w;
      void _done;
      return { ...rest, status: "in-progress" as const };
    }),
  };
}

const HARD_KINDS = new Set(["strength", "speed", "conditioning"]);

// Moves a session within its own plan week. Completion history is keyed by session ID, so it is kept.
// Two sessions may not share a date; a hard session next to another hard session is allowed with a warning.
// Completed and started sessions keep their date, a session can't move into the past, and it can't move ahead of
// anything already completed or started, so moving never reorders history or unlocks a session out of turn.
export function rescheduleSession(
  data: TrainingData,
  planId: string,
  sessionId: string,
  date: string,
  now: string = new Date().toISOString()
): { data: TrainingData; error?: string; warning?: string } {
  const plan = data.plans.find((p) => p.id === planId);
  const session = plan?.sessions.find((s) => s.id === sessionId);
  if (!plan || !session) return { data, error: "Session not found." };
  if (planPaused(planId, safetyRecords(data))) return { data, error: PAIN_PAUSE_MESSAGE };
  if (plan.status !== "active") return { data, error: "This plan has ended." };
  const doneOrStarted = (id: string) => data.completions.some((c) => sameSession(c, planId, id)) || data.workouts.some((w) => sameSession(w, planId, id));
  if (doneOrStarted(sessionId)) return { data, error: "Completed and started workouts keep their date, so your history stays in order." };
  const { from, to } = weekWindow(plan.startDate, session.week);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from || date > to) {
    return { data, error: `Choose a date in week ${session.week} (${from} to ${to}).` };
  }
  const today = localDateOf(now);
  if (!today) return { data, error: "Invalid current time." };
  if (date < today) return { data, error: "Choose today or a later date. RuckOn doesn't move workouts into the past." };
  const order = sessionsByDate({ ...plan, reschedules: { ...plan.reschedules, [sessionId]: date } });
  const position = order.findIndex((d) => d.session.id === sessionId);
  if (order.slice(position + 1).some((d) => doneOrStarted(d.session.id))) {
    return { data, error: "That date is before a workout you've already completed or started, which would put your history out of order." };
  }
  const dateOf = (id: string, week: number, weekday: (typeof plan.sessions)[number]["weekday"]) =>
    plan.reschedules[id] ?? defaultSessionDate(plan.startDate, week, weekday);
  const others = plan.sessions.filter((s) => s.id !== sessionId).map((s) => ({ session: s, date: dateOf(s.id, s.week, s.weekday) }));
  const clash = others.find((o) => o.date === date);
  if (clash) return { data, error: `${clash.session.title} is already on that date. Choose another day.` };
  let warning: string | undefined;
  if (plan.preferences.nextAftDate === date) warning = "That's your AFT day. RuckOn doesn't schedule training on the test day; consider another day.";
  else if (HARD_KINDS.has(session.kind)) {
    const neighbor = others.find((o) => HARD_KINDS.has(o.session.kind) && (o.date === addDays(date, 1) || o.date === addDays(date, -1)));
    if (neighbor) warning = `This puts ${session.title} next to ${neighbor.session.title}, another hard session. The plan avoids back-to-back hard days; consider a different day.`;
  }
  return {
    data: { ...data, plans: data.plans.map((p) => (p.id === planId ? { ...p, reschedules: { ...p.reschedules, [sessionId]: date } } : p)) },
    warning,
  };
}

// Links a later saved AFT result to a plan as its reassessment, as a copy, so the comparison with the baseline
// survives edits or deletion in AFT history. Replaces any earlier link; the plan itself is unchanged.
export function linkReassessment(
  data: TrainingData,
  planId: string,
  record: BaselineSnapshot,
  linkedAt: string
): { data: TrainingData; error?: string } {
  const plan = data.plans.find((p) => p.id === planId);
  if (!plan) return { data, error: "Plan not found." };
  if (record.resultId === plan.baseline.resultId) return { data, error: "Choose a test other than the plan's baseline." };
  if (record.testDate < plan.startDate) return { data, error: "Choose a test taken on or after the plan's start date." };
  const link = { ...(JSON.parse(JSON.stringify(record)) as BaselineSnapshot), linkedAt };
  return { data: { ...data, plans: data.plans.map((p) => (p.id === planId ? { ...p, reassessmentLink: link } : p)) } };
}

export function unlinkReassessment(data: TrainingData, planId: string): TrainingData {
  return {
    ...data,
    plans: data.plans.map((p) => {
      if (p.id !== planId) return p;
      const { reassessmentLink: _removed, ...rest } = p;
      void _removed;
      return rest;
    }),
  };
}

export function activePlan(data: TrainingData): StoredPlan | null {
  return data.plans.find((p) => p.status === "active") ?? null;
}

// ---------------------------------------------------------------------------
// Browser storage
// ---------------------------------------------------------------------------

let cachedRaw: string | null | undefined;
let cached: TrainingData = EMPTY_TRAINING;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): TrainingData {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseTrainingData(raw);
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Stored data from a newer RuckOn version can't be read here; writing would overwrite it with an empty section.
export function storedSchemaTooNew(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const version = (JSON.parse(raw) as { schemaVersion?: unknown })?.schemaVersion;
    return typeof version === "number" && version > SCHEMA_VERSION;
  } catch {
    return false;
  }
}

const TOO_NEW = "Your training data was saved by a newer version of RuckOn. Update the app before changing it; nothing was changed.";

export function readTrainingData(): TrainingData {
  return getSnapshot();
}

export function writeTrainingData(data: TrainingData): { ok: true } | { ok: false; error: string } {
  if (storedSchemaTooNew(readRaw())) return { ok: false, error: TOO_NEW };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save on this device. Browser storage may be full or disabled." };
  }
}

export function updateTrainingData(update: (data: TrainingData) => TrainingData) {
  return writeTrainingData(update(getSnapshot()));
}

export type TrainingOperation<T extends object> = (data: TrainingData) => ({ ok: true; data: TrainingData } & T) | { ok: false; error: string };

// Applies one operation to the stored data and saves it before returning, so every successful step is on disk.
// A single setItem either stores the whole section or nothing, so a failed save leaves the previous data intact.
export function commitTrainingData<T extends object>(operation: TrainingOperation<T>): ({ ok: true; data: TrainingData } & T) | { ok: false; error: string } {
  const result = operation(getSnapshot());
  if (!result.ok) return result;
  const saved = writeTrainingData(result.data);
  return saved.ok ? result : { ok: false, error: saved.error };
}

export function useTrainingData(): TrainingData {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_TRAINING);
}
