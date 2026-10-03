import { useSyncExternalStore } from "react";

// Whether the user has agreed to send results for AI explanations, in this browser only. Bumping the version asks
// again (for example if the data sent or the provider changes).
export const AI_CONSENT_KEY = "ruckon.aiConsent";
export const AI_CONSENT_VERSION = 1;
const EVENT = "ruckon:ai-consent-changed";

function read(): boolean {
  try {
    const value = JSON.parse(window.localStorage.getItem(AI_CONSENT_KEY) ?? "null");
    return !!value && value.version === AI_CONSENT_VERSION;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useAiConsent(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function setAiConsent(granted: boolean) {
  try {
    if (granted) window.localStorage.setItem(AI_CONSENT_KEY, JSON.stringify({ version: AI_CONSENT_VERSION, grantedAt: new Date().toISOString() }));
    else window.localStorage.removeItem(AI_CONSENT_KEY);
  } catch {
    // Storage unavailable: consent is asked again next time.
  }
  window.dispatchEvent(new Event(EVENT));
}
