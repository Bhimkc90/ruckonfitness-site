import type { AgeGroup, Gender, ScoreRow } from "./types";
import { mdlStandards, hrpStandards, sdcStandards, plankStandards, twoMileRunStandards } from "./standards";

export function getAgeGroup(age: number): AgeGroup {
  if (age <= 21) return "17-21";
  if (age <= 26) return "22-26";
  if (age <= 31) return "27-31";
  if (age <= 36) return "32-36";
  if (age <= 41) return "37-41";
  if (age <= 46) return "42-46";
  if (age <= 51) return "47-51";
  if (age <= 56) return "52-56";
  if (age <= 61) return "57-61";
  return "62+";
}

export function scoreHigherIsBetter(
  rawValue: number,
  rows: ScoreRow[],
  gender: Gender
): number {
  const sorted = [...rows].sort((a, b) => b.points - a.points);

  for (const row of sorted) {
    const requiredValue = row[gender];

    if (requiredValue !== null && rawValue >= requiredValue) {
      return row.points;
    }
  }

  return 0;
}


export function calculateMdlScore({
  age,
  gender,
  weight,
}: {
  age: number;
  gender: Gender;
  weight: number;
}) {
  const ageGroup = getAgeGroup(age);
  const rows = mdlStandards[ageGroup];

  return scoreHigherIsBetter(weight, rows, gender);
}


export function calculateHrpScore({
    age,
    gender,
    reps,
  }: {
    age: number;
    gender: Gender;
    reps: number;
  }) {
    const ageGroup = getAgeGroup(age);
    const rows = hrpStandards[ageGroup];
  
    return scoreHigherIsBetter(reps, rows, gender);
  }
  

  export function scoreLowerIsBetter(
    rawSeconds: number,
    rows: { points: number; M: number | null; F: number | null }[],
    gender: Gender
  ): number {
    const sorted = [...rows].sort((a, b) => b.points - a.points);
  
    for (const row of sorted) {
      const requiredSeconds = row[gender];
  
      if (requiredSeconds !== null && rawSeconds <= requiredSeconds) {
        return row.points;
      }
    }
  
    return 0;
  }
  
  export function calculateSdcScore({
    age,
    gender,
    seconds,
  }: {
    age: number;
    gender: Gender;
    seconds: number;
  }) {
    const ageGroup = getAgeGroup(age);
    const rows = sdcStandards[ageGroup];
  
    return scoreLowerIsBetter(seconds, rows, gender);
  }




  export function calculatePlankScore({
    age,
    gender,
    seconds,
  }: {
    age: number;
    gender: Gender;
    seconds: number;
  }) {
    const ageGroup = getAgeGroup(age);
    const rows = plankStandards[ageGroup];
  
    return scoreHigherIsBetter(seconds, rows, gender);
  }


  export function calculateTwoMileRunScore({
    age,
    gender,
    seconds,
  }: {
    age: number;
    gender: Gender;
    seconds: number;
  }) {
    const ageGroup = getAgeGroup(age);
    const rows = twoMileRunStandards[ageGroup];
  
    return scoreLowerIsBetter(seconds, rows, gender);
  }