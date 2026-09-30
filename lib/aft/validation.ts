import type { AftInput, AftStandard, Gender } from "./types";
import { MIN_AFT_AGE } from "./scoring";

export type AftFormValues = {
  testDate: string; // YYYY-MM-DD, optional (defaults to today when saving)
  age: string;
  standard: AftStandard;
  gender: "" | Gender;
  deadlift: string;
  pushups: string;
  sdcMinutes: string;
  sdcSeconds: string;
  plankMinutes: string;
  plankSeconds: string;
  runMinutes: string;
  runSeconds: string;
};

export type AftFormField = keyof AftFormValues | "sdc" | "plank" | "run";

export type AftValidationResult =
  | { ok: true; input: AftInput; testDate: string | null }
  | { ok: false; errors: Partial<Record<AftFormField, string>> };

export const emptyAftForm: AftFormValues = {
  testDate: "",
  age: "",
  standard: "general",
  gender: "",
  deadlift: "",
  pushups: "",
  sdcMinutes: "",
  sdcSeconds: "",
  plankMinutes: "",
  plankSeconds: "",
  runMinutes: "",
  runSeconds: "",
};

const MAX_AGE = 99;

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// `today` is YYYY-MM-DD in the user's local time, passed in so validation stays pure.
// Without it the future-date check is skipped (used for live previews during render).
export function validateAftForm(values: AftFormValues, today?: string): AftValidationResult {
  const errors: Partial<Record<AftFormField, string>> = {};

  const testDate = values.testDate.trim();
  if (testDate) {
    if (!isValidDate(testDate)) errors.testDate = "Enter a valid date.";
    else if (today && testDate > today) errors.testDate = "Test date cannot be in the future.";
  }

  const age = parseWholeNumber(values.age);
  if (values.age.trim() === "") errors.age = "Age is required.";
  else if (age === null || age < MIN_AFT_AGE || age > MAX_AGE) {
    errors.age = `Enter a whole number from ${MIN_AFT_AGE} to ${MAX_AGE}.`;
  }

  if (values.standard !== "general" && values.standard !== "combat") {
    errors.standard = "Choose a standard.";
  }

  if (values.standard === "general" && values.gender !== "M" && values.gender !== "F") {
    errors.gender = "Sex is required for the general standard.";
  }

  const count = (field: "deadlift" | "pushups", label: string, max: number) => {
    const parsed = parseWholeNumber(values[field]);
    if (values[field].trim() === "") errors[field] = `${label} is required.`;
    else if (parsed === null || parsed > max) errors[field] = `Enter a whole number from 0 to ${max}.`;
    return parsed ?? 0;
  };

  const time = (
    field: "sdc" | "plank" | "run",
    minutesValue: string,
    secondsValue: string,
    label: string
  ) => {
    if (minutesValue.trim() === "" && secondsValue.trim() === "") {
      errors[field] = `${label} time is required.`;
      return 0;
    }
    const minutes = minutesValue.trim() === "" ? 0 : parseWholeNumber(minutesValue);
    const seconds = secondsValue.trim() === "" ? 0 : parseWholeNumber(secondsValue);
    if (minutes === null || minutes > 99) {
      errors[field] = "Minutes must be a whole number from 0 to 99.";
      return 0;
    }
    if (seconds === null || seconds > 59) {
      errors[field] = "Seconds must be a whole number from 0 to 59.";
      return 0;
    }
    const total = minutes * 60 + seconds;
    if (total === 0) errors[field] = `${label} time must be greater than 0:00.`;
    return total;
  };

  const raw = {
    MDL: count("deadlift", "Deadlift weight", 1000),
    HRP: count("pushups", "Push-ups", 300),
    SDC: time("sdc", values.sdcMinutes, values.sdcSeconds, "Sprint-drag-carry"),
    PLK: time("plank", values.plankMinutes, values.plankSeconds, "Plank"),
    "2MR": time("run", values.runMinutes, values.runSeconds, "2-mile run"),
  };

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    testDate: testDate || null,
    input: {
      age: age as number,
      standard: values.standard,
      gender: values.standard === "general" ? (values.gender as Gender) : null,
      raw,
    },
  };
}

// Today's date as YYYY-MM-DD in local time. Call from event handlers, not during render.
export function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
