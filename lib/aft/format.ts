import type { AftEventCode, AftStandard, AgeGroup, Gender } from "./types";
import { aftEventInfo } from "./scoring";
import { aftStandardRules } from "./rules";
import { formatSeconds } from "./validation";

export function formatRaw(event: AftEventCode, raw: number): string {
  const unit = aftEventInfo[event].unit;
  if (unit === "seconds") return formatSeconds(raw);
  if (unit === "pounds") return `${raw} lb`;
  return `${raw} reps`;
}

// Axis/tick form: times as m:ss, others as plain numbers.
export function formatRawShort(event: AftEventCode, raw: number): string {
  return aftEventInfo[event].unit === "seconds" ? formatSeconds(raw) : String(raw);
}

export function rawUnitLabel(event: AftEventCode): string {
  const unit = aftEventInfo[event].unit;
  if (unit === "seconds") return "time (mm:ss)";
  if (unit === "pounds") return "pounds";
  return "repetitions";
}

export type RawChange = {
  text: string;
  // true = better, false = worse, null = no change.
  improved: boolean | null;
};

// Lower sprint-drag-carry and run times are better; higher weight, reps, and plank time are better.
export function describeRawChange(event: AftEventCode, delta: number): RawChange {
  if (delta === 0) return { text: "No change", improved: null };

  const info = aftEventInfo[event];
  const improved = info.higherIsBetter ? delta > 0 : delta < 0;
  const size = Math.abs(delta);

  if (info.unit === "pounds") return { text: `${delta > 0 ? "+" : "−"}${size} lb`, improved };
  if (info.unit === "repetitions") return { text: `${delta > 0 ? "+" : "−"}${size} reps`, improved };
  if (event === "PLK") return { text: `${formatSeconds(size)} ${delta > 0 ? "longer" : "shorter"}`, improved };
  return { text: `${formatSeconds(size)} ${delta < 0 ? "faster" : "slower"}`, improved };
}

export function formatSignedPoints(delta: number): string {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Test dates are stored as YYYY-MM-DD; format them as calendar dates, not instants.
export function formatTestDate(value: string, style: "long" | "short" = "long"): string {
  const date = new Date(`${value}T00:00:00Z`);
  return (style === "long" ? longDate : shortDate).format(date);
}

const localDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

// Timestamps (saved, exported, completed) are instants; show them as the date in the reader's time zone, so an
// evening save in the U.S. is not labeled with the next day's UTC date.
export function formatInstantDate(iso: string): string {
  return localDate.format(new Date(iso));
}

export function columnLabel(column: Gender): string {
  return column === "M" ? "Male | Combat" : "Female";
}

export function describeCategory(category: { standard: AftStandard; ageGroup: AgeGroup; column: Gender }): string {
  return `${aftStandardRules[category.standard].label} · ${category.ageGroup} · ${columnLabel(category.column)}`;
}
