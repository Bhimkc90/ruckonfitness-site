"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Search, X } from "lucide-react";
import type { AftEventCode } from "@/lib/aft/types";
import type { DrillId, Equipment, Exercise, Phase, Purpose } from "@/lib/library/types";
import {
  aftEventLabels,
  drillHref,
  drillMemberships,
  drills,
  emptyFilters,
  equipmentLabels,
  exerciseHref,
  exercises,
  hasActiveFilters,
  phaseLabels,
  purposeLabels,
  type LibraryFilters,
} from "@/lib/library";
import { CATEGORY_NOTE, filterSections, librarySections, matchingExerciseCount, type LibrarySection } from "@/lib/library/sections";
import { buttonClass } from "@/components/ui/Button";
import { Tag } from "./LibraryBits";

const SECTIONS = librarySections();

const selectClass =
  "mt-1 w-full rounded-lg border border-line-strong bg-canvas px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none";

const filterLabels: Record<Exclude<keyof LibraryFilters, "query">, string> = {
  drill: "Drill",
  purpose: "Purpose",
  phase: "Phase",
  equipment: "Equipment",
  aftEvent: "AFT event",
};

function filterValueLabel(key: Exclude<keyof LibraryFilters, "query">, value: string): string {
  if (key === "drill") return drills.find((d) => d.id === value)?.name ?? value;
  if (key === "purpose") return purposeLabels[value as Purpose];
  if (key === "phase") return phaseLabels[value as Phase];
  if (key === "equipment") return equipmentLabels[value as Equipment];
  return aftEventLabels[value as AftEventCode];
}

export default function LibraryBrowser() {
  const [filters, setFilters] = useState<LibraryFilters>(emptyFilters);
  const set = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters(emptyFilters);

  const visible = filterSections(filters, SECTIONS);
  const count = matchingExerciseCount(visible);
  const active = hasActiveFilters(filters);
  const activeKeys = (Object.keys(filterLabels) as (keyof typeof filterLabels)[]).filter((k) => filters[k] !== "all");
  const drillSections = visible.filter((v) => v.section.kind === "drill");
  const categorySections = visible.filter((v) => v.section.kind === "category");

  return (
    <div className="space-y-6">
      {/* Jump links */}
      <nav aria-label="Library sections" className="space-y-2">
        {drillSections.length > 0 && <JumpLinks label="Drills" items={drillSections} />}
        {categorySections.length > 0 && <JumpLinks label="More exercises" items={categorySections} />}
      </nav>

      {/* Search and filters */}
      <section aria-label="Search and filters" className="rounded-xl border border-line bg-surface/60 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))] md:items-end">
          <label className="col-span-2 block text-xs md:col-span-1">
            <span className="text-ink-2">Search</span>
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" aria-hidden />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Exercise, drill, or body area"
                className="w-full rounded-lg border border-line-strong bg-canvas py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-2/60 focus:border-accent focus:outline-none"
              />
            </span>
          </label>
          <FilterSelect label="Drill" value={filters.drill} onChange={(v) => set("drill", v as DrillId | "all")} all="All drills" options={drills.map((d) => [d.id, d.name])} />
          <FilterSelect
            label="Purpose (app)"
            value={filters.purpose}
            onChange={(v) => set("purpose", v as Purpose | "all")}
            all="Any purpose"
            options={(Object.keys(purposeLabels) as Purpose[]).map((p) => [p, purposeLabels[p]])}
          />
          <FilterSelect label="Phase" value={filters.phase} onChange={(v) => set("phase", v as Phase | "all")} all="Any phase" options={(Object.keys(phaseLabels) as Phase[]).map((p) => [p, phaseLabels[p]])} />
          <FilterSelect
            label="Equipment"
            value={filters.equipment}
            onChange={(v) => set("equipment", v as Equipment | "all")}
            all="Any equipment"
            options={(Object.keys(equipmentLabels) as Equipment[]).map((e) => [e, equipmentLabels[e]])}
          />
          <FilterSelect
            label="AFT event (app)"
            value={filters.aftEvent}
            onChange={(v) => set("aftEvent", v as AftEventCode | "all")}
            all="Any event"
            options={(Object.keys(aftEventLabels) as AftEventCode[]).map((e) => [e, aftEventLabels[e]])}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <p aria-live="polite" className="text-ink-2">
            {active ? (
              <>
                <span className="font-semibold text-ink">{count}</span> of {exercises.length} exercises match in {visible.length}{" "}
                {visible.length === 1 ? "section" : "sections"}
              </>
            ) : (
              <>
                {exercises.length} exercises in {SECTIONS.length} sections
              </>
            )}
          </p>
          {active && (
            <>
              <span className="text-xs text-ink-2">· Filters on:</span>
              {filters.query.trim() && (
                <ActiveChip label={`Search: “${filters.query.trim()}”`} onRemove={() => set("query", "")} />
              )}
              {activeKeys.map((k) => (
                <ActiveChip key={k} label={`${filterLabels[k]}: ${filterValueLabel(k, filters[k])}`} onRemove={() => set(k, "all")} />
              ))}
              <button type="button" onClick={reset} className={buttonClass("ghost", "px-2 py-1 text-xs")}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset all
              </button>
            </>
          )}
        </div>
      </section>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
          <p className="font-medium text-ink">No exercises match these filters.</p>
          <p className="mt-1 text-sm text-ink-2">Try a shorter search, or remove a filter. Some combinations don&apos;t exist, such as loaded equipment within a bodyweight drill.</p>
          <button type="button" onClick={reset} className={buttonClass("secondary", "mt-4")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset search and filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {visible.map(({ section, exercises: shown }) => (
            <SectionBlock key={section.id} section={section} shown={shown} filtered={active} />
          ))}
        </div>
      )}
    </div>
  );
}

function JumpLinks({ label, items }: { label: string; items: { section: LibrarySection; exercises: Exercise[] }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-ink-2">{label}</span>
      {items.map(({ section, exercises: shown }) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-accent/60"
        >
          {section.title}
          <span className="text-xs tabular-nums text-ink-2">{shown.length}</span>
        </a>
      ))}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  all,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  all: string;
  options: [string, string][];
}) {
  const on = value !== "all";
  return (
    <label className="block text-xs">
      <span className={on ? "font-semibold text-accent" : "text-ink-2"}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} ${on ? "border-accent/70" : ""}`}>
        <option value="all">{all}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/10 py-0.5 pl-2.5 pr-1 text-xs text-ink">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 text-ink-2 hover:text-ink">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}

function SectionBlock({ section, shown, filtered }: { section: LibrarySection; shown: Exercise[]; filtered: boolean }) {
  const total = section.exerciseIds.length;
  const headingId = `${section.id}-heading`;
  return (
    <section id={section.id} aria-labelledby={headingId} className="scroll-mt-28">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-1.5">
            {section.kind === "drill" ? (
              <>
                <Tag tone="official">{section.drill.officialCategory}</Tag>
                <Tag tone="official">{section.drill.officialComponent}</Tag>
              </>
            ) : (
              <Tag>{CATEGORY_NOTE}</Tag>
            )}
          </div>
          <h2 id={headingId} className="mt-2 text-xl font-semibold tracking-tight text-ink">
            {section.title}
            {section.kind === "drill" && <span className="ml-2 text-base font-normal text-ink-2">({section.drill.abbreviation})</span>}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{section.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-2">
            {filtered && shown.length !== total ? `${shown.length} of ${total} exercises` : `${total} ${total === 1 ? "exercise" : "exercises"}`}
            {section.kind === "drill" && ", official order"}
          </span>
          {section.kind === "drill" && (
            <Link href={drillHref(section.drill.id)} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
              View full drill
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">: {section.title}</span>
            </Link>
          )}
        </div>
      </header>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <ExerciseCard exercise={exercise} section={section} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExerciseCard({ exercise, section }: { exercise: Exercise; section: LibrarySection }) {
  const order = section.kind === "drill" ? section.exerciseIds.indexOf(exercise.id) + 1 : null;
  const otherDrills = drillMemberships(exercise.id).filter(({ drill }) => drill.id !== section.id);
  const context = section.kind === "category" ? exercise.executions.find((e) => e.context)?.context : undefined;
  return (
    <Link
      href={exerciseHref(exercise.id)}
      className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/60"
    >
      <div className="flex items-start gap-3">
        {order !== null && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold tabular-nums text-ink" aria-label={`Exercise ${order} of ${section.exerciseIds.length}`}>
            {order}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{exercise.name}</h3>
          {context && <p className="text-xs text-ink-2">{context}</p>}
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-ink-2">{exercise.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {exercise.tags.purposes.slice(0, 2).map((purpose) => (
          <Tag key={purpose}>{purposeLabels[purpose]}</Tag>
        ))}
        {exercise.tags.impact === "jumping" && <Tag>Includes jumping</Tag>}
        {otherDrills.map(({ drill, order: n }) => (
          <Tag key={drill.id} tone="official">
            Also {drill.abbreviation} #{n}
          </Tag>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
        <span className="text-ink-2">{exercise.tags.equipment.map((e) => equipmentLabels[e]).join(", ")}</span>
        <span className="inline-flex items-center gap-1 font-medium text-accent group-hover:underline">
          Instructions
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
