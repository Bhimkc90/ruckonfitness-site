import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { getExercise } from "@/lib/library";
import {
  addDays,
  analyzeBaseline,
  assignKinds,
  defaultSessionDate,
  exerciseAllowed,
  generatePlan,
  hardConflicts,
  weekdayOf,
} from "./engine";
import { adherence, nextSession, progressionHeld, sessionDate } from "./progress";
import { runningLimits } from "./templates";
import {
  EMPTY_TRAINING,
  completeSession,
  parseTrainingData,
  rescheduleSession,
  startPlan,
  undoCompletion,
  activePlan,
} from "@/lib/storage/trainingPlans";
import type { BaselineSnapshot, PlanDraft, PlanItem, PlanSession, Preferences, Restriction, Screening } from "./types";

const t = (m: number, s: number) => m * 60 + s;

function baseline(raw: Partial<AftInput["raw"]> = {}, extra: Partial<AftInput> = {}): BaselineSnapshot {
  const input: AftInput = {
    age: 25,
    standard: "general",
    gender: "M",
    raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw },
    ...extra,
  };
  return { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) };
}

const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 45,
  equipment: [],
  runningAccess: true,
  experience: "some",
  recentRunning: "31-60",
  restrictions: [],
  ...overrides,
});

const ok: Screening = { currentPain: false, otherInstructions: "" };
const START = "2026-10-05"; // a Monday

function ready(p: Preferences, b = baseline()): PlanDraft {
  const outcome = generatePlan({ baseline: b, prefs: p, screening: ok, startDate: START });
  if (outcome.status !== "ready") throw new Error(`expected ready, got ${outcome.status}: ${JSON.stringify(outcome)}`);
  return outcome.plan;
}

const allItems = (plan: PlanDraft): PlanItem[] =>
  plan.sessions.flatMap((s) => [...s.warmUp, ...s.main, ...s.recovery].flatMap((b) => b.items));

// Exercise IDs a session actually uses: listed exercises plus drill members that are not omitted.
function usedExercises(plan: PlanDraft): string[] {
  const ids: string[] = [];
  for (const item of allItems(plan)) {
    if (item.kind === "exercise") ids.push(item.exerciseId);
    if (item.kind === "drill") {
      const members: Record<string, string[]> = {
        "preparation-drill": ["bend-and-reach", "rear-lunge", "high-jumper", "rower", "squat-bender", "windmill", "forward-lunge", "prone-row", "bent-leg-body-twist", "push-up"],
        "four-for-the-core": ["bent-leg-raise", "side-bridge", "back-bridge", "quadraplex"],
        "military-movement-drill-1": ["vertical", "lateral", "shuttle-sprint"],
        "conditioning-drill-1": ["power-jump", "v-up", "mountain-climber", "leg-tuck-and-twist", "single-leg-push-up"],
        "conditioning-drill-2": ["turn-and-lunge", "supine-bicycle", "half-jack", "swimmer", "eight-count-t-push-up"],
        "recovery-drill": ["overhead-arm-pull", "rear-lunge", "extend-and-flex", "thigh-stretch", "single-leg-over", "groin-stretch", "calf-stretch", "hamstring-stretch"],
      };
      ids.push(...members[item.drillId].filter((id) => !item.omit?.includes(id)));
    }
  }
  return ids;
}

const activities = (plan: PlanDraft) => allItems(plan).flatMap((i) => (i.kind === "activity" ? [i.activityId] : []));

describe("event prioritization", () => {
  it("develops failed events first", () => {
    const { analysis } = analyzeBaseline(baseline({ HRP: 5, "2MR": t(24, 0) }));
    expect(analysis.filter((a) => a.role === "develop").map((a) => a.event)).toEqual(["HRP", "2MR"]);
    expect(analysis.find((a) => a.event === "HRP")?.reason).toMatch(/below the 60-point minimum/);
  });

  it("develops the two lowest-scoring events when everything passed", () => {
    const b = baseline({ MDL: 200, PLK: t(1, 45) });
    const points = b.result.events.map((e) => [e.event, e.points]);
    const { analysis, summary } = analyzeBaseline(b);
    const develop = analysis.filter((a) => a.role === "develop").map((a) => a.event);
    const lowest = [...points].sort((x, y) => (x[1] as number) - (y[1] as number)).slice(0, 2).map((p) => p[0]);
    expect(develop.sort()).toEqual(lowest.sort());
    expect(summary.join(" ")).toMatch(/not a validated way/);
  });

  it("keeps a balanced plan when every event scored 100", () => {
    const b = baseline({ MDL: 350, HRP: 70, SDC: t(1, 20), PLK: t(4, 0), "2MR": t(13, 0) });
    expect(b.result.events.every((e) => e.points === 100)).toBe(true);
    expect(analyzeBaseline(b).analysis.every((a) => a.role === "maintain")).toBe(true);
  });

  it("explains a total below the combat standard even when every event passed", () => {
    const b = baseline({ MDL: 170, HRP: 20, SDC: t(2, 20), PLK: t(1, 50), "2MR": t(19, 0) }, { standard: "combat", gender: null });
    expect(b.result.events.every((e) => e.points >= 60)).toBe(true);
    expect(b.result.total).toBeLessThan(350);
    expect(analyzeBaseline(b).summary.join(" ")).toMatch(/below the 350-point combat standard/);
  });
});

describe("screening and missing information", () => {
  it("requires a baseline", () => {
    expect(generatePlan({ baseline: null, prefs: prefs(), screening: ok, startDate: START }).status).toBe("invalid");
  });

  it("pauses when the user reports pain", () => {
    const outcome = generatePlan({ baseline: baseline(), prefs: prefs(), screening: { currentPain: true, otherInstructions: "" }, startDate: START });
    expect(outcome.status).toBe("paused");
  });

  it("requires an answer to the pain question", () => {
    expect(generatePlan({ baseline: baseline(), prefs: prefs(), screening: { currentPain: null, otherInstructions: "" }, startDate: START }).status).toBe("invalid");
  });

  it("sends free-text instructions to a review path instead of interpreting them", () => {
    const outcome = generatePlan({ baseline: baseline(), prefs: prefs(), screening: { currentPain: false, otherInstructions: "Profile: no running for 30 days" }, startDate: START });
    expect(outcome.status).toBe("needs-review");
  });

  it("rejects mismatched weekdays, past AFT dates, and bad targets", () => {
    const check = (p: Preferences) => generatePlan({ baseline: baseline(), prefs: p, screening: ok, startDate: START });
    expect(check(prefs({ weekdays: ["mon", "wed"] })).status).toBe("invalid");
    expect(check(prefs({ nextAftDate: "2026-09-01" })).status).toBe("invalid");
    expect(check(prefs({ targetScore: 600 })).status).toBe("invalid");
  });

  it("explains instead of planning when restrictions exclude everything useful", () => {
    const all: Restriction[] = ["no-running", "no-jumping", "no-loaded-lifting", "no-weight-on-hands"];
    expect(generatePlan({ baseline: baseline(), prefs: prefs({ restrictions: all }), screening: ok, startDate: START }).status).toBe("not-possible");
    const hrpOnly = baseline({ HRP: 5 });
    expect(generatePlan({ baseline: hrpOnly, prefs: prefs({ restrictions: ["no-weight-on-hands"] }), screening: ok, startDate: START }).status).toBe("not-possible");
  });
});

describe("equipment substitutions", () => {
  const weakDeadlift = baseline({ MDL: 140 });

  it("uses the Deadlift with a barbell or hex bar", () => {
    expect(usedExercises(ready(prefs({ equipment: ["barbell-or-hex-bar"] }), weakDeadlift))).toContain("deadlift");
  });

  it("uses kettlebell stations with kettlebells", () => {
    const used = usedExercises(ready(prefs({ equipment: ["kettlebell"] }), weakDeadlift));
    expect(used).toContain("sumo-squat");
    expect(used).toContain("straight-leg-deadlift");
  });

  it("falls back to body-weight hinge practice with an explained limitation", () => {
    const plan = ready(prefs({ equipment: [] }), weakDeadlift);
    expect(usedExercises(plan)).toContain("squat-bender");
    expect(usedExercises(plan)).not.toContain("deadlift");
    expect(plan.limitations.join(" ")).toMatch(/only practice the hinge pattern/);
  });

  it("never prescribes loaded lifts when the user avoids lifting", () => {
    const plan = ready(prefs({ equipment: ["barbell-or-hex-bar", "kettlebell"], restrictions: ["no-loaded-lifting"] }), weakDeadlift);
    const loaded = usedExercises(plan).filter((id) => !getExercise(id)!.tags.equipment.includes("none"));
    expect(loaded).toEqual([]);
  });

  it("uses effort-based loads, never maximums or fixed weights", () => {
    const plan = ready(prefs({ equipment: ["barbell-or-hex-bar"] }), weakDeadlift);
    const text = JSON.stringify(plan.sessions);
    expect(text).toMatch(/RPE 6–7/);
    expect(text).not.toMatch(/\d+\s?(lb|pounds|%)/);
  });
});

describe("restrictions", () => {
  it("removes running, jumping, and hand-supported exercises", () => {
    const plan = ready(prefs({ restrictions: ["no-running", "no-jumping", "no-weight-on-hands"] }), baseline({ MDL: 140 }));
    for (const id of usedExercises(plan)) {
      expect(exerciseAllowed(id, new Set(["no-running", "no-jumping", "no-weight-on-hands"])), id).toBe(true);
    }
    expect(activities(plan)).not.toContain("easy-run");
    expect(activities(plan)).not.toContain("intervals-30-60");
    expect(activities(plan)).not.toContain("hrp-practice");
    expect(plan.limitations.join(" ")).toMatch(/avoid weight on your hands/);
  });

  it("does not start running without a recent running base", () => {
    const plan = ready(prefs({ recentRunning: "none" }), baseline({ "2MR": t(24, 0) }));
    expect(activities(plan)).not.toContain("easy-run");
    expect(activities(plan)).not.toContain("intervals-30-60");
    expect(activities(plan)).toContain("walk");
    expect(plan.limitations.join(" ")).toMatch(/no recent running/);
  });
});

describe("workload limits", () => {
  const combos: Preferences[] = [];
  for (const days of [2, 3, 4, 5] as const) {
    for (const minutes of [30, 45, 60] as const) {
      const weekdays = (["mon", "tue", "wed", "thu", "fri"] as const).slice(0, days);
      combos.push(prefs({ daysPerWeek: days, weekdays: [...weekdays], sessionMinutes: minutes, equipment: ["kettlebell"] }));
    }
  }

  it("keeps every session within the selected duration", () => {
    for (const p of combos) {
      const plan = ready(p, baseline({ MDL: 140, HRP: 10, PLK: t(1, 20) }));
      for (const s of plan.sessions) {
        const sum = [...s.warmUp, ...s.main, ...s.recovery].reduce((n, b) => n + b.minutes, 0);
        expect(s.estimatedMinutes).toBe(sum);
        expect(sum, `${p.daysPerWeek}d ${p.sessionMinutes}m ${s.title}`).toBeLessThanOrEqual(p.sessionMinutes);
        expect(s.warmUp.length).toBeGreaterThan(0);
        expect(s.recovery.length).toBeGreaterThan(0);
      }
    }
  });

  it("never schedules hard sessions on back-to-back days", () => {
    for (const p of combos) {
      const plan = ready(p);
      const week = plan.sessions.filter((s) => s.week === 1);
      expect(hardConflicts(week.map((s) => s.weekday), week.map((s) => s.kind))).toBe(0);
    }
  });

  it("explains when consecutive days force a recovery session", () => {
    const { kinds, notes } = assignKinds(["mon", "tue", "wed", "thu", "fri"], ["strength", "speed", "recovery", "strength", "endurance"]);
    expect(hardConflicts(["mon", "tue", "wed", "thu", "fri"], kinds)).toBe(0);
    expect(kinds.filter((k) => k === "strength" || k === "speed").length).toBe(3);
    expect(notes).toEqual([]);
    const tight = assignKinds(["mon", "tue", "wed"], ["strength", "speed", "strength"]);
    expect(hardConflicts(["mon", "tue", "wed"], tight.kinds)).toBe(0);
    expect(tight.notes.length).toBeGreaterThan(0);
  });

  it("keeps weekly running within the reported range and does not increase it", () => {
    for (const range of ["up-to-30", "31-60", "61-120", "over-120"] as const) {
      for (const days of [2, 3, 4, 5] as const) {
        const weekdays = (["mon", "wed", "fri", "sat", "sun"] as const).slice(0, days);
        const plan = ready(prefs({ recentRunning: range, daysPerWeek: days, weekdays: [...weekdays] }));
        expect(plan.weeklyRunningMinutes, `${range} ${days}d`).toBeLessThanOrEqual(runningLimits[range].perWeek);
        for (const item of allItems(plan)) {
          if (item.kind === "activity" && item.activityId === "easy-run") {
            expect(item.prescription.build).toEqual(item.prescription.foundation);
            expect(parseInt(item.prescription.foundation.time!)).toBeLessThanOrEqual(runningLimits[range].perRun);
          }
        }
      }
    }
  });

  it("uses the condensed Preparation Drill for 30-minute sessions", () => {
    const plan = ready(prefs({ sessionMinutes: 30 }));
    expect(plan.sessions[0].warmUp[0].id).toBe("pd-condensed");
  });

  it("stores a fixed template version and baseline snapshot", () => {
    const plan = ready(prefs());
    expect(plan.templateVersion).toMatch(/not professionally reviewed/);
    expect(plan.baseline.result.total).toBe(baseline().result.total);
    expect(plan.sessions).toHaveLength(12);
  });
});

describe("scheduling dates", () => {
  it("places sessions on the chosen weekdays within each plan week", () => {
    expect(weekdayOf("2026-10-05")).toBe("mon");
    expect(defaultSessionDate("2026-10-07", 1, "mon")).toBe("2026-10-12"); // starts Wednesday
    expect(defaultSessionDate("2026-10-07", 1, "wed")).toBe("2026-10-07");
    expect(defaultSessionDate(START, 2, "fri")).toBe(addDays(START, 11));
  });
});

describe("storage and completion", () => {
  const draft = ready(prefs());
  const today = "2026-10-12"; // Monday of week 2
  let data = startPlan(EMPTY_TRAINING, draft, { id: "p1", createdAt: "2026-10-04T12:00:00Z", startDate: START });
  const plan = () => activePlan(data)!;

  it("starts a plan and ends any previous active plan", () => {
    const second = startPlan(data, draft, { id: "p2", createdAt: "2026-10-04T13:00:00Z", startDate: START });
    expect(second.plans.map((p) => [p.id, p.status])).toEqual([
      ["p1", "ended"],
      ["p2", "active"],
    ]);
  });

  it("round-trips through storage and ignores corrupt data", () => {
    expect(parseTrainingData(JSON.stringify(data)).plans[0].id).toBe("p1");
    expect(parseTrainingData("{not json")).toEqual(EMPTY_TRAINING);
    expect(parseTrainingData(JSON.stringify({ schemaVersion: 99, plans: [], completions: [] }))).toEqual(EMPTY_TRAINING);
  });

  it("records, replaces, and undoes completions", () => {
    data = completeSession(data, { planId: "p1", sessionId: "w1-s1", completedAt: "2026-10-05T18:00:00Z", difficulty: "about-right", pain: false, notes: "" });
    data = completeSession(data, { planId: "p1", sessionId: "w1-s1", completedAt: "2026-10-05T19:00:00Z", difficulty: "hard", pain: false, notes: "felt heavy" });
    expect(data.completions).toHaveLength(1);
    expect(data.completions[0].difficulty).toBe("hard");
    data = completeSession(data, { planId: "p1", sessionId: "w1-s2", completedAt: "2026-10-07T18:00:00Z", difficulty: "easy", pain: false, notes: "" });
    const a = adherence(plan(), data.completions, today);
    expect(a).toMatchObject({ total: 12, completed: 2, scheduledToDate: 4, completedOfScheduled: 2 });
    expect(a.weeks[0]).toEqual({ week: 1, scheduled: 3, completed: 2 });
    data = undoCompletion(data, "p1", "w1-s1");
    expect(adherence(plan(), data.completions, today).completed).toBe(1);
  });

  it("reschedules within the plan week and keeps completion history", () => {
    data = completeSession(data, { planId: "p1", sessionId: "w1-s3", completedAt: "2026-10-09T18:00:00Z", difficulty: "about-right", pain: false, notes: "" });
    const moved = rescheduleSession(data, "p1", "w1-s3", "2026-10-10");
    expect(moved.error).toBeUndefined();
    data = moved.data;
    const session = plan().sessions.find((s) => s.id === "w1-s3") as PlanSession;
    expect(sessionDate(plan(), session)).toBe("2026-10-10");
    expect(data.completions.some((c) => c.sessionId === "w1-s3")).toBe(true);
    expect(rescheduleSession(data, "p1", "w1-s3", "2026-10-20").error).toMatch(/week 1/);
  });

  it("refuses to double-book a date and warns about back-to-back hard sessions", () => {
    const monday = plan().sessions.find((s) => s.id === "w1-s1")!; // strength, Monday 2026-10-05
    expect(rescheduleSession(data, "p1", "w1-s2", sessionDate(plan(), monday)).error).toMatch(/already on that date/);
    const hard = plan().sessions.filter((s) => s.week === 1 && ["strength", "speed", "conditioning"].includes(s.kind));
    const moved = rescheduleSession(data, "p1", hard[1].id, "2026-10-06");
    expect(moved.error).toBeUndefined();
    expect(moved.warning).toMatch(/another hard session/);
  });

  it("finds the next uncompleted workout", () => {
    const next = nextSession(plan(), data.completions, today);
    expect(next?.date).toBe("2026-10-12");
  });

  it("holds progression after a too-hard session or pain", () => {
    expect(progressionHeld(plan(), data.completions, 3)).toBe(false);
    const hard = completeSession(data, { planId: "p1", sessionId: "w2-s1", completedAt: "2026-10-12T18:00:00Z", difficulty: "too-hard", pain: false, notes: "" });
    expect(progressionHeld(activePlan(hard)!, hard.completions, 3)).toBe(true);
    expect(progressionHeld(activePlan(hard)!, hard.completions, 2)).toBe(false);
    const pain = completeSession(data, { planId: "p1", sessionId: "w2-s2", completedAt: "2026-10-14T18:00:00Z", difficulty: "easy", pain: true, notes: "" });
    expect(progressionHeld(activePlan(pain)!, pain.completions, 4)).toBe(true);
  });
});

describe("personalization changes the plan", () => {
  // Each profile fails one event (general standard, 25-year-old male) and passes the rest.
  const runWeak = baseline({ "2MR": t(24, 0) });
  const liftWeak = baseline({ MDL: 120 });
  const sdcWeak = baseline({ SDC: t(3, 0) });
  const kindsOf = (plan: PlanDraft) => plan.sessions.filter((s) => s.week === 1).map((s) => s.kind);
  const count = (plan: PlanDraft, kind: string) => kindsOf(plan).filter((k) => k === kind).length;

  it("confirms each profile fails only its intended event", () => {
    for (const [b, event] of [[runWeak, "2MR"], [liftWeak, "MDL"], [sdcWeak, "SDC"]] as const) {
      expect(b.result.events.filter((e) => e.points < 60).map((e) => e.event)).toEqual([event]);
    }
  });

  it("gives run, deadlift, and SDC weaknesses different weekly session mixes", () => {
    for (const days of [3, 4, 5] as const) {
      const weekdays = (["mon", "wed", "fri", "sat", "sun"] as const).slice(0, days);
      const p = prefs({ daysPerWeek: days, weekdays: [...weekdays] });
      const run = ready(p, runWeak);
      const lift = ready(p, liftWeak);
      const sdc = ready(p, sdcWeak);
      expect(count(run, "endurance"), `${days}d run`).toBeGreaterThanOrEqual(2);
      expect(count(lift, "strength"), `${days}d lift`).toBeGreaterThanOrEqual(2);
      expect(count(lift, "endurance")).toBe(1);
      expect(count(run, "strength")).toBe(1);
      expect(count(sdc, "speed") + count(sdc, "conditioning"), `${days}d sdc`).toBeGreaterThanOrEqual(days >= 4 ? 2 : 1);
      const mixes = new Set([run, lift, sdc].map((plan) => [...kindsOf(plan)].sort().join(",")));
      expect(mixes.size, `${days}d mixes`).toBe(3);
    }
  });

  it("changes session content, not just titles", () => {
    const p = prefs({ equipment: ["barbell-or-hex-bar"], recentRunning: "61-120" });
    const lift = ready(p, liftWeak);
    const run = ready(p, runWeak);
    const liftStrength = lift.sessions.find((s) => s.kind === "strength")!;
    expect(liftStrength.main[0].id).toBe("mdl-deadlift");
    expect(liftStrength.main[0].title).toMatch(/development/);
    const runStrength = run.sessions.find((s) => s.kind === "strength")!;
    expect(runStrength.main.find((b) => b.id.startsWith("mdl"))!.title).toMatch(/maintenance/);
    const runLength = (plan: PlanDraft) => {
      const item = plan.sessions.find((s) => s.kind === "endurance")!.main[0].items[0];
      return item.kind === "activity" ? parseInt(item.prescription.foundation.time!) : 0;
    };
    expect(runLength(run)).toBeGreaterThan(runLength(lift));
  });

  it("keeps maintenance work for stronger events", () => {
    const lift = ready(prefs(), liftWeak);
    expect(kindsOf(lift)).toContain("endurance"); // the 2-mile run is maintained
    const hrpPlk = lift.sessions.find((s) => s.kind === "strength")!.main.map((b) => b.id);
    expect(hrpPlk).toEqual(expect.arrayContaining(["hrp-maintain", "plk-maintain"]));
    const run = ready(prefs(), runWeak);
    expect(kindsOf(run)).toContain("strength");
    expect(run.analysis.filter((a) => a.role === "maintain").map((a) => a.event)).toEqual(["MDL", "HRP", "SDC", "PLK"]);
  });

  it("explains failed events, priorities, maintenance, and how the sessions changed", () => {
    const plan = ready(prefs(), baseline({ HRP: 5, "2MR": t(24, 0) }));
    expect(plan.standardSummary).toMatch(/General · 22-26 · Male \| Combat.*at least 60 points on every event/);
    expect(plan.focusSummary.join(" ")).toMatch(/Failed the general standard: .*2-Mile Run|Failed the general standard: .*Hand-Release Push-Up/);
    expect(plan.focusSummary.join(" ")).toMatch(/Maintained: /);
    expect(plan.analysis.find((a) => a.priority === 1)).toBeDefined();
    expect(plan.rationale.join(" ")).toMatch(/2-mile run focus: \d of your 3 weekly sessions/);
    expect(plan.rationale.join(" ")).toMatch(/Push-Ups focus|Push-Ups and/);
    expect(plan.rationale.join(" ")).toMatch(/Stronger events/);
  });

  it("responds to schedule, experience, duration, equipment, and restrictions", () => {
    const b = sdcWeak;
    expect(ready(prefs({ daysPerWeek: 2, weekdays: ["mon", "thu"] }), b).sessions).toHaveLength(8);
    const reps = (plan: PlanDraft) => {
      const item = allItems(plan).find((i) => i.kind === "activity" && i.activityId === "intervals-30-60");
      return item ? item.prescription.build.reps : undefined;
    };
    expect(reps(ready(prefs({ experience: "new" }), b))).toBe("4 repeats");
    expect(reps(ready(prefs({ experience: "regular" }), b))).toBe("6 repeats");
    expect(ready(prefs({ sessionMinutes: 30 }), b).sessions[0].warmUp[0].id).toBe("pd-condensed");
    expect(usedExercises(ready(prefs({ equipment: ["kettlebell"] }), liftWeak))).toContain("sumo-squat");
    expect(activities(ready(prefs({ restrictions: ["no-running"] }), b))).not.toContain("intervals-30-60");
  });

  it("keeps a balanced mix when no event stands out", () => {
    const even = baseline({ MDL: 350, HRP: 70, SDC: t(1, 20), PLK: t(4, 0), "2MR": t(13, 0) });
    const plan = ready(prefs(), even);
    expect(plan.analysis.every((a) => a.role === "maintain")).toBe(true);
    expect([...kindsOf(plan)].sort()).toEqual(["endurance", "speed", "strength"]);
  });
});

describe("missing preferences", () => {
  it("asks for answers AFT scores cannot establish", () => {
    const outcome = generatePlan({
      baseline: baseline(),
      prefs: { ...prefs(), equipment: null, runningAccess: null, experience: null, recentRunning: null },
      screening: ok,
      startDate: START,
    });
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.errors).toHaveLength(4);
      expect(outcome.errors.join(" ")).toMatch(/equipment/);
      expect(outcome.errors.join(" ")).toMatch(/place to run/);
      expect(outcome.errors.join(" ")).toMatch(/training experience/);
      expect(outcome.errors.join(" ")).toMatch(/how much you have run/);
    }
  });

  it("accepts an explicit no-equipment answer", () => {
    expect(generatePlan({ baseline: baseline(), prefs: prefs({ equipment: [] }), screening: ok, startDate: START }).status).toBe("ready");
  });
});
