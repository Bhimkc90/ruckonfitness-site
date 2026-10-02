"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Info, Pencil, Trash2 } from "lucide-react";
import type { AftStandard, Gender } from "@/lib/aft/types";
import { aftStandardRules } from "@/lib/aft/rules";
import { columnLabel, formatTestDate } from "@/lib/aft/format";
import { localToday } from "@/lib/aft/validation";
import { useHydrated } from "@/lib/storage/aftResults";
import { deleteProfile, saveProfile, useProfile } from "@/lib/storage/profile";
import {
  MAX_NAME_LENGTH,
  ageOn,
  exportProfile,
  missingProfileInfo,
  profileToForm,
  validateProfileForm,
  type ProfileField,
  type ProfileFormValues,
  type SoldierProfile,
} from "@/lib/profile/profile";
import { WEEKDAYS, weekdayLabels } from "@/lib/training/engine";
import { equipmentOptions, experienceOptions, restrictionOptions, runningOptions } from "@/lib/training/options";
import type { RunningVolume, SessionMinutes, WeekdayId } from "@/lib/training/types";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import { Card, PageHeader } from "@/components/ui/Card";
import { useToday } from "@/components/training/PlanParts";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/form";


type Notice = { kind: "saved" | "deleted" | "error"; message: string } | null;

export default function ProfileEditor() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  if (!hydrated) return <div className="h-60 rounded-xl border border-card-line bg-surface shadow-sm" aria-busy="true" aria-label="Loading profile" />;

  const showForm = editing || !profile;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        description="Defaults for scoring new tests and for training-plan preferences. Everything is optional."
        actions={
          profile && !showForm ? (
            <button type="button" className={buttonClass()} onClick={() => {
                setEditing(true);
                setNotice(null);
              }}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit profile
            </button>
          ) : undefined
        }
      />

      <p className="flex gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden />
        Your profile stays in this browser only. It doesn&apos;t sync across devices and isn&apos;t sent anywhere. RuckOn doesn&apos;t ask for
        military identifiers, diagnoses, or medical documents.
      </p>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 text-sm ${notice.kind === "error" ? "text-bad" : "text-good"}`}
        >
          {notice.kind !== "error" && <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {notice.message}
        </p>
      )}

      {showForm ? (
        <ProfileForm
          profile={profile}
          onCancel={profile ? () => setEditing(false) : undefined}
          onSaved={() => {
            setEditing(false);
            setNotice({ kind: "saved", message: "Profile saved in this browser." });
          }}
        />
      ) : (
        <ProfileSummary profile={profile} onNotice={setNotice} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-line py-2 text-sm first:border-t-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

const notSet = <span className="text-ink-2">Not set</span>;

export function describeStandard(profile: SoldierProfile): string | null {
  if (!profile.standard) return null;
  const column = profile.standard === "combat" ? "Male | Combat (sex-neutral)" : profile.gender ? columnLabel(profile.gender) : "score table not set";
  return `${aftStandardRules[profile.standard].label} · ${column}`;
}

function ProfileSummary({ profile, onNotice }: { profile: SoldierProfile; onNotice: (n: Notice) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = useToday() ?? profile.updatedAt.slice(0, 10);
  const t = profile.training;
  const missing = missingProfileInfo(profile);
  const label = <T,>(list: { value: T; label: string }[], value: T | undefined) => list.find((o) => o.value === value)?.label;

  const handleExport = () => {
    const blob = new Blob([exportProfile(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruckon-profile-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    const result = deleteProfile();
    onNotice(result.ok ? { kind: "deleted", message: "Profile deleted. Your AFT history and training plans were kept." } : { kind: "error", message: result.error });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
      <Card title={profile.displayName || "Your profile"} description={profile.updatedAt ? `Last saved ${formatTestDate(profile.updatedAt.slice(0, 10))}.` : undefined}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">Scoring</h3>
        <dl className="mt-1">
          <Row
            label="Date of birth"
            value={profile.dateOfBirth ? `${formatTestDate(profile.dateOfBirth)} (age ${ageOn(profile.dateOfBirth, today)} today)` : notSet}
          />
          <Row label="Standard and score table" value={describeStandard(profile) ?? notSet} />
          <Row label="Next AFT" value={profile.nextAftDate ? formatTestDate(profile.nextAftDate) : notSet} />
          <Row label="Target score" value={profile.targetScore ?? notSet} />
        </dl>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-2">Training preferences</h3>
        <dl className="mt-1">
          <Row label="Training days" value={t.weekdays ? t.weekdays.map((d) => weekdayLabels[d].slice(0, 3)).join(", ") : notSet} />
          <Row label="Session length" value={t.sessionMinutes ? `${t.sessionMinutes} min` : notSet} />
          <Row
            label="Equipment"
            value={t.equipment ? (t.equipment.length ? t.equipment.map((e) => label(equipmentOptions, e)).join(", ") : "No equipment") : notSet}
          />
          <Row label="Place to run" value={t.runningAccess === undefined ? notSet : t.runningAccess ? "Yes" : "No"} />
          <Row label="Experience" value={label(experienceOptions, t.experience) ?? notSet} />
          <Row label="Recent running" value={label(runningOptions, t.recentRunning) ?? notSet} />
          <Row label="Movements to avoid" value={t.restrictions?.length ? t.restrictions.map((r) => label(restrictionOptions, r)).join("; ") : "None"} />
        </dl>
      </Card>

      <div className="space-y-5">
        <Card title="Missing information">
          {missing.length === 0 ? (
            <p className="text-sm text-ink">Your profile is complete.</p>
          ) : (
            <>
              <ul className="space-y-1 text-sm text-ink">
                {missing.map((m) => (
                  <li key={m.label}>
                    {m.label} <span className="text-xs text-ink-2">· {m.area === "scoring" ? "prefills the calculator" : "prefills training preferences"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-2">All optional. Training preferences are only needed when you ask for a plan.</p>
            </>
          )}
        </Card>

        <Card title="How your profile is used">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
            <li>
              <Link href="/aft-calculator" className="text-accent-ink hover:underline">
                Record AFT
              </Link>{" "}
              starts with your age on the test date, standard, and score table. You can change them for any single test.
            </li>
            <li>Saved results keep the details they were scored with. Editing your profile never rescores past tests.</li>
            <li>
              {TRAINING_PLANS_ENABLED
                ? "The training-plan wizard starts with your preferences and asks you to confirm them. Active plans keep the preferences they were created with."
                : "Training-plan preferences are saved for when personalized plans are released; they are in preview now."}
            </li>
          </ul>
        </Card>

        <Card title="Your data">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className={buttonClass("secondary")}>
              <Download className="h-4 w-4" aria-hidden />
              Export profile (JSON)
            </button>
            {!confirmDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass("ghost", "text-bad hover:text-bad")}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete profile
              </button>
            )}
          </div>
          {confirmDelete && (
            <div role="alertdialog" aria-label="Confirm profile deletion" className="mt-4 rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm">
              <p className="text-ink">
                Delete your profile from this browser? Your saved AFT results and training plans are kept. This can&apos;t be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={handleDelete} className={buttonClass("primary", "bg-bad text-white hover:bg-bad/90")}>
                  Delete profile
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass("secondary")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-2">The export contains only the fields on this page.</p>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function ProfileForm({ profile, onSaved, onCancel }: { profile: SoldierProfile | null; onSaved: () => void; onCancel?: () => void }) {
  const [values, setValues] = useState<ProfileFormValues>(() => profileToForm(profile));
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [saveError, setSaveError] = useState("");

  const set = <K extends ProfileField>(key: K, value: ProfileFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const handleSave = () => {
    const checked = validateProfileForm(values, localToday(), new Date().toISOString());
    if (!checked.ok) {
      setErrors(checked.errors);
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }
    const result = saveProfile(checked.profile);
    if (result.ok) onSaved();
    else setSaveError(result.error);
  };

  return (
    <form className="space-y-5" onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }} noValidate>
      <Card title="About you" description="Used to prefill the AFT calculator.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Display name (optional)" error={errors.displayName} hint="Shown on your dashboard. A nickname is fine.">
            <input
              value={values.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              maxLength={MAX_NAME_LENGTH + 10}
              autoComplete="nickname"
              className={inputClass}
            />
          </Field>
          <Field
            label="Date of birth (optional)"
            error={errors.dateOfBirth}
            hint="Used only to work out your age on each test date, including backdated tests and birthdays that change your age group."
          >
            <input type="date" value={values.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className={inputClass} />
          </Field>
          <Field label="AFT standard" error={errors.standard}>
            <select value={values.standard} onChange={(e) => set("standard", e.target.value as "" | AftStandard)} className={inputClass}>
              <option value="">Not set</option>
              <option value="general">General</option>
              <option value="combat">Combat</option>
            </select>
          </Field>
          <Field
            label="Sex (score table)"
            error={errors.gender}
            hint={values.standard === "combat" ? "The combat standard uses the sex-neutral Male | Combat column. Kept for tests you score under the general standard." : "Needed to choose the general-standard score table."}
          >
            <select value={values.gender} onChange={(e) => set("gender", e.target.value as "" | Gender)} className={inputClass}>
              <option value="">Not set</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </Field>
          {values.standard && <p className="text-xs text-ink-2 sm:col-span-2">{aftStandardRules[values.standard].label}: {aftStandardRules[values.standard].description}</p>}
          <Field label="Next AFT date (optional)" error={errors.nextAftDate}>
            <input type="date" value={values.nextAftDate} onChange={(e) => set("nextAftDate", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Target total score (optional)" error={errors.targetScore}>
            <input inputMode="numeric" value={values.targetScore} onChange={(e) => set("targetScore", e.target.value)} placeholder="e.g. 400" className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Training preferences" description="Optional until you ask for a training plan. The plan wizard asks you to confirm them.">
        <div className="grid gap-5 md:grid-cols-2">
          <fieldset className="text-sm md:col-span-2">
            <legend className="text-ink-2">Preferred training days ({values.weekdays.length} chosen; 2 to 5)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <label key={d} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${values.weekdays.includes(d) ? "border-accent" : "border-line"}`}>
                  <input
                    type="checkbox"
                    checked={values.weekdays.includes(d)}
                    onChange={() => set("weekdays", toggle<WeekdayId>(values.weekdays, d))}
                    className="accent-[var(--color-control)]"
                  />
                  {weekdayLabels[d].slice(0, 3)}
                </label>
              ))}
            </div>
            <FieldError message={errors.weekdays} />
          </fieldset>
          <fieldset className="text-sm">
            <legend className="text-ink-2">Session length</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {([30, 45, 60] as SessionMinutes[]).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input type="radio" name="minutes" checked={values.sessionMinutes === m} onChange={() => set("sessionMinutes", m)} className="accent-[var(--color-control)]" />
                  {m} min
                </label>
              ))}
              {values.sessionMinutes && (
                <button type="button" onClick={() => set("sessionMinutes", "")} className="text-xs text-ink-2 underline">
                  Clear
                </button>
              )}
            </div>
          </fieldset>
          <fieldset className="text-sm">
            <legend className="text-ink-2">Safe place to run (track or measured route)</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {[
                ["Yes", true],
                ["No", false],
              ].map(([label, value]) => (
                <label key={String(label)} className="flex items-center gap-2">
                  <input type="radio" name="running-access" checked={values.runningAccess === value} onChange={() => set("runningAccess", value as boolean)} className="accent-[var(--color-control)]" />
                  {label}
                </label>
              ))}
              {values.runningAccess !== null && (
                <button type="button" onClick={() => set("runningAccess", null)} className="text-xs text-ink-2 underline">
                  Clear
                </button>
              )}
            </div>
          </fieldset>
          <fieldset className="text-sm">
            <legend className="text-ink-2">Equipment you can use</legend>
            <div className="mt-2 space-y-1.5">
              {equipmentOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!values.equipment?.includes(o.value)}
                    onChange={() => set("equipment", toggle(values.equipment ?? [], o.value))}
                    className="accent-[var(--color-control)]"
                  />
                  {o.label}
                </label>
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.equipment !== null && values.equipment.length === 0}
                  onChange={() => set("equipment", values.equipment !== null && values.equipment.length === 0 ? null : [])}
                  className="accent-[var(--color-control)]"
                />
                No equipment
              </label>
            </div>
          </fieldset>
          <fieldset className="text-sm">
            <legend className="text-ink-2">Current training experience</legend>
            <div className="mt-2 space-y-1.5">
              {experienceOptions.map((o) => (
                <label key={o.value} className="flex items-start gap-2">
                  <input type="radio" name="experience" checked={values.experience === o.value} onChange={() => set("experience", o.value)} className="mt-1 accent-[var(--color-control)]" />
                  <span>
                    {o.label}
                    <span className="block text-xs text-ink-2">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Running in the last 4 weeks, on average" error={errors.recentRunning}>
            <select value={values.recentRunning} onChange={(e) => set("recentRunning", e.target.value as "" | RunningVolume)} className={inputClass}>
              <option value="">Not set</option>
              {runningOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="text-sm">
            <legend className="text-ink-2">Movements you must avoid, or have been told to avoid (optional)</legend>
            <div className="mt-2 space-y-1.5">
              {restrictionOptions.map((o) => (
                <label key={o.value} className="flex items-start gap-2">
                  <input type="checkbox" checked={values.restrictions.includes(o.value)} onChange={() => set("restrictions", toggle(values.restrictions, o.value))} className="mt-1 accent-[var(--color-control)]" />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-2">Movements only. Don&apos;t enter diagnoses or profile details.</p>
          </fieldset>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonClass()}>
          Save profile
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
            Cancel
          </button>
        )}
        {!profile && (
          <ButtonLink href="/dashboard" variant="ghost">
            Skip for now
          </ButtonLink>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-bad">
            {saveError}
          </p>
        )}
      </div>
      <p className="text-xs text-ink-2">Saving changes your defaults only. Saved AFT results and active training plans are not changed.</p>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-2">{hint}</span>}
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-bad">{message}</span>;
}
