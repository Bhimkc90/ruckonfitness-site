import type { AftEventCode } from "./types";

// Largest values the calculator form accepts (lib/aft/validation.ts): whole numbers only, times above 0:00 and
// at most 99:59. Shared by backup import and the explanation endpoint so stored and submitted entries are held to
// the same limits as typed ones.
export const RAW_LIMITS: Record<AftEventCode, { min: number; max: number }> = {
  MDL: { min: 0, max: 1000 },
  HRP: { min: 0, max: 300 },
  SDC: { min: 1, max: 99 * 60 + 59 },
  PLK: { min: 1, max: 99 * 60 + 59 },
  "2MR": { min: 1, max: 99 * 60 + 59 },
};

export const isWithin = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
