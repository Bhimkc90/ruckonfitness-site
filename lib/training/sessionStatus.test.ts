import { afterEach, describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { EMPTY_TRAINING, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { generatePlan } from "./engine";
import { PAIN_PAUSE_MESSAGE } from "./progress";
import { ONE_PER_DAY, laterActivity, localDateOf, planSessionStates, sessionState } from "./sessionStatus";
import { buildWorkout } from "./workout";
import type { Preferences, SessionCompletion, StoredPlan } from "./types";

const START = "2026-10-05"; // Monday. Week 1: w1-s1 Mon 10-05, w1-s2 Wed 10-07, w1-s3 Fri 10-09.

function plan(overrides: Partial<Preferences> = {}, startDate = START): StoredPlan {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 120, HRP: 40, SDC: 110, PLK: 150, "2MR": 990 } };
  const outcome = generatePlan({
    baseline: { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) },
    prefs: { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: ["barbell-or-hex-bar"], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [], ...overrides },
    screening: { currentPain: false, otherInstructions: "" },
    startDate,
  });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return startPlan(EMPTY_TRAINING, outcome.plan, { id: "p1", createdAt: "2026-10-01T00:00:00.000Z", startDate }).plans[0];
}

const P = plan();
const at = (date: string, hour = 17) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const done = (sessionId: string, date: string, extra: Partial<SessionCompletion> = {}): SessionCompletion => ({
  planId: "p1",
  sessionId,
  completedAt: at(date, 18),
  difficulty: "about-right",
  pain: false,
  notes: "",
  ...extra,
});
const records = (completions: SessionCompletion[] = [], extra: Partial<TrainingData> = {}) => ({ completions, workouts: [], painReports: [], ...extra });
const states = (p: StoredPlan, r: ReturnType<typeof records>, now: string) => planSessionStates(p, r, now);

// A tracked workout stored for a session, optionally with every set recorded.
function workoutFor(p: StoredPlan, sessionId: string, startedAt: string) {
  const snapshot = buildWorkout(p, p.sessions.find((s) => s.id === sessionId)!, { phase: "foundation", createdAt: startedAt });
  return { planId: p.id, sessionId, status: "in-progress" as const, startedAt, snapshot };
}

describe("first workout", () => {
  it("is upcoming before its date and available on it", () => {
    const before = sessionState(P, records(), "w1-s1", at("2026-10-04"))!;
    expect(before).toMatchObject({ status: "upcoming", eligible: false, reasons: ["Available on Oct 5."] });
    expect(sessionState(P, records(), "w1-s1", at(START))).toMatchObject({ status: "available", eligible: true, reasons: [], order: 1, date: START });
  });

  it("locks every later workout behind it, with the reason", () => {
    const later = sessionState(P, records(), "w1-s2", at("2026-10-07"))!;
    expect(later).toMatchObject({ status: "locked", eligible: false, waitingFor: "w1-s1" });
    expect(later.reasons[0]).toMatch(/^Complete Strength.* \(Oct 5\) first\. Workouts unlock in order\.$/);
    expect(states(P, records(), at(START)).sessions.filter((s) => s.status === "locked")).toHaveLength(P.sessions.length - 1);
  });
});

describe("sequential unlocking", () => {
  it("unlocks the next workout only once the previous one is completed, and not before its date", () => {
    const r = records([done("w1-s1", START)]);
    expect(sessionState(P, r, "w1-s1", at("2026-10-06"))!.status).toBe("completed");
    expect(sessionState(P, r, "w1-s2", at("2026-10-06"))).toMatchObject({ status: "upcoming", reasons: ["Available on Oct 7."] });
    expect(sessionState(P, r, "w1-s2", at("2026-10-07"))).toMatchObject({ status: "available", eligible: true });
    expect(sessionState(P, r, "w1-s3", at("2026-10-09"))).toMatchObject({ status: "locked", waitingFor: "w1-s2" });
  });

  it("keeps the next workout locked when every set is recorded but the workout isn't completed", () => {
    const w = workoutFor(P, "w1-s1", at(START));
    const r = records([], { workouts: [w] });
    expect(sessionState(P, r, "w1-s1", at("2026-10-07"))).toMatchObject({ status: "in-progress", eligible: true });
    expect(sessionState(P, r, "w1-s2", at("2026-10-07"))).toMatchObject({ status: "locked", waitingFor: "w1-s1" });
  });

  it("applies across week boundaries", () => {
    const week1 = [done("w1-s1", START), done("w1-s2", "2026-10-07")];
    expect(sessionState(P, records(week1), "w2-s1", at("2026-10-12"))).toMatchObject({ status: "locked", waitingFor: "w1-s3" });
    const all = [...week1, done("w1-s3", "2026-10-09")];
    expect(sessionState(P, records(all), "w2-s1", at("2026-10-11"))!.status).toBe("upcoming");
    expect(sessionState(P, records(all), "w2-s1", at("2026-10-12"))!.status).toBe("available");
  });

  it("follows effective dates, not session numbers", () => {
    // Starting on a Tuesday puts Monday's session (w1-s1) last in week 1.
    const tuesday = plan({}, "2026-10-06");
    expect(states(tuesday, records(), at("2026-10-07")).sessions.slice(0, 3).map((s) => [s.sessionId, s.date])).toEqual([
      ["w1-s2", "2026-10-07"],
      ["w1-s3", "2026-10-09"],
      ["w1-s1", "2026-10-12"],
    ]);
    expect(sessionState(tuesday, records(), "w1-s2", at("2026-10-07"))!.status).toBe("available");
    // A reschedule moves a session in the sequence.
    const moved = { ...P, reschedules: { "w1-s2": "2026-10-08" } };
    expect(sessionState(moved, records([done("w1-s1", START)]), "w1-s2", at("2026-10-07"))).toMatchObject({ status: "upcoming", date: "2026-10-08" });
  });

  it("needs nothing on rest days", () => {
    const r = records([done("w1-s1", START)]);
    const tuesday = states(P, r, at("2026-10-06"));
    expect(tuesday.status).toBe("active");
    expect(tuesday.earliestUnfinished).toMatchObject({ sessionId: "w1-s2", status: "upcoming", overdue: false });
    expect(tuesday.sessions.some((s) => s.date === "2026-10-06")).toBe(false);
  });

  it("counts legacy completed sessions as completed without set records", () => {
    const r = records([done("w1-s1", START)]);
    expect(r.workouts).toEqual([]);
    expect(sessionState(P, r, "w1-s1", at("2026-10-07"))!.status).toBe("completed");
    expect(sessionState(P, r, "w1-s2", at("2026-10-07"))!.status).toBe("available");
  });
});

describe("missed workouts", () => {
  it("keeps the earliest missed workout next, without skipping or completing it", () => {
    const r = records();
    const plan = states(P, r, at("2026-10-08"));
    expect(plan.earliestUnfinished).toMatchObject({ sessionId: "w1-s1", status: "overdue", eligible: true, overdue: true });
    expect(plan.earliestUnfinished!.reasons[0]).toMatch(/stays your next workout until you complete it or move it/);
    expect(plan.sessions[1]).toMatchObject({ sessionId: "w1-s2", status: "locked", overdue: true });
    expect(r.completions).toEqual([]);
  });

  it("allows one workout per day, so missed workouts aren't stacked", () => {
    const late = records([done("w1-s1", "2026-10-07")]); // Monday's workout done on Wednesday
    expect(sessionState(P, late, "w1-s2", at("2026-10-07", 20))).toMatchObject({ status: "locked", reasons: [ONE_PER_DAY] });
    expect(sessionState(P, late, "w1-s2", at("2026-10-08"))).toMatchObject({ status: "overdue", eligible: true });
  });

  it("doesn't count a workout's own start today against it", () => {
    const r = records([done("w1-s1", START), done("w1-s2", "2026-10-07")], { workouts: [{ ...workoutFor(P, "w1-s3", at("2026-10-09")), status: "in-progress" }] });
    expect(sessionState(P, r, "w1-s3", at("2026-10-09", 20))!.status).toBe("in-progress");
  });
});

describe("pauses, ended and completed plans, and unread prescriptions", () => {
  it("pauses every unfinished session after pain, from either source", () => {
    for (const r of [records([done("w1-s1", START, { pain: true })]), records([], { painReports: [{ planId: "p1", sessionId: "w1-s1", reportedAt: at(START), notes: "" }] })]) {
      const plan = states(P, r, at("2026-10-07"));
      expect(plan.status).toBe("paused");
      for (const s of plan.sessions.filter((x) => x.status !== "completed")) expect(s).toMatchObject({ status: "paused", eligible: false, reasons: [PAIN_PAUSE_MESSAGE] });
    }
  });

  it("pauses an in-progress workout too", () => {
    const r = records([], { workouts: [workoutFor(P, "w1-s1", at(START))], painReports: [{ planId: "p1", sessionId: "w1-s1", reportedAt: at(START), notes: "" }] });
    expect(sessionState(P, r, "w1-s1", at(START))!.status).toBe("paused");
  });

  it("ends every unfinished session when the plan ends", () => {
    const ended = { ...P, status: "ended" as const };
    const plan = states(ended, records([done("w1-s1", START)]), at("2026-10-07"));
    expect(plan.status).toBe("ended");
    expect(plan.sessions[0].status).toBe("completed");
    expect(plan.sessions.slice(1).every((s) => s.status === "ended" && !s.eligible)).toBe(true);
  });

  it("reports a plan with every session done as completed", () => {
    const all = P.sessions.map((s) => done(s.id, START));
    const plan = states(P, records(all), at("2026-11-02"));
    expect(plan.status).toBe("completed");
    expect(plan.earliestUnfinished).toBeNull();
  });

  it("blocks a session with an unread prescription and keeps everything after it locked", () => {
    const unread = structuredClone(P);
    unread.sessions.find((s) => s.id === "w1-s1")!.warmUp[0].items[0].prescription.foundation = { reps: "10 of each" };
    const first = sessionState(unread, records(), "w1-s1", at(START))!;
    expect(first).toMatchObject({ status: "blocked", eligible: false });
    expect(first.reasons.at(-1)).toMatch(/later workouts stay locked/);
    expect(sessionState(unread, records(), "w1-s2", at("2026-10-07"))).toMatchObject({ status: "locked", waitingFor: "w1-s1" });
    // A stored workout with an unread prescription is blocked as well.
    const stored = workoutFor(unread, "w1-s1", at(START));
    expect(sessionState(unread, records([], { workouts: [stored] }), "w1-s1", at(START))!.status).toBe("blocked");
  });

  it("returns null for an unknown session", () => {
    expect(sessionState(P, records(), "w9-s9", at(START))).toBeNull();
    expect(sessionState(P, records(), "", at(START))).toBeNull();
  });
});

describe("warnings", () => {
  it("warns about the AFT day and a hard session the day before", () => {
    const aftPlan = { ...P, preferences: { ...P.preferences, nextAftDate: "2026-10-07" } };
    expect(sessionState(aftPlan, records([done("w1-s1", START)]), "w1-s2", at("2026-10-07"))!.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/AFT day/)]));
    // Friday's strength session (w1-s3) done late on Sunday, then Monday's strength session (w2-s1).
    expect([P.sessions.find((x) => x.id === "w1-s3")!.kind, P.sessions.find((x) => x.id === "w2-s1")!.kind]).toEqual(["strength", "strength"]);
    const r = records([done("w1-s1", START), done("w1-s2", "2026-10-07"), done("w1-s3", "2026-10-11")]);
    const state = sessionState(P, r, "w2-s1", at("2026-10-12"))!;
    expect(state).toMatchObject({ status: "available", eligible: true });
    expect(state.warnings).toEqual(["You completed a hard session yesterday. The plan avoids back-to-back hard days; consider waiting a day."]);
    expect(sessionState(P, r, "w2-s1", at("2026-10-13"))!.warnings).toEqual([]);
  });
});

describe("history changes", () => {
  it("reports later activity that would make an undo leave history out of order", () => {
    expect(laterActivity(P, records([done("w1-s1", START)]), "w1-s1")).toBeNull();
    expect(laterActivity(P, records([done("w1-s1", START), done("w1-s2", "2026-10-07")]), "w1-s1")).toMatch(/already started or completed/);
    expect(laterActivity(P, records([done("w1-s1", START)], { workouts: [workoutFor(P, "w1-s2", at("2026-10-07"))] }), "w1-s1")).toMatch(/already started or completed/);
    expect(laterActivity(P, records(), "w9-s9")).toBe("Session not found.");
  });
});

describe("local dates and time zones", () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it("uses the device's calendar date, not UTC", () => {
    const instant = "2026-10-05T03:00:00.000Z";
    process.env.TZ = "America/New_York"; // 23:00 on Oct 4
    expect(localDateOf(instant)).toBe("2026-10-04");
    expect(sessionState(P, records(), "w1-s1", instant)!.status).toBe("upcoming");
    process.env.TZ = "Asia/Tokyo"; // 12:00 on Oct 5
    expect(localDateOf(instant)).toBe("2026-10-05");
    expect(sessionState(P, records(), "w1-s1", instant)!.status).toBe("available");
  });

  it("applies the daily limit by local day even when the UTC date differs", () => {
    process.env.TZ = "America/Los_Angeles";
    // Monday's workout done late, at 16:00 on Wednesday Oct 7 local (23:00 UTC, still Oct 7).
    const r = records([{ ...done("w1-s1", START), completedAt: "2026-10-07T23:00:00.000Z" }]);
    // 23:30 Oct 7 local is Oct 8 in UTC, but it's the same local day, so Wednesday's workout waits.
    expect(localDateOf("2026-10-08T06:30:00.000Z")).toBe("2026-10-07");
    expect(sessionState(P, r, "w1-s2", "2026-10-08T06:30:00.000Z")).toMatchObject({ status: "locked", reasons: [ONE_PER_DAY] });
    expect(sessionState(P, r, "w1-s2", "2026-10-08T16:00:00.000Z")).toMatchObject({ status: "overdue", eligible: true });
  });

  it("treats an invalid time as no date, which unlocks nothing", () => {
    expect(localDateOf("yesterday")).toBeNull();
    expect(localDateOf("2026-13-45T00:00:00Z")).toBeNull();
    expect(planSessionStates(P, records(), "not a time").sessions.some((s) => s.eligible)).toBe(false);
  });
});
