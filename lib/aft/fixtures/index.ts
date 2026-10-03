// Typed access to the synthetic AFT calculator test dataset. Test-only: nothing in the app imports this folder, so
// the fixtures never reach the production bundle, saved history, or dashboard statistics.
//
// Regenerate with `node scripts/aft-fixtures/generate.mjs`. Expected values come from an independent transcription
// of the official score tables (score-tables.reference.json), not from lib/aft/scoring.ts or lib/aft/standards.ts.
import type { AftEventCode, AftStandard, AgeGroup, Gender } from "@/lib/aft/types";
import type { AftFormValues } from "@/lib/aft/validation";
import dataset from "./aft-calculator-cases.json";
import referenceTables from "./score-tables.reference.json";

export type FixtureReason =
  | { kind: "event"; event: AftEventCode; points: number; text: string }
  | { kind: "total"; total: number; threshold: number; text: string };

export type ValidScoringCase = {
  id: string;
  label: string;
  status: "valid";
  scenario: string;
  description: string;
  age: number;
  ageGroup: AgeGroup;
  sex: Gender;
  standard: AftStandard;
  scoreColumn: "Male | Combat" | "Female";
  standardVersion: string;
  // MDL in pounds, HRP in repetitions, SDC/PLK/2MR in total seconds.
  raw: Record<AftEventCode, number>;
  rawDisplay: Record<AftEventCode, string>;
  expected: { points: Record<AftEventCode, number>; total: number; passed: boolean; failReasons: FixtureReason[] };
  sources: string[];
};

export type ImpossibleScoringCase = {
  id: string;
  label: null;
  status: "impossible";
  scenario: string;
  description: string;
  ageGroup: AgeGroup;
  sex: Gender;
  standard: AftStandard;
  reason: string;
};

export type ScoringCase = ValidScoringCase | ImpossibleScoringCase;

export type EventCase = {
  id: string;
  event: AftEventCode;
  ageGroup: AgeGroup;
  column: Gender;
  raw: number;
  rawDisplay: string;
  expectedPoints: number;
  note: string;
  source: string;
};

export type TimeCase = { seconds: number; display: string; minutes: string; secondsPart: string };

export type ValidationCase = {
  id: string;
  description: string;
  values: AftFormValues;
  today: string;
  expectedOk: boolean;
  expectedErrorFields: string[];
  expectedRaw?: Partial<Record<AftEventCode, number>>;
};

export type ReferenceTables = {
  groups: AgeGroup[];
  // event -> age group -> column -> [points, value] rows (seconds for timed events)
  tables: Record<AftEventCode, Record<AgeGroup, Record<Gender, [number, number][]>>>;
};

export const scoringCases = dataset.scoringCases as ScoringCase[];
export const validScoringCases = scoringCases.filter((c): c is ValidScoringCase => c.status === "valid");
export const impossibleScoringCases = scoringCases.filter((c): c is ImpossibleScoringCase => c.status === "impossible");
export const eventCases = dataset.eventCases as EventCase[];
export const timeCases = dataset.timeCases as TimeCase[];
export const validationCases = dataset.validationCases as ValidationCase[];
export const reference = referenceTables as unknown as ReferenceTables;
