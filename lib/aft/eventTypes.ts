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
  faults: string[];
  termination: string[];
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
  fitnessComponents: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
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
};