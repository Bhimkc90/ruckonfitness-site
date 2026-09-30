import type { Exercise } from "./types";
import { VERIFIED_ON, atp } from "./sources";

const base = {
  program: "army-h2f",
  verification: { status: "verified", checkedOn: VERIFIED_ON },
} as const;

const stretchTags = {
  equipment: ["none"],
  locations: ["open-ground"],
  impact: "no-jumping",
} as const;

const HOLD = "Hold each position 20–30 seconds.";

// Recovery Drill exercises (ATP 7-22.02 chapter 16). Rear Lunge is shared with the Preparation Drill.
export const recoveryExercises: Exercise[] = [
  {
    ...base,
    id: "overhead-arm-pull",
    name: "Overhead Arm Pull",
    summary: "A standing side lean that pulls one raised arm overhead to stretch the back of the arm and the side.",
    officialPurpose: "Develops flexibility of the joints in the arms, shoulders, and trunk.",
    focus: ["Triceps", "Shoulders", "Flank"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Raise the left arm overhead, grasp above the left elbow with the right hand, and pull right while leaning right. Feel the stretch in the left triceps and flank. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          { label: "CHANGE POSITION, READY, STRETCH", text: "Repeat on the right side." },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: HOLD,
        source: atp("16-3", "16-1", "Figure 16-1"),
      },
    ],
    cues: ["Grasp above the elbow, not the forearm.", "Lean with the pull to feel the stretch in the triceps and flank."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch"] },
  },
  {
    ...base,
    id: "extend-and-flex",
    name: "Extend and Flex",
    summary: "From the Front Leaning Rest, sag the hips to stretch the front of the body, then raise them to stretch the back of the legs.",
    officialPurpose: "Stretches the hip and abdominal muscles, then the back of the legs with the hips raised.",
    focus: ["Hips", "Abdominals", "Calves and hamstrings"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "front-leaning-rest",
        startingPosition: "Front Leaning Rest.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Lower the body toward the ground, sagging in the middle with the arms straight, legs and low back relaxed, toes on the ground pointing back. Look straight ahead, not up. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "CHANGE POSITION, READY, STRETCH",
            text: "Shift weight onto the balls of the feet and raise the hips. Straighten the legs and try to touch the heels to the ground, head between the arms looking toward the feet, back straight. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: HOLD,
        source: atp("16-5", "16-3", "Figure 16-3"),
      },
    ],
    cues: ["Keep the arms straight while sagging.", "With hips raised, keep the back straight and reach the heels toward the ground."],
    commonMistakes: ["Looking up during the sagging stretch."],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch"] },
  },
  {
    ...base,
    id: "thigh-stretch",
    name: "Thigh Stretch",
    summary: "Lying on one side on the forearm, pull the top ankle toward the buttock to stretch the front of the thigh.",
    officialPurpose: "Develops flexibility in the hip and knee joints.",
    focus: ["Front of thigh", "Hip", "Knee"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "sitting",
        startingPosition: "Sitting position with arms at the sides and palms on the floor.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Roll onto the right side with the right forearm on the ground under the shoulder, fist thumb-up. Grasp the left ankle, pull it toward the left buttock, and press the left thigh back with the right heel. Hold 20–30 seconds.",
          },
          {
            label: "CHANGE POSITION, READY, STRETCH",
            text: "Move back through the starting position and switch sides to stretch the right leg. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: HOLD,
        source: atp("16-6", "16-3", "Figure 16-4"),
      },
    ],
    cues: ["Place the supporting elbow directly under the shoulder.", "Use the bottom heel to press the top thigh further back."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch"] },
  },
  {
    ...base,
    id: "single-leg-over",
    name: "Single-Leg Over",
    summary: "Lying on the back, cross one bent knee over the other leg and pull it across while the shoulders stay down.",
    officialPurpose: "Develops flexibility of the hip and low back.",
    focus: ["Hip", "Low back"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "supine",
        startingPosition:
          "Supine with arms straight out to the sides, palms down, fingers and thumbs extended and joined, feet together with heels and head on the ground.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Bend the left knee to 90 degrees over the right leg, grasp the outside of the left knee with the right hand, and pull right. Keep the left shoulder and arm on the ground. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "CHANGE POSITION, READY, STRETCH",
            text: "Repeat with the right knee over the left leg, pulling left with the left hand and keeping the right shoulder and arm down. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: HOLD,
        sourceNotes: [
          "The ATP's introduction to this exercise says it is conducted for 30–60 seconds, while each printed step says to hold 20–30 seconds.",
        ],
        source: atp("16-7", "16-4", "Figure 16-5"),
      },
    ],
    cues: ["Keep the shoulder on the stretching side on the ground."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch", "trunk-rotation"] },
  },
  {
    ...base,
    id: "groin-stretch",
    name: "Groin Stretch",
    summary: "A sideways lunge that stretches the inside of the opposite thigh while the trunk faces forward.",
    officialPurpose: "Increases flexibility in the hip joint.",
    focus: ["Inner thigh", "Hip"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Take an exaggerated step right, bending the right knee into a lateral lunge with the trunk and head facing forward. Hold, or sink deeper, to stretch the inside of the left thigh for 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "CHANGE POSITION, READY, STRETCH",
            text: "Repeat to the left, stretching the inside of the right thigh for 20–30 seconds.",
          },
          { label: "Final step", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: HOLD,
        sourceNotes: ['The ATP labels the final step "On count 4" although the rest of this exercise is given by command.'],
        source: atp("16-8", "16-4 – 16-5", "Figure 16-6"),
      },
    ],
    cues: ["Keep the trunk and head facing forward during the lunge."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["lunge", "stretch"] },
  },
  {
    ...base,
    id: "calf-stretch",
    name: "Calf Stretch",
    summary: "Step one foot back with the heel down and bend the knees to stretch the calf and Achilles tendon.",
    officialPurpose: "Increases flexibility of the ankle.",
    focus: ["Calf", "Achilles tendon", "Ankle"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Step the left foot 1–2 feet back, flat on the ground. Keeping the left heel down, bend both knees until you feel a stretch in the left Achilles tendon.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "READY, STRETCH",
            text: "Repeat with the right leg. To stretch the calf more, step further back and lock the right knee, keeping the right foot pointing forward.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: "Hold either stretch position 20–30 seconds.",
        source: atp("16-9", "16-5"),
      },
    ],
    cues: ["Keep the rear heel on the ground.", "Keep the rear foot pointing forward."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch"] },
  },
  {
    ...base,
    id: "hamstring-stretch",
    name: "Hamstring Stretch",
    summary: "Seated with straight legs, reach toward the feet to stretch the back of the legs, then reach a little further.",
    officialPurpose: "Increases flexibility of the knees and hips.",
    focus: ["Hamstrings", "Hips", "Knees"],
    executions: [
      {
        drillId: "recovery-drill",
        position: "sitting",
        startingPosition: "Sitting position with arms at the sides and palms on the floor.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Reach both hands toward the feet and grasp the feet, ankles, or lower legs, keeping the knees straight but not locked. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          { label: "READY, STRETCH", text: "Repeat, reaching slightly further." },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: "Hold the stretch 20–30 seconds.",
        source: atp("16-10", "16-6", "Figure 16-8"),
      },
    ],
    cues: ["Keep the knees straight without locking them."],
    commonMistakes: [],
    cautions: [],
    tags: { ...stretchTags, purposes: ["recovery", "mobility-flexibility"], movementPatterns: ["stretch"] },
  },
];
