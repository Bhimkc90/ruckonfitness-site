"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { aftStandardRules } from "@/lib/aft/rules";
import { formatTestDate } from "@/lib/aft/format";
import { useProfile } from "@/lib/storage/profile";
import { ageOn, missingProfileInfo } from "@/lib/profile/profile";
import { useToday } from "@/components/training/PlanParts";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

// Both dates are YYYY-MM-DD, which Date.parse reads as UTC midnight.
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export default function DashboardProfileCard({ latestTotal }: { latestTotal?: number }) {
  const profile = useProfile();
  const today = useToday();

  if (!profile) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-ink">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">Set up your profile</h2>
              <p className="mt-0.5 text-sm text-ink-2">Save your date of birth and standard so Record AFT fills them in. Stored only in this browser.</p>
            </div>
          </div>
          <ButtonLink href="/profile" variant="secondary">
            Create profile
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const missing = missingProfileInfo(profile);
  const scoringMissing = missing.filter((m) => m.area === "scoring").map((m) => m.label.toLowerCase());
  const trainingMissing = missing.filter((m) => m.area === "training").length;
  const upcoming = profile.nextAftDate && today && profile.nextAftDate >= today ? profile.nextAftDate : null;
  const facts = [
    profile.standard && `${aftStandardRules[profile.standard].label} standard`,
    profile.dateOfBirth && today && `age ${ageOn(profile.dateOfBirth, today)}`,
    upcoming && `next AFT ${formatTestDate(upcoming, "short")} (${daysBetween(today!, upcoming)} days)`,
    profile.targetScore !== undefined &&
      `target ${profile.targetScore}${latestTotal !== undefined ? ` · latest ${latestTotal}` : ""}`,
  ].filter(Boolean);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-ink">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{profile.displayName || "Your profile"}</h2>
            <p className="mt-0.5 text-sm text-ink-2">{facts.length ? facts.join(" · ") : "No details saved yet."}</p>
            {profile.nextAftDate && today && profile.nextAftDate < today && (
              <p className="mt-1 text-xs text-ink-2">Your saved next AFT date has passed. Update it in your profile.</p>
            )}
            {scoringMissing.length > 0 && (
              <p className="mt-1 text-xs text-accent-ink">Add {scoringMissing.join(", ")} to prefill Record AFT.</p>
            )}
            {trainingMissing > 0 && (
              <p className="mt-1 text-xs text-ink-2">
                {trainingMissing} training {trainingMissing === 1 ? "preference is" : "preferences are"} not set. They&apos;re only needed for a training plan.
              </p>
            )}
          </div>
        </div>
        <Link href="/profile" className="text-sm text-accent-ink hover:underline">
          {missing.length ? "Complete profile" : "Edit profile"}
        </Link>
      </div>
    </Card>
  );
}
