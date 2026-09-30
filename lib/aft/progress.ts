import type { AftEventCode, AftResult, AftStandard, AgeGroup, Gender } from "./types";
import type { SavedAftResult } from "@/lib/storage/aftResults";
import { aftEventOrder } from "./scoring";
import { aftStandardRules } from "./rules";
import { columnLabel, formatTestDate } from "./format";

export type ScoringCategory = { standard: AftStandard; ageGroup: AgeGroup; column: Gender };

export function categoryOf(result: AftResult): ScoringCategory {
  return { standard: result.standard, ageGroup: result.ageGroup, column: result.column };
}

// Points are only directly comparable when the same table and pass rule were used.
export function sameCategory(a: AftResult, b: AftResult): boolean {
  return a.standard === b.standard && a.ageGroup === b.ageGroup && a.column === b.column;
}

export function describeCategoryChange(from: AftResult, to: AftResult): string[] {
  const changes: string[] = [];
  if (from.standard !== to.standard) {
    changes.push(
      `Standard changed from ${aftStandardRules[from.standard].label} to ${aftStandardRules[to.standard].label}`
    );
  } else if (from.column !== to.column) {
    changes.push(`Score column changed from ${columnLabel(from.column)} to ${columnLabel(to.column)}`);
  }
  if (from.ageGroup !== to.ageGroup) {
    changes.push(`Age group changed from ${from.ageGroup} to ${to.ageGroup}`);
  }
  return changes;
}

// Oldest first. Same-day tests keep the order they were saved in.
export function sortByTestDate(results: SavedAftResult[]): SavedAftResult[] {
  return [...results].sort(
    (a, b) =>
      a.testDate.localeCompare(b.testDate) ||
      a.savedAt.localeCompare(b.savedAt) ||
      a.id.localeCompare(b.id)
  );
}

export type EventProgress = {
  event: AftEventCode;
  points: number;
  raw: number;
  // Against the previous comparable test (same standard, age group, and column).
  pointsChange: number | null;
  // Against the previous test of any category; raw performance is always the same measure.
  rawChange: number | null;
};

export type TestProgress = {
  record: SavedAftResult;
  index: number;
  previous: SavedAftResult | null;
  previousComparable: SavedAftResult | null;
  // How this test's scoring category differs from the immediately previous test.
  categoryChanges: string[];
  totalChange: number | null;
  events: EventProgress[];
  // 1-based position among tests on the same date, and how many share that date.
  sameDayIndex: number;
  sameDayCount: number;
};

export function buildProgress(results: SavedAftResult[]): TestProgress[] {
  const ordered = sortByTestDate(results);

  return ordered.map((record, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    const previousComparable =
      ordered
        .slice(0, index)
        .reverse()
        .find((item) => sameCategory(item.result, record.result)) ?? null;

    const sameDay = ordered.filter((item) => item.testDate === record.testDate);

    return {
      record,
      index,
      previous,
      previousComparable,
      categoryChanges: previous ? describeCategoryChange(previous.result, record.result) : [],
      totalChange: previousComparable ? record.result.total - previousComparable.result.total : null,
      events: aftEventOrder.map((event) => {
        const current = record.result.events.find((item) => item.event === event);
        const comparable = previousComparable?.result.events.find((item) => item.event === event);
        const before = previous?.result.events.find((item) => item.event === event);
        const points = current?.points ?? 0;
        const raw = current?.raw ?? 0;
        return {
          event,
          points,
          raw,
          pointsChange: comparable ? points - comparable.points : null,
          rawChange: before ? raw - before.raw : null,
        };
      }),
      sameDayIndex: sameDay.indexOf(record) + 1,
      sameDayCount: sameDay.length,
    };
  });
}

export function testLabel(progress: Pick<TestProgress, "record" | "sameDayIndex" | "sameDayCount">, style: "long" | "short" = "long") {
  const date = formatTestDate(progress.record.testDate, style);
  return progress.sameDayCount > 1 ? `${date} (${progress.sameDayIndex} of ${progress.sameDayCount})` : date;
}

// Consecutive tests in the same scoring category share a segment; a new segment starts
// whenever the category changes so charts never draw a line between unlike point totals.
export function assignSegments(progress: TestProgress[]): number[] {
  let segment = 0;
  return progress.map((item, index) => {
    if (index > 0 && item.categoryChanges.length > 0) segment += 1;
    return segment;
  });
}

export type DashboardSummary = {
  latest: TestProgress;
  testCount: number;
  // True when the test right before the latest one used a different scoring category.
  previousNotComparable: boolean;
};

export function summarize(progress: TestProgress[]): DashboardSummary | null {
  if (progress.length === 0) return null;
  const latest = progress[progress.length - 1];
  return {
    latest,
    testCount: progress.length,
    previousNotComparable: latest.previous !== null && latest.categoryChanges.length > 0,
  };
}
