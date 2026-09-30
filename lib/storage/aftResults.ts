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

function sameInput(a: AftInput, b: AftInput): boolean {
  return (
    a.age === b.age &&
    a.standard === b.standard &&
    a.gender === b.gender &&
    (Object.keys(a.raw) as (keyof AftInput["raw"])[]).every((event) => a.raw[event] === b.raw[event])
  );
}

// An identical test (same date and same entries) that is already saved.
export function findDuplicate(
  results: SavedAftResult[],
  entry: { testDate: string; input: AftInput }
): SavedAftResult | undefined {
  return results.find((item) => item.testDate === entry.testDate && sameInput(item.input, entry.input));
}

export function saveAftResult(entry: { testDate: string; input: AftInput; result: AftResult }):
  | { ok: true; record: SavedAftResult }
  | { ok: false; error: string; duplicate?: SavedAftResult } {
  const duplicate = findDuplicate(getSnapshot(), entry);
  if (duplicate) {
    return { ok: false, error: "This test is already saved.", duplicate };
  }

  const record: SavedAftResult = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    scoringVersion: aftScoringFile.fileName,
    ...entry,
  };
  const written = write([...getSnapshot(), record]);
  return written.ok ? { ok: true, record } : written;
}

export function deleteAftResult(id: string) {
  return write(getSnapshot().filter((item) => item.id !== id));
}

export function useAftResults(): SavedAftResult[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

// False during server rendering and hydration, true once browser storage can be read.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
