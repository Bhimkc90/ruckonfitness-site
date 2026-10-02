import type { AftEventCode } from "./types";

// Official figures from ATP 7-22.01, Holistic Health and Fitness Testing (12 March 2026), chapter 2. The ATP is
// approved for public release with unlimited distribution. Each image is the figure as printed, cropped to the
// figure area. The printed frame line was removed; photos are not retouched, recolored, or rearranged. Captions
// are the official figure titles. Checked against the publication on 2026-10-02.

// Where a figure sits in the event guide: next to the starting position, beside one execution step (by the
// step's id in events.ts), or with the errors that stop or void a repetition.
export type FigurePlacement = { kind: "start" } | { kind: "step"; stepId: string } | { kind: "faults" };

export type AftGuideFigure = {
  event: AftEventCode;
  src: string;
  width: number;
  height: number;
  figure: string; // ATP figure number
  caption: string; // official title, as printed
  page: string; // printed page number
  alt: string;
  placement: FigurePlacement;
};

export const AFT_FIGURE_CREDIT =
  "Photos and illustrations: ATP 7-22.01, Holistic Health and Fitness Testing (U.S. Army, 12 March 2026). Approved for public release; distribution is unlimited.";

export const aftGuideFigures: AftGuideFigure[] = [
  {
    event: "MDL",
    src: "/images/aft/mdl-fig2-3.jpg",
    width: 1430,
    height: 1145,
    figure: "2-3",
    caption: "Maximum Deadlift",
    page: "27",
    alt: "A Soldier stands holding a loaded hex bar at full extension while a grader in uniform watches with a clipboard; other Soldiers lift in lanes behind them. Below, a photo sequence shows one Soldier lifting the hex bar from the ground to standing and lowering it again.",
    placement: { kind: "start" },
  },
  {
    event: "MDL",
    src: "/images/aft/mdl-fig2-4.jpg",
    width: 1495,
    height: 350,
    figure: "2-4",
    caption: "Proper technique to execute the Maximum Deadlift",
    page: "27",
    alt: "Overlapping photo sequence of one Soldier inside a hex bar: standing, bending at the knees and hips to grip the handles with a flat back, standing up with the bar, and lowering it back to the ground.",
    placement: { kind: "step", stepId: "lift" },
  },
  {
    event: "MDL",
    src: "/images/aft/mdl-fig2-7.jpg",
    width: 1403,
    height: 612,
    figure: "2-7",
    caption: "Touching the plates to the ground versus not touching the ground",
    page: "29",
    alt: "Two photos of a Soldier at the bottom of a hex-bar repetition: on the left the plates rest on the ground; on the right the plates are held just above the ground.",
    placement: { kind: "step", stepId: "lower" },
  },
  {
    event: "MDL",
    src: "/images/aft/mdl-fig2-5.jpg",
    width: 1524,
    height: 355,
    figure: "2-5",
    caption: "Knees moving closer together",
    page: "28",
    alt: "Three photos of a Soldier lifting a hex bar with the knees moving inward toward each other, shown from the side, the front, and at the top of the lift.",
    placement: { kind: "faults" },
  },
  {
    event: "MDL",
    src: "/images/aft/mdl-fig2-6.jpg",
    width: 1353,
    height: 676,
    figure: "2-6",
    caption: "Hips moving above the shoulders or rounding of the spine",
    page: "28",
    alt: "Two photos of a Soldier gripping a hex bar with the hips raised above the shoulders and the back rounded, viewed from the front-side and from the side.",
    placement: { kind: "faults" },
  },
  {
    event: "HRP",
    src: "/images/aft/hrp-fig2-9.jpg",
    width: 1600,
    height: 219,
    figure: "2-9",
    caption: "Proper technique to execute the Hand-Release Push-Up",
    page: "30",
    alt: "Photo sequence viewed from the front of one Soldier: lying prone, pushing up to the front leaning rest, lowering to the ground, extending both arms out to the sides in a T, and returning the hands under the shoulders.",
    placement: { kind: "start" },
  },
  {
    event: "HRP",
    src: "/images/aft/hrp-fig2-8.jpg",
    width: 1433,
    height: 775,
    figure: "2-8",
    caption: "Hand-Release Push-Up",
    page: "30",
    alt: "A Soldier lies prone on turf with both arms extended straight out to the sides in the hand-release position while a grader kneels beside the lane watching; another grader stands behind.",
    placement: { kind: "step", stepId: "release" },
  },
  {
    event: "SDC",
    src: "/images/aft/sdc-fig2-10.jpg",
    width: 1600,
    height: 659,
    figure: "2-10",
    caption: "Sprint-Drag-Carry",
    page: "33",
    alt: "Grey illustration of the five shuttles in order, each labeled 50 meters: sprint, drag (pulling a sled loaded with plates by its straps), lateral (side-stepping), carry (a kettlebell in each hand), and sprint.",
    placement: { kind: "start" },
  },
  {
    event: "SDC",
    src: "/images/aft/sdc-fig2-11.jpg",
    width: 1435,
    height: 348,
    figure: "2-11",
    caption: "Authorized strap handle grips",
    page: "33",
    alt: "Three close-up photos of a hand on the sled strap: fingers through the loop; the hand completely through the loop gripping the strap below the sewn portion; and the hand gripping below the loop at the sewn portion.",
    placement: { kind: "step", stepId: "drag" },
  },
  {
    event: "PLK",
    src: "/images/aft/plk-fig2-12.jpg",
    width: 1422,
    height: 733,
    figure: "2-12",
    caption: "Plank",
    page: "35",
    alt: "A Soldier holds a forearm plank with fists on the ground, elbows under the shoulders, and the body straight from head to heels on the toes, while a grader kneels nearby watching.",
    placement: { kind: "step", stepId: "hold" },
  },
  {
    event: "2MR",
    src: "/images/aft/2mr-fig2-13.jpg",
    width: 1431,
    height: 668,
    figure: "2-13",
    caption: "2-Mile Run",
    page: "37",
    alt: "A line of Soldiers in black PT uniforms crouch at a start line on pavement, ready to run, while a grader in uniform stands at the side.",
    placement: { kind: "start" },
  },
];

export function figuresForEvent(event: AftEventCode): AftGuideFigure[] {
  return aftGuideFigures.filter((f) => f.event === event);
}

export function figuresAt(event: AftEventCode, placement: FigurePlacement): AftGuideFigure[] {
  return figuresForEvent(event).filter(
    (f) => f.placement.kind === placement.kind && (f.placement.kind !== "step" || placement.kind !== "step" || f.placement.stepId === placement.stepId)
  );
}

// Very wide photo strips read better across the full width than beside text.
export const isWide = (figure: AftGuideFigure) => figure.width / figure.height > 3;
