import { describe, expect, it } from "vitest";
import { aftEventInfo, aftEventOrder, getAgeGroup, getScoreColumn, scoreAft, scoreEvent } from "./scoring";
import { ageGroups, hrpStandards, mdlStandards, plankStandards, sdcStandards, twoMileRunStandards } from "./standards";
import type { AftEventCode, AftInput, AftRawScores, ScoreRow } from "./types";

// Expected values below are read directly from the official AFT Score Tables
// (AFT_Scoring_Scales_250601.pdf, effective 1 June 2025).
const t = (minutes: number, seconds: number) => minutes * 60 + seconds;

describe("getAgeGroup", () => {
  it.each([
    [17, "17-21"], [21, "17-21"], [22, "22-26"], [26, "22-26"], [27, "27-31"], [36, "32-36"],
    [37, "37-41"], [46, "42-46"], [51, "47-51"], [56, "52-56"], [57, "57-61"], [61, "57-61"], [62, "62+"], [70, "62+"],
  ] as const)("age %i -> %s", (age, group) => {
    expect(getAgeGroup(age)).toBe(group);
  });
});

describe("score tables are complete", () => {
  const tables: Record<AftEventCode, Record<string, ScoreRow[]>> = {
    MDL: mdlStandards, HRP: hrpStandards, SDC: sdcStandards, PLK: plankStandards, "2MR": twoMileRunStandards,
  };

  for (const event of aftEventOrder) {
    for (const group of ageGroups) {
      for (const column of ["M", "F"] as const) {
        it(`${event} ${group} ${column} runs 100 to 0 in strict order`, () => {
          const rows = tables[event][group]
            .filter((row) => row[column] !== null)
            .sort((a, b) => b.points - a.points);
          expect(rows[0].points).toBe(100);
          expect(rows.at(-1)?.points).toBe(0);
          for (let i = 1; i < rows.length; i++) {
            const previous = rows[i - 1][column] as number;
            const current = rows[i][column] as number;
            if (aftEventInfo[event].higherIsBetter) expect(current).toBeLessThan(previous);
            else expect(current).toBeGreaterThan(previous);
          }
        });
      }
    }
  }
});

describe("scoreEvent matches the official tables", () => {
  it.each([
    // [event, raw, ageGroup, column, expected points]
    ["MDL", 340, "17-21", "M", 100],
    ["MDL", 220, "17-21", "F", 100],
    ["MDL", 180, "17-21", "F", 91],
    ["MDL", 179, "17-21", "F", 88],
    ["MDL", 150, "17-21", "F", 80],
    ["MDL", 300, "37-41", "M", 91],
    ["MDL", 290, "42-46", "M", 90],
    ["MDL", 150, "62+", "F", 90],
    ["MDL", 140, "32-36", "M", 60],
    ["MDL", 130, "32-36", "M", 50],
    ["MDL", 80, "32-36", "M", 0],
    ["MDL", 79, "32-36", "M", 0],
    ["HRP", 58, "17-21", "M", 100],
    ["HRP", 53, "17-21", "F", 100],
    ["HRP", 34, "22-26", "F", 91],
    ["HRP", 40, "22-26", "M", 83],
    ["HRP", 29, "57-61", "M", 90],
    ["HRP", 30, "42-46", "F", 92],
    ["HRP", 29, "42-46", "F", 90], // 91 is "---" for this column
    ["HRP", 11, "32-36", "F", 60],
    ["HRP", 9, "32-36", "F", 50],
    ["HRP", 4, "32-36", "F", 0],
    ["HRP", 3, "32-36", "F", 0],
    ["SDC", t(1, 29), "17-21", "M", 100],
    ["SDC", t(1, 30), "17-21", "M", 99],
    ["SDC", t(2, 47), "32-36", "F", 70],
    ["SDC", t(2, 16), "57-61", "M", 91],
    ["SDC", t(2, 36), "32-36", "M", 60],
    ["SDC", t(2, 37), "32-36", "M", 59],
    ["SDC", t(2, 46), "32-36", "M", 50],
    ["SDC", t(3, 36), "32-36", "M", 0],
    ["SDC", t(3, 37), "32-36", "M", 0],
    ["PLK", t(3, 40), "17-21", "M", 100],
    ["PLK", t(3, 40), "17-21", "F", 100],
    ["PLK", t(2, 47), "37-41", "F", 90],
    ["PLK", t(1, 15), "32-36", "M", 60],
    ["PLK", t(1, 10), "32-36", "M", 50],
    ["PLK", t(0, 45), "32-36", "M", 0],
    ["PLK", t(0, 44), "32-36", "M", 0],
    ["2MR", t(16, 0), "17-21", "F", 100],
    ["2MR", t(18, 30), "32-36", "M", 70],
    ["2MR", t(18, 31), "32-36", "M", 69],
    ["2MR", t(25, 0), "62+", "F", 60],
    ["2MR", t(25, 3), "62+", "F", 59],
    ["2MR", t(27, 55), "62+", "F", 0],
    ["2MR", t(27, 56), "62+", "F", 0],
  ] as const)("%s raw %i, %s %s -> %i", (event, raw, group, column, expected) => {
    expect(scoreEvent(event, raw, group, column)).toBe(expected);
  });
});

// 32-36 Male | Combat column: exactly 60 points in every event.
const sixtyEach: AftRawScores = { MDL: 140, HRP: 13, SDC: t(2, 36), PLK: t(1, 15), "2MR": t(20, 44) };

describe("scoreAft", () => {
  const base: AftInput = { age: 34, standard: "general", gender: "M", raw: sixtyEach };

  it("passes the general standard at exactly 60 per event and 300 total", () => {
    const result = scoreAft(base);
    expect(result.events.map((e) => e.points)).toEqual([60, 60, 60, 60, 60]);
    expect(result.total).toBe(300);
    expect(result.passed).toBe(true);
    expect(result.failReasons).toEqual([]);
  });

  it("fails the combat standard below 350 total", () => {
    const result = scoreAft({ ...base, standard: "combat" });
    expect(result.passed).toBe(false);
    expect(result.failReasons).toEqual(["Total is below 350 points (300)."]);
  });

  it("fails when any event is below 60 even if the total is high", () => {
    const result = scoreAft({ ...base, raw: { ...sixtyEach, MDL: 350, HRP: 60, PLK: t(3, 25), SDC: t(2, 37) } });
    expect(result.total).toBeGreaterThanOrEqual(300);
    expect(result.passed).toBe(false);
    expect(result.failReasons).toEqual(["Sprint-Drag-Carry is below 60 points (59)."]);
  });

  it("scores ages outside 32-36 (regression: other age groups used to score 0)", () => {
    const result = scoreAft({ age: 25, standard: "general", gender: "M", raw: { ...sixtyEach, HRP: 40 } });
    expect(result.ageGroup).toBe("22-26");
    expect(result.events.find((e) => e.event === "HRP")?.points).toBe(83);
  });

  it("uses the Male | Combat column for everyone on the combat standard", () => {
    expect(getScoreColumn({ standard: "combat", gender: "F" })).toBe("M");
    expect(getScoreColumn({ standard: "combat", gender: null })).toBe("M");
    expect(getScoreColumn({ standard: "general", gender: "F" })).toBe("F");
    const female = scoreAft({ ...base, standard: "combat", gender: "F" });
    const male = scoreAft({ ...base, standard: "combat", gender: "M" });
    expect(female.events).toEqual(male.events);
  });

  it("requires sex for the general standard and a minimum age of 17", () => {
    expect(() => scoreAft({ ...base, gender: null })).toThrow();
    expect(() => scoreAft({ ...base, age: 16 })).toThrow();
  });

  it("reports every tied strongest and weakest event", () => {
    const result = scoreAft(base);
    expect(result.strongest).toHaveLength(5);
    expect(result.weakest).toHaveLength(5);
  });
});
