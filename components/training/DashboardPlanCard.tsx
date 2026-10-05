"use client";

import Link from "next/link";
import { formatTestDate } from "@/lib/aft/format";
import { activePlan, useTrainingData } from "@/lib/storage/trainingPlans";
import { adherence, compareWithBaseline, currentWeek, nextSession } from "@/lib/training/progress";
import { formatSignedPoints } from "@/lib/aft/format";
import { PLAN_WEEKS } from "@/lib/training/templates";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { useToday } from "./PlanParts";

export default function DashboardPlanCard({ latestResultId }: { latestResultId: string }) {
  const data = useTrainingData();
  const today = useToday();
  const plan = activePlan(data);
  if (!today) return null;

  if (!plan) {
    return (
      <Card title="Training plan" description="No active plan. Plans start from a saved AFT result and are stored in this browser.">
        <ButtonLink href={`/training-plan/new?baseline=${latestResultId}`}>Suggest training plan</ButtonLink>
      </Card>
    );
  }

  const stats = adherence(plan, data.completions, today);
  const week = currentWeek(plan, today);
  const next = nextSession(plan, data.completions, today);
  const thisWeek = stats.weeks.find((w) => w.week === week);

  return (
    <Card
      title="Training plan"
      description={`Baseline from ${formatTestDate(plan.baseline.testDate)} · ${week <= PLAN_WEEKS ? `week ${week} of ${PLAN_WEEKS}` : "plan finished"}`}
      action={
        <Link href="/training-plan" className="text-sm font-medium text-accent-ink hover:underline">
          Open plan
        </Link>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-2">Completed of scheduled so far</dt>
          <dd className="text-2xl font-semibold text-ink">
            {stats.completedOfScheduled} / {stats.scheduledToDate}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">This week</dt>
          <dd className="text-2xl font-semibold text-ink">{thisWeek ? `${thisWeek.completed} / ${thisWeek.scheduled}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Next workout</dt>
          <dd className="text-sm text-ink">
            {next ? (
              <>
                <span className="font-semibold">{next.session.title}</span>
                <span className="block text-ink-2">
                  {next.date === today ? "Today" : formatTestDate(next.date)} · about {next.session.estimatedMinutes} min
                </span>
              </>
            ) : (
              "No upcoming sessions"
            )}
          </dd>
        </div>
      </dl>
      {plan.reassessmentLink ? (
        <p className="mt-4 text-sm text-ink">
          Reassessment linked: {formatTestDate(plan.reassessmentLink.testDate)}
          {(() => {
            const cmp = compareWithBaseline(plan.baseline, plan.reassessmentLink!);
            return cmp.totalChange !== null ? `, total ${formatSignedPoints(cmp.totalChange)} vs baseline` : " (different scoring category, so points aren't compared)";
          })()}
          .
        </p>
      ) : (
        week > PLAN_WEEKS && (
          <p className="mt-4 text-sm text-ink">
            Plan finished. Record a practice AFT and{" "}
            <Link href="/training-plan" className="font-semibold text-accent-ink underline">
              link it as your reassessment
            </Link>
            .
          </p>
        )
      )}
    </Card>
  );
}
