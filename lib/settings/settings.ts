import type { AftEventCode } from "@/lib/aft/types";

// App preferences. Only settings the app actually applies are stored here. Soldier demographics and
// training preferences stay in the profile, and the training-plan release flag is deployment configuration.

export const SETTINGS_SCHEMA_VERSION = 1;

// Destinations that exist in the app. The landing page is only ever chosen from this list.
export const LANDING_PAGES = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/aft-calculator", label: "Record AFT" },
  { href: "/aft-guide", label: "AFT Guide" },
  { href: "/score-history", label: "History" },
  { href: "/workouts", label: "Library" },
  { href: "/training-plan", label: "Training plans" },
  { href: "/profile", label: "Profile" },
] as const;

export type LandingPage = (typeof LANDING_PAGES)[number]["href"];
export type TrendView = "points" | "raw";

export const TREND_EVENTS: AftEventCode[] = ["MDL", "HRP", "SDC", "PLK", "2MR"];

export type AppSettings = {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  updatedAt: string; // ISO timestamp
  landingPage: LandingPage;
  // Dashboard event-trend chart: what it shows first.
  trendView: TrendView;
  trendEvent: AftEventCode;
};

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  updatedAt: "",
  landingPage: "/dashboard",
  trendView: "points",
  trendEvent: "MDL",
};

const isLanding = (v: unknown): v is LandingPage => LANDING_PAGES.some((p) => p.href === v);

// Strict: returns null unless every field is present and valid, so a bad value is never guessed.
export function parseSettingsValue(data: unknown): AppSettings | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.schemaVersion !== SETTINGS_SCHEMA_VERSION) return null;
  if (typeof d.updatedAt !== "string" || !isLanding(d.landingPage)) return null;
  if (d.trendView !== "points" && d.trendView !== "raw") return null;
  if (!TREND_EVENTS.includes(d.trendEvent as AftEventCode)) return null;
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: d.updatedAt,
    landingPage: d.landingPage,
    trendView: d.trendView,
    trendEvent: d.trendEvent as AftEventCode,
  };
}

export function parseSettings(raw: string | null): AppSettings | null {
  if (!raw) return null;
  try {
    return parseSettingsValue(JSON.parse(raw));
  } catch {
    return null;
  }
}
