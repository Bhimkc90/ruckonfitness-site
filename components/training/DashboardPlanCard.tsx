"use client";

import Link from "next/link";
import { formatTestDate } from "@/lib/aft/format";
import { activePlan, useTrainingData } from "@/lib/storage/trainingPlans";
import { adherence, currentWeek, nextSession } from "@/lib/training/progress";
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
      description={`Baseline from ${formatTestDate(plan.baseline.testDate)} · ${week <= 4 ? `week ${week} of 4` : "plan finished"}`}
      action={
        <Link href="/training-plan" className="text-sm font-medium text-accent hover:underline">
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
    </Card>
  );
}
