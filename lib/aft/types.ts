export type Gender = "M" | "F";

export type AgeGroup =
  | "17-21"
  | "22-26"
  | "27-31"
  | "32-36"
  | "37-41"
  | "42-46"
  | "47-51"
  | "52-56"
  | "57-61"
  | "62+";

export type AftEventCode = "MDL" | "HRP" | "SDC" | "PLK" | "2MR";

// "general" = combat-enabling specialties (sex- and age-normed).
// "combat" = combat specialties (sex-neutral, age-normed; uses the Male | Combat column).
export type AftStandard = "general" | "combat";

export type ScoreRow = {
  points: number;
  M: number | null;
  F: number | null;
};

export type EventScoreResult = {
  event: AftEventCode;
  raw: number;
  points: number;
};

export type TimeScoreRow = {
  points: number;
  M: number | null; // seconds
  F: number | null; // seconds
};

// Raw performance for one test. Timed events are in total seconds.
export type AftRawScores = Record<AftEventCode, number>;

export type AftInput = {
  age: number;
  standard: AftStandard;
  // Required for the general standard; ignored by the sex-neutral combat standard.
  gender: Gender | null;
  raw: AftRawScores;
};

export type AftResult = {
  ageGroup: AgeGroup;
  standard: AftStandard;
  column: Gender;
  events: EventScoreResult[];
  total: number;
  passed: boolean;
  failReasons: string[];
  strongest: EventScoreResult[];
  weakest: EventScoreResult[];
};
