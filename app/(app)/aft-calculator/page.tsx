import type { Metadata } from "next";
import AftCalculator from "@/components/aft/AftCalculator";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Record AFT" };

export default function AftCalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Record AFT"
        description="Enter raw Army Fitness Test results to see your score from the official tables effective 1 June 2025. Nothing is saved until you choose to save it."
      />
      <AftCalculator />
    </div>
  );
}
