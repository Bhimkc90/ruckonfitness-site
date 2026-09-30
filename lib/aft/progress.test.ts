import { describe, expect, it } from "vitest";
import { scoreAft } from "./scoring";
import { assignSegments, buildProgress, sortByTestDate, summarize, testLabel } from "./progress";
import { describeRawChange, formatSignedPoints, formatTestDate } from "./format";
import { findDuplicate, type SavedAftResult } from "@/lib/storage/aftResults";
import type { AftInput } from "./types";

const t = (minutes: number, seconds: number) => minutes * 60 + seconds;

const baseInput: AftInput = {
  age: 25,
  standard: "general",
  gender: "F",
  raw: { MDL: 180, HRP: 30, SDC: t(2, 15), PLK: t(3, 5), "2MR": t(19, 30) },
};

let counter = 0;
function record(
  testDate: string,
  overrides: Omit<Partial<AftInput>, "raw"> & { raw?: Partial<AftInput["raw"]> } = {},
  savedAt?: string
): SavedAftResult {
  counter += 1;
  const input: AftInput = { ...baseInput, ...overrides, raw: { ...baseInput.raw, ...overrides.raw } };
  return {
    id: `id-${counter}`,
    savedAt: savedAt ?? `2026-09-30T12:00:${String(counter).padStart(2, "0")}.000Z`,
    testDate,
    scoringVersion: "AFT_Scoring_Scales_250601.pdf",
    input,
    result: scoreAft(input),
  };
}

describe("describeRawChange", () => {
  it("treats lower sprint-drag-carry and run times as improvement", () => {
    expect(describeRawChange("SDC", -5)).toEqual({ text: "0:05 faster", improved: true });
    expect(describeRawChange("SDC", 3)).toEqual({ text: "0:03 slower", improved: false });
    expect(describeRawChange("2MR", -75)).toEqual({ text: "1:15 faster", improved: true });
    expect(describeRawChange("2MR", 20)).toEqual({ text: "0:20 slower", improved: false });
  });

  it("treats a longer plank as improvement", () => {
    expect(describeRawChange("PLK", 15)).toEqual({ text: "0:15 longer", improved: true });
    expect(describeRawChange("PLK", -10)).toEqual({ text: "0:10 shorter", improved: false });
  });

  it("treats more weight and reps as improvement", () => {
    expect(describeRawChange("MDL", 10)).toEqual({ text: "+10 lb", improved: true });
    expect(describeRawChange("MDL", -20)).toEqual({ text: "−20 lb", improved: false });
    expect(describeRawChange("HRP", 3)).toEqual({ text: "+3 reps", improved: true });
    expect(describeRawChange("HRP", 0)).toEqual({ text: "No change", improved: null });
  });
});

describe("formatting", () => {
  it("formats calendar dates without timezone drift", () => {
    expect(formatTestDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatTestDate("2026-09-29", "short")).toBe("Sep 29");
  });

  it("signs point changes", () => {
    expect(formatSignedPoints(4)).toBe("+4");
    expect(formatSignedPoints(-3)).toBe("−3");
    expect(formatSignedPoints(0)).toBe("0");
  });
});

describe("sortByTestDate", () => {
  it("orders by test date, then by save time for same-day tests", () => {
    const late = record("2026-09-20", {}, "2026-09-20T18:00:00.000Z");
    const early = record("2026-09-20", {}, "2026-09-20T08:00:00.000Z");
    const older = record("2026-08-01", {}, "2026-09-25T08:00:00.000Z");
    expect(sortByTestDate([late, older, early]).map((r) => r.id)).toEqual([older.id, early.id, late.id]);
  });
});

describe("buildProgress", () => {
  it("returns nothing for no records and a single test with no changes", () => {
    expect(buildProgress([])).toEqual([]);
    expect(summarize([])).toBeNull();

    const [only] = buildProgress([record("2026-09-01")]);
    expect(only.previous).toBeNull();
    expect(only.totalChange).toBeNull();
    expect(only.events.every((e) => e.pointsChange === null && e.rawChange === null)).toBe(true);
  });

  it("compares totals and event points with the previous comparable test", () => {
    const first = record("2026-08-01");
    const second = record("2026-09-01", { raw: { MDL: 190, SDC: t(2, 10) } });
    const progress = buildProgress([second, first]);
    const latest = progress[1];

    expect(latest.record.id).toBe(second.id);
    expect(latest.previousComparable?.id).toBe(first.id);
    expect(latest.totalChange).toBe(second.result.total - first.result.total);
    const mdl = latest.events.find((e) => e.event === "MDL");
    expect(mdl?.rawChange).toBe(10);
    expect(mdl?.pointsChange).toBe(
      (second.result.events.find((e) => e.event === "MDL")?.points ?? 0) -
        (first.result.events.find((e) => e.event === "MDL")?.points ?? 0)
    );
    expect(latest.events.find((e) => e.event === "SDC")?.rawChange).toBe(-5);
  });

  it("does not compare points across a standard or age-group change, and labels the change", () => {
    const general = record("2026-07-01");
    const combat = record("2026-08-01", { standard: "combat", gender: null });
    const older = record("2026-09-01", { standard: "combat", gender: null, age: 27 });
    const progress = buildProgress([general, combat, older]);

    expect(progress[1].previousComparable).toBeNull();
    expect(progress[1].totalChange).toBeNull();
    expect(progress[1].categoryChanges).toEqual(["Standard changed from General to Combat"]);
    // Raw performance is still compared with the previous test.
    expect(progress[1].events.find((e) => e.event === "MDL")?.rawChange).toBe(0);

    expect(progress[2].categoryChanges).toEqual(["Age group changed from 22-26 to 27-31"]);
    expect(progress[2].totalChange).toBeNull();

    expect(assignSegments(progress)).toEqual([0, 1, 2]);
    expect(summarize(progress)?.previousNotComparable).toBe(true);
  });

  it("finds the last comparable test even when an unlike test sits between", () => {
    const a = record("2026-06-01");
    const b = record("2026-07-01", { standard: "combat", gender: null });
    const c = record("2026-08-01", { raw: { HRP: 35 } });
    const progress = buildProgress([a, b, c]);
    expect(progress[2].previousComparable?.id).toBe(a.id);
    expect(progress[2].totalChange).toBe(c.result.total - a.result.total);
    expect(progress[2].categoryChanges).toEqual(["Standard changed from Combat to General"]);
    expect(assignSegments(progress)).toEqual([0, 1, 2]);
  });

  it("keeps same-category tests in one segment and labels same-day tests", () => {
    const a = record("2026-09-20", {}, "2026-09-20T08:00:00.000Z");
    const b = record("2026-09-20", { raw: { HRP: 31 } }, "2026-09-20T09:00:00.000Z");
    const progress = buildProgress([b, a]);
    expect(assignSegments(progress)).toEqual([0, 0]);
    expect(testLabel(progress[0])).toBe("Sep 20, 2026 (1 of 2)");
    expect(testLabel(progress[1], "short")).toBe("Sep 20 (2 of 2)");
  });
});

describe("findDuplicate", () => {
  it("matches only the same date and identical entries", () => {
    const saved = record("2026-09-01");
    expect(findDuplicate([saved], { testDate: "2026-09-01", input: saved.input })?.id).toBe(saved.id);
    expect(findDuplicate([saved], { testDate: "2026-09-02", input: saved.input })).toBeUndefined();
    expect(
      findDuplicate([saved], { testDate: "2026-09-01", input: { ...saved.input, raw: { ...saved.input.raw, HRP: 31 } } })
    ).toBeUndefined();
  });
});
