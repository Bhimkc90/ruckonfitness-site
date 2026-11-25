"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { formatClock, TIMER_HEARTBEAT_MS, timerElapsedMs, timerRunning, timerStale } from "@/lib/training/workoutTimer";
import type { WorkoutRest, WorkoutTarget, WorkoutTimer } from "@/lib/training/types";
import { buttonClass } from "@/components/ui/Button";

// Timers for an open workout. The workout clock is saved (see lib/training/workoutTimer.ts); exercise and rest timers
// live only on this page. None of them records anything: a set is recorded only when its box is ticked.

const small = buttonClass("secondary", "min-h-11 px-3 py-1.5");

// The current time, refreshed while `active`. Display only.
export function useNowMs(active: boolean, interval = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, interval);
    return () => window.clearInterval(timer);
  }, [active, interval]);
  return now;
}

// ---------------------------------------------------------------------------
// One timer slot per workout: starting a timer replaces any other, so two never run at once.
// ---------------------------------------------------------------------------

type Mark = { ms: number; text: string };
type Slot = { key: string; marks: Mark[]; accumulatedMs: number; runningSince: number | null };

type TimerSlot = {
  slot: Slot | null;
  start: (key: string, marks: Mark[]) => void;
  pause: () => void;
  resume: () => void;
  clear: () => void;
  rest: { exerciseId: string; rest: WorkoutRest } | null;
  offerRest: (exerciseId: string, rest: WorkoutRest) => void;
};

const TimerContext = createContext<TimerSlot | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [rest, setRest] = useState<TimerSlot["rest"]>(null);
  const value: TimerSlot = {
    slot,
    start: (key, marks) => setSlot({ key, marks, accumulatedMs: 0, runningSince: Date.now() }),
    pause: () => setSlot((s) => (s?.runningSince ? { ...s, accumulatedMs: s.accumulatedMs + Date.now() - s.runningSince, runningSince: null } : s)),
    resume: () => setSlot((s) => (s && !s.runningSince ? { ...s, runningSince: Date.now() } : s)),
    clear: () => setSlot(null),
    rest,
    offerRest: (exerciseId, r) => setRest({ exerciseId, rest: r }),
  };
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export const useTimerSlot = () => useContext(TimerContext);

const slotElapsed = (s: Slot, now: number) => s.accumulatedMs + (s.runningSince ? Math.max(0, now - s.runningSince) : 0);

// The last mark passed, announced once (and a short vibration where the device supports it).
function useMarkNotice(slot: Slot | null, elapsed: number): string {
  const passed = slot ? slot.marks.filter((m) => elapsed >= m.ms) : [];
  const latest = passed.at(-1);
  const announced = useRef<string>("");
  const id = latest && slot ? `${slot.key}:${latest.ms}` : "";
  useEffect(() => {
    if (!id || announced.current === id) return;
    announced.current = id;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(200);
  }, [id]);
  return latest?.text ?? "";
}

// ---------------------------------------------------------------------------
// Exercise timer (holds, timed work, runs, intervals)
// ---------------------------------------------------------------------------

// The points worth announcing for a target, from the prescription only. Null when the target isn't timed.
export function timerMarks(target: WorkoutTarget): Mark[] | null {
  switch (target.kind) {
    case "hold":
      return [{ ms: target.seconds * 1000, text: target.upTo ? `${formatClock(target.seconds * 1000)} reached: the most this hold asks for.` : "Target time reached." }];
    case "hold-range":
      return [
        { ms: target.minSeconds * 1000, text: `${target.minSeconds} seconds reached.` },
        { ms: target.maxSeconds * 1000, text: `${target.maxSeconds} seconds reached: the most this hold asks for.` },
      ];
    case "duration":
      return [{ ms: target.seconds * 1000, text: "Target time reached." }];
    case "interval":
      return [
        { ms: target.workSeconds * 1000, text: `${target.work[0].toUpperCase()}${target.work.slice(1)} part done: ${target.recovery} now.` },
        { ms: (target.workSeconds + target.recoverySeconds) * 1000, text: "Repeat done." },
      ];
    default:
      return null;
  }
}

export function SetTimer({ timerKey, target, label, onUseTime }: { timerKey: string; target: WorkoutTarget; label: string; onUseTime?: (seconds: number) => void }) {
  const ctx = useTimerSlot();
  const marks = timerMarks(target);
  const mine = ctx?.slot?.key === timerKey ? ctx.slot : null;
  const now = useNowMs(!!mine?.runningSince);
  const elapsed = mine ? slotElapsed(mine, now) : 0;
  const notice = useMarkNotice(mine, elapsed);
  if (!ctx || !marks) return null;
  const goal = marks.at(-1)!.ms;
  const phase = target.kind === "interval" && mine ? (elapsed < target.workSeconds * 1000 ? target.work : target.recovery) : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2/60 p-2 text-sm">
      <Timer className="h-4 w-4 text-ink-2" aria-hidden />
      <span className="tabular-nums font-semibold text-ink" aria-label={`${label} timer`}>
        {formatClock(elapsed)}
      </span>
      <span className="text-xs text-ink-2">of {formatClock(goal)}</span>
      {phase && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold capitalize text-black">{phase}</span>}
      <span className="flex flex-wrap gap-1.5">
        {!mine ? (
          <button type="button" className={small} onClick={() => ctx.start(timerKey, marks)}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start timer<span className="sr-only"> for {label}</span>
          </button>
        ) : mine.runningSince ? (
          <button type="button" className={small} onClick={ctx.pause}>
            <Pause className="h-3.5 w-3.5" aria-hidden />
            Pause
          </button>
        ) : (
          <button type="button" className={small} onClick={ctx.resume}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            Resume
          </button>
        )}
        {mine && (
          <button type="button" className={small} onClick={ctx.clear}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        )}
        {mine && onUseTime && elapsed >= 1000 && (
          <button type="button" className={small} onClick={() => onUseTime(Math.round(elapsed / 1000))}>
            Use {formatClock(elapsed)} as my time
          </button>
        )}
      </span>
      <p role="status" aria-live="polite" className="w-full text-xs font-semibold text-ink">
        {notice}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rest countdown: offered after a set is recorded, only where the snapshot prescribes rest
// ---------------------------------------------------------------------------

export function RestTimer({ exerciseId }: { exerciseId: string }) {
  const ctx = useTimerSlot();
  const offer = ctx?.rest?.exerciseId === exerciseId ? ctx.rest : null;
  const key = `rest:${exerciseId}`;
  const mine = ctx?.slot?.key === key ? ctx.slot : null;
  const now = useNowMs(!!mine?.runningSince);
  const elapsed = mine ? slotElapsed(mine, now) : 0;
  const notice = useMarkNotice(mine, elapsed);
  if (!ctx || !offer) return null;
  const { minSeconds, maxSeconds, between } = offer.rest;
  const marks: Mark[] = [
    ...(minSeconds < maxSeconds ? [{ ms: minSeconds * 1000, text: `${minSeconds} seconds of rest done; rest up to ${maxSeconds} if you need it.` }] : []),
    { ms: maxSeconds * 1000, text: "Rest done." },
  ];
  const range = minSeconds === maxSeconds ? `${maxSeconds} seconds` : `${minSeconds}–${maxSeconds} seconds`;
  const remaining = Math.max(0, maxSeconds * 1000 - elapsed);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ink/20 bg-accent/10 p-2 text-sm">
      <span className="font-medium text-ink">
        Rest {range} between {between}
      </span>
      {mine && <span className="tabular-nums font-semibold text-ink">{formatClock(remaining)} left</span>}
      <span className="flex flex-wrap gap-1.5">
        {!mine ? (
          <button type="button" className={small} onClick={() => ctx.start(key, marks)}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start rest
          </button>
        ) : mine.runningSince ? (
          <button type="button" className={small} onClick={ctx.pause}>
            <Pause className="h-3.5 w-3.5" aria-hidden />
            Pause
          </button>
        ) : (
          <button type="button" className={small} onClick={ctx.resume}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            Resume
          </button>
        )}
        <button
          type="button"
          className={small}
          onClick={() => {
            if (mine) ctx.clear();
            ctx.offerRest("", offer.rest);
          }}
        >
          <SkipForward className="h-3.5 w-3.5" aria-hidden />
          Skip rest
        </button>
      </span>
      <p role="status" aria-live="polite" className="w-full text-xs font-semibold text-ink">
        {notice}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workout clock: saved, paused and resumed through storage
// ---------------------------------------------------------------------------

export type ClockResult = { ok: true; autoPaused?: boolean } | { ok: false; error: string };
export type ClockActions = { pause: () => ClockResult; resume: () => ClockResult; heartbeat: () => ClockResult };

export function WorkoutClock({ timer, estimatedMinutes, actions }: { timer?: WorkoutTimer; estimatedMinutes: number; actions?: ClockActions }) {
  const running = timerRunning(timer);
  const now = useNowMs(running, 1000);
  const iso = new Date(now).toISOString();
  const stale = timerStale(timer, iso);
  const [message, setMessage] = useState("");
  // The parent passes new action functions on every render; the heartbeat reads the latest through a ref so saving a
  // beat (which re-renders the parent) never restarts the heartbeat.
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  const interactive = !!actions;

  // While the page is open and visible, a heartbeat keeps the clock running; hidden or closed, it stops counting
  // on its own. The first beat also closes a segment left stale while away.
  useEffect(() => {
    if (!interactive || !running) return;
    const beat = () => {
      if (document.visibilityState !== "visible" || !latest.current) return;
      const result = latest.current.heartbeat();
      if (!result.ok) setMessage(`Clock not saved: ${result.error}`);
      else if (result.autoPaused) setMessage("The clock paused while you were away; that time isn't counted. Resume when you start again.");
    };
    beat();
    const timerId = window.setInterval(beat, TIMER_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timerId);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [interactive, running]);

  const act = (fn: () => ClockResult) => {
    const result = fn();
    setMessage(result.ok ? "" : `Not saved: ${result.error}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-2.5 text-sm">
      <Timer className="h-4 w-4 text-ink-2" aria-hidden />
      <span>
        <span className="text-ink-2">Workout time </span>
        <span className="tabular-nums text-base font-semibold text-ink">{formatClock(timerElapsedMs(timer, iso))}</span>
        <span className="text-ink-2"> · estimated about {estimatedMinutes} min</span>
      </span>
      <span className={`text-xs font-semibold ${running && !stale ? "text-good" : "text-ink-2"}`}>{!timer ? "Clock not started" : running && !stale ? "Running" : "Paused"}</span>
      {actions &&
        (running && !stale ? (
          <button type="button" className={small} onClick={() => act(actions.pause)}>
            <Pause className="h-3.5 w-3.5" aria-hidden />
            Pause clock
          </button>
        ) : (
          <button type="button" className={small} onClick={() => act(actions.resume)}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            {timer ? "Resume clock" : "Start clock"}
          </button>
        ))}
      {message && (
        <p role={message.startsWith("Not saved") || message.startsWith("Clock not saved") ? "alert" : "status"} className="w-full text-xs font-medium text-ink">
          {message}
        </p>
      )}
    </div>
  );
}
