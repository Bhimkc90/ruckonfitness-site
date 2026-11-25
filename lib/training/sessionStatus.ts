import { formatTestDate } from "@/lib/aft/format";
import { addDays } from "./engine";
import { PAIN_PAUSE_MESSAGE, sessionsByDate } from "./progress";
import { buildWorkout, planPaused, workoutPhase } from "./workout";
import type { PlanSession, SessionCompletion, SessionKind, StoredPlan, StoredWorkout, WorkoutPainReport } from "./types";

// Which sessions can be trained now, and why the others can't. Every storage operation that starts, continues,
// completes, undoes, or moves a session checks this, so the rules hold however the operations are called.
//
// Rules: sessions run in order of their effective date (reschedules applied), then session ID. A session becomes
// available on its date, and only once every earlier session is completed (a completion record, from the tracked
// workout or the plan view; set records alone never count). A pain report pauses everything. Days without a
// session are rest days and need nothing. Missed sessions stay next in line until completed or moved; nothing is
// skipped or marked done automatically, and only one workout can be started or completed per local day.

export type SessionStatus = "upcoming" | "available" | "in-progress" | "completed" | "locked" | "overdue" | "paused" | "ended" | "blocked";

export type SessionState = {
  sessionId: string;
  session: PlanSession;
  date: string; // effective scheduled date, YYYY-MM-DD
  order: number; // 1-based position in the sequence
  status: SessionStatus;
  // True when the session can be started, continued, or completed right now.
  eligible: boolean;
  // Scheduled before today and not completed.
  overdue: boolean;
  reasons: string[];
  warnings: string[];
  // The earlier session that must be completed first, for locked sessions.
  waitingFor?: string;
};

export type PlanState = {
  planId: string;
  today: string;
  status: "active" | "paused" | "ended" | "completed";
  sessions: SessionState[];
  // The first session in order that isn't completed: what the person should do next.
  earliestUnfinished: SessionState | null;
};

export type SessionRecords = { completions: SessionCompletion[]; workouts: StoredWorkout[]; painReports: WorkoutPainReport[] };

const HARD: SessionKind[] = ["strength", "speed", "conditioning"];
const pad = (n: number) => String(n).padStart(2, "0");

// The calendar date of an instant in this device's time zone (how localToday reads "today").
export function localDateOf(iso: string): string | null {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(iso)) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const ONE_PER_DAY =
  "You've already trained today. The next workout is available tomorrow: RuckOn doesn't stack workouts to catch up on missed days.";

export function planSessionStates(plan: StoredPlan, records: SessionRecords, now: string): PlanState {
  const today = localDateOf(now) ?? "";
  const safety = { sessionCompletions: records.completions, painReports: records.painReports };
  const paused = planPaused(plan.id, safety);
  const mine = <T extends { planId: string; sessionId: string }>(list: T[], id: string) => list.find((x) => x.planId === plan.id && x.sessionId === id);
  const done = new Map(plan.sessions.map((s) => [s.id, mine(records.completions, s.id)]));
  // Sessions trained today: completed today, or a tracked workout started today.
  const trainedToday = new Set(
    plan.sessions
      .filter((s) => localDateOf(done.get(s.id)?.completedAt ?? "") === today || localDateOf(mine(records.workouts, s.id)?.startedAt ?? "") === today)
      .map((s) => s.id)
  );
  // An invalid time gives no date: nothing is in reach (every date is "later"), and nothing throws.
  const yesterday = today ? addDays(today, -1) : null;
  const hardYesterday = plan.sessions.some((s) => HARD.includes(s.kind) && localDateOf(done.get(s.id)?.completedAt ?? "") === yesterday);

  let blocker: SessionState | null = null;
  const sessions = sessionsByDate(plan).map(({ session, date }, i): SessionState => {
    const base = { sessionId: session.id, session, date, order: i + 1, overdue: false, reasons: [] as string[], warnings: [] as string[] };
    if (done.get(session.id)) return { ...base, status: "completed", eligible: false };
    const workout = mine(records.workouts, session.id);
    const overdue = date < today;
    const state = (status: SessionStatus, eligible: boolean, reasons: string[], extra: Partial<SessionState> = {}): SessionState => ({ ...base, overdue, status, eligible, reasons, ...extra });

    let result: SessionState;
    if (paused) result = state("paused", false, [PAIN_PAUSE_MESSAGE]);
    else if (plan.status === "ended") result = state("ended", false, ["This plan has ended."]);
    else if (blocker) {
      const waiting = blocker as SessionState;
      result = state("locked", false, [
        `Complete ${waiting.session.title} (${formatTestDate(waiting.date, "short")}) first. Workouts unlock in order.`,
        ...(workout ? ["Sets you already recorded are kept."] : []),
      ], { waitingFor: waiting.sessionId });
    } else if (workout) {
      result = workout.snapshot.unsupported.length
        ? state("blocked", false, blockedReasons(workout.snapshot.unsupported))
        : state("in-progress", true, []);
    } else {
      const preview = buildWorkout(plan, session, { ...workoutPhase(plan, safety, session), createdAt: now });
      if (preview.unsupported.length) result = state("blocked", false, blockedReasons(preview.unsupported));
      else if (date > today) result = state("upcoming", false, [`Available on ${formatTestDate(date, "short")}.`]);
      else if ([...trainedToday].some((id) => id !== session.id)) result = state("locked", false, [ONE_PER_DAY]);
      else
        result = overdue
          ? state("overdue", true, [`Scheduled for ${formatTestDate(date, "short")}. It stays your next workout until you complete it or move it.`])
          : state("available", true, []);
    }
    if (result.eligible) {
      if (plan.preferences.nextAftDate === today) result.warnings.push("Today is your AFT day. RuckOn doesn't schedule training on the test day; consider another day.");
      if (HARD.includes(session.kind) && hardYesterday) result.warnings.push("You completed a hard session yesterday. The plan avoids back-to-back hard days; consider waiting a day.");
    }
    blocker ??= result;
    return result;
  });

  const earliestUnfinished = sessions.find((s) => s.status !== "completed") ?? null;
  const status = paused ? "paused" : !earliestUnfinished ? "completed" : plan.status === "ended" ? "ended" : "active";
  return { planId: plan.id, today, status, sessions, earliestUnfinished };
}

function blockedReasons(unsupported: { name: string; text: string }[]): string[] {
  return [
    ...unsupported.map((u) => `${u.name}: RuckOn could not read "${u.text}".`),
    "This workout can't be tracked or completed, so later workouts stay locked. Ask your unit's H2F team before going on.",
  ];
}

export function sessionState(plan: StoredPlan, records: SessionRecords, sessionId: string, now: string): SessionState | null {
  return planSessionStates(plan, records, now).sessions.find((s) => s.sessionId === sessionId) ?? null;
}

// Why an earlier completion can't be undone or re-recorded: a later session was started or completed, and removing
// the earlier one would leave history out of order. Null when it can.
export function laterActivity(plan: StoredPlan, records: SessionRecords, sessionId: string): string | null {
  const ordered = sessionsByDate(plan);
  const index = ordered.findIndex((d) => d.session.id === sessionId);
  if (index === -1) return "Session not found.";
  const later = ordered
    .slice(index + 1)
    .find(({ session }) => records.completions.some((c) => c.planId === plan.id && c.sessionId === session.id) || records.workouts.some((w) => w.planId === plan.id && w.sessionId === session.id));
  return later
    ? `${later.session.title} (${formatTestDate(later.date, "short")}) is already started or completed. Changing an earlier session now would leave your history out of order, so nothing was changed.`
    : null;
}
