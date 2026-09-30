import { buildSamplePlans } from "@/lib/training/samples";
import SamplePlans from "./SamplePlans";

// Shown while the training-plan release flag is off. Sample plans are generated at build time from
// synthetic AFT results; personalized plans stay unavailable until the review is complete.
export default function UnderReview() {
  return <SamplePlans samples={buildSamplePlans()} />;
}
