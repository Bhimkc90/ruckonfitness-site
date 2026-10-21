"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { aftEventInfo, aftEventOrder, meetsEventMinimum } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { describeCategory, formatRaw } from "@/lib/aft/format";
import { addDays, generatePlan, weekdayLabels } from "@/lib/training/engine";
import { pathwayStatusLabels } from "@/lib/training/pathways";
import { describePreferences } from "@/lib/training/samples";
import { DEFAULT_SCENARIO_PREFS, SCENARIOS, SCENARIO_START, SCENARIO_WEEKDAYS, scenarioBaseline, type Scenario } from "@/lib/training/scenarios";
import { equipmentOptions, experienceOptions, restrictionOptions, runningOptions } from "@/lib/training/options";
import type { PlanOutcome, Preferences } from "@/lib/training/types";
import { Card, PageHeader } from "@/components/ui/Card";
import { PassFailBadge } from "@/components/ui/StatusBadge";
import PlanPreview from "./PlanPreview";

const selectClass = "mt-1 block w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink";
const groups = Array.from(new Set(SCENARIOS.map((s) => s.group)));
const AFT_OFFSETS = [
  { value: "", label: "None" },
  { value: "17", label: "In 2½ weeks (inside the plan)" },
  { value: "42", label: "In 6 weeks (after the plan)" },
];

type Settings = Preferences & { aftOffset: string };

function settingsFor(scenario: Scenario): Settings {
  return { ...DEFAULT_SCENARIO_PREFS, ...scenario.prefs, aftOffset: "" };
}

function outcomeFor(scenario: Scenario, settings: Settings): PlanOutcome {
  const { aftOffset, ...prefs } = settings;
  return generatePlan({
    baseline: scenarioBaseline(scenario),
    prefs: { ...prefs, ...(aftOffset ? { nextAftDate: addDays(SCENARIO_START, Number(aftOffset)) } : {}) },
    screening: { currentPain: false, otherInstructions: "" },
    startDate: SCENARIO_START,
  });
}

const statusOf = (outcome: PlanOutcome) => (outcome.status === "ready" ? pathwayStatusLabels[outcome.plan.pathway!.status] : outcome.status);

// Reviewer-only: every failure pattern from synthetic baselines, built in memory by the real engine.
// Nothing here reads or writes saved results, plans, or the dashboard.
export default function ScenarioExplorer() {
  const router = useRouter();
  const params = useSearchParams();
  const scenario = SCENARIOS.find((s) => s.id === params.get("s")) ?? SCENARIOS[0];
  const [edited, setEdited] = useState<{ id: string; settings: Settings } | null>(null);
  const settings = edited?.id === scenario.id ? edited.settings : settingsFor(scenario);
  const set = (patch: Partial<Settings>) => setEdited({ id: scenario.id, settings: { ...settings, ...patch } });
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const choose = (id: string) => router.replace(`?s=${id}`, { scroll: false });

  const baseline = scenarioBaseline(scenario);
  const rule = aftStandardRules[baseline.result.standard];
  const outcome = outcomeFor(scenario, settings);
  const overview = useMemo(() => SCENARIOS.map((s) => ({ s, outcome: outcomeFor(s, settingsFor(s)) })), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training-plan scenarios"
        description="Synthetic AFT baselines for every failure pattern, run through the real scoring and plan engine. For professional review only."
      />
      <Card className="border-accent/40">
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
            <FlaskConical className="h-3 w-3" aria-hidden />
            Reviewer preview · synthetic · not saved
          </span>
          Only in protected Preview builds. The results are made up; nothing on this page is saved to your history, plans, or dashboard.
        </p>
        <p className="mt-2 text-sm text-ink-2">
          Technical checks show that the plans follow RuckOn&apos;s documented rules. They don&apos;t show that the rules are suitable; that is the professional review.
        </p>
      </Card>

      <Card title="Scenario and preferences" description="Change a preference to see how it changes the plan. Preferences reset when you pick another scenario.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-2">Scenario</span>
            <select value={scenario.id} onChange={(e) => choose(e.target.value)} className={selectClass}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {SCENARIOS.filter((s) => s.group === g).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Days per week</span>
            <select
              value={settings.daysPerWeek}
              onChange={(e) => {
                const daysPerWeek = Number(e.target.value) as Preferences["daysPerWeek"];
                set({ daysPerWeek, weekdays: SCENARIO_WEEKDAYS[daysPerWeek] });
              }}
              className={selectClass}
            >
              {([2, 3, 4, 5] as const).map((d) => (
                <option key={d} value={d}>
                  {d} ({SCENARIO_WEEKDAYS[d].map((w) => weekdayLabels[w].slice(0, 3)).join(", ")})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Session length</span>
            <select value={settings.sessionMinutes} onChange={(e) => set({ sessionMinutes: Number(e.target.value) as Preferences["sessionMinutes"] })} className={selectClass}>
              {[30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Experience</span>
            <select value={settings.experience} onChange={(e) => set({ experience: e.target.value as Preferences["experience"] })} className={selectClass}>
              {experienceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Recent running</span>
            <select value={settings.recentRunning} onChange={(e) => set({ recentRunning: e.target.value as Preferences["recentRunning"] })} className={selectClass}>
              {runningOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Place to run</span>
            <select value={settings.runningAccess ? "yes" : "no"} onChange={(e) => set({ runningAccess: e.target.value === "yes" })} className={selectClass}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Next AFT</span>
            <select value={settings.aftOffset} onChange={(e) => set({ aftOffset: e.target.value })} className={selectClass}>
              {AFT_OFFSETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm sm:col-span-2">
            <legend className="text-ink-2">Equipment</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {equipmentOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5 text-ink">
                  <input type="checkbox" checked={settings.equipment.includes(o.value)} onChange={() => set({ equipment: toggle(settings.equipment, o.value) })} className="accent-[var(--color-control)]" />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="text-sm sm:col-span-2">
            <legend className="text-ink-2">Movements to avoid</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {restrictionOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5 text-ink">
                  <input type="checkbox" checked={settings.restrictions.includes(o.value)} onChange={() => set({ restrictions: toggle(settings.restrictions, o.value) })} className="accent-[var(--color-control)]" />
                  {o.label.replace(/ \(.*\)$/, "")}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Synthetic baseline" description={scenario.description}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-semibold text-ink">{baseline.result.total}</span>
            <span className="text-sm text-ink-2">/ 500</span>
            <PassFailBadge passed={baseline.result.passed} />
          </div>
          <p className="mt-1 text-sm text-ink-2">
            Age {baseline.input.age}, {describeCategory({ standard: baseline.result.standard, ageGroup: baseline.result.ageGroup, column: baseline.result.column })}. Minimum{" "}
            {rule.minEventPoints} points per event and {rule.minTotalPoints} total.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <caption className="sr-only">Raw results and verified points</caption>
              <thead className="text-xs text-ink-2">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Event</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Raw</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Points</th>
                  <th className="py-1.5 font-medium">Minimum</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {aftEventOrder.map((event) => {
                  const e = baseline.result.events.find((x) => x.event === event)!;
                  const met = meetsEventMinimum(e.points, baseline.result.standard);
                  return (
                    <tr key={event} className="border-t border-line">
                      <td className="py-2 pr-3 text-ink">{aftEventInfo[event].name}</td>
                      <td className="py-2 pr-3 text-right text-ink-2">{formatRaw(event, e.raw)}</td>
                      <td className={`py-2 pr-3 text-right font-semibold ${met ? "text-ink" : "text-bad"}`}>{e.points}</td>
                      <td className="py-2">{met ? "Met" : <span className="text-bad">Below</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-ink">Pass/fail reasons (scoring engine)</h3>
          {baseline.result.failReasons.length ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">
              {baseline.result.failReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink">None: every event and the total meet the standard.</p>
          )}
        </Card>
        <Card title="Preferences used" description="Synthetic answers. A real plan asks for each one.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {describePreferences(settings).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {settings.aftOffset && <li>Next AFT: {AFT_OFFSETS.find((o) => o.value === settings.aftOffset)!.label.toLowerCase()}</li>}
          </ul>
          <p className="mt-3 text-xs text-ink-2">Plan start: Monday 5 Oct 2026 (fixed, so dates are comparable). Assumptions are listed with the plan&apos;s limits below.</p>
        </Card>
      </div>

      {outcome.status === "ready" ? (
        <PlanPreview plan={outcome.plan} startDate={SCENARIO_START} openDecisions />
      ) : (
        <Card title={`No plan: ${outcome.status}`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {(outcome.status === "paused" ? [outcome.message] : outcome.status === "invalid" ? outcome.errors : outcome.reasons).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="All scenarios" description="Each scenario with its own default preferences. Choose one to inspect it above.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Every scenario, its pathway, status, and week 1 sessions</caption>
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Scenario</th>
                <th className="py-1.5 pr-3 font-medium">Total</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium">Week 1</th>
              </tr>
            </thead>
            <tbody>
              {overview.map(({ s, outcome: o }) => (
                <tr key={s.id} className="border-t border-line align-top">
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => choose(s.id)} aria-current={s.id === scenario.id ? "true" : undefined} className="text-left font-medium text-accent-ink underline-offset-2 hover:underline">
                      {s.label}
                    </button>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-ink-2">{scenarioBaseline(s).result.total}</td>
                  <td className="py-2 pr-3 text-ink">{statusOf(o)}</td>
                  <td className="py-2 text-ink-2">{o.status === "ready" ? o.plan.sessions.filter((x) => x.week === 1).map((x) => x.kind).join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
