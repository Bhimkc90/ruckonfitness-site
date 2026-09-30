"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import type { AftEventCode } from "@/lib/aft/types";
import type { DrillId, Equipment, Phase, Purpose } from "@/lib/library/types";
import {
  aftEventLabels,
  drillHref,
  drillMemberships,
  drills,
  emptyFilters,
  equipmentLabels,
  exerciseHref,
  filterDrills,
  filterExercises,
  hasActiveFilters,
  impactLabels,
  phaseLabels,
  purposeLabels,
  type LibraryFilters,
} from "@/lib/library";
import { buttonClass } from "@/components/ui/Button";
import { Tag } from "./LibraryBits";

type View = "exercises" | "drills";

const selectClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

export default function LibraryBrowser() {
  const [filters, setFilters] = useState<LibraryFilters>(emptyFilters);
  const [view, setView] = useState<View>("exercises");

  const set = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const exerciseResults = filterExercises(filters);
  const drillResults = filterDrills(filters);
  const count = view === "exercises" ? exerciseResults.length : drillResults.length;
  const active = hasActiveFilters(filters);

  return (
    <div className="space-y-5">
      <section aria-label="Search and filters" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <label className="block text-sm">
          <span className="text-ink-2">Search</span>
          <span className="relative mt-1.5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Exercise, drill, or body area"
              className="w-full rounded-lg border border-line-strong bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-2/60 focus:border-accent focus:outline-none"
            />
          </span>
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm">
            <span className="text-ink-2">Drill</span>
            <select value={filters.drill} onChange={(e) => set("drill", e.target.value as DrillId | "all")} className={selectClass}>
              <option value="all">All drills</option>
              {drills.map((drill) => (
                <option key={drill.id} value={drill.id}>
                  {drill.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Purpose</span>
            <select value={filters.purpose} onChange={(e) => set("purpose", e.target.value as Purpose | "all")} className={selectClass}>
              <option value="all">Any purpose</option>
              {(Object.keys(purposeLabels) as Purpose[]).map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purposeLabels[purpose]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Session phase</span>
            <select value={filters.phase} onChange={(e) => set("phase", e.target.value as Phase | "all")} className={selectClass}>
              <option value="all">Any phase</option>
              {(Object.keys(phaseLabels) as Phase[]).map((phase) => (
                <option key={phase} value={phase}>
                  {phaseLabels[phase]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Equipment</span>
            <select
              value={filters.equipment}
              onChange={(e) => set("equipment", e.target.value as Equipment | "all")}
              className={selectClass}
            >
              <option value="all">Any equipment</option>
              {(Object.keys(equipmentLabels) as Equipment[]).map((equipment) => (
                <option key={equipment} value={equipment}>
                  {equipmentLabels[equipment]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">AFT event (app mapping)</span>
            <select
              value={filters.aftEvent}
              onChange={(e) => set("aftEvent", e.target.value as AftEventCode | "all")}
              className={selectClass}
            >
              <option value="all">Any event</option>
              {(Object.keys(aftEventLabels) as AftEventCode[]).map((event) => (
                <option key={event} value={event}>
                  {aftEventLabels[event]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="View" className="flex rounded-lg border border-line-strong p-0.5">
            {(["exercises", "drills"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === value ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {value === "exercises" ? "Exercises" : "Drills"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-ink-2" aria-live="polite">
              {count} {view === "exercises" ? (count === 1 ? "exercise" : "exercises") : count === 1 ? "drill" : "drills"}
            </p>
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              disabled={!active}
              className={buttonClass("ghost", "px-2 py-1")}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset filters
            </button>
          </div>
        </div>
      </section>

      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
          <p className="font-medium text-ink">No {view} match these filters.</p>
          <p className="mt-1 text-sm text-ink-2">
            Try another purpose or phase, clear the search, or switch to the {view === "exercises" ? "drills" : "exercises"} view.
          </p>
          <button type="button" onClick={() => setFilters(emptyFilters)} className={buttonClass("secondary", "mt-4")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset filters
          </button>
        </div>
      ) : view === "exercises" ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {exerciseResults.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={exerciseHref(exercise.id)}
                className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/60"
              >
                <span className="font-semibold text-ink">{exercise.name}</span>
                <span className="mt-1 text-sm text-ink-2">{exercise.summary}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {drillMemberships(exercise.id).map(({ drill, order }) => (
                    <Tag key={drill.id} tone="official">
                      {drill.abbreviation} #{order}
                    </Tag>
                  ))}
                  {exercise.tags.purposes.map((purpose) => (
                    <Tag key={purpose}>{purposeLabels[purpose]}</Tag>
                  ))}
                </span>
                <span className="mt-auto pt-3 text-xs text-ink-2">
                  {exercise.tags.equipment.map((e) => equipmentLabels[e]).join(", ")} · {impactLabels[exercise.tags.impact]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {drillResults.map((drill) => (
            <li key={drill.id}>
              <Link
                href={drillHref(drill.id)}
                className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/60"
              >
                <span className="font-semibold text-ink">
                  {drill.name} <span className="font-normal text-ink-2">({drill.abbreviation})</span>
                </span>
                <span className="mt-1 text-sm text-ink-2">{drill.summary}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  <Tag tone="official">{drill.officialCategory}</Tag>
                  <Tag tone="official">{drill.officialComponent}</Tag>
                  <Tag>{phaseLabels[drill.tags.phase]}</Tag>
                </span>
                <span className="mt-auto pt-3 text-xs text-ink-2">{drill.sequence.length} exercises in official order</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
