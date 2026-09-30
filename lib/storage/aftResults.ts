import { useSyncExternalStore } from "react";
import type { AftInput, AftResult } from "@/lib/aft/types";
import { aftScoringFile } from "@/lib/aft/scoringFile";

// Results are stored only in this browser (prototype). No account or cloud copy exists.
const STORAGE_KEY = "ruckon.aftResults";
const SCHEMA_VERSION = 1;
const CHANGE_EVENT = "ruckon:aft-results-changed";

export type SavedAftResult = {
  id: string;
  savedAt: string; // ISO timestamp
  testDate: string; // YYYY-MM-DD
  scoringVersion: string; // score table file used to calculate `result`
  input: AftInput;
  result: AftResult;
};

type StoredData = {
  schemaVersion: number;
  results: SavedAftResult[];
};

const EMPTY: SavedAftResult[] = [];

let cachedRaw: string | null | undefined;
let cachedResults: SavedAftResult[] = EMPTY;

function isSavedResult(value: unknown): value is SavedAftResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedAftResult>;
  return (
    typeof item.id === "string" &&
    typeof item.savedAt === "string" &&
    typeof item.testDate === "string" &&
    typeof item.scoringVersion === "string" &&
    !!item.input &&
    !!item.result &&
    typeof item.result.total === "number" &&
    Array.isArray(item.result.events)
  );
}

function parse(raw: string | null): SavedAftResult[] {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<StoredData>;
    if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.results)) return EMPTY;
    return data.results.filter(isSavedResult);
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): SavedAftResult[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedResults = parse(raw);
  }
  return cachedResults;
}

function getServerSnapshot(): SavedAftResult[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(results: SavedAftResult[]): { ok: true } | { ok: false; error: string } {
  try {
    const data: StoredData = { schemaVersion: SCHEMA_VERSION, results };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save on this device. Browser storage may be full or disabled." };
  }
}

export function saveAftResult(entry: { testDate: string; input: AftInput; result: AftResult }) {
  const record: SavedAftResult = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    scoringVersion: aftScoringFile.fileName,
    ...entry,
  };
  return write([...getSnapshot(), record]);
}

export function deleteAftResult(id: string) {
  return write(getSnapshot().filter((item) => item.id !== id));
}

// Oldest first, by test date then save time.
export function sortByTestDate(results: SavedAftResult[]): SavedAftResult[] {
  return [...results].sort(
    (a, b) => a.testDate.localeCompare(b.testDate) || a.savedAt.localeCompare(b.savedAt)
  );
}

export function useAftResults(): SavedAftResult[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
