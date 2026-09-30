import { useSyncExternalStore } from "react";
import { addDays, defaultSessionDate, weekWindow } from "@/lib/training/engine";
import type { Difficulty, PlanDraft, SessionCompletion, StoredPlan } from "@/lib/training/types";

// Training plans live in their own key, separate from AFT history, and only in this browser.
const STORAGE_KEY = "ruckon.trainingPlans";
const SCHEMA_VERSION = 1;
const CHANGE_EVENT = "ruckon:training-plans-changed";

export type TrainingData = {
  schemaVersion: number;
  plans: StoredPlan[];
  completions: SessionCompletion[];
};

export const EMPTY_TRAINING: TrainingData = { schemaVersion: SCHEMA_VERSION, plans: [], completions: [] };

// ---------------------------------------------------------------------------
// Pure updates (tested without a browser)
// ---------------------------------------------------------------------------

export function parseTrainingData(raw: string | null): TrainingData {
  if (!raw) return EMPTY_TRAINING;
  try {
    const data = JSON.parse(raw) as Partial<TrainingData>;
    if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.plans) || !Array.isArray(data.completions)) return EMPTY_TRAINING;
    const plans = data.plans.filter(
      (p): p is StoredPlan =>
        !!p && typeof p.id === "string" && typeof p.startDate === "string" && Array.isArray(p.sessions) && !!p.baseline && typeof p.templateVersion === "string"
    );
    const completions = data.completions.filter(
      (c): c is SessionCompletion => !!c && typeof c.planId === "string" && typeof c.sessionId === "string" && typeof c.completedAt === "string"
    );
    return { schemaVersion: SCHEMA_VERSION, plans, completions };
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

export function completeSession(
  data: TrainingData,
  entry: { planId: string; sessionId: string; completedAt: string; difficulty: Difficulty; pain: boolean; notes: string }
): TrainingData {
  const plan = data.plans.find((p) => p.id === entry.planId);
  if (!plan || !plan.sessions.some((s) => s.id === entry.sessionId)) return data;
  const others = data.completions.filter((c) => !(c.planId === entry.planId && c.sessionId === entry.sessionId));
  return { ...data, completions: [...others, { ...entry, notes: entry.notes.slice(0, 500) }] };
}

export function undoCompletion(data: TrainingData, planId: string, sessionId: string): TrainingData {
  return { ...data, completions: data.completions.filter((c) => !(c.planId === planId && c.sessionId === sessionId)) };
}

const HARD_KINDS = new Set(["strength", "speed", "conditioning"]);

// Moves a session within its own plan week. Completion history is keyed by session ID, so it is kept.
// Two sessions may not share a date; a hard session next to another hard session is allowed with a warning.
export function rescheduleSession(
  data: TrainingData,
  planId: string,
  sessionId: string,
  date: string
): { data: TrainingData; error?: string; warning?: string } {
  const plan = data.plans.find((p) => p.id === planId);
  const session = plan?.sessions.find((s) => s.id === sessionId);
  if (!plan || !session) return { data, error: "Session not found." };
  const { from, to } = weekWindow(plan.startDate, session.week);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from || date > to) {
    return { data, error: `Choose a date in week ${session.week} (${from} to ${to}).` };
  }
  const dateOf = (id: string, week: number, weekday: (typeof plan.sessions)[number]["weekday"]) =>
    plan.reschedules[id] ?? defaultSessionDate(plan.startDate, week, weekday);
  const others = plan.sessions.filter((s) => s.id !== sessionId).map((s) => ({ session: s, date: dateOf(s.id, s.week, s.weekday) }));
  const clash = others.find((o) => o.date === date);
  if (clash) return { data, error: `${clash.session.title} is already on that date. Choose another day.` };
  let warning: string | undefined;
  if (HARD_KINDS.has(session.kind)) {
    const neighbor = others.find((o) => HARD_KINDS.has(o.session.kind) && (o.date === addDays(date, 1) || o.date === addDays(date, -1)));
    if (neighbor) warning = `This puts ${session.title} next to ${neighbor.session.title}, another hard session. The plan avoids back-to-back hard days; consider a different day.`;
  }
  return {
    data: { ...data, plans: data.plans.map((p) => (p.id === planId ? { ...p, reschedules: { ...p.reschedules, [sessionId]: date } } : p)) },
    warning,
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

export function writeTrainingData(data: TrainingData): { ok: true } | { ok: false; error: string } {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save on this device. Browser storage may be full or disabled." };
  }
}

export function updateTrainingData(update: (data: TrainingData) => TrainingData) {
  return writeTrainingData(update(getSnapshot()));
}

export function useTrainingData(): TrainingData {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_TRAINING);
}
