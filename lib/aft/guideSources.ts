// Official sources for the AFT Guide. Last checked 2026-10-02: the ATP 7-22.01 PDF on armypubs was unchanged
// (same file as checked 2026-09-30), and army.mil/aft still listed the same publications, score tables, and videos.

export const GUIDE_VERIFIED_ON = "2026-10-02";

export const guideSources = {
  atp72201: {
    id: "atp72201",
    number: "ATP 7-22.01",
    title: "Holistic Health and Fitness Testing",
    date: "12 March 2026",
    url: "https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN46104-ATP_7-22.01-000-WEB-1.pdf",
    status: "Current. Supersedes ATP 7-22.01, 1 October 2020.",
    distribution: "Approved for public release; distribution is unlimited.",
  },
  ad202607: {
    id: "ad202607",
    number: "Army Directive 2026-07",
    title: "Army Physical Fitness Standards",
    date: "17 April 2026 (armypubs record date)",
    url: "https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN46456-ARMY_DIR_2026-07-000-WEB-1.pdf",
    status:
      "Active. Supersedes Army Directive 2025-06 in part and controls where it conflicts with other Army regulations or directives.",
    distribution: "Published on the Army Publishing Directorate site.",
  },
  scoringScales: {
    id: "scoringScales",
    number: "AFT Scoring Scales",
    title: "Army Fitness Test Score Tables",
    date: "Approved 15 May 2025, effective 1 June 2025",
    url: "https://www.army.mil/aft/",
    status: "Listed as the current AFT scoring tables on army.mil/aft when checked.",
    distribution: "Published on army.mil/aft.",
  },
  armyAftSite: {
    id: "armyAftSite",
    number: "army.mil/aft",
    title: "Army Fitness Test website",
    date: "Checked 2 October 2026",
    url: "https://www.army.mil/aft/",
    status: "The ATP names this site for event descriptions and instructional videos.",
    distribution: "Public website.",
  },
} as const;

export type GuideSourceId = keyof typeof guideSources;

export const atp01 = (paragraphs: string, pages: string) => `ATP 7-22.01 (12 Mar 2026), para. ${paragraphs}, p. ${pages}`;

export const OFFICIAL_VIDEO_NOTE =
  "Official U.S. Army Holistic Health and Fitness video linked from army.mil/aft. It was titled for the ACFT and may predate the June 2025 AFT and the March 2026 ATP; where anything differs, follow ATP 7-22.01 (March 2026). RuckOn has not reviewed the video frame by frame.";
