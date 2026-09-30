import type { Metadata } from "next";
import AftCalculator from "@/components/aft/AftCalculator";

export const metadata: Metadata = { title: "AFT Calculator" };

export default function AftCalculatorPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase text-yellow-400">AFT Calculator</h1>
        <p className="mt-2 text-zinc-400">
          Enter raw Army Fitness Test results. Points use the official score tables effective 1 June 2025.
        </p>
      </div>
      <AftCalculator />
    </div>
  );
}
