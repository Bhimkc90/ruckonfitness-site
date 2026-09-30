import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <Card>
        <p className="text-sm text-ink-2">App settings are currently in development.</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-4">
          Back to dashboard
        </ButtonLink>
      </Card>
    </div>
  );
}
