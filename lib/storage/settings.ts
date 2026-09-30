import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from "@/lib/settings/settings";

// App preferences live in their own key, only in this browser.
export const SETTINGS_KEY = "ruckon.settings";
export const SETTINGS_EVENT = "ruckon:settings-changed";

let cachedRaw: string | null | undefined;
let cachedSettings: AppSettings | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return null;
  }
}

// The saved settings, or null when none are saved (defaults apply).
function getSnapshot(): AppSettings | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSettings = parseSettings(raw);
  }
  return cachedSettings;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SETTINGS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SETTINGS_EVENT, onChange);
  };
}

export function saveSettings(changes: Partial<Omit<AppSettings, "schemaVersion" | "updatedAt">>): { ok: true } | { ok: false; error: string } {
  const next: AppSettings = { ...(getSnapshot() ?? DEFAULT_SETTINGS), ...changes, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save on this device. Browser storage may be full or disabled." };
  }
}

export function useSavedSettings(): AppSettings | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

// Saved settings with defaults filled in.
export function useSettings(): AppSettings {
  return useSavedSettings() ?? DEFAULT_SETTINGS;
}
