"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileUp, Trash2 } from "lucide-react";
import { aftEventInfo } from "@/lib/aft/scoring";
import { useAftResults, useHydrated } from "@/lib/storage/aftResults";
import { useTrainingData } from "@/lib/storage/trainingPlans";
import { useProfile } from "@/lib/storage/profile";
import { saveSettings, useSavedSettings, useSettings } from "@/lib/storage/settings";
import { DATA_SECTIONS, deleteSections, readLocalData, storageSizes, writeLocalData, type DataSection } from "@/lib/storage/localData";
import { LANDING_PAGES, TREND_EVENTS, type LandingPage, type TrendView } from "@/lib/settings/settings";
import {
  createBackup,
  planImport,
  serializeBackup,
  validateBackup,
  type Backup,
  type ImportMode,
  type LocalData,
} from "@/lib/backup/backup";
import type { AftEventCode } from "@/lib/aft/types";
import { formatTestDate } from "@/lib/aft/format";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

type Notice = { kind: "ok" | "error"; message: string } | null;

function StatusLine({ notice }: { notice: Notice }) {
  return (
    <div aria-live="polite" className="min-h-5">
      {notice && (
        <p role={notice.kind === "error" ? "alert" : undefined} className={`flex items-start gap-2 text-sm ${notice.kind === "error" ? "text-bad" : "text-good"}`}>
          {notice.kind === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          {notice.message}
        </p>
      )}
    </div>
  );
}

function useExport(appVersion: string) {
  return () => {
    const now = new Date();
    const backup = createBackup(readLocalData(), { exportedAt: now.toISOString(), appVersion });
    const blob = new Blob([serializeBackup(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruckon-backup-${now.toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

export default function SettingsPanel({ appVersion }: { appVersion: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-60 rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading settings" />;
  return (
    <div className="space-y-5">
      <PreferencesCard />
      <ProfileCard />
      <DataCard appVersion={appVersion} />
      <DeleteCard appVersion={appVersion} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App preferences
// ---------------------------------------------------------------------------

function PreferencesCard() {
  const settings = useSettings();
  const [notice, setNotice] = useState<Notice>(null);
  const update = (changes: Parameters<typeof saveSettings>[0], label: string) => {
    const result = saveSettings(changes);
    setNotice(result.ok ? { kind: "ok", message: `${label} saved. It applies right away in every open RuckOn tab.` } : { kind: "error", message: result.error });
  };

  return (
    <Card id="preferences" title="App preferences" description="Saved in this browser and applied immediately.">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Start page</span>
          <select
            value={settings.landingPage}
            onChange={(e) => update({ landingPage: e.target.value as LandingPage }, "Start page")}
            className={inputClass}
          >
            {LANDING_PAGES.map((p) => (
              <option key={p.href} value={p.href}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink-2">Where ruckonfitness.com opens. Links to a specific page still open that page.</span>
        </label>

        <fieldset className="text-sm">
          <legend className="text-ink-2">Dashboard event trend shows</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {(
              [
                ["points", "Points"],
                ["raw", "Raw results"],
              ] as [TrendView, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="trend-view"
                  checked={settings.trendView === value}
                  onChange={() => update({ trendView: value }, "Trend view")}
                  className="accent-[var(--color-accent)]"
                />
                {label}
              </label>
            ))}
          </div>
          <span className="mt-1 block text-xs text-ink-2">You can still switch on the dashboard; this is the view it opens with.</span>
        </fieldset>

        <label className="block text-sm">
          <span className="text-ink-2">Dashboard trend event</span>
          <select value={settings.trendEvent} onChange={(e) => update({ trendEvent: e.target.value as AftEventCode }, "Trend event")} className={inputClass}>
            {TREND_EVENTS.map((e) => (
              <option key={e} value={e}>
                {aftEventInfo[e].name}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <p className="text-ink-2">Units and theme</p>
          <p className="mt-1.5 text-ink">
            Results use the official units from the Army score tables: pounds, repetitions, and minutes:seconds. They can&apos;t be changed, so
            scores always match the tables. RuckOn has one dark theme.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <StatusLine notice={notice} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profile and training
// ---------------------------------------------------------------------------

function ProfileCard() {
  return (
    <Card id="profile" title="Profile and training preferences">
      <p className="text-sm text-ink">
        Date of birth, AFT standard, score table, and training preferences are kept in your{" "}
        <Link href="/profile" className="text-accent underline">
          profile
        </Link>
        .
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
        <li>Editing them never changes saved AFT results. Each result keeps the age, standard, and score table it was scored with.</li>
        <li>Active training plans keep the preferences they were created with.</li>
        <li>Personalized training plans are in preview. Whether they are available is decided by the app release, not by a setting.</li>
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stored data, export, import
// ---------------------------------------------------------------------------

function useLocalData(): LocalData {
  return { aftResults: useAftResults(), training: useTrainingData(), profile: useProfile(), settings: useSavedSettings() };
}

const kb = (bytes: number) => (bytes === 0 ? "—" : bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

function DataCard({ appVersion }: { appVersion: string }) {
  const local = useLocalData();
  const sizes = storageSizes();
  const exportBackup = useExport(appVersion);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<{ backup: Backup; data: LocalData; fileName: string } | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileId = useId();

  const rows: { section: DataSection; count: string }[] = [
    { section: "aftResults", count: `${local.aftResults.length} ${local.aftResults.length === 1 ? "result" : "results"}` },
    {
      section: "training",
      count: `${local.training.plans.length} ${local.training.plans.length === 1 ? "plan" : "plans"}, ${local.training.completions.length} completed ${local.training.completions.length === 1 ? "workout" : "workouts"}`,
    },
    { section: "profile", count: local.profile ? "Saved" : "None" },
    { section: "settings", count: local.settings ? "Saved" : "Defaults" },
  ];

  const handleFile = async (file: File | undefined) => {
    setNotice(null);
    setPending(null);
    setConfirmed(false);
    setMode("merge");
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", message: "Couldn't read that file." });
      return;
    }
    const result = validateBackup(text);
    if (!result.ok) {
      setNotice({ kind: "error", message: `${result.error} Nothing was changed.` });
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setPending({ backup: result.backup, data: result.data, fileName: file.name });
  };

  const cancel = () => {
    setPending(null);
    setConfirmed(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const plan = pending ? planImport(local, pending.data, mode, pending.backup.exportedAt) : null;
  const needsConfirm = mode === "replace";

  const apply = () => {
    if (!plan) return;
    const result = writeLocalData(plan.next);
    if (!result.ok) {
      setNotice({ kind: "error", message: result.error });
      return;
    }
    const added = plan.changes.reduce((n, c) => n + (mode === "merge" ? c.added : 0), 0);
    setNotice({
      kind: "ok",
      message: mode === "merge" ? `Backup merged: ${added} ${added === 1 ? "item" : "items"} added. Nothing in this browser was overwritten.` : "This browser's data was replaced with the backup.",
    });
    cancel();
  };

  return (
    <Card id="data" title="Your data in this browser" description="RuckOn has no accounts. Everything below is stored only in this browser on this device and doesn't sync to other devices or browsers.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Data stored by RuckOn in this browser</caption>
          <thead className="text-xs text-ink-2">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Data</th>
              <th className="py-1.5 pr-3 font-medium">Stored</th>
              <th className="py-1.5 text-right font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.section} className="border-t border-line">
                <td className="py-2 pr-3 text-ink">{DATA_SECTIONS[r.section].label}</td>
                <td className="py-2 pr-3 text-ink-2">{r.count}</td>
                <td className="py-2 text-right tabular-nums text-ink-2">{kb(sizes[r.section])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-2">
        Clearing this site&apos;s data in your browser, or using a private window, removes it. Export a backup to keep a copy or move to another device.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line p-4">
          <h3 className="text-sm font-semibold text-ink">Export a backup</h3>
          <p className="mt-1 text-sm text-ink-2">A JSON file (backup version 1) with your AFT history, training plans and completed workouts, profile, and app preferences.</p>
          <button type="button" onClick={exportBackup} className={buttonClass("primary", "mt-3")}>
            <Download className="h-4 w-4" aria-hidden />
            Export all data
          </button>
        </div>
        <div className="rounded-lg border border-line p-4">
          <h3 className="text-sm font-semibold text-ink">Import a backup</h3>
          <p className="mt-1 text-sm text-ink-2">You&apos;ll see what will change and choose merge or replace before anything is saved.</p>
          <label htmlFor={fileId} className={buttonClass("secondary", "mt-3 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-accent")}>
            <FileUp className="h-4 w-4" aria-hidden />
            Choose backup file
            <input
              id={fileId}
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="mt-4">
        <StatusLine notice={notice} />
      </div>

      {pending && plan && (
        <section aria-labelledby="import-preview" className="mt-4 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <h3 id="import-preview" className="text-sm font-semibold text-ink">
            Import preview: {pending.fileName}
          </h3>
          <p className="mt-1 text-xs text-ink-2">
            Exported {formatTestDate(pending.backup.exportedAt.slice(0, 10))} from RuckOn {pending.backup.appVersion}. Nothing has been saved yet.
          </p>

          <fieldset className="mt-3 text-sm">
            <legend className="text-ink-2">How to import</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2">
                <input type="radio" name="import-mode" checked={mode === "merge"} onChange={() => (setMode("merge"), setConfirmed(false))} className="mt-1 accent-[var(--color-accent)]" />
                <span>
                  <span className="font-medium text-ink">Merge</span>
                  <span className="block text-xs text-ink-2">Add records that aren&apos;t here yet. Nothing in this browser is overwritten or removed.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => (setMode("replace"), setConfirmed(false))} className="mt-1 accent-[var(--color-accent)]" />
                <span>
                  <span className="font-medium text-ink">Replace</span>
                  <span className="block text-xs text-ink-2">Remove all RuckOn data in this browser and use the backup&apos;s data instead.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <ul aria-label="Changes this import would make" className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface text-sm">
            {plan.changes.map((c) => (
              <li key={c.section} className="px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-ink">{c.label}</span>
                  <span className="tabular-nums text-ink-2">
                    {c.before} <span aria-hidden>→</span>
                    <span className="sr-only">becomes</span> <span className="font-semibold text-ink">{c.after}</span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">
                  {[
                    mode === "replace" ? (c.removed || c.added ? `${c.removed} removed, ${c.added} from backup` : "") : c.added ? `${c.added} added` : "",
                    c.duplicates ? `${c.duplicates} already here` : "",
                    c.conflicts ? `${c.conflicts} kept from this browser (different in backup)` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No change"}
                </p>
                {c.notes.map((n) => (
                  <p key={n} className="mt-0.5 text-xs text-ink-2">
                    {n}
                  </p>
                ))}
              </li>
            ))}
          </ul>

          {mode === "replace" && plan.newerLocal > 0 && (
            <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
              This browser has {plan.newerLocal} {plan.newerLocal === 1 ? "record" : "records"} saved after this backup was made. Replacing removes{" "}
              {plan.newerLocal === 1 ? "it" : "them"}.
            </p>
          )}
          {!plan.changed && <p className="mt-3 text-sm text-ink">This backup wouldn&apos;t change anything in this browser.</p>}

          {needsConfirm && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={() => setConfirmed(!confirmed)} className="mt-1 accent-[var(--color-accent)]" />
              I understand that replacing removes the data now in this browser.
            </label>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={apply} disabled={!plan.changed || (needsConfirm && !confirmed)} className={buttonClass()}>
              {mode === "merge" ? "Merge backup" : "Replace my data"}
            </button>
            {mode === "replace" && (
              <button type="button" onClick={exportBackup} className={buttonClass("secondary")}>
                <Download className="h-4 w-4" aria-hidden />
                Export current data first
              </button>
            )}
            <button type="button" onClick={cancel} className={buttonClass("ghost")}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

const DELETE_DETAILS: Record<DataSection, string> = {
  aftResults: "Removes every saved AFT result. Training plans keep their own copy of the baseline result.",
  training: "Removes all training plans, including the active plan, and every completed-workout record.",
  profile: "Removes your profile. AFT history and training plans are kept.",
  settings: "Resets start page and dashboard defaults. Nothing else changes.",
};

const DELETE_LABELS: Record<DataSection, string> = {
  aftResults: "Delete AFT history",
  training: "Delete training plans and completions",
  profile: "Delete profile",
  settings: "Reset app preferences",
};

function DeleteCard({ appVersion }: { appVersion: string }) {
  const exportBackup = useExport(appVersion);
  const local = useLocalData();
  const [open, setOpen] = useState<DataSection | "all" | null>(null);
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const has: Record<DataSection, boolean> = {
    aftResults: local.aftResults.length > 0,
    training: local.training.plans.length > 0 || local.training.completions.length > 0,
    profile: !!local.profile,
    settings: !!local.settings,
  };
  const anything = Object.values(has).some(Boolean);

  const run = (sections: DataSection[], message: string) => {
    const result = deleteSections(sections);
    setNotice(result.ok ? { kind: "ok", message } : { kind: "error", message: result.error });
    setOpen(null);
    setTyped("");
  };

  const confirmPanel = (id: DataSection | "all", text: string, action: () => void, requireTyping = false) => (
    <div role="group" aria-label={`Confirm: ${id === "all" ? "delete all local app data" : DELETE_LABELS[id]}`} className="mt-3 rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm">
      <p className="text-ink">{text} This can&apos;t be undone.</p>
      {requireTyping && (
        <label className="mt-3 block">
          <span className="text-ink-2">Type DELETE to confirm</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          ref={(el) => el?.focus()}
          onClick={exportBackup}
          className={buttonClass("secondary")}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export backup first
        </button>
        <button type="button" onClick={action} disabled={requireTyping && typed.trim() !== "DELETE"} className={buttonClass("primary", "bg-bad text-white hover:bg-bad/90")}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {id === "all" ? "Delete all local app data" : DELETE_LABELS[id]}
        </button>
        <button type="button" onClick={() => (setOpen(null), setTyped(""))} className={buttonClass("ghost")}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <Card id="delete" title="Delete data" description="Each control removes only the data it names. Other sites and other browser storage are never touched.">
      <ul className="divide-y divide-line">
        {(Object.keys(DELETE_LABELS) as DataSection[]).map((s) => (
          <li key={s} className="py-3 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{DATA_SECTIONS[s].label}</p>
                <p className="text-xs text-ink-2">{DELETE_DETAILS[s]}</p>
              </div>
              <button
                type="button"
                onClick={() => (setOpen(s), setNotice(null))}
                disabled={!has[s] || open === s}
                aria-expanded={open === s}
                className={buttonClass("secondary", "text-bad")}
              >
                {DELETE_LABELS[s]}
              </button>
            </div>
            {open === s && confirmPanel(s, DELETE_DETAILS[s], () => run([s], `${DATA_SECTIONS[s].label} deleted from this browser.`))}
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-lg border border-bad/40 p-4">
        <h3 className="text-sm font-semibold text-bad">Delete all local app data</h3>
        <p className="mt-1 text-sm text-ink-2">
          Removes your AFT history, training plans and completed workouts, profile, and app preferences from this browser. Only RuckOn&apos;s own
          data is removed.
        </p>
        <button
          type="button"
          onClick={() => (setOpen("all"), setNotice(null))}
          disabled={!anything || open === "all"}
          aria-expanded={open === "all"}
          className={buttonClass("secondary", "mt-3 text-bad")}
        >
          Delete all local app data
        </button>
        {open === "all" &&
          confirmPanel(
            "all",
            "Everything RuckOn stores in this browser will be removed.",
            () => run(["aftResults", "training", "profile", "settings"], "All RuckOn data was deleted from this browser."),
            true
          )}
      </div>

      <div className="mt-4">
        <StatusLine notice={notice} />
      </div>
    </Card>
  );
}
