import { describe, expect, it } from "vitest";
import { aftEventOrder, failedEvents, scoreAft } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import type { AftEventCode, AftInput } from "@/lib/aft/types";
import { generatePlan } from "./engine";
import { canStartPlan, classifyPattern } from "./pathways";
import { DEFAULT_SCENARIO_PREFS, SCENARIOS, SCENARIO_START, SCENARIO_WEEKDAYS, scenarioBaseline } from "./scenarios";
import { EMPTY_TRAINING, parseTrainingData, startPlan } from "@/lib/storage/trainingPlans";
import type { BaselineSnapshot, PlanDraft, Preferences } from "./types";

const t = (m: number, s: number) => m * 60 + s;
const PASS = { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30) };
const FAIL = { MDL: 120, HRP: 8, SDC: t(3, 30), PLK: t(0, 50), "2MR": t(24, 0) };
const NEAR = { MDL: 140, HRP: 10, SDC: t(2, 45), PLK: t(1, 15), "2MR": t(20, 0) };

const masks = Array.from({ length: 32 }, (_, mask) => aftEventOrder.filter((_, i) => mask & (1 << i)));

function baselineFor(failed: AftEventCode[], values: Record<AftEventCode, number> = FAIL): BaselineSnapshot {
  const raw = Object.fromEntries(aftEventOrder.map((e) => [e, failed.includes(e) ? values[e] : PASS[e]])) as AftInput["raw"];
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw };
  return { resultId: "x", testDate: SCENARIO_START, input, result: scoreAft(input) };
}

const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({ ...DEFAULT_SCENARIO_PREFS, ...overrides });
const withDays = (daysPerWeek: Preferences["daysPerWeek"], overrides: Partial<Preferences> = {}) => prefs({ daysPerWeek, weekdays: SCENARIO_WEEKDAYS[daysPerWeek], ...overrides });

function plan(b: BaselineSnapshot, p: Preferences = prefs()): PlanDraft {
  const outcome = generatePlan({ baseline: b, prefs: p, screening: { currentPain: false, otherInstructions: "" }, startDate: SCENARIO_START });
  if (outcome.status !== "ready") throw new Error(`${outcome.status}: ${JSON.stringify(outcome)}`);
  return outcome.plan;
}

// What a person would actually do in week 1: session types and every prescription, without titles.
const content = (p: PlanDraft) =>
  JSON.stringify(p.sessions.filter((s) => s.week === 1).map((s) => [s.kind, s.main.map((b) => b.items.map((i) => [i, i.prescription.foundation]))]));
const kinds = (p: PlanDraft) => p.sessions.filter((s) => s.week === 1).map((s) => s.kind);

describe("failure patterns come from the scoring engine", () => {
  it("represents all 32 five-event pass/fail patterns with valid raw inputs, far below and just below the minimum", () => {
    for (const failed of masks)
      for (const values of [FAIL, NEAR]) {
        const b = baselineFor(failed, values);
        expect(failedEvents(b.result)).toEqual(failed);
        const pattern = classifyPattern(b.result);
        expect(pattern.failedEvents).toEqual(failed);
        expect(pattern.kind).toBe(failed.length === 0 ? "none-failed" : failed.length === 1 ? "single" : failed.length === 2 ? "pair" : "multiple");
      }
  });

  it("uses the just-below values only for 40–59 points", () => {
    const b = baselineFor([...aftEventOrder], NEAR);
    for (const e of b.result.events) expect(e.points, e.event).toBeGreaterThanOrEqual(40);
    for (const e of b.result.events) expect(e.points, e.event).toBeLessThan(60);
  });

  it("develops every failed event and maintains every passed one", () => {
    for (const failed of masks.filter((m) => m.length > 0)) {
      const p = plan(baselineFor(failed));
      for (const a of p.analysis) expect(a.role, `${failed} ${a.event}`).toBe(failed.includes(a.event) ? "develop" : "maintain");
      expect(p.pathway?.failedEvents).toEqual(failed);
    }
  });

  it("detects a total-only failure on the combat standard, which can't happen on the general standard", () => {
    const rule = aftStandardRules.general;
    expect(rule.minEventPoints * 5).toBeGreaterThanOrEqual(rule.minTotalPoints);
    const scenario = SCENARIOS.find((s) => s.id === "total-only")!;
    const b = scenarioBaseline(scenario);
    expect(b.result.passed).toBe(false);
    expect(failedEvents(b.result)).toEqual([]);
    const p = plan(b);
    expect(p.pathway).toMatchObject({ kind: "total-only", status: "draft", failedEvents: [], totalBelowMinimum: true });
    expect(p.pathway?.decisions).toContain("total-only");
    expect(p.analysis.filter((a) => a.role === "develop")).toHaveLength(2);
    expect(p.focusSummary.join(" ")).toMatch(/below the 350-point combat standard/);
  });

  it("never lets a high total hide a failed event", () => {
    for (const e of aftEventOrder) {
      const high = scenarioBaseline(SCENARIOS.find((s) => s.id === `high-${e}`)!);
      expect(high.result.total).toBeGreaterThan(400);
      const p = plan(high);
      expect(p.pathway?.id).toBe(`single-${e}`);
      expect(p.analysis.find((a) => a.event === e)).toMatchObject({ passed: false, role: "develop", priority: 1 });
      expect(p.analysis.filter((a) => a.role === "develop")).toHaveLength(1);
    }
  });
});

describe("pathways produce different plans", () => {
  it("gives each single-event failure different session content", () => {
    const plans = aftEventOrder.map((e) => content(plan(baselineFor([e]))));
    expect(new Set([...plans, content(plan(baselineFor([])))]).size).toBe(6);
  });

  it("gives running events different session types from strength events", () => {
    expect(kinds(plan(baselineFor(["SDC"])))).toContain("speed");
    expect(kinds(plan(baselineFor(["2MR"]))).filter((k) => k === "endurance")).toHaveLength(2);
    for (const e of ["MDL", "HRP", "PLK"] as const) expect(kinds(plan(baselineFor([e]))).filter((k) => k === "strength")).toHaveLength(2);
  });

  it("gives each of the ten two-event failures different content", () => {
    const pairs = masks.filter((m) => m.length === 2);
    expect(pairs).toHaveLength(10);
    expect(new Set(pairs.map((m) => content(plan(baselineFor(m))))).size).toBe(10);
  });

  it("trains both failed events of every pair, and every failed event of larger sets, from 3 days a week", () => {
    for (const failed of masks.filter((m) => m.length >= 2))
      for (const d of [3, 4, 5] as const) {
        const p = plan(baselineFor(failed), withDays(d));
        expect(p.pathway?.decisions, `${failed} ${d}d`).not.toContain("uncovered-event");
      }
  });

  it("says which failed event gets no session when 2 days can't cover them", () => {
    const p = plan(baselineFor(["SDC", "2MR"]), withDays(2));
    expect(p.pathway).toMatchObject({ status: "partial" });
    expect(p.pathway?.decisions).toContain("uncovered-event");
    expect(p.limitations.join(" ")).toMatch(/Sprint-drag-carry: it is below the minimum but has no session with 2 training days/i);
  });

  it("adds SDC leg strength only with kettlebells, and drops it from 30-minute sessions with a stated limit", () => {
    const ids = (p: PlanDraft) => p.sessions.flatMap((s) => s.main.map((b) => b.id));
    expect(ids(plan(baselineFor(["SDC"])))).toContain("sdc-step-up");
    expect(ids(plan(baselineFor(["SDC"]), prefs({ equipment: [] })))).not.toContain("sdc-step-up");
    expect(ids(plan(baselineFor(["SDC"]), prefs({ restrictions: ["no-loaded-lifting"] })))).not.toContain("sdc-step-up");
    const short = plan(baselineFor(["SDC"]), prefs({ sessionMinutes: 30 }));
    expect(ids(short)).not.toContain("sdc-step-up");
    expect(short.limitations.join(" ")).toMatch(/Step-Up station does not fit in a 30-minute session/);
    expect(ids(plan(baselineFor([])))).not.toContain("sdc-step-up");
  });

  it("changes the plan with schedule, equipment, experience, session length, and recent running", () => {
    const b = baselineFor(["SDC", "MDL"]);
    const reference = JSON.stringify(plan(b).sessions);
    const variants: Partial<Preferences>[] = [
      { daysPerWeek: 4, weekdays: SCENARIO_WEEKDAYS[4] },
      { equipment: ["barbell-or-hex-bar"] },
      { experience: "new" },
      { sessionMinutes: 30 },
      { recentRunning: "none" },
    ];
    for (const v of variants) expect(JSON.stringify(plan(b, prefs(v)).sessions), JSON.stringify(v)).not.toBe(reference);
    const run = baselineFor(["2MR"]);
    expect(JSON.stringify(plan(run, prefs({ recentRunning: "61-120" })).sessions)).not.toBe(JSON.stringify(plan(run).sessions));
  });
});

describe("statuses and limits", () => {
  it("marks three or more failures pending review: shown, but not startable", () => {
    for (const failed of masks.filter((m) => m.length >= 3)) {
      const p = plan(baselineFor(failed));
      expect(p.pathway).toMatchObject({ kind: "multiple", status: "pending-review" });
      expect(p.pathway?.decisions).toContain("multiple-workload");
      expect(canStartPlan(p)).toBe(false);
      expect(p.sessions).toHaveLength(12);
    }
  });

  it("marks pathways partial when part of the emphasis can't be delivered", () => {
    expect(plan(baselineFor(["SDC"])).pathway?.status).toBe("partial"); // no drag or carry exercise
    expect(plan(baselineFor(["2MR"]), prefs({ recentRunning: "none" })).pathway?.status).toBe("partial");
    expect(plan(baselineFor(["MDL"]), prefs({ equipment: [] })).pathway?.status).toBe("partial");
    expect(plan(baselineFor(["HRP"]), prefs({ restrictions: ["no-weight-on-hands"] })).pathway?.status).toBe("partial");
    for (const e of ["MDL", "HRP", "PLK", "2MR"] as const) expect(plan(baselineFor([e])).pathway?.status, e).toBe("draft");
  });

  it("still refuses the documented impossible case", () => {
    const outcome = generatePlan({ baseline: baselineFor(["HRP"]), prefs: prefs({ equipment: [], restrictions: ["no-weight-on-hands"] }), screening: { currentPain: false, otherInstructions: "" }, startDate: SCENARIO_START });
    expect(outcome.status).toBe("not-possible");
  });

  it("keeps the pain and free-text review paths ahead of any pathway", () => {
    const b = baselineFor(["MDL", "HRP", "SDC"]);
    expect(generatePlan({ baseline: b, prefs: prefs(), screening: { currentPain: true, otherInstructions: "" }, startDate: SCENARIO_START }).status).toBe("paused");
    expect(generatePlan({ baseline: b, prefs: prefs(), screening: { currentPain: false, otherInstructions: "profile" }, startDate: SCENARIO_START }).status).toBe("needs-review");
  });
});

describe("scenarios and storage", () => {
  it("has a scenario for every pattern, labeled with the pattern the scoring engine finds", () => {
    const ids = new Set(SCENARIOS.map((s) => classifyPattern(scenarioBaseline(s).result).id));
    for (const failed of masks) {
      const pattern = classifyPattern(baselineFor(failed).result);
      expect(ids.has(pattern.id), pattern.id).toBe(true);
    }
    for (const s of SCENARIOS) {
      const pattern = classifyPattern(scenarioBaseline(s).result);
      const failedInId = s.id.startsWith("multiple-") || s.id.startsWith("pair-") || s.id.startsWith("single-") ? s.id.split("-").slice(1) : null;
      if (failedInId && !s.id.includes("near") && !s.id.includes("all")) expect(pattern.failedEvents, s.id).toEqual(failedInId);
      expect(() => plan(scenarioBaseline(s), prefs(s.prefs))).not.toThrow();
    }
  });

  it("stores the pathway with a started plan and still reads plans saved without one", () => {
    const draft = plan(baselineFor(["SDC"]));
    const started = startPlan(EMPTY_TRAINING, draft, { id: "p1", createdAt: "2026-10-05T12:00:00.000Z", startDate: SCENARIO_START });
    const roundTrip = parseTrainingData(JSON.stringify(started));
    expect(roundTrip.plans[0].pathway).toEqual(draft.pathway);
    const { pathway: _omit, ...legacy } = roundTrip.plans[0];
    void _omit;
    const old = parseTrainingData(JSON.stringify({ ...started, plans: [{ ...legacy, templateVersion: "starter-4wk-v3-draft (2026-10-20, not professionally reviewed)" }] }));
    expect(old.plans).toHaveLength(1);
    expect(old.plans[0].templateVersion).toMatch(/v3/);
    expect(canStartPlan(old.plans[0])).toBe(true);
  });
});
