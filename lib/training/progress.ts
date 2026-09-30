import { defaultSessionDate, weekWindow } from "./engine";
import type { PlanSession, SessionCompletion, StoredPlan } from "./types";

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
    weeks: [1, 2, 3, 4].map((week) => {
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
  for (let week = 1; week <= 4; week++) {
    if (today <= weekWindow(plan.startDate, week).to) return week;
  }
  return 5;
}
