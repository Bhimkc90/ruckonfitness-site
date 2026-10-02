import type { Metadata } from "next";
import Link from "next/link";
import { aftEvents, aftGuideHref } from "@/lib/aft/events";
import { GUIDE_VERIFIED_ON } from "@/lib/aft/guideSources";
import {
  closeoutChecklist,
  equipmentSpecs,
  equipmentTable,
  fieldDiscrepancies,
  fieldLayout,
  personnelDependencies,
  roles,
  runCourse,
  safety,
  sequence,
  setupChecklist,
  timingRules,
  uniformRules,
  warmupRecovery,
} from "@/lib/aft/fieldSetup";
import { drillHref } from "@/lib/library";
import { Checklist, CitedList, EndorsementNote, GuideSection, GuideSourceList, Note, Ref } from "@/components/aft-guide/GuideBits";
import { FieldOverviewDiagram, SdcLaneDiagram, SdcSequenceDiagram } from "@/components/aft-guide/Diagrams";

export const metadata: Metadata = {
  title: "AFT field setup",
  description: "AFT equipment, lane dimensions, SDC layout, 2-mile course, timing, grader roles, and safety from ATP 7-22.01 (March 2026).",
};

const contents = [
  ["depends", "What depends on your unit"],
  ["equipment", "Equipment"],
  ["layout", "Field and lanes"],
  ["sdc", "SDC lane"],
  ["run", "2-mile course"],
  ["sequence", "Sequence and timing"],
  ["roles", "Roles"],
  ["areas", "Warm-up and recovery"],
  ["safety", "Safety"],
  ["checklists", "Checklists"],
];

export default function FieldSetupPage() {
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/aft-guide" className="hover:text-ink">
          AFT Guide
        </Link>{" "}
        / <span className="text-ink">Field setup</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">AFT field setup</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Equipment, layout, sequence, and roles for administering the Army Fitness Test, from ATP 7-22.01 (12 March 2026).
          The ATP makes all aspects of AFT administration the unit commander&apos;s responsibility.
        </p>
        <Ref>ATP 7-22.01 (12 Mar 2026), para. 2-1, p. 17</Ref>
      </header>

      <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {contents.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <GuideSection id="depends" title="What depends on your unit">
        <p className="mb-3 text-ink-2">
          The ATP fixes the grader ratio and lane dimensions but leaves the number of lanes, support personnel, and on-site
          medical support to commanders and local policy. Plan these for your group size rather than copying a fixed layout.
        </p>
        <CitedList items={personnelDependencies} />
      </GuideSection>

      <GuideSection id="equipment" title="Equipment checklist">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Single lane</th>
                <th className="py-2 pr-3 font-medium">16-lane set</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {equipmentTable.map((row) => (
                <tr key={row.item} className="border-t border-line align-top">
                  <td className="py-2 pr-3 font-medium">{row.item}</td>
                  <td className="py-2 pr-3 text-ink-2">{row.singleLane}</td>
                  <td className="py-2 pr-3 text-ink-2">{row.sixteenLanes}</td>
                  <td className="py-2 text-xs text-ink-2">{row.ref.replace("ATP 7-22.01 (12 Mar 2026), ", "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-4 rounded-lg border border-line bg-surface-2/40 p-3">
          <summary className="cursor-pointer font-medium">Equipment specifications</summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {equipmentSpecs.map((spec) => (
              <div key={spec.item}>
                <h3 className="font-semibold">{spec.item}</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
                  {spec.specs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <Ref>{spec.ref}</Ref>
              </div>
            ))}
          </div>
        </details>
        <details className="mt-3 rounded-lg border border-line bg-surface-2/40 p-3">
          <summary className="cursor-pointer font-medium">Uniform and prohibited items</summary>
          <div className="mt-3">
            <CitedList items={uniformRules} />
          </div>
        </details>
      </GuideSection>

      <GuideSection id="layout" title="Field and lane layout">
        <CitedList items={fieldLayout} />
        <div className="mt-4">
          <FieldOverviewDiagram />
        </div>
      </GuideSection>

      <GuideSection id="sdc" title="SDC lane layout and movement sequence">
        <p className="text-ink-2">
          Full event rules are on the{" "}
          <Link href={aftGuideHref("sprint-drag-carry")} className="text-accent-ink hover:underline">
            Sprint-Drag-Carry guide
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
          <SdcLaneDiagram />
          <SdcSequenceDiagram />
        </div>
      </GuideSection>

      <GuideSection id="run" title="2-mile course requirements">
        <CitedList items={runCourse} />
      </GuideSection>

      <GuideSection id="sequence" title="Testing sequence, timing, and rest">
        <ol className="space-y-2">
          {sequence.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-ink-2">{step.detail}</p>
                <Ref>{step.ref}</Ref>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="mt-5 font-semibold">Timing and rest rules</h3>
        <div className="mt-2">
          <CitedList items={timingRules} />
        </div>
      </GuideSection>

      <GuideSection id="roles" title="Grader and support roles">
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.role}>
              <h3 className="font-semibold">{role.role}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
                {role.duties.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
              <Ref>{role.ref}</Ref>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="areas" title="Warm-up and recovery areas">
        <CitedList items={warmupRecovery} />
        <p className="mt-3 text-ink-2">
          Drill instructions:{" "}
          <Link href={drillHref("preparation-drill")} className="text-accent-ink hover:underline">
            Preparation Drill
          </Link>{" "}
          ·{" "}
          <Link href={drillHref("recovery-drill")} className="text-accent-ink hover:underline">
            Recovery Drill
          </Link>
        </p>
      </GuideSection>

      <GuideSection id="safety" title="Safety and emergency preparation">
        <CitedList items={safety} />
        <div className="mt-3">
          <Note>The ATP does not prescribe a specific emergency action plan beyond the medical support plan and risk assessment; follow local policy.</Note>
        </div>
      </GuideSection>

      <GuideSection id="checklists" title="Setup and close-out checklists">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Before test day and setup</h3>
            <div className="mt-2">
              <Checklist items={setupChecklist} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Close-out and teardown</h3>
            <div className="mt-2">
              <Checklist items={closeoutChecklist} />
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Source notes">
        <p className="mb-3 text-ink-2">Inconsistencies in the official text are reported here rather than resolved:</p>
        <CitedList items={fieldDiscrepancies} />
      </GuideSection>

      <GuideSection title="Event guides">
        <ul className="flex flex-wrap gap-2">
          {aftEvents.map((event) => (
            <li key={event.code}>
              <Link href={aftGuideHref(event.slug)} className="inline-block rounded-full border border-line-strong px-3 py-1 hover:border-accent">
                {event.order}. {event.name}
              </Link>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection title="Sources">
        <GuideSourceList ids={["atp72201", "ad202607"]} />
        <Ref>Checked against the publications on {GUIDE_VERIFIED_ON}.</Ref>
        <div className="mt-3">
          <EndorsementNote />
        </div>
      </GuideSection>
    </div>
  );
}
