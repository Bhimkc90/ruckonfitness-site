import type { AftEventCode } from "@/lib/aft/types";

// ---------------------------------------------------------------------------
// Sources and citations
// ---------------------------------------------------------------------------

export type SourceId = "atp-7-22-02-c1" | "fm-7-22-c2";

export type Source = {
  id: SourceId;
  number: string; // e.g. "ATP 7-22.02"
  title: string;
  publisher: string;
  edition: string; // edition and change as printed on the title page
  changeDate: string; // date printed on the change transmittal
  url: string;
  distribution: string;
  supersedes?: string;
  verifiedOn: string; // YYYY-MM-DD the content was checked against the publication
  notes?: string[];
};

export type SourceRef = {
  sourceId: SourceId;
  paragraphs: string; // e.g. "3-3"
  pages: string; // printed page numbers, e.g. "3-1"
  figure?: string;
};

// ---------------------------------------------------------------------------
// Official Army classifications (taken from the sources)
// ---------------------------------------------------------------------------

// ATP 7-22.02 chapter 1 groups physical training drills as preparation, activity, or recovery drills.
export type OfficialDrillCategory = "Preparation Drill" | "Activity Drill" | "Recovery Drill";

// FM 7-22 table 6-2 "H2F drills", Physical Component column.
export type OfficialPhysicalComponent = "Muscular Endurance" | "Anaerobic Endurance";

// ATP 7-22.02 para 1-17: slow = 50 counts per minute, moderate = 80. Recovery Drill stretches are held on command.
export type Cadence = "slow" | "moderate" | "hold";

// ---------------------------------------------------------------------------
// RuckOn editorial tags (app classifications, not Army terminology)
// ---------------------------------------------------------------------------

export type Purpose =
  | "strength"
  | "muscular-endurance"
  | "aerobic-endurance"
  | "anaerobic-conditioning"
  | "speed"
  | "agility"
  | "mobility-flexibility"
  | "balance-stability"
  | "recovery";

export type Phase = "warm-up" | "main" | "recovery";

export type Equipment = "none";

export type Impact = "no-jumping" | "jumping";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push"
  | "pull"
  | "trunk-flexion"
  | "trunk-rotation"
  | "trunk-extension"
  | "jump"
  | "locomotion"
  | "stretch";

export type Location = "open-ground";

export type Program = "army-h2f";

export type AftMapping = {
  events: AftEventCode[];
  // "app": RuckOn's mapping. "source-mention": the source text itself points at this kind of test demand.
  basis: "app" | "source-mention";
  note: string;
};

// ---------------------------------------------------------------------------
// Positions, exercises, drills, templates
// ---------------------------------------------------------------------------

export type PositionId =
  | "position-of-attention"
  | "straddle-stance"
  | "forward-leaning-stance"
  | "front-leaning-rest"
  | "prone"
  | "supine"
  | "sitting"
  | "squat";

export type Position = {
  id: PositionId;
  name: string;
  description?: string; // absent when the source names but does not define the position
  source?: SourceRef;
};

export type DrillId = "preparation-drill" | "conditioning-drill-1" | "conditioning-drill-2" | "recovery-drill";

export type ExecutionStep = {
  label: string; // "Count 1" or the command, e.g. "READY, STRETCH"
  text: string;
};

// How an exercise is performed inside one specific drill.
export type DrillExecution = {
  drillId: DrillId;
  position: PositionId;
  startingPosition: string;
  steps: ExecutionStep[];
  cadence: Cadence;
  // Repetitions or hold time printed for this exercise, if any.
  officialPrescription?: string;
  // Gaps or inconsistencies in the printed source, stated rather than filled in.
  sourceNotes?: string[];
  source: SourceRef;
};

export type Exercise = {
  id: string;
  name: string; // official name as printed
  summary: string; // concise original description
  officialPurpose: string; // paraphrase of what the source says the exercise develops
  focus: string[]; // primary body regions or qualities named by the source
  program: Program;
  executions: DrillExecution[];
  cues: string[];
  commonMistakes: string[]; // only when the source names them
  cautions: string[]; // only when the source supports them
  tags: {
    purposes: Purpose[];
    equipment: readonly Equipment[];
    impact: Impact;
    movementPatterns: MovementPattern[];
    locations: readonly Location[];
  };
  aft?: AftMapping;
  demonstrationUrl?: string; // only a verified, exercise-specific official link
  verification: { status: "verified"; checkedOn: string };
};

export type Drill = {
  id: DrillId;
  name: string;
  abbreviation: string;
  program: Program;
  officialCategory: OfficialDrillCategory;
  officialComponent: OfficialPhysicalComponent;
  summary: string;
  sequence: string[]; // exercise IDs in official order
  officialGuidance: { text: string; source: SourceRef }[];
  officialPrescription: { text: string; source: SourceRef };
  tags: { purposes: Purpose[]; phase: Phase };
  modifiedVersionNote?: string;
  sources: SourceRef[];
  verification: { status: "verified"; checkedOn: string };
};

export type TemplateBlock =
  | { kind: "drill"; drillId: DrillId; prescription: string }
  | { kind: "exercise"; exerciseId: string; prescription: string };

// App suggestions assembled from official drills; never presented as Army prescriptions.
export type WorkoutTemplate = {
  id: string;
  name: string;
  description: string;
  origin: "ruckon-suggestion";
  blocks: { phase: Phase; items: TemplateBlock[] }[];
  basis: { text: string; source: SourceRef }[];
};
