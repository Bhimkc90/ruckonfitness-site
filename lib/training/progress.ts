import { defaultSessionDate, weekWindow } from "./engine";
import type { AftEventCode } from "@/lib/aft/types";
import { aftEventOrder } from "@/lib/aft/scoring";
import { describeCategoryChange, sameCategory } from "@/lib/aft/progress";
import { describeRawChange } from "@/lib/aft/format";
import type { BaselineSnapshot, PlanSession, SessionCompletion, StoredPlan } from "./types";
import { PLAN_WEEKS } from "./templates";

export function sessionDate(plan: StoredPlan, session: PlanSession): string {
  return plan.reschedules[session.id] ?? defaultSessionDate(plan.startDate, session.week, session.weekday);
}

export function planCompletions(plan: StoredPlan, completions: SessionCompletion[]): Map<string, SessionCompletion> {
  return new Map(completions.filter((c) => c.planId === plan.id).map((c) => [c.sessionId, c]));
}

export function sessionsByDate(plan: StoredPlan): { session: PlanSession; date: string }[] {
  return plan.sessions
    .map((session) => ({ session, date: sessionDate(plan, session) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.session.id.localeCompare(b.session.id));
}

export type Adherence = {
  total: number;
  completed: number;
  scheduledToDate: number;
  completedOfScheduled: number;
  weeks: { week: number; scheduled: number; completed: number }[];
};

// Counts only what was actually recorded. Nothing is estimated.
export function adherence(plan: StoredPlan, completions: SessionCompletion[], today: string): Adherence {
  const done = planCompletions(plan, completions);
  const dated = sessionsByDate(plan);
  const due = dated.filter((d) => d.date <= today);
  return {
    total: plan.sessions.length,
    completed: plan.sessions.filter((s) => done.has(s.id)).length,
    scheduledToDate: due.length,
    completedOfScheduled: due.filter((d) => done.has(d.session.id)).length,
    weeks: Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((week) => {
      const inWeek = plan.sessions.filter((s) => s.week === week);
      return { week, scheduled: inWeek.length, completed: inWeek.filter((s) => done.has(s.id)).length };
    }),
  };
}

export function nextSession(plan: StoredPlan, completions: SessionCompletion[], today: string) {
  const done = planCompletions(plan, completions);
  return sessionsByDate(plan).find((d) => d.date >= today && !done.has(d.session.id)) ?? null;
}

export function painReported(plan: StoredPlan, completions: SessionCompletion[]): boolean {
  return completions.some((c) => c.planId === plan.id && c.pain);
}

// Weeks 3–4 use the build prescription only when no earlier session was too hard or painful.
export function progressionHeld(plan: StoredPlan, completions: SessionCompletion[], week: number): boolean {
  if (week < 3) return false;
  const earlier = new Set(plan.sessions.filter((s) => s.week < week).map((s) => s.id));
  return completions.some((c) => c.planId === plan.id && earlier.has(c.sessionId) && (c.pain || c.difficulty === "too-hard"));
}

export function currentWeek(plan: StoredPlan, today: string): number {
  for (let week = 1; week <= PLAN_WEEKS; week++) {
    if (today <= weekWindow(plan.startDate, week).to) return week;
  }
  return PLAN_WEEKS + 1;
}

// Saved results that can be linked as the plan's reassessment: taken on or after the start date, not the baseline.
export function reassessmentCandidates<T extends { id: string; testDate: string }>(plan: StoredPlan, results: T[]): T[] {
  return results.filter((r) => r.id !== plan.baseline.resultId && r.testDate >= plan.startDate).sort((a, b) => b.testDate.localeCompare(a.testDate));
}

export type BaselineComparison = {
  comparable: boolean;
  categoryChanges: string[];
  totalChange: number | null;
  events: { event: AftEventCode; pointsChange: number | null; rawChange: number; rawText: string; improved: boolean | null }[];
};

// Raw results are always compared; points only when both tests use the same scoring category. Changes are
// reported as recorded; they are not attributed to the plan.
export function compareWithBaseline(baseline: BaselineSnapshot, later: BaselineSnapshot): BaselineComparison {
  const comparable = sameCategory(baseline.result, later.result);
  return {
    comparable,
    categoryChanges: comparable ? [] : describeCategoryChange(baseline.result, later.result),
    totalChange: comparable ? later.result.total - baseline.result.total : null,
    events: aftEventOrder.map((event) => {
      const before = baseline.result.events.find((e) => e.event === event)!;
      const after = later.result.events.find((e) => e.event === event)!;
      const rawChange = after.raw - before.raw;
      const described = describeRawChange(event, rawChange);
      return { event, pointsChange: comparable ? after.points - before.points : null, rawChange, rawText: described.text, improved: described.improved };
    }),
  };
}
