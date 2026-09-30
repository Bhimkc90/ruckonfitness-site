import type { Exercise } from "./types";
import { VERIFIED_ON, atp } from "./sources";

const base = {
  program: "army-h2f",
  verification: { status: "verified", checkedOn: VERIFIED_ON },
} as const;

const bodyweight = { equipment: ["none"], locations: ["open-ground"] } as const;

// Conditioning Drill 1 and 2 exercises (ATP 7-22.02 chapter 5).
export const conditioningExercises: Exercise[] = [
  {
    ...base,
    id: "power-jump",
    name: "Power Jump",
    summary: "From a deep squat with palms on the ground, jump forcefully with an overhead arm swing and land softly.",
    officialPurpose:
      "Reinforces correct jumping and landing, requires balance and coordination, and develops explosive strength to move off the ground.",
    focus: ["Legs", "Jumping and landing", "Balance"],
    executions: [
      {
        drillId: "conditioning-drill-1",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "Count 1",
            text: "Squat with heels flat, rounding the spine forward to place the palms on the ground. Keep the gaze forward.",
          },
          {
            label: "Count 2",
            text: "Jump forcefully, swinging the arms up and overhead with palms facing in.",
          },
          {
            label: "Count 3",
            text: "Land softly with feet pointed forward and shoulder-width apart, returning to the count 1 position.",
          },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "moderate",
        source: atp("5-3", "5-1 – 5-2", "Figure 5-1"),
      },
    ],
    cues: ["Keep the heels flat in the squat and the gaze forward.", "Land softly, feet forward and shoulder-width apart."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "balance-stability"],
      impact: "jumping",
      movementPatterns: ["squat", "jump"],
    },
  },
  {
    ...base,
    id: "v-up",
    name: "V-Up",
    summary: "From lying on the back, lift the straight legs and trunk together into a V, then lower under control.",
    officialPurpose:
      "Develops the abdominal and hip flexor muscles for tasks such as the leg tuck, rope traverse, and surmounting obstacles.",
    focus: ["Abdominals", "Hip flexors"],
    executions: [
      {
        drillId: "conditioning-drill-1",
        position: "supine",
        startingPosition:
          "Supine with arms on the ground at 45 degrees from the body, knees bent to 90 degrees, head 1–2 inches off the ground.",
        steps: [
          {
            label: "Count 1",
            text: "Raise the legs and trunk together into a V, using the arms for balance. Keep the knees straight and the head in line with the trunk.",
          },
          { label: "Count 2", text: "Return under control to the starting position without dropping the legs." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the count 2 position." },
        ],
        cadence: "moderate",
        source: atp("5-4", "5-2", "Figure 5-2"),
      },
    ],
    cues: ["Keep the knees straight in the V.", "Keep the head in line with the trunk, neither tucked nor tipped back."],
    commonMistakes: ["Dropping the legs on the way down."],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength"],
      impact: "no-jumping",
      movementPatterns: ["trunk-flexion"],
    },
  },
  {
    ...base,
    id: "mountain-climber",
    name: "Mountain Climber",
    summary: "From the Front Leaning Rest with one foot forward, switch feet while keeping the back straight and hips level.",
    officialPurpose:
      "Develops the ability to power quickly out of the Front Leaning Rest into a run or crouch run.",
    focus: ["Legs", "Trunk", "Shoulders"],
    executions: [
      {
        drillId: "conditioning-drill-1",
        position: "front-leaning-rest",
        startingPosition: "Front Leaning Rest with the left foot below the chest and the left knee between the arms.",
        steps: [
          {
            label: "Count 1",
            text: "Shift body weight to the hands while switching the position of the feet. Keep the back straight and the hips from moving up and down.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "moderate",
        source: atp("5-5", "5-3", "Figure 5-3"),
      },
    ],
    cues: ["Keep the back straight.", "Keep the hips level; do not let them move up and down."],
    commonMistakes: ["Letting the hips rise and fall."],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["speed", "strength"],
      impact: "no-jumping",
      movementPatterns: ["locomotion"],
    },
    aft: {
      events: ["SDC", "PLK"],
      basis: "app",
      note: "RuckOn mapping: powering out of a ground position into a run relates to the sprint-drag-carry; holding a level Front Leaning Rest resembles the plank.",
    },
  },
  {
    ...base,
    id: "leg-tuck-and-twist",
    name: "Leg-Tuck and Twist",
    summary: "From a reclined seated position, draw the knees toward one shoulder while rotating onto that side.",
    officialPurpose:
      "Strengthens trunk and hip coordination while promoting control of trunk rotation; an advanced body-weight exercise.",
    focus: ["Trunk", "Hips", "Rotation control"],
    executions: [
      {
        drillId: "conditioning-drill-1",
        position: "sitting",
        startingPosition:
          "Supported reclining Sitting position: hands on the ground behind the shoulders, palms down, legs straight and together with the feet 8–12 inches off the ground.",
        steps: [
          {
            label: "Count 1",
            text: "Raise the legs while rotating onto the left buttock and drawing the knees toward the left shoulder, controlling the legs and trunk.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 to the right." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "moderate",
        source: atp("5-6", "5-4", "Figure 5-4"),
      },
    ],
    cues: ["Keep the feet 8–12 inches off the ground between repetitions.", "Control both the legs and the trunk."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "balance-stability"],
      impact: "no-jumping",
      movementPatterns: ["trunk-flexion", "trunk-rotation"],
    },
  },
  {
    ...base,
    id: "single-leg-push-up",
    name: "Single-Leg Push-Up",
    summary: "A push-up that lifts one straight leg slightly on each descent, alternating legs.",
    officialPurpose:
      "Strengthens the chest and hips and increases the challenge to shoulder stability; prepares for more vigorous pushing.",
    focus: ["Chest", "Hips", "Shoulder stability"],
    executions: [
      {
        drillId: "conditioning-drill-1",
        position: "front-leaning-rest",
        startingPosition:
          "Front Leaning Rest, hands directly under the shoulders with fingers spread, feet together, body straight from head to heels.",
        steps: [
          {
            label: "Count 1",
            text: "Lower the body until the upper arms are parallel to the ground while raising the straight left leg until the toe is level with or just above the right heel.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 with the right leg." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "moderate",
        source: atp("5-7", "5-4 – 5-5", "Figure 5-5"),
      },
    ],
    cues: ["Keep the raised knee straight.", "Raise the toe only to about the height of the other heel."],
    commonMistakes: ["Turning it into a high leg raise or hyperextending the hip."],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "balance-stability"],
      impact: "no-jumping",
      movementPatterns: ["push"],
    },
    aft: {
      events: ["HRP", "PLK"],
      basis: "app",
      note: "RuckOn mapping: a pushing movement from the Front Leaning Rest with a straight body line.",
    },
  },
  {
    ...base,
    id: "turn-and-lunge",
    name: "Turn and Lunge",
    summary: "Pivot 90 degrees into a forward lunge with a reach to the ground, alternating sides.",
    officialPurpose: "Develops the agility to rotate, lower, and raise the body for effective changes of direction.",
    focus: ["Legs", "Hips", "Change of direction"],
    executions: [
      {
        drillId: "conditioning-drill-2",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "Count 1",
            text: "Turn 90 degrees left, pivoting on the right foot and stepping with the left, into a Forward Lunge. Reach the right hand to the ground between the legs as the left arm moves rearward. Keep the head in line with the spine.",
          },
          {
            label: "Count 2",
            text: "Stand and rotate right to the starting position, stepping with the right foot and pivoting on the ball of the left.",
          },
          { label: "Count 3", text: "Repeat count 1 to the right, stepping with the right foot and pivoting on the left." },
          {
            label: "Count 4",
            text: "Rotate left, pivoting on the right foot and stepping with the left, to the starting position.",
          },
        ],
        cadence: "slow",
        officialPrescription: "Complete 5–10 repetitions.",
        source: atp("5-19", "5-9", "Figure 5-11"),
      },
    ],
    cues: ["Pivot on the rear foot and step with the lead foot.", "Keep the head in line with the spine."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["agility"],
      impact: "no-jumping",
      movementPatterns: ["lunge", "trunk-rotation"],
    },
    aft: {
      events: ["SDC"],
      basis: "app",
      note: "RuckOn mapping: changes of direction and lowering to the ground relate to the sprint-drag-carry.",
    },
  },
  {
    ...base,
    id: "supine-bicycle",
    name: "Supine Bicycle",
    summary: "Lying on the back, bring one knee toward the chest while rotating the trunk, pausing between sides.",
    officialPurpose:
      "Strengthens the abdominal muscles and controls trunk rotation; hand placement and controlled movement make it a safe way to build strength and endurance.",
    focus: ["Abdominals", "Rotation control"],
    executions: [
      {
        drillId: "conditioning-drill-2",
        position: "supine",
        startingPosition:
          "Supine with hands resting on top of the head (not behind it), knees and hips bent to 90 degrees, head 2–4 inches off the ground.",
        steps: [
          {
            label: "Count 1",
            text: "Bring the left knee toward the chest while flexing and rotating the trunk left, trying to touch the right elbow with the right thigh, as the right leg straightens.",
          },
          { label: "Count 2", text: "Return under control to the starting position and pause." },
          { label: "Count 3", text: "Repeat count 1 to the opposite side." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Complete 5–10 repetitions.",
        source: atp("5-20", "5-10", "Figure 5-12"),
      },
    ],
    cues: ["Rest the hands on top of the head, not the back of the head.", "Pause on count 2 before switching sides."],
    commonMistakes: ["Pedaling continuously from side to side instead of pausing on count 2."],
    cautions: ["Keep the hands on top of the head; the ATP identifies hand placement as part of what makes this a safe exercise."],
    tags: {
      ...bodyweight,
      purposes: ["strength", "muscular-endurance"],
      impact: "no-jumping",
      movementPatterns: ["trunk-flexion", "trunk-rotation"],
    },
  },
  {
    ...base,
    id: "half-jack",
    name: "Half Jack",
    summary: "A jumping jack with the arms raised only to shoulder height.",
    officialPurpose:
      "Trains jumping and landing with the legs apart and controlling the landing while moving the feet laterally.",
    focus: ["Legs", "Lateral movement", "Landing control"],
    executions: [
      {
        drillId: "conditioning-drill-2",
        position: "position-of-attention",
        startingPosition: "Position of Attention.",
        steps: [
          {
            label: "Count 1",
            text: "Jump and land with feet shoulder-width apart and pointed ahead, arms straight out to the sides at shoulder height, palms down, fingers and thumbs extended and joined.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "moderate",
        officialPrescription: "Complete 5–10 repetitions.",
        source: atp("5-21", "5-11", "Figure 5-13"),
      },
    ],
    cues: ["Land with the feet shoulder-width apart and pointed ahead.", "Raise the arms no higher than parallel to the ground."],
    commonMistakes: [],
    cautions: [
      "Do not raise the arms above parallel to the ground. The ATP says keeping them there avoids the shoulder impingement that repeated movement above shoulder height can cause.",
    ],
    tags: {
      ...bodyweight,
      purposes: ["agility", "balance-stability"],
      impact: "jumping",
      movementPatterns: ["jump"],
    },
    aft: {
      events: ["SDC"],
      basis: "app",
      note: "RuckOn mapping: controlled lateral foot movement relates to the lateral portion of the sprint-drag-carry.",
    },
  },
  {
    ...base,
    id: "swimmer",
    name: "Swimmer",
    summary: "Lying face down, lift the opposite arm and leg with the head up and a slight arch.",
    officialPurpose:
      "Strengthens the back of the shoulder, neck, spine, hips, and legs (the posterior chain) used in low crawling, prone firing, and swimming.",
    focus: ["Posterior chain", "Shoulders", "Spine", "Hips"],
    executions: [
      {
        drillId: "conditioning-drill-2",
        position: "prone",
        startingPosition: "Prone with arms extended overhead, palms down on the ground, toes pointed to the rear.",
        steps: [
          {
            label: "Count 1",
            text: "Raise the left arm and right leg while lifting the head and arching the back slightly, eyes looking down-range.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 with the opposite arm and leg." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Complete 5–10 repetitions.",
        source: atp("5-22", "5-12", "Figure 5-14"),
      },
    ],
    cues: ["Lift opposite arm and leg together.", "Keep the gaze down-range, parallel to the ground."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength"],
      impact: "no-jumping",
      movementPatterns: ["trunk-extension"],
    },
  },
  {
    ...base,
    id: "eight-count-t-push-up",
    name: "8-Count T Push-Up",
    summary: "Squat, kick back, lower to the ground, reach the arms out into a T, then push up and stand.",
    officialPurpose:
      "Develops total-body strength, endurance, and mobility, with the hand release and T position emphasizing full push and reach motions.",
    focus: ["Total body", "Chest", "Shoulders"],
    executions: [
      {
        drillId: "conditioning-drill-2",
        position: "position-of-attention",
        startingPosition: "Position of Attention.",
        steps: [
          { label: "Count 1", text: "Assume the Squat position." },
          { label: "Count 2", text: "Thrust the legs back into the Front Leaning Rest." },
          { label: "Count 3", text: "Bend the elbows to lower the body to the ground." },
          {
            label: "Count 4",
            text: "Release the hands and move the arms straight out to the sides into a T. Hands may be on or off the ground.",
          },
          {
            label: "Count 6",
            text: "Push up from the ground into the Front Leaning Rest, keeping the body straight from head to heels.",
          },
          { label: "Count 7", text: "Return to the Squat position." },
          { label: "Count 8", text: "Return to the Position of Attention." },
        ],
        cadence: "moderate",
        officialPrescription: "Complete 5–10 repetitions.",
        sourceNotes: ["The ATP's printed steps go from count 4 to count 6; count 5 is not described."],
        source: atp("5-23", "5-12", "Figure 5-15"),
      },
    ],
    cues: ["Keep a straight line from head to heels when pushing back up.", "Move the arms directly out to the side in the T."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "muscular-endurance", "mobility-flexibility"],
      impact: "no-jumping",
      movementPatterns: ["squat", "push"],
    },
    aft: {
      events: ["HRP"],
      basis: "app",
      note: "RuckOn mapping: lowering to the ground, releasing the hands, and pushing back up follows the same sequence as the hand-release push-up.",
    },
  },
];
