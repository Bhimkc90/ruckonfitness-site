import { AFT_RESULTS_EVENT, AFT_RESULTS_KEY, AFT_RESULTS_SCHEMA_VERSION, parseAftResults } from "./aftResults";
import { TRAINING_EVENT, TRAINING_KEY, parseTrainingData } from "./trainingPlans";
import { PROFILE_EVENT, PROFILE_KEY } from "./profile";
import { SETTINGS_EVENT, SETTINGS_KEY } from "./settings";
import { parseProfile } from "@/lib/profile/profile";
import { parseSettings } from "@/lib/settings/settings";
import type { LocalData } from "@/lib/backup/backup";

// Every key RuckOn writes. Deleting app data removes only these keys, never other browser storage.
export type DataSection = "aftResults" | "training" | "profile" | "settings";

export const DATA_SECTIONS: Record<DataSection, { key: string; event: string; label: string }> = {
  aftResults: { key: AFT_RESULTS_KEY, event: AFT_RESULTS_EVENT, label: "AFT history" },
  training: { key: TRAINING_KEY, event: TRAINING_EVENT, label: "Training plans and completed workouts" },
  profile: { key: PROFILE_KEY, event: PROFILE_EVENT, label: "Profile" },
  settings: { key: SETTINGS_KEY, event: SETTINGS_EVENT, label: "App preferences" },
};

const SECTIONS = Object.keys(DATA_SECTIONS) as DataSection[];

type Result = { ok: true } | { ok: false; error: string };

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readLocalData(): LocalData {
  return {
    aftResults: parseAftResults(readRaw(AFT_RESULTS_KEY)),
    training: parseTrainingData(readRaw(TRAINING_KEY)),
    profile: parseProfile(readRaw(PROFILE_KEY)),
    settings: parseSettings(readRaw(SETTINGS_KEY)),
  };
}

// Bytes used by each section (UTF-16, as browsers count localStorage).
export function storageSizes(): Record<DataSection, number> {
  return Object.fromEntries(SECTIONS.map((s) => [s, (readRaw(DATA_SECTIONS[s].key)?.length ?? 0) * 2])) as Record<DataSection, number>;
}

function notify(sections: DataSection[]) {
  for (const s of sections) window.dispatchEvent(new Event(DATA_SECTIONS[s].event));
}

// Writes all sections together. If any write fails, every key is restored to what it was before.
export function writeLocalData(data: LocalData): Result {
  const nextRaw: Record<DataSection, string | null> = {
    aftResults: data.aftResults.length ? JSON.stringify({ schemaVersion: AFT_RESULTS_SCHEMA_VERSION, results: data.aftResults }) : null,
    training: data.training.plans.length || data.training.completions.length ? JSON.stringify(data.training) : null,
    profile: data.profile ? JSON.stringify(data.profile) : null,
    settings: data.settings ? JSON.stringify(data.settings) : null,
  };
  const previous = Object.fromEntries(SECTIONS.map((s) => [s, readRaw(DATA_SECTIONS[s].key)])) as Record<DataSection, string | null>;
  try {
    for (const s of SECTIONS) {
      const value = nextRaw[s];
      if (value === null) window.localStorage.removeItem(DATA_SECTIONS[s].key);
      else window.localStorage.setItem(DATA_SECTIONS[s].key, value);
    }
  } catch {
    try {
      for (const s of SECTIONS) {
        const value = previous[s];
        if (value === null) window.localStorage.removeItem(DATA_SECTIONS[s].key);
        else window.localStorage.setItem(DATA_SECTIONS[s].key, value);
      }
    } catch {
      // Restoring the previous values failed too; report the original problem.
    }
    notify(SECTIONS);
    return { ok: false, error: "Could not save the imported data. Browser storage may be full or disabled. Nothing was changed." };
  }
  notify(SECTIONS);
  return { ok: true };
}

export function deleteSections(sections: DataSection[]): Result {
  try {
    for (const s of sections) window.localStorage.removeItem(DATA_SECTIONS[s].key);
    notify(sections);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete data from this browser." };
  }
}
