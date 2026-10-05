"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { drillHref, exerciseHref, formatSourceRef, getDrill, getExercise } from "@/lib/library";
import { activities } from "@/lib/training/templates";
import { exerciseAllowed } from "@/lib/training/engine";
import type { EquipmentOption, PlanBlock, PlanItem, Prescription, Restriction } from "@/lib/training/types";
import { localToday } from "@/lib/aft/validation";

const noopSubscribe = () => () => {};

// Today's local date once the browser has hydrated; null during server rendering.
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, localToday, () => null);
}

export function formatPrescription(p: Prescription): string {
  const sets = p.sets && (/^\d+$/.test(p.sets) ? `${p.sets} ${p.sets === "1" ? "set" : "sets"}` : p.sets);
  // Bare counts ("4", "8–10", "up to 10") get a unit; descriptive values are shown as written.
  const reps = p.reps && (/^(up to )?\d+(–\d+)?$/.test(p.reps) ? `${p.reps} ${p.reps === "1" ? "rep" : "reps"}` : p.reps);
  return [sets, reps, p.time, p.rest && `rest ${p.rest}`, p.intensity, p.notes]
    .filter(Boolean)
    .join(" · ");
}

function ItemName({ item }: { item: PlanItem }) {
  if (item.kind === "drill") {
    const drill = getDrill(item.drillId)!;
    return (
      <Link href={drillHref(drill.id)} className="font-medium text-accent-ink hover:underline">
        {drill.name}
      </Link>
    );
  }
  if (item.kind === "exercise") {
    const exercise = getExercise(item.exerciseId)!;
    return (
      <Link href={exerciseHref(exercise.id)} className="font-medium text-accent-ink hover:underline">
        {exercise.name}
      </Link>
    );
  }
  const activity = activities[item.activityId];
  return activity.link ? (
    <Link href={activity.link} className="font-medium text-accent-ink hover:underline">
      {activity.name}
    </Link>
  ) : (
    <span className="font-medium text-ink">{activity.name}</span>
  );
}

// What the user can do instead, from the library's sourced substitutions, limited to exercises their
// restrictions and equipment allow. Variants that aren't library entries are shown only without restrictions.
function substitutionsFor(exerciseId: string, restrictions: Restriction[], equipment: EquipmentOption[]) {
  const exercise = getExercise(exerciseId);
  const set = new Set(restrictions);
  return (exercise?.substitutions ?? []).filter((s) => {
    if (!s.exerciseId) return restrictions.length === 0;
    const alt = getExercise(s.exerciseId);
    if (!alt || !exerciseAllowed(s.exerciseId, set)) return false;
    return alt.tags.equipment.includes("none") || alt.tags.equipment.some((e) => equipment.includes(e as EquipmentOption));
  });
}

function ItemHelp({ item, restrictions, equipment }: { item: PlanItem; restrictions: Restriction[]; equipment: EquipmentOption[] }) {
  if (item.kind === "drill") {
    return (
      <Link href={drillHref(item.drillId)} className="text-xs font-medium text-accent-ink underline underline-offset-2">
        Drill instructions and figures
      </Link>
    );
  }
  if (item.kind === "activity") {
    const activity = activities[item.activityId];
    return activity.link ? (
      <Link href={activity.link} className="text-xs font-medium text-accent-ink underline underline-offset-2">
        Event standard and official Army video
      </Link>
    ) : null;
  }
  const exercise = getExercise(item.exerciseId)!;
  const subs = substitutionsFor(item.exerciseId, restrictions, equipment);
  return (
    <details className="text-xs text-ink-2">
      <summary className="cursor-pointer font-medium text-accent-ink">How to do it{subs.length ? " and substitutes" : ""}</summary>
      <div className="mt-1.5 space-y-1.5">
        {exercise.cues.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-ink">
            {exercise.cues.slice(0, 4).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        {exercise.cautions.length > 0 && (
          <ul className="space-y-0.5 text-ink">
            {exercise.cautions.map((c) => (
              <li key={c}>
                <span className="font-semibold">Safety:</span> {c}
              </li>
            ))}
          </ul>
        )}
        <Link href={exerciseHref(exercise.id)} className="inline-block font-medium text-accent-ink underline underline-offset-2">
          Full instructions and figure
        </Link>
        {subs.length > 0 && (
          <div>
            <p className="font-semibold text-ink">If you need a substitute</p>
            <ul className="mt-0.5 space-y-1">
              {subs.map((sub) => (
                <li key={sub.name}>
                  {sub.exerciseId ? (
                    <Link href={exerciseHref(sub.exerciseId)} className="font-medium text-accent-ink underline underline-offset-2">
                      {sub.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{sub.name}</span>
                  )}
                  : {sub.difference} <span className="text-ink-2">({formatSourceRef(sub.source)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function BlockView({
  block,
  useBuild,
  condensed,
  restrictions = [],
  equipment = [],
}: {
  block: PlanBlock;
  useBuild: boolean;
  condensed?: boolean;
  restrictions?: Restriction[];
  equipment?: EquipmentOption[];
}) {
  return (
    <li className="rounded-lg border border-line bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{block.title}</p>
        <span className="text-xs text-ink-2">about {block.minutes} min</span>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {block.items.map((item, index) => {
          const prescription = useBuild ? item.prescription.build : item.prescription.foundation;
          const skipped =
            item.kind === "drill" && !condensed && item.omit?.length
              ? item.omit.map((id) => getExercise(id)?.name).filter(Boolean).join(", ")
              : "";
          return (
            <li key={index}>
              <ItemName item={item} />
              <p className="text-ink-2">{formatPrescription(prescription)}</p>
              {item.kind === "activity" && <p className="text-xs text-ink-2">{activities[item.activityId].description}</p>}
              {skipped && <p className="text-xs text-ink-2">Skip for your restrictions: {skipped}</p>}
              <div className="mt-1">
                <ItemHelp item={item} restrictions={restrictions} equipment={equipment} />
              </div>
            </li>
          );
        })}
      </ul>
      <details className="mt-2 text-xs text-ink-2">
        <summary className="cursor-pointer hover:text-ink">Sources and assumptions</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {block.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {block.assumptions.map((a) => (
            <li key={a}>RuckOn assumption: {a}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function PlanDisclaimer() {
  return (
    <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-ink">
      <span className="font-semibold">General suggestion, not an Army-prescribed program.</span> This plan is generated by fixed rules from
      Army drill and training publications and has not been reviewed by a coach or medical professional. It does not replace your
      unit&apos;s H2F program, your provider&apos;s instructions, or a physical profile. Stop and seek advice if you have pain. Plans are
      stored only in this browser.
    </p>
  );
}
