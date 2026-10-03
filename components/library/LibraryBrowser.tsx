"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Footprints, Info, RotateCcw, Search, X } from "lucide-react";
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
  hasActiveFilters,
  phaseLabels,
  purposeLabels,
  type LibraryFilters,
} from "@/lib/library";
import { GENERAL_NOTE, filterSections, librarySections, matchingExerciseCount, viewExerciseCount, type LibrarySection, type LibraryView } from "@/lib/library/sections";
import { activities } from "@/lib/training/templates";
import { buttonClass, segmentClass } from "@/components/ui/Button";
import { fieldFocus } from "@/components/ui/form";
import { Tag } from "./LibraryBits";
import { DemonstrationNote, ExecutionDetails, FormGuidance, Substitutions, hasFormGuidance } from "./ExerciseDetail";
import { FIGURE_READING_NOTE, FigureList } from "./FigureGallery";
import { accents } from "./accents";
import { ExerciseThumbSmall } from "./ExerciseImage";
import { figuresInDrill } from "@/lib/library/images";

const SECTIONS = librarySections();

// The chosen view lives in the URL (?view=general) so it can be shared; the Military view is the default.
const VIEW_EVENT = "library-view";
function subscribeView(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}
const urlView = (): LibraryView => (new URLSearchParams(window.location.search).get("view") === "general" ? "general" : "military");
function chooseView(view: LibraryView) {
  const url = new URL(window.location.href);
  if (view === "general") url.searchParams.set("view", "general");
  else url.searchParams.delete("view");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(VIEW_EVENT));
}

const VIEWS: { id: LibraryView; title: string; text: string }[] = [
  { id: "military", title: "Military / PRT", text: "Official Army drills in order, plus more ATP 7-22.02 exercises" },
  { id: "general", title: "General Fitness", text: "Strength, endurance, core, and conditioning groups for AFT preparation" },
];

// Running activities come from Training Plans' activity records; prescriptions stay there.
const AEROBIC_ACTIVITIES = (["walk", "easy-run", "intervals-30-60"] as const).map((id) => ({ id, ...activities[id] }));

const selectClass =
  `mt-1 w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink ${fieldFocus}`;

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
  const view = useSyncExternalStore(subscribeView, urlView, () => "military" as const);
  const [filters, setFilters] = useState<LibraryFilters>(emptyFilters);
  const set = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters(emptyFilters);
  const accordion = useAccordion();
  const switchView = (next: LibraryView) => {
    // The drill filter belongs to the Military view only.
    if (next === "general") set("drill", "all");
    chooseView(next);
  };

  const visible = filterSections(filters, view, SECTIONS);
  const count = matchingExerciseCount(visible);
  const total = viewExerciseCount(view, SECTIONS);
  const sectionTotal = SECTIONS.filter((s) => s.view === view).length;
  const active = hasActiveFilters(filters);
  const activeKeys = (Object.keys(filterLabels) as (keyof typeof filterLabels)[]).filter((k) => filters[k] !== "all");
  const drillSections = visible.filter((v) => v.section.kind === "drill");
  const otherSections = visible.filter((v) => v.section.kind !== "drill");
  const showAerobic =
    view === "general" &&
    (filters.aftEvent === "all" || filters.aftEvent === "2MR") &&
    (filters.equipment === "all" || filters.equipment === "none") &&
    (filters.purpose === "all" || filters.purpose === "aerobic-endurance") &&
    (filters.phase === "all" || filters.phase === "main") &&
    AEROBIC_ACTIVITIES.some((a) => matchesActivity(a, filters.query));

  return (
    <div className="space-y-6">
      {/* View switcher */}
      <div role="group" aria-label="Library view" className="grid gap-2 sm:grid-cols-2">
        {VIEWS.map((v) => {
          const on = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => switchView(v.id)}
              className={`rounded-xl border-2 p-3 text-left transition-colors sm:p-4 ${on ? "border-ink bg-accent text-black" : "border-card-line bg-surface text-ink hover:border-ink"}`}
            >
              <span className="block text-base font-bold">{v.title}</span>
              <span className={`mt-0.5 block text-sm ${on ? "text-black/80" : "text-ink-2"}`}>{v.text}</span>
            </button>
          );
        })}
      </div>

      {view === "general" && (
        <p className="readable flex gap-2 rounded-lg border border-card-line bg-surface px-3 py-2.5 text-sm text-ink-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden />
          <span>
            {GENERAL_NOTE} Every exercise comes from ATP 7-22.02 and cites it. AFT links show a plausible supporting movement, not evidence that the
            exercise raises AFT scores. Sets, repetitions, and schedules belong in{" "}
            <Link href="/training-plan" className="font-medium text-ink underline underline-offset-2">
              Training Plans
            </Link>
            .
          </span>
        </p>
      )}

      {/* Jump links */}
      <nav aria-label="Library sections" className="space-y-2">
        {drillSections.length > 0 && <JumpLinks label="Drills" items={drillSections} />}
        {otherSections.length > 0 && <JumpLinks label={view === "general" ? "Groups" : "More"} items={otherSections} />}
        {showAerobic && (
          <div className="flex flex-wrap items-center gap-1.5">
            <a href="#aerobic-activities" className="inline-flex items-center gap-1.5 rounded-full border border-card-line bg-card px-3 py-1 text-sm font-medium text-ink hover:border-ink">
              Aerobic activities
            </a>
          </div>
        )}
      </nav>

      {/* Search and filters */}
      <section aria-label="Search and filters" className="rounded-xl border border-card-line bg-card p-3 shadow-sm sm:p-4">
        <div role="group" aria-label="Supports AFT event" className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-ink">Supports AFT event</span>
          {(["all", ...(Object.keys(aftEventLabels) as AftEventCode[])] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={filters.aftEvent === code}
              onClick={() => set("aftEvent", code)}
              className={`${segmentClass(filters.aftEvent === code)} border ${filters.aftEvent === code ? "border-accent" : "border-line-strong"} py-1 text-xs`}
            >
              {code === "all" ? "All events" : aftEventLabels[code]}
            </button>
          ))}
        </div>
        <div className={`grid grid-cols-2 gap-3 md:items-end ${view === "military" ? "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]" : "md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"}`}>
          <label className="col-span-2 block text-xs md:col-span-1">
            <span className="text-ink-2">Search</span>
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" aria-hidden />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Exercise, drill, or body area"
                className={`w-full rounded-lg border border-line-strong bg-surface py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-2/70 ${fieldFocus}`}
              />
            </span>
          </label>
          {view === "military" && (
            <FilterSelect label="Drill" value={filters.drill} onChange={(v) => set("drill", v as DrillId | "all")} all="All drills" options={drills.map((d) => [d.id, d.name])} />
          )}
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <p aria-live="polite" className="text-ink-2">
            {active ? (
              <>
                <span className="font-semibold text-ink">{count}</span> of {total} exercises match in {visible.length}{" "}
                {visible.length === 1 ? "section" : "sections"}
              </>
            ) : (
              <>
                {total} exercises in {sectionTotal} sections
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

      {visible.length === 0 && !showAerobic ? (
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
            <SectionBlock key={section.id} section={section} shown={shown} filtered={active} accordion={accordion} />
          ))}
          {showAerobic && <AerobicActivities query={filters.query} />}
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
          className="inline-flex items-center gap-1.5 rounded-full border border-card-line bg-card px-3 py-1 text-sm font-medium text-ink hover:border-ink"
        >
          <span className={`h-2 w-2 rounded-full ${sectionAccent(section).bar}`} aria-hidden />
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
      <span className={on ? "font-semibold text-ink" : "text-ink-2"}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} ${on ? "border-accent ring-1 ring-accent" : ""}`}>
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
    <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/25 py-0.5 pl-2.5 pr-1 text-xs font-medium text-ink">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 text-ink-2 hover:text-ink">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}

function sectionAccent(section: LibrarySection) {
  return accents[section.kind === "drill" ? section.drill.officialCategory : "app"];
}

// ---------------------------------------------------------------------------
// Inline instructions: each section is a vertical list of accordion rows
// ---------------------------------------------------------------------------

// An exercise can appear in two sections (Rear Lunge is in the Preparation and Recovery Drills), so open state
// is kept per section and exercise. Rows stay open while filters change and reappear open when they match again.
const rowKey = (sectionId: string, exerciseId: string) => `${sectionId}--${exerciseId}`;
const triggerId = (key: string) => `${key}-trigger`;
const panelId = (key: string) => `${key}-panel`;
const headingId = (key: string) => `${key}-heading`;

type Accordion = {
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
  // Previous/Next: close the row being left, open the target, then focus it and bring its heading into view.
  go: (from: string, to: string) => void;
  collapse: (key: string) => void;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useAccordion(): Accordion {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const pending = useRef<{ key: string; block: ScrollLogicalPosition } | null>(null);

  // Runs after the DOM reflects the new open state, so the scroll lands where the heading ends up once the row
  // being left has closed. Headings carry a scroll margin that clears the sticky mobile header.
  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    document.getElementById(triggerId(target.key))?.focus({ preventScroll: true });
    document
      .getElementById(headingId(target.key))
      ?.scrollIntoView({ block: target.block, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [open]);

  const update = useCallback((change: (next: Set<string>) => void) => {
    setOpen((current) => {
      const next = new Set(current);
      change(next);
      return next;
    });
  }, []);

  return {
    isOpen: (key) => open.has(key),
    toggle: (key) => update((next) => (next.has(key) ? next.delete(key) : next.add(key))),
    go: (from, to) => {
      pending.current = { key: to, block: "start" };
      update((next) => {
        next.delete(from);
        next.add(to);
      });
    },
    collapse: (key) => {
      pending.current = { key, block: "nearest" };
      update((next) => next.delete(key));
    },
  };
}

// Arrow keys move between row triggers within a section; Home and End jump to its first and last row.
function moveFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
  const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const triggers = Array.from(event.currentTarget.closest("section")?.querySelectorAll<HTMLButtonElement>("[data-row-trigger]") ?? []);
  const index = triggers.indexOf(event.currentTarget);
  const target =
    event.key === "Home"
      ? triggers[0]
      : event.key === "End"
        ? triggers[triggers.length - 1]
        : triggers[index + (event.key === "ArrowDown" ? 1 : -1)];
  if (!target) return;
  event.preventDefault();
  target.focus();
}

function SectionBlock({
  section,
  shown,
  filtered,
  accordion,
}: {
  section: LibrarySection;
  shown: Exercise[];
  filtered: boolean;
  accordion: Accordion;
}) {
  const total = section.exerciseIds.length;
  const sectionHeadingId = `${section.id}-heading`;
  const accent = sectionAccent(section);
  return (
    <section id={section.id} aria-labelledby={sectionHeadingId} className="scroll-mt-32 lg:scroll-mt-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink pb-4">
        <div className="flex min-w-0 max-w-3xl gap-3">
          <span className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${accent.bar}`} aria-hidden />
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider ${accent.text}`}>
              {section.kind === "drill"
                ? `${accent.label} · ${section.drill.officialCategory} (Army)`
                : section.kind === "atp"
                  ? "Army · ATP 7-22.02"
                  : "General Fitness · RuckOn grouping"}
            </p>
            <h2 id={sectionHeadingId} className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {section.title}
              {section.kind === "drill" && <span className="ml-2 text-lg font-normal text-ink-2">({section.drill.abbreviation})</span>}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{section.description}</p>
            {section.kind === "drill" && (
              <p className="mt-2 text-xs text-ink-2">Physical component (Army): {section.drill.officialComponent}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-2">
            {filtered && shown.length !== total ? `${shown.length} of ${total} exercises` : `${total} ${total === 1 ? "exercise" : "exercises"}`}
            {section.kind === "drill" && ", official order"}
          </span>
          {section.kind === "drill" && (
            <Link href={drillHref(section.drill.id)} className={buttonClass("primary", "px-3 py-1.5")}>
              View full drill
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">: {section.title}</span>
            </Link>
          )}
        </div>
      </header>

      <ul className="mt-4 space-y-3">
        {shown.map((exercise, index) => {
          const key = rowKey(section.id, exercise.id);
          const previous = shown[index - 1];
          const next = shown[index + 1];
          return (
            <ExerciseRow
              key={exercise.id}
              rowId={key}
              exercise={exercise}
              section={section}
              open={accordion.isOpen(key)}
              onToggle={() => accordion.toggle(key)}
              previous={previous && { exercise: previous, go: () => accordion.go(key, rowKey(section.id, previous.id)) }}
              next={next && { exercise: next, go: () => accordion.go(key, rowKey(section.id, next.id)) }}
              onCollapse={() => accordion.collapse(key)}
            />
          );
        })}
      </ul>
    </section>
  );
}

type Neighbor = { exercise: Exercise; go: () => void } | undefined;

function ExerciseRow({
  rowId,
  exercise,
  section,
  open,
  onToggle,
  previous,
  next,
  onCollapse,
}: {
  rowId: string;
  exercise: Exercise;
  section: LibrarySection;
  open: boolean;
  onToggle: () => void;
  previous: Neighbor;
  next: Neighbor;
  onCollapse: () => void;
}) {
  const order = officialOrder(section, exercise);
  const otherDrills = drillMemberships(exercise.id).filter(({ drill }) => drill.id !== section.id);
  // Outside a drill section, name where the exercise comes from (drill memberships show as tags).
  const context = section.kind !== "drill" ? exercise.executions.filter((e) => e.context).map((e) => e.context).join("; ") || undefined : undefined;
  const abbreviation = section.kind === "drill" ? section.drill.abbreviation : undefined;
  const nameId = `${rowId}-name`;
  const summaryId = `${rowId}-summary`;

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${
        open ? "border-ink shadow-[inset_4px_0_0_var(--color-accent)]" : "border-card-line hover:border-line-strong"
      }`}
    >
      <h3 id={headingId(rowId)} className="scroll-mt-32 lg:scroll-mt-6">
        <button
          type="button"
          id={triggerId(rowId)}
          data-row-trigger
          aria-expanded={open}
          aria-controls={panelId(rowId)}
          aria-labelledby={nameId}
          aria-describedby={summaryId}
          onClick={onToggle}
          onKeyDown={moveFocus}
          className="group flex w-full items-start gap-3 rounded-[11px] p-3 text-left hover:bg-card-hover sm:gap-4 sm:p-4"
        >
          <ExerciseThumbSmall exercise={exercise} drillAbbreviation={abbreviation} />
          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-2">
              {order && (
                <span
                  className={`mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                    open ? "bg-accent text-black" : "bg-ink text-canvas"
                  }`}
                  aria-hidden
                >
                  {order.n}
                </span>
              )}
              <span id={nameId} className="text-base font-semibold leading-snug text-ink">
                {order && <span className="sr-only">Exercise {order.n} of {order.of}: </span>}
                {exercise.name}
              </span>
            </span>
            {context && <span className="mt-0.5 block text-xs text-ink-2">{context}</span>}
            <span id={summaryId} className="mt-1 line-clamp-2 block max-w-[75ch] text-sm leading-relaxed text-ink-2">
              {exercise.summary}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Tag>{exercise.tags.equipment.map((e) => equipmentLabels[e]).join(", ")}</Tag>
              {exercise.tags.purposes.slice(0, 2).map((purpose) => (
                <Tag key={purpose}>{purposeLabels[purpose]}</Tag>
              ))}
              {exercise.tags.impact === "jumping" && <Tag>Includes jumping</Tag>}
              {otherDrills.map(({ drill, order: n }) => (
                <Tag key={drill.id} tone="official">
                  Also {drill.abbreviation} #{n}
                </Tag>
              ))}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-1 self-center">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                open ? "border-accent bg-accent text-black" : "border-line-strong bg-card text-ink group-hover:border-ink"
              }`}
              aria-hidden
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
            <span className="hidden text-[11px] font-medium text-ink-2 sm:block" aria-hidden>
              {open ? "Hide" : "Steps"}
            </span>
          </span>
        </button>
      </h3>

      <div id={panelId(rowId)} role="region" aria-labelledby={triggerId(rowId)} hidden={!open}>
        {open && (
          <InlineInstructions exercise={exercise} section={section} rowId={rowId} previous={previous} next={next} onCollapse={onCollapse} />
        )}
      </div>
    </li>
  );
}

function officialOrder(section: LibrarySection, exercise: Exercise): { n: number; of: number } | null {
  return section.kind === "drill" ? { n: section.exerciseIds.indexOf(exercise.id) + 1, of: section.exerciseIds.length } : null;
}

// The exercise's verified instructions for this section, built from the same components as the exercise page.
// In a drill section only that drill's execution and figures are shown; elsewhere, every official context.
function InlineInstructions({
  exercise,
  section,
  rowId,
  previous,
  next,
  onCollapse,
}: {
  exercise: Exercise;
  section: LibrarySection;
  rowId: string;
  previous: Neighbor;
  next: Neighbor;
  onCollapse: () => void;
}) {
  const executions = section.kind === "drill" ? exercise.executions.filter((x) => x.drillId === section.id) : exercise.executions;
  const figures = figuresInDrill(exercise.id, section.kind === "drill" ? section.drill.abbreviation : undefined);
  const multiple = executions.length > 1;
  const neighborLabel = (neighbor: NonNullable<Neighbor>) => {
    const order = officialOrder(section, neighbor.exercise);
    return order ? `${order.n}. ${neighbor.exercise.name}` : neighbor.exercise.name;
  };

  return (
    <div className="readable border-t border-card-line px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
      <div className="grid gap-6 lg:grid-cols-2">
        {figures.length > 0 && (
          <div className="min-w-0 lg:order-2">
            <h4 className="text-sm font-semibold text-ink">Demonstration</h4>
            <p className="mb-3 mt-0.5 text-xs text-ink-2">{FIGURE_READING_NOTE}</p>
            <FigureList exercise={exercise} figures={figures} />
          </div>
        )}

        <div className={`min-w-0 space-y-6 ${figures.length > 0 ? "lg:order-1" : "lg:col-span-2 lg:max-w-3xl"}`}>
          {executions.map((execution) => (
            <div key={execution.drillId ?? execution.context}>
              {multiple && (
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">
                  {execution.drillId ? `In the ${drills.find((d) => d.id === execution.drillId)?.name ?? "drill"}` : `In ${execution.context}`}
                </h4>
              )}
              <ExecutionDetails execution={execution} level={multiple ? 5 : 4} />
            </div>
          ))}

          {hasFormGuidance(exercise) && (
            <div className="rounded-lg border border-card-line bg-surface-2/60 p-3 sm:p-4">
              <h4 className="text-sm font-semibold text-ink">Form</h4>
              <p className="mb-3 mt-0.5 text-xs text-ink-2">Drawn from the cited instructions.</p>
              <FormGuidance exercise={exercise} level={5} />
            </div>
          )}

          <Substitutions exercise={exercise} level={4} />

          <div className="space-y-2">
            <DemonstrationNote exercise={exercise} hasPhotos={figures.length > 0} />
            <Link
              href={exerciseHref(exercise.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
            >
              Open the full exercise page
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span className="sr-only">: {exercise.name}</span>
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label={`${section.title}: move between exercises`} className="mt-6 grid grid-cols-2 gap-2 border-t border-card-line pt-4 sm:flex sm:items-stretch">
        <button
          type="button"
          onClick={previous?.go}
          disabled={!previous}
          className={buttonClass("secondary", "min-w-0 justify-start px-3 text-left sm:flex-1")}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-ink-2">Previous</span>
            <span className="block truncate">{previous ? neighborLabel(previous) : "Start of section"}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={next?.go}
          disabled={!next}
          className={buttonClass("primary", "min-w-0 justify-end px-3 text-right sm:order-3 sm:flex-1")}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium">Next</span>
            <span className="block truncate">{next ? neighborLabel(next) : "End of section"}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-controls={panelId(rowId)}
          className={buttonClass("ghost", "col-span-2 border border-transparent text-ink hover:border-line-strong sm:order-2 sm:col-span-1")}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
          Collapse instructions
        </button>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aerobic activities (General Fitness view)
// ---------------------------------------------------------------------------

function matchesActivity(activity: { name: string; description: string }, query: string): boolean {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const text = `${activity.name} ${activity.description} run running aerobic`.toLowerCase();
  return terms.every((t) => text.includes(t));
}

// Running is described here as activities, not exercises; durations and progression are set in Training Plans.
function AerobicActivities({ query }: { query: string }) {
  const shown = AEROBIC_ACTIVITIES.filter((a) => matchesActivity(a, query));
  return (
    <section id="aerobic-activities" aria-labelledby="aerobic-activities-heading" className="scroll-mt-32 lg:scroll-mt-6">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">General Fitness · RuckOn grouping</p>
        <h2 id="aerobic-activities-heading" className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Aerobic activities
        </h2>
        <p className="readable mt-1.5 text-sm leading-relaxed text-ink-2">
          Running and walking are sessions, not single exercises, so they are listed as activities. How long and how often to do them is set in
          Training Plans.
        </p>
      </header>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {shown.map((activity) => (
          <li key={activity.id} className="flex flex-col rounded-xl border border-card-line bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-ink-2" aria-hidden />
              <h3 className="font-semibold text-ink">{activity.name}</h3>
            </div>
            <p className="mt-1.5 text-sm text-ink-2">{activity.description}</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              <Tag>Supports: {aftEventLabels["2MR"]}</Tag>
            </p>
            <details className="mt-3 text-xs text-ink-2">
              <summary className="cursor-pointer font-medium text-ink">Sources</summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {activity.sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-2">
        The 2-mile run link is a RuckOn mapping. Interval and run sessions are prescribed in{" "}
        <Link href="/training-plan" className="font-medium text-ink underline underline-offset-2">
          Training Plans
        </Link>
        .
      </p>
    </section>
  );
}
