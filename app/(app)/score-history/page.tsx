import type { Metadata } from "next";
import ScoreHistory from "@/components/aft/ScoreHistory";
import { PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "History" };

export default function ScoreHistoryPage() {
  return (
    <div>
      <PageHeader
        title="History"
        description="Every saved AFT result, newest first, with changes since earlier tests."
        actions={<ButtonLink href="/aft-calculator">Record AFT</ButtonLink>}
      />
      <ScoreHistory />
    </div>
  );
}
