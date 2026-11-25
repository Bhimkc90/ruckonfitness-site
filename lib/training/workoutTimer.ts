import type { WorkoutTimer } from "./types";

// Workout clock arithmetic. Pure: every function takes the current time.
//
// While running, the page records a heartbeat every 30 seconds (lastSeenAt). Time counts only up to TIMER_GRACE_MS
// after the last heartbeat, so a closed tab, a sleeping phone, or a workout left unfinished stops counting by
// itself instead of adding hours.

export const TIMER_GRACE_MS = 2 * 60_000;
export const TIMER_HEARTBEAT_MS = 30_000;
export const MAX_WORKOUT_MS = 24 * 3600_000;

const ms = (iso: string) => Date.parse(iso);

export function timerRunning(timer: WorkoutTimer | undefined): boolean {
  return !!timer?.runningSince;
}

// True when the running segment has gone past the grace period without activity.
export function timerStale(timer: WorkoutTimer | undefined, now: string): boolean {
  if (!timer?.runningSince) return false;
  return ms(now) - ms(timer.lastSeenAt ?? timer.runningSince) > TIMER_GRACE_MS;
}

export function timerElapsedMs(timer: WorkoutTimer | undefined, now: string): number {
  if (!timer) return 0;
  if (!timer.runningSince) return timer.elapsedMs;
  const start = ms(timer.runningSince);
  const end = Math.min(ms(now), ms(timer.lastSeenAt ?? timer.runningSince) + TIMER_GRACE_MS);
  return Math.min(MAX_WORKOUT_MS, timer.elapsedMs + Math.max(0, end - start));
}

export const pauseTimer = (timer: WorkoutTimer | undefined, now: string): WorkoutTimer => ({ elapsedMs: timerElapsedMs(timer, now) });

// Starts a new segment; time away since a stale segment is not counted.
export function resumeTimer(timer: WorkoutTimer | undefined, now: string): WorkoutTimer {
  if (timer?.runningSince && !timerStale(timer, now)) return { ...timer, lastSeenAt: now };
  return { elapsedMs: timerElapsedMs(timer, now), runningSince: now, lastSeenAt: now };
}

// A heartbeat or action while the workout is open. A stale segment is closed (the timer pauses) rather than resumed;
// the person resumes it themselves when they come back.
export function touchTimer(timer: WorkoutTimer | undefined, now: string): { timer: WorkoutTimer | undefined; autoPaused: boolean } {
  if (!timer?.runningSince) return { timer, autoPaused: false };
  if (timerStale(timer, now)) return { timer: pauseTimer(timer, now), autoPaused: true };
  return { timer: { ...timer, lastSeenAt: now }, autoPaused: false };
}

export function formatClock(totalMs: number): string {
  const total = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
