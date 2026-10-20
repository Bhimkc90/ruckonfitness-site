import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { generatePlan } from "./engine";
import { blockProgression, planProgression } from "./progression";
import { firstPainReport } from "./progress";
import { ASSUMPTIONS } from "./templates";
import { EMPTY_TRAINING, completeSession, startPlan } from "@/lib/storage/trainingPlans";
import type { BaselineSnapshot, EquipmentOption, PlanDraft, Preferences, Restriction } from "./types";

const t = (m: number, s: number) => m * 60 + s;

function baseline(raw: Partial<AftInput["raw"]>): BaselineSnapshot {
  const input: AftInput = { age: 19, standard: "general", gender: "M", raw: { MDL: 250, HRP: 29, SDC: t(1, 57), PLK: t(2, 51), "2MR": t(18, 54), ...raw } };
  return { resultId: "r1", testDate: "2026-10-20", input, result: scoreAft(input) };
}

const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 45,
  equipment: ["kettlebell"],
  runningAccess: true,
  experience: "some",
  recentRunning: "31-60",
  restrictions: [],
  ...overrides,
});

function plan(b: BaselineSnapshot, p: Preferences): PlanDraft {
  const outcome = generatePlan({ baseline: b, prefs: p, screening: { currentPain: false, otherInstructions: "" }, startDate: "2026-10-20" });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return outcome.plan;
}

const BASELINES = [baseline({}), baseline({ MDL: 120 }), baseline({ HRP: 5 }), baseline({ PLK: t(0, 50) }), baseline({ SDC: t(3, 30) }), baseline({ "2MR": t(24, 0) })];
const EQUIPMENT: EquipmentOption[][] = [[], ["kettlebell"], ["dumbbell"], ["barbell-or-hex-bar"]];
const RESTRICTIONS: Restriction[][] = [[], ["no-weight-on-hands"], ["no-loaded-lifting"]];

describe("progression explanations come from the plan's prescriptions", () => {
  it("never describes a maintenance block as progressing, and always explains development progressions", () => {
    for (const b of BASELINES)
      for (const equipment of EQUIPMENT)
        for (const restrictions of RESTRICTIONS)
          for (const daysPerWeek of [3, 5] as const) {
            const weekdays = daysPerWeek === 3 ? (["mon", "wed", "fri"] as const) : (["mon", "tue", "wed", "fri", "sat"] as const);
            const outcome = generatePlan({ baseline: b, prefs: prefs({ equipment, restrictions, daysPerWeek, weekdays: [...weekdays] }), screening: { currentPain: false, otherInstructions: "" }, startDate: "2026-10-20" });
            if (outcome.status !== "ready") continue;
            for (const block of outcome.plan.sessions.flatMap((s) => s.main)) {
              const changes = blockProgression(block);
              if (/maintenance/i.test(block.title)) expect(changes, block.title).toEqual([]);
              const changed = block.items.some((i) => JSON.stringify(i.prescription.foundation) !== JSON.stringify(i.prescription.build));
              expect(changes.length > 0, block.title).toBe(changed);
            }
          }
  });

  it("summarizes what changes and what stays the same for the AFT-0003 example", () => {
    const summary = planProgression(plan(baseline({}), prefs()));
    expect(summary.progresses.find((p) => p.title === "Hand-release push-up development")?.changes).toEqual(
      expect.arrayContaining(["Hand-release push-up practice: 3 sets → 4 sets", "Supine Chest Press: 2 rounds → 3 rounds"])
    );
    expect(summary.unchanged).toEqual(expect.arrayContaining(["Kettlebell hinge and squat maintenance", "Plank maintenance"]));
    expect(summary.progresses.map((p) => p.title)).not.toContain("Plank maintenance");
  });

  it("states that maintenance stays the same in every rule that describes a weeks 3–4 increase", () => {
    for (const id of ["loadedHinge", "kettlebellCircuit", "hrpPractice", "pushAccessory", "plankPractice", "intervals", "progressionGate"] as const) {
      expect(ASSUMPTIONS[id], id).toMatch(/maintenance stays|maintained, it stays|otherwise weeks 3–4 stay the same|maintenance work stays the same/);
    }
  });
});

describe("review path", () => {
  it("gives instructions that match the screens instead of pointing at checkboxes that aren't there", () => {
    const outcome = generatePlan({ baseline: baseline({}), prefs: prefs(), screening: { currentPain: false, otherInstructions: "No overhead lifting" }, startDate: "2026-10-20" });
    expect(outcome.status).toBe("needs-review");
    const text = outcome.status === "needs-review" ? outcome.reasons.join(" ") : "";
    expect(text).not.toMatch(/above/);
    expect(text).toMatch(/health check/);
    expect(text).toMatch(/Movements you must avoid/);
  });
});

describe("pain pause", () => {
  it("finds the first pain report for the plan and keeps every record", () => {
    const started = startPlan(EMPTY_TRAINING, plan(baseline({}), prefs()), { id: "p1", createdAt: "2026-10-20T12:00:00.000Z", startDate: "2026-10-20" });
    let data = completeSession(started, { planId: "p1", sessionId: "w1-s1", completedAt: "2026-10-20T18:00:00.000Z", difficulty: "easy", pain: false, notes: "" });
    expect(firstPainReport(data.plans[0], data.completions)).toBeNull();
    data = completeSession(data, { planId: "p1", sessionId: "w1-s2", completedAt: "2026-10-22T18:00:00.000Z", difficulty: "hard", pain: true, notes: "knee" });
    const withOtherPlan = [...data.completions, { planId: "other", sessionId: "w1-s1", completedAt: "2026-10-19T18:00:00.000Z", difficulty: "easy" as const, pain: true, notes: "" }];
    expect(firstPainReport(data.plans[0], withOtherPlan)?.sessionId).toBe("w1-s2");
    expect(data.completions.map((c) => c.sessionId)).toEqual(["w1-s1", "w1-s2"]);
  });
});
