import { describe, expect, it } from "vitest";
import { scoreAft, scoreEvent } from "./scoring";
import { ageGroups, hrpStandards, mdlStandards, plankStandards, sdcStandards, twoMileRunStandards } from "./standards";
import { formatSeconds, validateAftForm, emptyAftForm } from "./validation";
import type { AftEventCode, ScoreRow } from "./types";
import { eventCases, impossibleScoringCases, reference, scoringCases, timeCases, validScoringCases, validationCases } from "./fixtures";

// Runs the synthetic dataset (lib/aft/fixtures, built by scripts/aft-fixtures/generate.mjs from an independent
// transcription of the official score tables) against the calculator's scoring and validation code.

const EVENTS: AftEventCode[] = ["MDL", "HRP", "SDC", "PLK", "2MR"];

describe("synthetic dataset shape", () => {
  it("has unique IDs and fictional labels only", () => {
    const ids = [...scoringCases.map((c) => c.id), ...eventCases.map((c) => c.id), ...validationCases.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of validScoringCases) expect(c.label).toMatch(/^Test Soldier \d{3,}$/);
  });

  it("covers every age group, sex, and standard with all nine scenarios", () => {
    const scenarios = [
      "S1-all-minimum",
      "S2-all-maximum",
      "S3-typical-mixed",
      ...EVENTS.map((e) => `S4-one-fail-${e}`),
      "S5-multiple-fail",
      "S6-all-below-minimum",
      "S7-total-at-threshold",
      "S8-total-just-below-threshold",
      "S9-total-above-but-event-fails",
    ];
    for (const group of ageGroups) {
      for (const standard of ["general", "combat"] as const) {
        for (const sex of ["M", "F"] as const) {
          const mine = scoringCases.filter((c) => c.scenario.startsWith("S") && c.ageGroup === group && c.standard === standard && c.sex === sex);
          expect(mine.map((c) => c.scenario).sort(), `${group} ${standard} ${sex}`).toEqual([...scenarios].sort());
        }
      }
    }
  });

  it("marks only the mathematically impossible general-standard 'just below 300' scenario as impossible", () => {
    expect(impossibleScoringCases.every((c) => c.scenario === "S8-total-just-below-threshold" && c.standard === "general")).toBe(true);
    expect(impossibleScoringCases).toHaveLength(ageGroups.length * 2);
  });
});

describe("independent table transcription matches the app's tables", () => {
  const app: Record<AftEventCode, Record<string, ScoreRow[]>> = { MDL: mdlStandards, HRP: hrpStandards, SDC: sdcStandards, PLK: plankStandards, "2MR": twoMileRunStandards };
  for (const event of EVENTS) {
    it(`${event} rows agree for every age group and column`, () => {
      for (const group of ageGroups) {
        for (const col of ["M", "F"] as const) {
          const fromApp = app[event][group].filter((r) => r[col] !== null).map((r) => [r.points, r[col]]).sort((a, b) => b[0]! - a[0]!);
          const fromPdf = [...reference.tables[event][group][col]].sort((a, b) => b[0] - a[0]);
          expect(fromApp, `${event} ${group} ${col}`).toEqual(fromPdf);
        }
      }
    });
  }
});

describe("full-test scoring cases", () => {
  it.each(validScoringCases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    // Combat cases pass the selected sex too; the combat standard must ignore it.
    const result = scoreAft({ age: c.age, standard: c.standard, gender: c.sex, raw: c.raw });
    expect(result.ageGroup).toBe(c.ageGroup);
    expect(result.column).toBe(c.scoreColumn === "Female" ? "F" : "M");
    expect(Object.fromEntries(result.events.map((e) => [e.event, e.points]))).toEqual(c.expected.points);
    expect(result.total).toBe(c.expected.total);
    expect(result.passed).toBe(c.expected.passed);
    expect(result.failReasons).toEqual(c.expected.failReasons.map((r) => r.text));
  });
});

describe("single-event boundary cases", () => {
  it.each(eventCases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(scoreEvent(c.event, c.raw, c.ageGroup, c.column), `${c.event} ${c.ageGroup} ${c.column} ${c.rawDisplay}: ${c.note}`).toBe(c.expectedPoints);
  });
});

describe("time conversion", () => {
  it.each(timeCases.map((c) => [c.display, c] as const))("%s round-trips", (_d, c) => {
    expect(formatSeconds(c.seconds)).toBe(c.display);
    const parsed = validateAftForm(
      { ...emptyAftForm, age: "25", gender: "M", deadlift: "200", pushups: "30", sdcMinutes: c.minutes, sdcSeconds: c.secondsPart, plankMinutes: "2", plankSeconds: "00", runMinutes: "18", runSeconds: "00" },
      "2026-10-03"
    );
    expect(parsed.ok && parsed.input.raw.SDC).toBe(c.seconds);
  });
});

describe("input validation cases", () => {
  it.each(validationCases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const result = validateAftForm(c.values, c.today);
    expect(result.ok, c.description).toBe(c.expectedOk);
    if (!result.ok) expect(Object.keys(result.errors).sort(), c.description).toEqual([...c.expectedErrorFields].sort());
    if (result.ok && c.expectedRaw) expect(result.input.raw).toMatchObject(c.expectedRaw);
  });

  it("rejects ages below the minimum in the scoring engine as well", () => {
    expect(() => scoreAft({ age: 16, standard: "general", gender: "M", raw: { MDL: 200, HRP: 30, SDC: 130, PLK: 120, "2MR": 1100 } })).toThrow();
  });
});
