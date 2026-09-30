import { useSyncExternalStore } from "react";
import { PROFILE_SCHEMA_VERSION, parseProfile, type SoldierProfile } from "@/lib/profile/profile";

// The profile lives in its own key, only in this browser. It is separate from AFT history
// (ruckon.aftResults) and training plans (ruckon.trainingPlans); saving or deleting it never touches those.
export const PROFILE_KEY = "ruckon.profile";
export const PROFILE_EVENT = "ruckon:profile-changed";
const CHANGE_EVENT = PROFILE_EVENT;

let cachedRaw: string | null | undefined;
let cachedProfile: SoldierProfile | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): SoldierProfile | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = parseProfile(raw);
  }
  return cachedProfile;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function saveProfile(profile: SoldierProfile): { ok: true } | { ok: false; error: string } {
  if (profile.schemaVersion !== PROFILE_SCHEMA_VERSION) return { ok: false, error: "Unsupported profile version." };
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save on this device. Browser storage may be full or disabled." };
  }
}

// Removes only the profile. AFT results and training plans are kept.
export function deleteProfile(): { ok: true } | { ok: false; error: string } {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the profile from this browser." };
  }
}

export function useProfile(): SoldierProfile | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
