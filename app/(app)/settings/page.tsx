import type { Metadata } from "next";
import pkg from "@/package.json";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { Card, PageHeader } from "@/components/ui/Card";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { aftRulesSource } from "@/lib/aft/rules";
import { TEMPLATE_VERSION } from "@/lib/training/templates";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import { formatTestDate } from "@/lib/aft/format";

export const metadata: Metadata = {
  title: "Settings",
  description: "App preferences, backup and restore, data deletion, privacy, and version information for RuckOn Fitness.",
};

// Build details are read when the page is built. Vercel provides the commit for Git deployments;
// local builds don't have one.
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
const builtAt = new Date().toISOString();

const sections = [
  ["preferences", "App preferences"],
  ["profile", "Profile"],
  ["data", "Your data"],
  ["delete", "Delete data"],
  ["privacy", "Privacy"],
  ["about", "About"],
  ["help", "Help"],
] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-line py-2 text-sm first:border-t-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Preferences, backups, and data stored by RuckOn in this browser." />

      <nav aria-label="Settings sections" className="-mt-2 flex flex-wrap gap-2 text-sm">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line px-3 py-1 text-ink-2 hover:border-line-strong hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <SettingsPanel appVersion={pkg.version} />

      <Card id="privacy" title="Privacy">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
          <li>
            RuckOn has no accounts and no server database. Your AFT results, training plans and completed workouts, profile, and app preferences
            are saved in this browser&apos;s local storage on this device.
          </li>
          <li>That data isn&apos;t sent to RuckOn or anyone else. It stays until you delete it here or clear this site&apos;s data in your browser.</li>
          <li>
            The profile asks only for what scoring and plans need. RuckOn doesn&apos;t collect military identifiers, diagnoses, or medical documents.
          </li>
          <li>Backup files contain the same data in readable form. Store them somewhere you trust.</li>
          <li>Like any website, the hosting provider receives standard request information (such as IP address) when pages load.</li>
        </ul>
      </Card>

      <Card id="about" title="About RuckOn Fitness">
        <dl>
          <Row label="App version">{pkg.version}</Row>
          <Row label="Build">{commit ? `${commit} · ${formatTestDate(builtAt.slice(0, 10))}` : `Local build · ${formatTestDate(builtAt.slice(0, 10))}`}</Row>
          <Row label="Score tables">
            <a href={aftScoringFile.path} className="text-accent underline">
              {aftScoringFile.title}
            </a>{" "}
            (effective {formatTestDate(aftScoringFile.effectiveDate)})
          </Row>
          <Row label="Pass rules">
            <a href={aftRulesSource.url} className="text-accent underline">
              {aftRulesSource.publisher}, {formatTestDate(aftRulesSource.date)}
            </a>
          </Row>
          <Row label="Training plans">{TRAINING_PLANS_ENABLED ? "Enabled in this build" : "Preview examples only (awaiting professional review)"}</Row>
          <Row label="Plan template">{TEMPLATE_VERSION}</Row>
          <Row label="Backup format">Version 1</Row>
        </dl>
        <p className="mt-4 text-xs text-ink-2">
          Unofficial tool — not affiliated with or endorsed by the U.S. Army. Confirm official results with your unit.
        </p>
      </Card>

      <Card id="help" title="Help">
        <div className="space-y-2 text-sm">
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-medium text-ink">Why don&apos;t my results show on another device?</summary>
            <p className="mt-2 text-ink-2">
              Data is stored in this browser only. To move it, export a backup here, open RuckOn on the other device, and import the file under
              Your data.
            </p>
          </details>
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-medium text-ink">What does merge do with duplicates?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
              <li>Merge never overwrites or removes anything already in this browser.</li>
              <li>An AFT result with the same record ID, or the same test date and results, counts as a duplicate and is skipped.</li>
              <li>
                A record with the same ID but different content is a conflict. This browser&apos;s copy is kept and the preview shows how many.
              </li>
              <li>If both have an active training plan, the backup&apos;s plan is added as ended so only one plan is active.</li>
              <li>
                Completed workouts are imported only with their own plan, so every completion still points to the right plan and baseline.
              </li>
              <li>Your profile and app preferences are kept if they exist here; otherwise the backup&apos;s are used.</li>
            </ul>
          </details>
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-medium text-ink">When should I use replace?</summary>
            <p className="mt-2 text-ink-2">
              Replace makes this browser match the backup exactly, including removing anything saved here since the backup was made. The preview
              warns you when that would happen. Export your current data first if you might need it.
            </p>
          </details>
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-medium text-ink">Why was my backup rejected?</summary>
            <p className="mt-2 text-ink-2">
              RuckOn only imports complete backups it can read: backup version 1, with valid records in every section. Files from a newer version,
              edited files, and other JSON files are rejected, and nothing in this browser changes.
            </p>
          </details>
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-medium text-ink">Does restoring a backup change my scores?</summary>
            <p className="mt-2 text-ink-2">
              No. Each result keeps the scores, age, standard, and score table it was saved with, and each plan keeps its baseline copy. Nothing is
              rescored.
            </p>
          </details>
        </div>
      </Card>
    </div>
  );
}
