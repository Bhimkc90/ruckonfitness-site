import type { Metadata } from "next";
import AftCalculator, { type CalculatorEvent } from "@/components/aft/AftCalculator";
import EventGuide from "@/components/aft-guide/EventGuide";
import { aftEvents } from "@/lib/aft/events";
import type { AftEventCode } from "@/lib/aft/types";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Record AFT" };

// Event names and the verified guides are rendered here on the server and handed to the calculator, which shows a
// guide in a drawer without leaving the form.
const events: CalculatorEvent[] = aftEvents.map((e) => ({ code: e.code, slug: e.slug, order: e.order ?? 0, name: e.name, abbreviation: e.code }));

export default function AftCalculatorPage() {
  const guides = Object.fromEntries(
    aftEvents.map((event) => [event.code, <EventGuide key={event.code} event={event} idPrefix={`calc-${event.slug}-`} level={3} />])
  ) as Record<AftEventCode, React.ReactNode>;

  return (
    <div>
      <PageHeader
        title="Record AFT"
        description="Enter raw Army Fitness Test results, then calculate your score from the official tables effective 1 June 2025. Nothing is saved until you choose to save it."
      />
      <AftCalculator events={events} guides={guides} />
    </div>
  );
}
