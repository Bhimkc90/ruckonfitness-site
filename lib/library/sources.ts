import type { Position, Source, SourceId, SourceRef } from "./types";

// Re-checked 2026-10-02: the armypubs ATP 7-22.02 PDF was byte-identical to the copy checked on 2026-09-29.
export const VERIFIED_ON = "2026-10-02";

export const sources: Record<SourceId, Source> = {
  "atp-7-22-02-c1": {
    id: "atp-7-22-02-c1",
    number: "ATP 7-22.02",
    title: "Holistic Health and Fitness Drills and Exercises",
    publisher: "Headquarters, Department of the Army",
    edition: "October 2020, incorporating Change 1",
    changeDate: "Change 1 transmittal dated 28 May 2025 (title page reads September 2025)",
    url: "https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN45013-ATP_7-22.02-001-WEB-4.pdf",
    distribution: "Approved for public release; distribution unlimited",
    supersedes: "Chapters 7–10 and appendixes B, C, and E of FM 7-22, 26 October 2012",
    verifiedOn: VERIFIED_ON,
    notes: [
      "The publication lists demonstration videos at the Central Army Registry (atiam.train.army.mil) and army.mil/aft; it does not give a link for each exercise.",
    ],
  },
  "fm-7-22-c2": {
    id: "fm-7-22-c2",
    number: "FM 7-22",
    title: "Holistic Health and Fitness",
    publisher: "Headquarters, Department of the Army",
    edition: "October 2020, incorporating Change 2",
    changeDate: "Change 2 dated 1 August 2025",
    url: "https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44522-FM_7-22-002-WEB-7.pdf",
    distribution: "Approved for public release; distribution is unlimited",
    supersedes: "Chapters 1–6 and appendix D of FM 7-22, 26 October 2012",
    verifiedOn: "2026-09-29",
    notes: ["Refers readers to ATP 7-22.02 for H2F drills and exercises."],
  },
};

export const atp = (paragraphs: string, pages: string, figure?: string): SourceRef => ({
  sourceId: "atp-7-22-02-c1",
  paragraphs,
  pages,
  ...(figure ? { figure } : {}),
});

export const fm = (paragraphs: string, pages: string): SourceRef => ({
  sourceId: "fm-7-22-c2",
  paragraphs,
  pages,
});

export function formatSourceRef(ref: SourceRef): string {
  const source = sources[ref.sourceId];
  const figure = ref.figure ? `, ${ref.figure}` : "";
  return `${source.number}, para. ${ref.paragraphs}, p. ${ref.pages}${figure}`;
}

// Starting positions used by the included drills (ATP 7-22.02 chapter 2).
export const positions: Record<Position["id"], Position> = {
  "position-of-attention": {
    id: "position-of-attention",
    name: "Position of Attention",
  },
  "straddle-stance": {
    id: "straddle-stance",
    name: "Straddle Stance",
    description: "Stand with the feet pointing ahead and shoulder-width apart.",
    source: atp("2-5", "2-3"),
  },
  "forward-leaning-stance": {
    id: "forward-leaning-stance",
    name: "Forward Leaning Stance",
    description:
      "Feet straight ahead under the shoulders, bent forward 45 degrees at the waist with the knees bent to 45 degrees and the back straight from head to hips.",
    source: atp("2-6", "2-3"),
  },
  "front-leaning-rest": {
    id: "front-leaning-rest",
    name: "Front Leaning Rest",
    description:
      "From the Squat, shift weight to the hands and thrust both feet back, landing with feet together. The body forms a straight line from heels to head without the hips dipping.",
    source: atp("2-3", "2-2"),
  },
  prone: {
    id: "prone",
    name: "Prone",
    description:
      "Lowered to the ground from the Front Leaning Rest, feet together or up to a boot's width apart, hands under the shoulders.",
    source: atp("2-7", "2-3"),
  },
  supine: {
    id: "supine",
    name: "Supine",
    description:
      "Lying on the back with legs together and the body aligned, reached from the Straddle Stance through Half-Kneeling and Sitting without using the hands.",
    source: atp("2-8 – 2-10", "2-3 – 2-4"),
  },
  sitting: {
    id: "sitting",
    name: "Sitting",
    description:
      "Seated with both legs straight and together, reached from Half-Kneeling without using the hands; hands then rest on the ground beside the hips, fingers forward.",
    source: atp("2-12", "2-4"),
  },
  "six-point-stance": {
    id: "six-point-stance",
    name: "Six-Point Stance",
    description: "A modified Front Leaning Rest: from the Front Leaning Rest, drop the knees to the ground with the toes pointed to the rear.",
    source: atp("2-4", "2-2"),
  },
  "side-lying": {
    id: "side-lying",
    name: "Side-lying",
  },
  squat: {
    id: "squat",
    name: "Squat",
    description:
      "A transition position: knees bent and hands on the ground between the knees, weight shared between the balls of the feet and the hands.",
    source: atp("2-2", "2-1"),
  },
};
