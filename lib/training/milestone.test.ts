import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { addDays, buildTimeline, daysBetween, defaultSessionDate, describeTimeAvailable, exerciseAllowed, generatePlan } from "./engine";
import { adherence, compareWithBaseline, nextSession, reassessmentCandidates } from "./progress";
import { PLAN_WEEKS, SUPPORTED_PLAN_WEEKS, TEMPLATE_VERSION } from "./templates";
import {
  EMPTY_TRAINING,
  activePlan,
  completeSession,
  linkReassessment,
  parseTrainingData,
  rescheduleSession,
  startPlan,
  unlinkReassessment,
} from "@/lib/storage/trainingPlans";
import { createBackup, validateBackup } from "@/lib/backup/backup";
import type { BaselineSnapshot, PlanDraft, PlanItem, Preferences, Restriction, Screening } from "./types";
import { validScoringCases } from "@/lib/aft/fixtures";

const t = (m: number, s: number) => m * 60 + s;
const START = "2026-10-05"; // Monday
const ok: Screening = { currentPain: false, otherInstructions: "" };

function baseline(raw: Partial<AftInput["raw"]> = {}, extra: Partial<AftInput> = {}, id = "r1", testDate = "2026-09-01"): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw }, ...extra };
  return { resultId: id, testDate, input, result: scoreAft(input) };
}

const prefs = (o: Partial<Preferences> = {}): Preferences => ({
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 60,
  equipment: [],
  runningAccess: true,
  experience: "some",
  recentRunning: "31-60",
  restrictions: [],
  ...o,
});

function plan(p: Preferences, b = baseline(), start = START): PlanDraft {
  const out = generatePlan({ baseline: b, prefs: p, screening: ok, startDate: start });
  if (out.status !== "ready") throw new Error(`${out.status}: ${JSON.stringify(out)}`);
  return out.plan;
}

const items = (d: PlanDraft): PlanItem[] => d.sessions.flatMap((s) => [...s.warmUp, ...s.main, ...s.recovery].flatMap((b) => b.items));
const exerciseIds = (d: PlanDraft) => items(d).flatMap((i) => (i.kind === "exercise" ? [i.exerciseId] : []));
const weakHrp = baseline({ HRP: 8 }); // fails only the HRP

describe("weight-on-hands restriction", () => {
  const hands = new Set<Restriction>(["no-weight-on-hands"]);
  it("blocks hand-supported exercises but not lying or standing presses", () => {
    for (const id of ["push-up", "single-leg-push-up", "eight-count-t-push-up", "mountain-climber"]) expect(exerciseAllowed(id, hands), id).toBe(false);
    for (const id of ["bench-press", "supine-chest-press", "overhead-push-press"]) expect(exerciseAllowed(id, hands), id).toBe(true);
  });

  it("replaces push-up practice with a press when equipment allows", () => {
    const d = plan(prefs({ equipment: ["kettlebell"], restrictions: ["no-weight-on-hands"] }), weakHrp);
    expect(exerciseIds(d)).toContain("supine-chest-press");
    expect(items(d).some((i) => i.kind === "activity" && i.activityId === "hrp-practice")).toBe(false);
    expect(d.limitations.join(" ")).toMatch(/lying press replaces push-up practice/);
  });

  it("explains instead of planning when there is no press available", () => {
    const out = generatePlan({ baseline: weakHrp, prefs: prefs({ restrictions: ["no-weight-on-hands"] }), screening: ok, startDate: START });
    expect(out.status).toBe("not-possible");
  });
});

describe("General Fitness press for push-up development", () => {
  it("uses the Supine Chest Press with kettlebells and the Bench Press with a barbell or dumbbells", () => {
    expect(exerciseIds(plan(prefs({ equipment: ["kettlebell"] }), weakHrp))).toContain("supine-chest-press");
    expect(exerciseIds(plan(prefs({ equipment: ["barbell-or-hex-bar"] }), weakHrp))).toContain("bench-press");
    expect(exerciseIds(plan(prefs({ equipment: ["dumbbell"] }), weakHrp))).toContain("bench-press");
  });

  it("adds no press without equipment, when lifting is restricted, or when push-ups are only maintained", () => {
    const none = exerciseIds(plan(prefs(), weakHrp));
    expect(none).not.toContain("bench-press");
    expect(none).not.toContain("supine-chest-press");
    const noLift = exerciseIds(plan(prefs({ equipment: ["barbell-or-hex-bar"], restrictions: ["no-loaded-lifting"] }), weakHrp));
    expect(noLift).not.toContain("bench-press");
    const weakRun = exerciseIds(plan(prefs({ equipment: ["barbell-or-hex-bar"] }), baseline({ "2MR": t(30, 0) })));
    expect(weakRun).not.toContain("bench-press");
  });

  it("uses effort-based prescriptions that progress only by sets or rounds", () => {
    const d = plan(prefs({ equipment: ["barbell-or-hex-bar"] }), weakHrp);
    const bench = items(d).find((i) => i.kind === "exercise" && i.exerciseId === "bench-press")!;
    expect(bench.prescription.foundation).toMatchObject({ sets: "2", reps: "8–10", rest: "90 seconds" });
    expect(bench.prescription.build).toMatchObject({ sets: "3", reps: "8–10" });
    expect(JSON.stringify(bench.prescription)).not.toMatch(/lb|kg|%|max(imum)? (load|weight)/i);
  });
});

describe("timeline to the next AFT", () => {
  it("describes the time available", () => {
    expect(describeTimeAvailable(45)).toBe("45 days after the plan starts (6 weeks, 3 days)");
    expect(describeTimeAvailable(7)).toBe("7 days after the plan starts (1 week)");
    expect(daysBetween("2026-10-05", "2026-10-12")).toBe(7);
  });

  it("supports only the 4-week template", () => {
    expect(SUPPORTED_PLAN_WEEKS).toEqual([4]);
    expect(plan(prefs()).sessions.every((s) => s.week >= 1 && s.week <= PLAN_WEEKS)).toBe(true);
  });

  it("explains a plan that fits before the AFT", () => {
    const d = plan(prefs({ nextAftDate: addDays(START, 60) }));
    expect(d.timeline).toMatchObject({ daysUntilAft: 60, fitsBeforeAft: true, sessionsBeforeAft: 12 });
    expect(d.timeline!.summary.join(" ")).toMatch(/ends 33 days before your AFT/);
  });

  it("never compresses or intensifies the plan when the AFT is sooner", () => {
    const without = plan(prefs());
    const soon = plan(prefs({ nextAftDate: addDays(START, 10) }));
    expect(soon.sessions).toEqual(without.sessions); // same sessions, same prescriptions
    expect(soon.weeklyRunningMinutes).toBe(without.weeklyRunningMinutes);
    expect(soon.timeline).toMatchObject({ fitsBeforeAft: false, daysUntilAft: 10 });
    const before = soon.sessions.filter((s) => defaultSessionDate(START, s.week, s.weekday) < addDays(START, 10)).length;
    expect(soon.timeline!.sessionsBeforeAft).toBe(before);
    expect(soon.timeline!.summary.join(" ")).toMatch(/can't finish before your AFT.*doesn't shorten it or add workload/);
  });

  it("flags a session on the AFT day without moving it, and gives no unreviewed taper", () => {
    const aft = defaultSessionDate(START, 2, "wed");
    const d = plan(prefs({ nextAftDate: aft }));
    expect(d.timeline!.sessionsOnAftDay).toBe(1);
    expect(d.timeline!.summary.join(" ")).toMatch(/falls on your AFT day/);
    expect(d.timeline!.summary.join(" ")).toMatch(/taper guidance hasn't been reviewed/);
    expect(d.reassessment).not.toMatch(/light|taper/i);
    expect(buildTimeline(aft, START, d.sessions)).toEqual(d.timeline);
  });

  it("omits the timeline without an AFT date", () => {
    expect(plan(prefs()).timeline).toBeUndefined();
  });
});

describe("progress, rescheduling, and reassessment", () => {
  const draft = plan(prefs({ nextAftDate: addDays(START, 20) }));
  const started = startPlan(EMPTY_TRAINING, draft, { id: "p1", createdAt: "2026-10-04T12:00:00.000Z", startDate: START });

  it("warns when a session is moved onto the AFT day", () => {
    const aft = addDays(START, 20); // Sunday of week 3
    const session = started.plans[0].sessions.find((s) => s.week === 3)!;
    const moved = rescheduleSession(started, "p1", session.id, aft);
    expect(moved.error).toBeUndefined();
    expect(moved.warning).toMatch(/AFT day/);
  });

  it("counts adherence from recorded completions and keeps them through rescheduling", () => {
    const first = started.plans[0].sessions[0];
    let data = completeSession(started, { planId: "p1", sessionId: first.id, completedAt: "2026-10-05T18:00:00.000Z", difficulty: "hard", pain: false, notes: "ok" });
    const second = started.plans[0].sessions[1];
    data = rescheduleSession(data, "p1", second.id, addDays(START, 6)).data;
    const today = addDays(START, 3);
    const stats = adherence(activePlan(data)!, data.completions, today);
    expect(stats.completed).toBe(1);
    expect(stats.scheduledToDate).toBe(1); // the second session moved past today
    expect(stats.completedOfScheduled).toBe(1);
    expect(nextSession(activePlan(data)!, data.completions, today)!.date).toBe(addDays(START, 4));
    expect(data.completions[0].difficulty).toBe("hard");
  });

  it("links a later result as a copied reassessment and compares it with the baseline", () => {
    const later = baseline({ HRP: 45, "2MR": t(15, 50) }, {}, "r2", "2026-11-03");
    const linked = linkReassessment(started, "p1", later, "2026-11-03T12:00:00.000Z");
    expect(linked.error).toBeUndefined();
    later.result.total = 0; // later edits to the source record don't reach the plan
    const link = linked.data.plans[0].reassessmentLink!;
    expect(link.result.total).not.toBe(0);
    const cmp = compareWithBaseline(started.plans[0].baseline, link);
    expect(cmp.comparable).toBe(true);
    expect(cmp.totalChange).toBe(link.result.total - started.plans[0].baseline.result.total);
    expect(cmp.events.find((e) => e.event === "HRP")).toMatchObject({ rawChange: 5, improved: true });
    expect(unlinkReassessment(linked.data, "p1").plans[0].reassessmentLink).toBeUndefined();
  });

  it("refuses the baseline itself or a test before the start, and lists only eligible results", () => {
    expect(linkReassessment(started, "p1", started.plans[0].baseline, "2026-11-03T12:00:00.000Z").error).toMatch(/baseline/);
    expect(linkReassessment(started, "p1", baseline({}, {}, "old", "2026-10-01"), "2026-11-03T12:00:00.000Z").error).toMatch(/on or after/);
    const results = [
      { id: "r1", testDate: "2026-09-01" },
      { id: "old", testDate: "2026-10-01" },
      { id: "a", testDate: "2026-10-30" },
      { id: "b", testDate: "2026-11-05" },
    ];
    expect(reassessmentCandidates(started.plans[0], results).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("compares raw results but not points across scoring categories", () => {
    const combat = baseline({ HRP: 45 }, { standard: "combat" }, "r3", "2026-11-03");
    const cmp = compareWithBaseline(started.plans[0].baseline, combat);
    expect(cmp.comparable).toBe(false);
    expect(cmp.totalChange).toBeNull();
    expect(cmp.events.every((e) => e.pointsChange === null)).toBe(true);
    expect(cmp.categoryChanges.join(" ")).toMatch(/Standard changed/);
  });

  it("survives storage parsing and backup round trips with the link and timeline", () => {
    const linked = linkReassessment(started, "p1", baseline({}, {}, "r2", "2026-11-03"), "2026-11-03T12:00:00.000Z").data;
    expect(parseTrainingData(JSON.stringify(linked))).toEqual(linked);
    const text = JSON.stringify(createBackup({ aftResults: [], training: linked, profile: null, settings: null }, { exportedAt: "2026-11-04T00:00:00.000Z", appVersion: "0.1.0" }));
    const parsed = validateBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.training.plans[0].reassessmentLink?.resultId).toBe("r2");
    const broken = JSON.parse(text);
    broken.data.trainingPlans.plans[0].reassessmentLink.result.total = "lots";
    expect(validateBackup(JSON.stringify(broken)).ok).toBe(false);
  });
});

describe("plans are fixed once started", () => {
  it("keeps the baseline, template version, and sessions when new results or preferences produce a different plan", () => {
    const b = baseline({ HRP: 8 });
    const draft = plan(prefs({ equipment: ["kettlebell"] }), b);
    const first = startPlan(EMPTY_TRAINING, draft, { id: "p1", createdAt: "2026-10-04T12:00:00.000Z", startDate: START });
    const snapshot = JSON.stringify(first.plans[0]);
    // Changing the source objects (as a profile edit or result edit would) does not reach the stored plan.
    b.result.total = 1;
    draft.sessions.length = 0;
    draft.preferences.weekdays.push("sun");
    expect(JSON.stringify(first.plans[0])).toBe(snapshot);
    expect(first.plans[0].templateVersion).toBe(TEMPLATE_VERSION);
    // A newer result starts a new plan; the earlier one is ended, not rewritten.
    const next = plan(prefs({ equipment: ["kettlebell"] }), baseline({ HRP: 30 }, {}, "r2", "2026-11-03"), "2026-11-09");
    const both = startPlan(first, next, { id: "p2", createdAt: "2026-11-08T12:00:00.000Z", startDate: "2026-11-09" });
    expect(both.plans[0].status).toBe("ended");
    expect(JSON.stringify({ ...both.plans[0], status: "active" })).toBe(snapshot);
  });
});

describe("age groups and scoring categories", () => {
  it("states the baseline's category and rule, and focuses on the combat total when every event passed", () => {
    const old = plan(prefs(), baseline({}, { age: 63 }));
    expect(old.standardSummary).toMatch(/62\+/);
    const c = validScoringCases.find((x) => x.standard === "combat" && x.scenario === "S8-total-just-below-threshold" && x.ageGroup === "22-26")!;
    const combat = baseline(c.raw, { age: c.age, standard: "combat", gender: c.sex });
    expect(combat.result.events.every((e) => e.points >= 60) && combat.result.total < 350).toBe(true);
    {
      const d = plan(prefs(), combat);
      expect(d.standardSummary).toMatch(/total of at least 350/);
      expect(d.focusSummary.join(" ")).toMatch(/below the 350-point/);
    }
    expect(plan(prefs(), baseline({}, { standard: "combat", gender: "F" })).standardSummary).toMatch(/Male \| Combat/);
  });
});

describe("rationale names only work that is scheduled", () => {
  it("says when a maintained event has no session instead of claiming maintenance", () => {
    const three = plan(prefs({ equipment: ["kettlebell"] }), baseline({ HRP: 8 }));
    const kinds = new Set(three.sessions.map((s) => s.kind));
    const text = three.rationale.join(" ");
    if (!kinds.has("speed") && !kinds.has("conditioning")) {
      expect(text).toMatch(/SDC has no separate session with 3 training days/);
      expect(text).not.toMatch(/Stronger events \([^)]*SDC/);
    }
    expect(kinds.has("speed") || kinds.has("conditioning")).toBe(false);
    const four = plan(prefs({ daysPerWeek: 4, weekdays: ["mon", "tue", "thu", "sat"] }), baseline({ HRP: 8 }));
    expect(four.rationale.join(" ")).toMatch(/Stronger events \([^)]*SDC[^)]*\) keep .*speed or conditioning session/);
  });
});
