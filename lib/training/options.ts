import type { EquipmentOption, Experience, Restriction, RunningVolume } from "./types";

// Answer labels shared by the training-plan wizard and the Soldier profile.
export const experienceOptions: { value: Experience; label: string; hint: string }[] = [
  { value: "new", label: "New or returning", hint: "Little or no structured training in the last 3 months" },
  { value: "some", label: "Some", hint: "Training 1–2 times a week" },
  { value: "regular", label: "Regular", hint: "Training 3 or more times a week for 3+ months" },
];

export const runningOptions: { value: RunningVolume; label: string }[] = [
  { value: "none", label: "None" },
  { value: "up-to-30", label: "Up to 30 minutes a week" },
  { value: "31-60", label: "31–60 minutes a week" },
  { value: "61-120", label: "61–120 minutes a week" },
  { value: "over-120", label: "More than 120 minutes a week" },
];

export const equipmentOptions: { value: EquipmentOption; label: string }[] = [
  { value: "kettlebell", label: "Kettlebells" },
  { value: "dumbbell", label: "Dumbbells" },
  { value: "barbell-or-hex-bar", label: "Barbell or hex bar with plates" },
];

export const restrictionOptions: { value: Restriction; label: string }[] = [
  { value: "no-running", label: "Running" },
  { value: "no-jumping", label: "Jumping or bounding" },
  { value: "no-loaded-lifting", label: "Lifting weights" },
  { value: "no-weight-on-hands", label: "Putting weight on my hands (push-ups, hands-and-knees positions)" },
];
