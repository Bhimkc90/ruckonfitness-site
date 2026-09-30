import type { AftStandard } from "./types";

export type AftStandardRule = {
  label: string;
  description: string;
  minEventPoints: number;
  minTotalPoints: number;
};

// Source: "Army establishes new fitness test of record to strengthen readiness and lethality",
// army.mil, 21 April 2025 (https://www.army.mil/article/284799), and https://www.army.mil/aft/.
// Combat standard effective 1 January 2026 (active component) and 1 June 2026 (Reserve and National Guard).
export const aftStandardRules: Record<AftStandard, AftStandardRule> = {
  general: {
    label: "General",
    description: "Combat-enabling specialties. Sex- and age-normed.",
    minEventPoints: 60,
    minTotalPoints: 300,
  },
  combat: {
    label: "Combat",
    description: "Combat specialties. Sex-neutral and age-normed.",
    minEventPoints: 60,
    minTotalPoints: 350,
  },
};

export const aftRulesSource = {
  title: "Army establishes new fitness test of record to strengthen readiness and lethality",
  publisher: "army.mil",
  date: "2025-04-21",
  url: "https://www.army.mil/article/284799",
};
