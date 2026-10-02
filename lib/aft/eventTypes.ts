import type { AftEventCode } from "./types";

export type AftEventCommand = {
  command: string;
  description?: string;
};

export type AftExecutionPhase = {
  id: string;
  title: string;
  command?: string;
  instructions: string[];
};

export type AftEventRules = {
  allowed: string[];
  // Movement errors that make a repetition or attempt not count.
  faults: string[];
  termination: string[];
  // Only safety guidance the cited source supports.
  safetyTips: string[];
  considerations: string[];
};

export type AftEventScoring = {
  rawUnit: "pounds" | "repetitions" | "seconds";
  displayUnit: string;
  higherIsBetter: boolean;
  minimumPoints: number;
  maximumPoints: number;
};

export type AftEventPerformance = {
  // Components of fitness named by the Army source.
  fitnessComponents: string[];
  // Anatomical explanation written by RuckOn; not an Army statement.
  primaryMuscles: string[];
  secondaryMuscles: string[];
  // Movement patterns involved (RuckOn description).
  trainingFocus: string[];
};

export type AftEventEquipment = {
  name: string;
  description?: string;
  quantity?: number;
};

export type AftEventMedia = {
  image?: string;
  video?: string;
  animation?: string;
};

export type AftEventSource = {
  title: string;
  type: "Army" | "RuckOn";
  reference?: string;
  date?: string;
  url?: string;
};

// Section-level citations, e.g. "ATP 7-22.01, paras 2-41–2-43, p. 26".
export type AftEventSection =
  | "measures"
  | "equipment"
  | "setup"
  | "commands"
  | "startingPosition"
  | "execution"
  | "completion"
  | "faults"
  | "termination"
  | "grading"
  | "safety"
  | "allowed";

export type AftEventVideo = {
  url: string;
  title: string; // title as published
  channel: string;
  note: string;
};

export type AftEvent = {
  code: AftEventCode;
  slug: string;

  name: string;
  shortName: string;

  description: string;
  purpose: string;

  rawScoreLabel: string;

  equipment: AftEventEquipment[];
  setup: string[];

  commands: AftEventCommand[];
  execution: AftExecutionPhase[];

  rules: AftEventRules;

  scoring: AftEventScoring;

  performance: AftEventPerformance;

  media: AftEventMedia;

  sources: AftEventSource[];

  // Additions for the AFT Guide.
  order?: number;
  startingPosition?: string;
  completion?: string[];
  grading?: { procedure: string[]; responsibilities: string[] };
  // null when the source gives no breathing guidance for the event.
  breathing?: string | null;
  refs?: Partial<Record<AftEventSection, string>>;
  video?: AftEventVideo;
  // Inconsistencies in the source, stated rather than resolved.
  discrepancies?: string[];
};
