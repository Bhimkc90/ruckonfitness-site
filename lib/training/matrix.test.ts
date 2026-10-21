import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { getDrill, getExercise } from "@/lib/library";
import { WEEKDAYS, addDays, exerciseAllowed, generatePlan } from "./engine";
import { progressionHeld } from "./progress";
import { runningLimits } from "./templates";
import { EMPTY_TRAINING, completeSession, linkReassessment, startPlan } from "@/lib/storage/trainingPlans";
import type { BaselineSnapshot, EquipmentOption, PlanDraft, Preferences, Restriction, RunningVolume, WeekdayId } from "./types";

// Checks the documented rules (docs/training-plan-review.md) across every schedule and a broad matrix of
// baselines, restrictions, equipment, and running answers. It checks the implementation, not the rules' suitability.

const t = (m: number, s: number) => m * 60 + s;

function baseline(raw: Partial<AftInput["raw"]>): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw } };
  return { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) };
}

const BASELINES: Record<string, BaselineSnapshot> = {
  balanced: baseline({}),
  slowRun: baseline({ "2MR": t(24, 0) }),
  lowDeadlift: baseline({ MDL: 120 }),
  slowSdc: baseline({ SDC: t(3, 30) }),
  lowHrp: baseline({ HRP: 5 }),
  lowPlank: baseline({ PLK: t(0, 50) }),
};

const HARD = new Set(["strength", "speed", "conditioning"]);
const RUNNING_ACTIVITIES = new Set(["easy-run", "intervals-30-60"]);
const RESTRICTIONS: Restriction[] = ["no-running", "no-jumping", "no-loaded-lifting", "no-weight-on-hands"];
const EQUIPMENT: EquipmentOption[][] = [[], ["kettlebell"], ["dumbbell"], ["barbell-or-hex-bar"]];
const VOLUMES = Object.keys(runningLimits) as RunningVolume[];

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]));
}
const subsets = <T,>(items: T[]) => Array.from({ length: items.length + 1 }, (_, k) => combinations(items, k)).flat();

const START_DATES = ["2026-10-05", "2026-10-07", "2026-10-11"]; // Monday, Wednesday, Sunday

function prefs(overrides: Partial<Preferences>): Preferences {
  return { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: [], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [], ...overrides };
}

function usedExercises(plan: PlanDraft): string[] {
  const ids: string[] = [];
  for (const s of plan.sessions)
    for (const block of [...s.warmUp, ...s.main, ...s.recovery])
      for (const item of block.items) {
        if (item.kind === "exercise") ids.push(item.exerciseId);
        if (item.kind === "drill") ids.push(...getDrill(item.drillId)!.sequence.filter((id) => !item.omit?.includes(id)));
      }
  return ids;
}

const dateOf = (startDate: string, week: number, weekday: WeekdayId) => {
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, (week - 1) * 7 + i);
    if (WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7] === weekday) return date;
  }
  throw new Error("no date");
};

// Returns every documented rule the plan breaks; an empty list means it complies.
function violations(p: Preferences, b: BaselineSnapshot, startDate: string): string[] {
  const outcome = generatePlan({ baseline: b, prefs: p, screening: { currentPain: false, otherInstructions: "" }, startDate });
  const restrictions = new Set(p.restrictions);
  if (outcome.status !== "ready") {
    // Only these two documented cases may refuse a plan for valid answers.
    const allFour = restrictions.size === 4;
    const noPress = restrictions.has("no-weight-on-hands") && (restrictions.has("no-loaded-lifting") || p.equipment.length === 0);
    return outcome.status === "not-possible" && (allFour || noPress) ? [] : [`unexpected ${outcome.status}`];
  }
  const plan = outcome.plan;
  const out: string[] = [];
  const limits = runningLimits[p.recentRunning];
  const runAllowed = !restrictions.has("no-running") && p.runningAccess;
  const canRun = runAllowed && p.recentRunning !== "none";
  const twoMileMaintained = plan.analysis.find((a) => a.event === "2MR")!.role === "maintain";

  if (plan.sessions.length !== p.daysPerWeek * 4) out.push("session count");
  for (let w = 1; w <= 4; w++) {
    const days = plan.sessions.filter((s) => s.week === w).map((s) => s.weekday).sort();
    if (JSON.stringify(days) !== JSON.stringify([...p.weekdays].sort())) out.push(`week ${w} weekdays`);
  }

  // Scheduling: no hard sessions on consecutive calendar dates, across week boundaries too.
  const dated = plan.sessions.map((s) => ({ s, date: dateOf(startDate, s.week, s.weekday) })).sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < dated.length; i++) {
    if (dated[i].date === dated[i - 1].date) out.push("two sessions on one date");
    if (addDays(dated[i - 1].date, 1) === dated[i].date && HARD.has(dated[i - 1].s.kind) && HARD.has(dated[i].s.kind)) out.push(`back-to-back hard ${dated[i - 1].date}`);
  }

  // Session mix.
  const kinds = plan.sessions.filter((s) => s.week === 1).map((s) => s.kind);
  if (!kinds.includes("strength") && !kinds.includes("recovery")) out.push("no strength session");
  if (p.daysPerWeek === 5 && !kinds.includes("recovery")) out.push("5 days without recovery");
  if (p.daysPerWeek >= 4 && canRun && plan.scheduleNotes.length === 0 && !kinds.includes("speed")) out.push("4+ days without speed");
  if (p.daysPerWeek === 2 && kinds.length !== 2) out.push("2-day mix");

  for (const s of plan.sessions) {
    if (s.estimatedMinutes > p.sessionMinutes) out.push(`${s.id} ${s.estimatedMinutes} > ${p.sessionMinutes} min`);
    if (s.week > 2) {
      const twin = plan.sessions.find((x) => x.week === s.week - 2 && x.weekday === s.weekday)!;
      if (twin.title !== s.title || twin.estimatedMinutes !== s.estimatedMinutes) out.push(`${s.id} differs from week ${s.week - 2}`);
    }
  }

  // Running caps, and no running without a base, a place to run, and no restriction.
  for (let w = 1; w <= 4; w++) {
    let weekly = 0;
    for (const s of plan.sessions.filter((x) => x.week === w))
      for (const block of [...s.warmUp, ...s.main, ...s.recovery])
        for (const item of block.items) {
          if (item.kind !== "activity" || !RUNNING_ACTIVITIES.has(item.activityId)) continue;
          if (!canRun) out.push(`${s.id} ${item.activityId} without running base/access`);
          if (item.activityId === "easy-run") {
            for (const phase of [item.prescription.foundation, item.prescription.build]) {
              const minutes = parseInt(phase.time!);
              if (minutes > limits.perRun) out.push(`${s.id} run ${minutes} > ${limits.perRun}`);
              if (twoMileMaintained && minutes > 20) out.push(`${s.id} maintenance run ${minutes} > 20`);
            }
            weekly += parseInt(item.prescription.build.time!);
          } else weekly += 5;
        }
    if (weekly > limits.perWeek) out.push(`week ${w} running ${weekly} > ${limits.perWeek}`);
  }

  // Restrictions and equipment.
  for (const id of usedExercises(plan)) {
    if (!exerciseAllowed(id, restrictions)) out.push(`${id} breaks a restriction`);
    const needs = getExercise(id)!.tags.equipment;
    if (!needs.includes("none") && !needs.some((e) => (p.equipment as string[]).includes(e))) out.push(`${id} needs equipment the user lacks`);
  }
  return [...new Set(out)];
}

describe("documented rules hold across the input matrix", () => {
  it("every weekday combination for 2, 3, 4, and 5 days", () => {
    const failures: string[] = [];
    for (const days of [2, 3, 4, 5] as const)
      for (const weekdays of combinations(WEEKDAYS, days))
        for (const startDate of START_DATES)
          for (const [name, b] of Object.entries(BASELINES)) {
            const p = prefs({ daysPerWeek: days, weekdays, equipment: ["kettlebell"] });
            const v = violations(p, b, startDate);
            if (v.length) failures.push(`${days}d ${weekdays.join(",")} ${startDate} ${name}: ${v.join("; ")}`);
          }
    expect(failures).toEqual([]);
  });

  it("every restriction, equipment, running, experience, and session-length answer", () => {
    const failures: string[] = [];
    const schedules: WeekdayId[][] = [["tue", "sat"], ["mon", "wed", "fri"], ["mon", "tue", "thu", "sat"], ["mon", "tue", "wed", "fri", "sat"]];
    for (const weekdays of schedules)
      for (const restrictions of subsets(RESTRICTIONS))
        for (const equipment of EQUIPMENT)
          for (const recentRunning of VOLUMES)
            for (const runningAccess of [true, false])
              for (const [name, b] of Object.entries(BASELINES)) {
                const p = prefs({ daysPerWeek: weekdays.length as Preferences["daysPerWeek"], weekdays, restrictions, equipment, recentRunning, runningAccess, experience: recentRunning === "none" ? "new" : "some", sessionMinutes: ([30, 45, 60] as const)[weekdays.length % 3] });
                const v = violations(p, b, "2026-10-05");
                if (v.length) failures.push(`${weekdays.join(",")} [${restrictions}] [${equipment}] ${recentRunning} access=${runningAccess} ${name}: ${v.join("; ")}`);
              }
    expect(failures.slice(0, 20)).toEqual([]);
  });
});

describe("documented rules hold for every failure pattern", () => {
  const PASS = { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30) };
  const FAIL = { MDL: 120, HRP: 8, SDC: t(3, 30), PLK: t(0, 50), "2MR": t(24, 0) };
  const events = ["MDL", "HRP", "SDC", "PLK", "2MR"] as const;
  const patterns: [string, BaselineSnapshot][] = Array.from({ length: 32 }, (_, mask) => {
    const failed = events.filter((_, i) => mask & (1 << i));
    return [failed.join("+") || "none", baseline(Object.fromEntries(events.map((e) => [e, failed.includes(e) ? FAIL[e] : PASS[e]])))];
  });
  const combatTotalOnly: AftInput = { age: 25, standard: "combat", gender: "M", raw: { MDL: 200, HRP: 25, SDC: t(2, 20), PLK: t(1, 40), "2MR": t(19, 30) } };
  patterns.push(["combat total only", { resultId: "r1", testDate: "2026-09-01", input: combatTotalOnly, result: scoreAft(combatTotalOnly) }]);

  it("all 32 pass/fail patterns and a total-only failure, across schedules, lengths, equipment, restrictions, and running", () => {
    const failures: string[] = [];
    const schedules: WeekdayId[][] = [["tue", "sat"], ["mon", "wed", "fri"], ["mon", "tue", "thu", "sat"], ["mon", "tue", "wed", "fri", "sat"]];
    for (const [name, b] of patterns)
      for (const weekdays of schedules)
        for (const sessionMinutes of [30, 45, 60] as const)
          for (const equipment of EQUIPMENT)
            for (const restrictions of [[], ...RESTRICTIONS.map((r) => [r])] as Restriction[][])
              for (const recentRunning of ["none", "61-120"] as RunningVolume[]) {
                const p = prefs({ daysPerWeek: weekdays.length as Preferences["daysPerWeek"], weekdays, sessionMinutes, equipment, restrictions, recentRunning, experience: recentRunning === "none" ? "new" : "some" });
                const v = violations(p, b, "2026-10-05");
                if (v.length) failures.push(`${name} ${weekdays.join(",")} ${sessionMinutes} [${equipment}] [${restrictions}] ${recentRunning}: ${v.join("; ")}`);
              }
    expect(failures.slice(0, 20)).toEqual([]);
  });
});

describe("progression gate and reassessment edge cases", () => {
  const outcome = generatePlan({ baseline: BASELINES.slowRun, prefs: prefs({}), screening: { currentPain: false, otherInstructions: "" }, startDate: "2026-10-05" });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  const started = startPlan(EMPTY_TRAINING, outcome.plan, { id: "p1", createdAt: "2026-10-05T12:00:00.000Z", startDate: "2026-10-05" });
  const plan = started.plans[0];
  const rate = (sessionId: string, difficulty: "easy" | "about-right" | "hard" | "too-hard", pain = false, planId = "p1") =>
    completeSession(started, { planId, sessionId, completedAt: "2026-10-06T18:00:00.000Z", difficulty, pain, notes: "" }).completions;

  it("progresses after easy, about-right, or hard ratings without pain", () => {
    for (const d of ["easy", "about-right", "hard"] as const) {
      expect(progressionHeld(plan, rate("w1-s1", d), 3)).toBe(false);
      expect(progressionHeld(plan, rate("w2-s3", d), 4)).toBe(false);
    }
  });

  it("holds only weeks after the session rated too hard or painful", () => {
    for (const completions of [rate("w3-s1", "too-hard"), rate("w3-s1", "easy", true)]) {
      expect(progressionHeld(plan, completions, 3)).toBe(false);
      expect(progressionHeld(plan, completions, 4)).toBe(true);
    }
    expect(progressionHeld(plan, rate("w4-s1", "too-hard"), 4)).toBe(false);
  });

  it("ignores ratings recorded against another plan", () => {
    expect(progressionHeld(plan, rate("w1-s1", "too-hard", true, "other"), 3)).toBe(false);
  });

  it("links a reassessment without changing the stored baseline", () => {
    const before = JSON.stringify(plan.baseline);
    const later = { ...baseline({ "2MR": t(22, 0) }), resultId: "r2", testDate: "2026-11-02" };
    const linked = linkReassessment(started, "p1", later, "2026-11-02T12:00:00.000Z");
    expect(linked.error).toBeUndefined();
    expect(JSON.stringify(linked.data.plans[0].baseline)).toBe(before);
    expect(linked.data.plans[0].reassessmentLink?.resultId).toBe("r2");
  });
});
