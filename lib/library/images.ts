// Official demonstration photographs from ATP 7-22.02, Holistic Health and Fitness Drills and Exercises
// (October 2020, incorporating Change 1). The publication is approved for public release with unlimited
// distribution; its photos were developed by the U.S. Army Center for Initial Military Training (ATP
// Acknowledgements). Each image is the full printed figure, cropped to the figure area with the frame line
// removed. Nothing inside a figure is cropped, retouched, or rearranged. Each was checked against its caption.

export type ExerciseFigure = {
  exerciseId: string;
  src: string;
  width: number;
  height: number;
  figure: string; // ATP figure number
  caption: string; // official caption, as printed
  page: string; // printed page number
};

export const FIGURE_SOURCE = "ATP 7-22.02 (U.S. Army, Oct 2020, incl. C1)";
export const FIGURE_CREDIT = "Photos: U.S. Army Center for Initial Military Training, ATP 7-22.02. Approved for public release.";

export const exerciseFigures: ExerciseFigure[] = [
  { exerciseId: "bend-and-reach", src: "/images/exercises/bend-and-reach.jpg", width: 1600, height: 702, figure: "3-1", caption: "PD1 Bend and Reach", page: "3-1" },
  { exerciseId: "rear-lunge", src: "/images/exercises/rear-lunge.jpg", width: 1600, height: 349, figure: "3-2", caption: "PD2 Rear Lunge", page: "3-2" },
  { exerciseId: "rear-lunge", src: "/images/exercises/rear-lunge-technique.jpg", width: 1068, height: 1268, figure: "3-3", caption: "PD2 Proper technique to execute the Rear Lunge", page: "3-2" },
  { exerciseId: "high-jumper", src: "/images/exercises/high-jumper.jpg", width: 1171, height: 1374, figure: "3-4", caption: "PD3 High Jumper", page: "3-3" },
  { exerciseId: "rower", src: "/images/exercises/rower.jpg", width: 1600, height: 208, figure: "3-5", caption: "PD4 Rower", page: "3-4" },
  { exerciseId: "rower", src: "/images/exercises/rower-technique.jpg", width: 1600, height: 946, figure: "3-6", caption: "PD4 Proper technique to execute the Rower", page: "3-4" },
  { exerciseId: "squat-bender", src: "/images/exercises/squat-bender.jpg", width: 1412, height: 1244, figure: "3-7", caption: "PD5 Squat Bender", page: "3-5" },
  { exerciseId: "windmill", src: "/images/exercises/windmill.jpg", width: 1600, height: 278, figure: "3-8", caption: "PD6 Windmill", page: "3-6" },
  { exerciseId: "windmill", src: "/images/exercises/windmill-technique.jpg", width: 1600, height: 779, figure: "3-9", caption: "PD6 Proper technique to execute the Windmill", page: "3-6" },
  { exerciseId: "forward-lunge", src: "/images/exercises/forward-lunge.jpg", width: 1600, height: 1304, figure: "3-10", caption: "PD7 Forward Lunge", page: "3-7" },
  { exerciseId: "prone-row", src: "/images/exercises/prone-row.jpg", width: 1600, height: 584, figure: "3-11", caption: "PD8 Prone Row", page: "3-8" },
  { exerciseId: "bent-leg-body-twist", src: "/images/exercises/bent-leg-body-twist.jpg", width: 1590, height: 1197, figure: "3-12", caption: "PD9 Bent-Leg Body Twist", page: "3-9" },
  { exerciseId: "push-up", src: "/images/exercises/push-up.jpg", width: 1600, height: 572, figure: "3-13", caption: "PD10 Push-Up", page: "3-9" },
  { exerciseId: "bent-leg-raise", src: "/images/exercises/bent-leg-raise.jpg", width: 1486, height: 497, figure: "4-12", caption: "4C.1. Bent-Leg Raise", page: "4-9" },
  { exerciseId: "side-bridge", src: "/images/exercises/side-bridge.jpg", width: 1600, height: 626, figure: "4-13", caption: "4C.2. Side Bridge", page: "4-9" },
  { exerciseId: "back-bridge", src: "/images/exercises/back-bridge.jpg", width: 1600, height: 630, figure: "4-14", caption: "4C.3. Back Bridge", page: "4-10" },
  { exerciseId: "quadraplex", src: "/images/exercises/quadraplex.jpg", width: 1483, height: 1037, figure: "4-15", caption: "4C.4. Quadraplex", page: "4-11" },
  { exerciseId: "power-jump", src: "/images/exercises/power-jump.jpg", width: 1600, height: 1490, figure: "5-1", caption: "CD1.1 Power Jump", page: "5-2" },
  { exerciseId: "v-up", src: "/images/exercises/v-up.jpg", width: 1589, height: 650, figure: "5-2", caption: "CD1.2 V-Up", page: "5-3" },
  { exerciseId: "mountain-climber", src: "/images/exercises/mountain-climber.jpg", width: 1600, height: 985, figure: "5-3", caption: "CD1.3 Mountain Climber", page: "5-3" },
  { exerciseId: "leg-tuck-and-twist", src: "/images/exercises/leg-tuck-and-twist.jpg", width: 1600, height: 957, figure: "5-4", caption: "CD1.4 Leg-Tuck and Twist", page: "5-4" },
  { exerciseId: "single-leg-push-up", src: "/images/exercises/single-leg-push-up.jpg", width: 1600, height: 743, figure: "5-5", caption: "CD1.5 Single-Leg Push-up", page: "5-5" },
  { exerciseId: "turn-and-lunge", src: "/images/exercises/turn-and-lunge.jpg", width: 1223, height: 1580, figure: "5-11", caption: "CD2.1 Turn and Lunge", page: "5-10" },
  { exerciseId: "supine-bicycle", src: "/images/exercises/supine-bicycle.jpg", width: 1600, height: 560, figure: "5-12", caption: "CD2.2 Supine Bicycle", page: "5-11" },
  { exerciseId: "half-jack", src: "/images/exercises/half-jack.jpg", width: 1600, height: 650, figure: "5-13", caption: "CD2.3 Half Jack", page: "5-11" },
  { exerciseId: "swimmer", src: "/images/exercises/swimmer.jpg", width: 1600, height: 548, figure: "5-14", caption: "CD2.4 Swimmer", page: "5-12" },
  { exerciseId: "eight-count-t-push-up", src: "/images/exercises/eight-count-t-push-up.jpg", width: 1600, height: 1050, figure: "5-15", caption: "CD2.5 8-Count T-Push-Up", page: "5-13" },
  { exerciseId: "vertical", src: "/images/exercises/vertical.jpg", width: 1600, height: 719, figure: "8-1", caption: "MMD1.1 Vertical", page: "8-1" },
  { exerciseId: "lateral", src: "/images/exercises/lateral.jpg", width: 1600, height: 324, figure: "8-2", caption: "MMD1.2 Lateral", page: "8-2" },
  { exerciseId: "shuttle-sprint", src: "/images/exercises/shuttle-sprint.jpg", width: 1295, height: 1013, figure: "8-3", caption: "MMD1.3 Shuttle Sprint", page: "8-3" },
  { exerciseId: "sumo-squat", src: "/images/exercises/sumo-squat.jpg", width: 1600, height: 1172, figure: "13-1", caption: "STC1 Sumo Squat", page: "13-2" },
  { exerciseId: "straight-leg-deadlift", src: "/images/exercises/straight-leg-deadlift-stc.jpg", width: 1579, height: 1370, figure: "13-2", caption: "STC2 Straight-Leg Deadlift", page: "13-3" },
  { exerciseId: "deadlift", src: "/images/exercises/deadlift-bar.jpg", width: 1600, height: 360, figure: "14-3", caption: "FW3 Deadlift—straight bar", page: "14-4" },
  { exerciseId: "deadlift", src: "/images/exercises/deadlift-kettlebells.jpg", width: 1600, height: 564, figure: "14-4", caption: "FW3 Deadlift—kettlebells", page: "14-4" },
  { exerciseId: "straight-leg-deadlift", src: "/images/exercises/straight-leg-deadlift-fw.jpg", width: 1600, height: 1020, figure: "14-5", caption: "FW3 Straight-Leg Deadlift", page: "14-5" },
  { exerciseId: "overhead-arm-pull", src: "/images/exercises/overhead-arm-pull.jpg", width: 1600, height: 730, figure: "16-1", caption: "RD1 Overhead Arm Pull", page: "16-1" },
  { exerciseId: "rear-lunge", src: "/images/exercises/rd-rear-lunge.jpg", width: 1425, height: 1695, figure: "16-2", caption: "RD2 Rear Lunge", page: "16-2" },
  { exerciseId: "extend-and-flex", src: "/images/exercises/extend-and-flex.jpg", width: 1600, height: 274, figure: "16-3", caption: "RD3 Extend and Flex", page: "16-3" },
  { exerciseId: "thigh-stretch", src: "/images/exercises/thigh-stretch.jpg", width: 1600, height: 483, figure: "16-4", caption: "RD4 Thigh Stretch", page: "16-3" },
  { exerciseId: "single-leg-over", src: "/images/exercises/single-leg-over.jpg", width: 1600, height: 981, figure: "16-5", caption: "RD5 Single-Leg Over", page: "16-4" },
  { exerciseId: "groin-stretch", src: "/images/exercises/groin-stretch.jpg", width: 1600, height: 739, figure: "16-6", caption: "RD6 Groin Stretch", page: "16-5" },
  { exerciseId: "calf-stretch", src: "/images/exercises/calf-stretch.jpg", width: 1600, height: 565, figure: "16-7", caption: "RD7 Calf Stretch", page: "16-5" },
  { exerciseId: "hamstring-stretch", src: "/images/exercises/hamstring-stretch.jpg", width: 1232, height: 580, figure: "16-8", caption: "RD8 Hamstring Stretch", page: "16-6" },
  // Added 2026-10-02 for the General Fitness view: Conditioning Drill 3, Strength Training Circuit, Free Weight Training.
  { exerciseId: "forward-lunge", src: "/images/exercises/forward-lunge-stc.jpg", width: 1575, height: 1739, figure: "13-3", caption: "STC3 Forward Lunge", page: "13-4" },
  { exerciseId: "step-up", src: "/images/exercises/step-up.jpg", width: 1600, height: 1659, figure: "13-4", caption: "STC4 8-Count Step-up", page: "13-5" },
  { exerciseId: "supine-chest-press", src: "/images/exercises/supine-chest-press.jpg", width: 1586, height: 761, figure: "13-7", caption: "STC6 Supine Chest Press", page: "13-7" },
  { exerciseId: "bent-over-row", src: "/images/exercises/bent-over-row-stc.jpg", width: 1600, height: 660, figure: "13-8", caption: "STC7 Bent-Over Row", page: "13-8" },
  { exerciseId: "overhead-push-press", src: "/images/exercises/overhead-push-press-stc.jpg", width: 1600, height: 689, figure: "13-9", caption: "STC8 Overhead Push-Press", page: "13-9" },
  { exerciseId: "supine-body-twist", src: "/images/exercises/supine-body-twist.jpg", width: 1600, height: 260, figure: "13-10", caption: "STC9 Supine Body Twist", page: "13-9" },
  { exerciseId: "front-squat", src: "/images/exercises/front-squat.jpg", width: 1564, height: 1726, figure: "14-1", caption: "FW1 Front Squat", page: "14-2" },
  { exerciseId: "back-squat", src: "/images/exercises/back-squat.jpg", width: 1600, height: 796, figure: "14-2", caption: "FW2 Back Squat", page: "14-3" },
  { exerciseId: "bench-press", src: "/images/exercises/bench-press-bar.jpg", width: 1600, height: 754, figure: "14-6", caption: "FW4 Bench Press—straight bar", page: "14-6" },
  { exerciseId: "bench-press", src: "/images/exercises/bench-press-dumbbell.jpg", width: 1600, height: 862, figure: "14-7", caption: "FW4 Bench Press—dumbbell", page: "14-7" },
  { exerciseId: "heel-raise", src: "/images/exercises/heel-raise.jpg", width: 1600, height: 1704, figure: "14-12", caption: "FW7 Heel Raise", page: "14-11" },
  { exerciseId: "bent-over-row", src: "/images/exercises/bent-over-row-fw.jpg", width: 1600, height: 1020, figure: "14-13", caption: "FW8 Bent-Over Row", page: "14-12" },
  { exerciseId: "single-arm-bent-over-row", src: "/images/exercises/single-arm-bent-over-row.jpg", width: 1600, height: 412, figure: "14-14", caption: "FW9 Single-Arm Bent-Over Row", page: "14-13" },
  { exerciseId: "overhead-push-press", src: "/images/exercises/overhead-push-press-fw.jpg", width: 1600, height: 623, figure: "14-17", caption: "FW11 Overhead Push-Press", page: "14-15" },
  { exerciseId: "single-leg-deadlift", src: "/images/exercises/single-leg-deadlift.jpg", width: 1599, height: 1562, figure: "5-17", caption: "CD3.2 Single-Leg Deadlift", page: "5-15" },
  { exerciseId: "half-squat-laterals", src: "/images/exercises/half-squat-laterals.jpg", width: 1600, height: 1340, figure: "5-22", caption: "CD3.7 Half-Squat Laterals", page: "5-20" },
];

// The figure used as a card thumbnail when an exercise has more than one. Chosen for proportions that fit
// the card without cropping; otherwise the first figure is used.
const THUMBNAILS: Record<string, string> = {
  "rear-lunge": "3-3",
  "rower": "3-6",
  "windmill": "3-9",
  "straight-leg-deadlift": "13-2",
  "deadlift": "14-3",
  "bent-over-row": "13-8",
  "overhead-push-press": "13-9",
};

export function figuresFor(exerciseId: string): ExerciseFigure[] {
  return exerciseFigures.filter((f) => f.exerciseId === exerciseId);
}

// Within a drill section, prefer that drill's own figure (Rear Lunge shows figure 16-2 under the Recovery
// Drill and 3-3 under the Preparation Drill). Captions start with the drill abbreviation, e.g. "RD2".
export function figuresInDrill(exerciseId: string, drillAbbreviation?: string): ExerciseFigure[] {
  const all = figuresFor(exerciseId);
  const own = drillAbbreviation ? all.filter((f) => new RegExp(`^${drillAbbreviation}[0-9.]`).test(f.caption)) : [];
  return own.length ? own : all;
}

export function thumbnailFor(exerciseId: string, drillAbbreviation?: string): ExerciseFigure | undefined {
  const figures = figuresInDrill(exerciseId, drillAbbreviation);
  return figures.find((f) => f.figure === THUMBNAILS[exerciseId]) ?? figures[0];
}

export function figureAlt(exerciseName: string, figure: ExerciseFigure): string {
  return `${exerciseName}: official ATP 7-22.02 photo sequence (figure ${figure.figure}, ${figure.caption}) showing the positions of the exercise in order.`;
}
