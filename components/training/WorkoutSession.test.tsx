import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { getDrill, getExercise } from "@/lib/library";
import { EMPTY_TRAINING, completeSession, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { completeTrackedWorkout, recordWorkoutSet, reportPain, startOrResumeWorkout } from "@/lib/storage/workouts";
import { generatePlan } from "@/lib/training/engine";
import { workoutView } from "@/lib/training/planDashboard";
import { sessionState } from "@/lib/training/sessionStatus";
import { buildWorkout, trackableSetIds } from "@/lib/training/workout";
import WorkoutSession, { type WorkoutActions } from "./WorkoutSession";
import { timerMarks } from "./WorkoutTimers";
import { ActivePlan } from "./PlanView";

// Server-rendered markup for each state. These check what is shown and enabled; clicking, typing, and layout need
// a browser and are listed for manual testing.

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
const ids = (d: TrainingData, s = "w1-s1") => trackableSetIds(d.workouts.find((w) => w.sessionId === s)!.snapshot);
const noop: WorkoutActions = { recordSet: () => ({ ok: true }), undoSet: () => ({ ok: true }), complete: () => ({ ok: true }), reportPain: () => ({ ok: true }) };
const count = (html: string, needle: string) => html.split(needle).length - 1;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

function render(d: TrainingData, now: string, sessionId = "w1-s1", actions?: WorkoutActions, extra: { onStart?: () => void } = {}) {
  const state = sessionState(d.plans[0], d, sessionId, now)!;
  const view = workoutView(d.plans[0], d, state, now);
  if (view.mode === "untracked") throw new Error("untracked");
  return renderToStaticMarkup(<WorkoutSession view={view} actions={actions} reasons={state.reasons} {...extra} />);
}

// The Phase 4 bug: outside an active workout each set was drawn with an empty circle and "Not done", which looked like
// an unticked checkbox but did nothing when clicked. These pin down that nothing inert looks clickable any more.
describe("sets that can't be recorded don't look clickable", () => {
  const inert = (html: string) => {
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain("lucide-circle "); // the hollow circle icon
    expect(html).not.toMatch(/>Not done</);
  };

  it("labels a locked session's preview as preview-only, with the engine's reason", () => {
    const html = render(fresh(), at("2026-10-07"), "w1-s2");
    inert(html);
    const t = text(html);
    expect(t).toContain("Preview only: sets can't be recorded here.");
    expect(t).toMatch(/Complete Strength.*\(Oct 5\) first\. Workouts unlock in order\./);
    expect(html).not.toContain(">Start workout<");
  });

  it("offers Start inside today's preview, since that is where people try to tick sets", () => {
    const html = render(fresh(), at(START), "w1-s1", undefined, { onStart: () => {} });
    inert(html);
    expect(text(html)).toContain("Start the workout to record sets.");
    expect(count(html, ">Start workout<")).toBe(1);
  });

  it("labels a paused workout as read-only and keeps its recorded sets marked done", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    d = ok(recordWorkoutSet(d, "p1", "w1-s1", { setId: ids(d)[0], completedAt: at(START) })).data;
    d = ok(reportPain(d, "p1", "w1-s1", { reportedAt: at(START, 18), notes: "" })).data;
    const html = render(d, at(START, 19), "w1-s1", noop);
    inert(html);
    expect(text(html)).toContain("Read-only: sets can't be recorded or changed now.");
    expect(count(html, ">Done<")).toBe(1);
    expect(text(html)).toContain("Not recorded");
  });

  it("still gives an active workout one real checkbox per set", () => {
    const d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    const html = render(d, at(START), "w1-s1", noop);
    expect(count(html, 'type="checkbox"')).toBe(ids(d).length);
    expect(html).not.toContain("Preview only");
    expect(html).not.toContain("lucide-circle ");
  });
});

describe("workout timers", () => {
  it("shows the saved workout clock and its estimate on an active workout", () => {
    const d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    const view = workoutView(d.plans[0], d, sessionState(d.plans[0], d, "w1-s1", at(START))!, at(START));
    if (view.mode !== "active") throw new Error(view.mode);
    const clock = { pause: () => ({ ok: true as const }), resume: () => ({ ok: true as const }), heartbeat: () => ({ ok: true as const }) };
    const html = (iso: string) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(iso));
      try {
        return text(renderToStaticMarkup(<WorkoutSession view={view} actions={clock ? noop : undefined} clock={clock} />));
      } finally {
        vi.useRealTimers();
      }
    };
    // Ten seconds after the start: running.
    expect(html("2026-10-05T17:00:10.000Z")).toMatch(/Workout time 0:10 · estimated about \d+ min Running Pause clock/);
    // A day later with no heartbeat: counted only to the grace period, and shown paused.
    expect(html("2026-10-06T17:00:00.000Z")).toMatch(/Workout time 2:00 · estimated about \d+ min Paused Resume clock/);
  });

  it("offers an exercise timer only for timed sets", () => {
    const d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    const html = render(d, at(START), "w1-s1", noop);
    const timed = d.workouts[0].snapshot.sections.flatMap((s) => s.exercises.flatMap((e) => e.sets)).filter((set) => timerMarks(set.target));
    expect(timed.length).toBeGreaterThan(0);
    expect(count(html, ">Start timer<")).toBe(timed.length);
    expect(html).toContain("Start timer<span class=\"sr-only\"> for Overhead Arm Pull, Hold 1</span>");
  });

  it("announces only the prescription's own times", () => {
    expect(timerMarks({ kind: "hold", seconds: 75 })).toEqual([{ ms: 75_000, text: "Target time reached." }]);
    expect(timerMarks({ kind: "hold", seconds: 60, upTo: true })![0].text).toMatch(/the most this hold asks for/);
    expect(timerMarks({ kind: "hold-range", minSeconds: 20, maxSeconds: 30 })!.map((m) => m.ms)).toEqual([20_000, 30_000]);
    expect(timerMarks({ kind: "duration", seconds: 1200 })).toEqual([{ ms: 1_200_000, text: "Target time reached." }]);
    expect(timerMarks({ kind: "interval", workSeconds: 30, recoverySeconds: 60, work: "fast", recovery: "walking" })).toEqual([
      { ms: 30_000, text: "Fast part done: walking now." },
      { ms: 90_000, text: "Repeat done." },
    ]);
    for (const t of [{ kind: "reps", reps: 10 }, { kind: "rep-range", min: 8, max: 10 }, { kind: "distance", meters: 50, description: "x" }, { kind: "as-prescribed", text: "x" }] as const) {
      expect(timerMarks(t)).toBeNull();
    }
  });

  it("shows the recorded workout time in history, and says so when there is none", () => {
    let d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START, 16))).data;
    d = ids(d).reduce((x, setId) => ok(recordWorkoutSet(x, "p1", "w1-s1", { setId, completedAt: at(START, 16) })).data, d);
    d = ok(completeTrackedWorkout(d, "p1", "w1-s1", { completedAt: "2026-10-05T16:00:45.000Z", difficulty: "easy", pain: false, notes: "" })).data;
    expect(text(render(d, at("2026-10-06"), "w1-s1"))).toContain("Workout time 0:45 (estimated about");
    const legacy = { ...d, workouts: d.workouts.map((w) => ({ ...w, timer: undefined, durationSeconds: undefined })) };
    expect(text(render(legacy, at("2026-10-06"), "w1-s1"))).toContain("Workout time wasn't recorded for this workout.");
  });
});

describe("WorkoutSession", () => {
  const started = () => ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;

  it("shows every set of an active workout with a checkbox, and recorded sets as done", () => {
    let d = started();
    d = ok(recordWorkoutSet(d, "p1", "w1-s1", { setId: ids(d)[0], completedAt: at(START), actual: { reps: 9 } })).data;
    const html = render(d, at(START, 18), "w1-s1", noop);
    expect(count(html, 'type="checkbox"')).toBe(ids(d).length);
    expect(count(html, 'checked=""')).toBe(1);
    expect(count(html, ">Done<")).toBe(1);
    expect(count(html, ">Not done<")).toBe(ids(d).length - 1);
    expect(text(html)).toContain("Recorded: 9 reps");
    expect(text(html)).toContain("Report pain");
    expect(text(html)).toContain(`Record every set to finish. ${ids(d).length - 1} left.`);
    // Each checkbox is named for its exercise and set, and sits in a 44px touch target.
    expect(html).toContain('aria-label="Bend and Reach, Set 1: 10 reps, done"');
    expect(html).toContain('aria-label="Rear Lunge, Set 1: 10 reps, not done"');
    expect(count(html, 'class="-m-2.5 flex h-11 w-11')).toBe(ids(d).length);
    expect(text(html)).toContain("0 of 1 set done");
    expect(text(html)).not.toContain("1 sets");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Complete workout<\/button>/);
  });

  it("organizes the workout into warm-up, main workout, and recovery, with every drill exercise and its figure", () => {
    const html = render(started(), at(START), "w1-s1", noop);
    const t = text(html);
    const heading = (label: string) => html.search(new RegExp(`<h3[^>]*>${label}</h3>`));
    expect(heading("Warm-up")).toBeGreaterThan(-1);
    expect(heading("Warm-up")).toBeLessThan(heading("Main workout"));
    expect(heading("Main workout")).toBeLessThan(heading("Recovery"));
    for (const id of [...getDrill("preparation-drill")!.sequence, ...getDrill("recovery-drill")!.sequence]) expect(t).toContain(getExercise(id)!.name);
    expect(html).toContain('href="/workouts/exercises/bend-and-reach"');
    expect(html).toContain("bend-and-reach.jpg"); // next/image serves it through its optimizer URL
    expect(t).toContain("8–10 reps");
    expect(t).toContain("Rest 90 seconds between sets");
    expect(t).toContain("Hold 20–30 seconds");
  });

  it("enables completion only when every set is recorded", () => {
    let d = started();
    d = ids(d).reduce((x, setId) => ok(recordWorkoutSet(x, "p1", "w1-s1", { setId, completedAt: at(START) })).data, d);
    const html = render(d, at(START, 18), "w1-s1", noop);
    expect(html).not.toContain("Record every set to finish");
    expect(html).not.toMatch(/<fieldset[^>]*disabled/);
    // Still waits for the pain and difficulty answers.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Complete workout<\/button>/);
  });

  it("previews a locked workout with no checkboxes, start, or pain form", () => {
    const html = render(fresh(), at("2026-10-07"), "w1-s2");
    expect(text(html)).toContain("Preview only: sets can't be recorded here.");
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain("Report pain");
    expect(html).not.toContain("Complete workout");
  });

  it("shows an unread prescription as written, without a checkbox, and says why", () => {
    const d = fresh();
    d.plans[0].sessions.find((s) => s.id === "w1-s1")!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    const snapshot = buildWorkout(d.plans[0], d.plans[0].sessions.find((s) => s.id === "w1-s1")!, { phase: "foundation", createdAt: at(START) });
    const stored: TrainingData = { ...d, workouts: [{ planId: "p1", sessionId: "w1-s1", status: "in-progress", startedAt: at(START), snapshot }] };
    const html = render(stored, at(START), "w1-s1", noop);
    const t = text(html);
    expect(t).toContain("As written: 10 of each");
    expect(t).toContain("can't be completed in RuckOn and later workouts stay locked");
    expect(html).not.toContain('type="checkbox"'); // blocked: the stored workout is read-only
  });

  it("shows completed workouts as read-only history with actual performance, date, difficulty, and notes", () => {
    let d = started();
    d = ids(d).reduce((x, setId, i) => ok(recordWorkoutSet(x, "p1", "w1-s1", { setId, completedAt: at(START), ...(i === 0 ? { actual: { reps: 10 } } : {}) })).data, d);
    d = ok(completeTrackedWorkout(d, "p1", "w1-s1", { completedAt: at(START, 19), difficulty: "hard", pain: false, notes: "heavy pulls" })).data;
    const html = render(d, at("2026-10-06"), "w1-s1", noop);
    const t = text(html);
    expect(html).not.toContain('type="checkbox"');
    expect(t).toContain("Recorded: 10 reps");
    expect(t).toMatch(/Completed .* · Hard/);
    expect(t).toContain("heavy pulls");
    expect(t).not.toContain("Complete workout");
  });

  it("keeps a paused workout's sets visible but read-only", () => {
    let d = started();
    d = ok(recordWorkoutSet(d, "p1", "w1-s1", { setId: ids(d)[0], completedAt: at(START) })).data;
    d = ok(reportPain(d, "p1", "w1-s1", { reportedAt: at(START, 18), notes: "" })).data;
    const html = render(d, at(START, 19), "w1-s1", noop);
    expect(html).not.toContain('type="checkbox"');
    expect(count(html, ">Done<")).toBe(1);
    expect(html).not.toContain("Complete workout");
  });
});

describe("active plan page", () => {
  const page = (d: TrainingData, now: string) => renderToStaticMarkup(<ActivePlan plan={d.plans[0]} data={d} now={now} results={[]} />);

  it("shows progress, today's workout, rest days, statuses, and Start only for the eligible workout", () => {
    const html = page(fresh(), at(START));
    const t = text(html);
    expect(t).toContain("Week 1 of 4");
    expect(t).toContain("0 completed · 12 remaining");
    expect(t).toContain("Workout day:");
    expect(count(t, "Rest day")).toBe(16);
    expect(count(html, ">Start workout<")).toBe(1);
    expect(t).toContain("Ready");
    expect(t).toContain("Locked");
    expect(t).toMatch(/Complete Strength.*\(Oct 5\) first\. Workouts unlock in order\./);
    expect(t).not.toContain("Mark complete");
    // Previews render only when opened.
    expect(count(html, "Preview exercises")).toBe(12);
    expect(t).not.toContain("Preview only: sets can't be recorded here.");
  });

  it("offers Resume for a workout in progress", () => {
    const d = ok(startOrResumeWorkout(fresh(), "p1", "w1-s1", at(START))).data;
    const html = page(d, at(START, 18));
    expect(html).toContain(">Resume workout<");
    expect(html).not.toContain(">Start workout<");
    expect(text(html)).toContain("In progress");
  });

  it("shows the overdue workout as next and an upcoming workout's date", () => {
    expect(text(page(fresh(), at("2026-10-08")))).toMatch(/Overdue/);
    expect(text(page(fresh(), at("2026-10-04")))).toContain("Available on Oct 5.");
  });

  it("shows a plan-wide pause and offers nothing to start", () => {
    const d = ok(reportPain(fresh(), "p1", "w1-s1", { reportedAt: at(START, 12), notes: "" })).data;
    const html = page(d, at(START, 13));
    const t = text(html);
    expect(t).toMatch(/Plan paused since/);
    expect(t).toContain("No workout can be started, continued, completed, or moved.");
    expect(html).not.toContain(">Start workout<");
    expect(html).not.toContain("Reschedule");
  });

  it("shows legacy records as recorded without set tracking, and explains when undo isn't allowed", () => {
    let d = completeSession(fresh(), { planId: "p1", sessionId: "w1-s1", completedAt: at(START), difficulty: "easy", pain: false, notes: "" });
    d = completeSession(d, { planId: "p1", sessionId: "w1-s2", completedAt: at("2026-10-07"), difficulty: "easy", pain: false, notes: "" });
    const t = text(page(d, at("2026-10-08")));
    expect(t).toContain("Recorded without set tracking");
    expect(t).toContain("Recorded before workouts were tracked set by set, so there are no set records.");
    expect(t).toMatch(/Can't undo: .*already started or completed/);
    expect(t).toContain("Undo completion");
    expect(t).toContain("2 completed · 10 remaining");
  });
});

describe("no quick-complete path in the interface", () => {
  // The plan view's old "Mark complete" bypassed set tracking. Only the tracked workflow may complete a session.
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
    });

  it("doesn't call completeSession from any page or component", () => {
    const offenders = [...files("components"), ...files("app")].filter((f) => /\bcompleteSession\s*\(/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("completes workouts only through saveTrackedCompletion in the plan view", () => {
    const source = readFileSync("components/training/PlanView.tsx", "utf8");
    expect(source).toContain("saveTrackedCompletion(");
    expect(source).not.toMatch(/completeTrackedWorkout\(|updateTrainingData\(\(d\) =>\s*complete/);
  });
});
