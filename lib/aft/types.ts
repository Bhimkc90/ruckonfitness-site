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