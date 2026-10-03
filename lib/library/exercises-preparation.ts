import type { Exercise } from "./types";
import { VERIFIED_ON, atp } from "./sources";

const base = {
  program: "army-h2f",
  verification: { status: "verified", checkedOn: VERIFIED_ON },
} as const;

const bodyweight = { equipment: ["none"], locations: ["open-ground"] } as const;

// Preparation Drill exercises (ATP 7-22.02 chapter 3). Rear Lunge also appears in the Recovery Drill.
export const preparationExercises: Exercise[] = [
  {
    ...base,
    id: "bend-and-reach",
    name: "Bend and Reach",
    summary: "A slow partial squat with a rounded spine that reaches the arms back between the legs.",
    officialPurpose:
      "Flexes the trunk, hips, and knees and extends the shoulders to prepare for squatting, rolling, and climbing.",
    focus: ["Trunk", "Hips", "Knees", "Shoulders"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance, arms overhead with elbows straight, palms facing in, fingers and thumbs extended and joined.",
        steps: [
          {
            label: "Count 1",
            text: "Drop into a partial squat with heels down, round the spine, and reach the arms as far back between the legs as possible. Tuck the chin to look to the rear.",
          },
          { label: "Count 2", text: "Return to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        source: atp("3-3", "3-1", "Figure 3-1"),
      },
    ],
    cues: ["Keep the heels on the ground.", "Round the spine and tuck the chin to look to the rear."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["mobility-flexibility"],
      impact: "no-jumping",
      movementPatterns: ["squat", "trunk-flexion"],
    },
  },
  {
    ...base,
    id: "rear-lunge",
    name: "Rear Lunge",
    summary:
      "A long step back onto the ball of the foot. Performed for repetitions in the Preparation Drill and as a held stretch in the Recovery Drill.",
    officialPurpose:
      "Promotes flexibility, strength, and balance in the hip and leg, preparing for taking cover and kneeling firing positions. In the Recovery Drill it stretches the front of the thigh and hip.",
    focus: ["Hip", "Front of thigh", "Balance"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "Count 1",
            text: "Keeping hands on hips, take an exaggerated step back with the left leg and touch down on the ball of the foot directly behind the start. The heel stays off the ground; lower further if you do not feel a stretch in the front of the left hip and thigh.",
          },
          {
            label: "Count 2",
            text: "Return to the starting position, keeping the same foot width as the Straddle Stance.",
          },
          { label: "Count 3", text: "Repeat count 1 with the right leg." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        source: atp("3-4", "3-2", "Figures 3-2 and 3-3"),
      },
      {
        drillId: "recovery-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "READY, STRETCH",
            text: "Take an exaggerated step back with the left leg onto the ball of the foot, directly behind the start, to stretch the front of the left thigh and hip. Keep the back straight and the gaze forward. Hold 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "READY, STRETCH",
            text: "Repeat with the right leg, holding 20–30 seconds.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: "Hold each side 20–30 seconds.",
        source: atp("16-4", "16-2", "Figure 16-2"),
      },
    ],
    cues: [
      "Touch down on the ball of the rear foot, directly behind the starting position.",
      "Keep the same foot width when you return to the Straddle Stance.",
      "In the Recovery Drill, keep the back straight and eyes forward.",
    ],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["mobility-flexibility", "balance-stability", "recovery"],
      impact: "no-jumping",
      movementPatterns: ["lunge", "stretch"],
    },
  },
  {
    ...base,
    id: "high-jumper",
    name: "High Jumper",
    summary: "An arm swing with a small hop, then a forceful vertical jump, landing softly each time.",
    officialPurpose:
      "Teaches correct jumping and landing, balance, and coordination, and prepares the Soldier to build explosive strength.",
    focus: ["Legs", "Jumping and landing", "Coordination"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "forward-leaning-stance",
        startingPosition: "Forward Leaning Stance, palms facing in, fingers and thumbs extended and joined.",
        steps: [
          {
            label: "Count 1",
            text: "Swing the arms forward to parallel with the ground while jumping a few inches straight up.",
          },
          {
            label: "Count 2",
            text: "Land softly on the balls of the feet and return to the starting position with the same foot width.",
          },
          {
            label: "Count 3",
            text: "Swing the arms forcefully forward and overhead and jump forcefully straight up.",
          },
          { label: "Count 4", text: "Land softly on the balls of the feet and return to the starting position." },
        ],
        cadence: "moderate",
        source: atp("3-5", "3-3", "Figure 3-4"),
      },
    ],
    cues: ["Land softly on the balls of the feet.", "Keep the same foot width as the starting stance."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "balance-stability"],
      impact: "jumping",
      movementPatterns: ["jump"],
    },
  },
  {
    ...base,
    id: "rower",
    name: "Rower",
    summary: "From lying on the back with arms overhead, sit up into a tuck with the arms reaching forward.",
    officialPurpose:
      "Improves abdominal strength and total-body coordination and prepares the Soldier to move from lying to sitting.",
    focus: ["Abdominals", "Total-body coordination"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "supine",
        startingPosition:
          "Supine, arms overhead at shoulder width with palms in, feet together and pointing up, head held 1–2 inches off the ground.",
        steps: [
          {
            label: "Count 1",
            text: "Sit up, bending at the hips and knees and swinging the arms forward to parallel with the ground. Finish with feet flat and knees between the arms.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Perform 5–10 repetitions.",
        source: atp("3-6 – 3-7", "3-4", "Figures 3-5 and 3-6"),
      },
    ],
    cues: [
      "Hold the head 1–2 inches off the ground in the starting position.",
      "Finish count 1 with feet flat and knees between the arms.",
    ],
    commonMistakes: [],
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
    id: "squat-bender",
    name: "Squat Bender",
    summary: "Alternates a squat with arms forward and a straight-back forward bend.",
    officialPurpose:
      "Develops strength, endurance, and flexibility in the lower back and thighs, and prepares for proper lifting technique in training and testing events that require heavy lifts.",
    focus: ["Lower back", "Thighs", "Lifting technique"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "Count 1",
            text: "Squat while leaning slightly forward from the waist, head up, arms in front of the body parallel to the ground with palms in.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          {
            label: "Count 3",
            text: "With knees slightly bent, bend forward at the waist with the spine straight and head in line, reaching toward the ground until you feel a stretch in the back of the thighs.",
          },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Perform 5–10 repetitions.",
        source: atp("3-8", "3-5", "Figure 3-7"),
      },
    ],
    cues: ["Keep the head up in the squat.", "In the forward bend, keep the spine straight and the head in line with it."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "muscular-endurance", "mobility-flexibility"],
      impact: "no-jumping",
      movementPatterns: ["squat", "hinge"],
    },
    aft: {
      events: ["MDL"],
      basis: "source-mention",
      note: "The ATP says this exercise prepares for proper lifting technique in testing events that require heavy lifts. RuckOn maps that to the deadlift.",
    },
  },
  {
    ...base,
    id: "windmill",
    name: "Windmill",
    summary: "A bend and trunk rotation that touches one hand to the outside of the opposite foot.",
    officialPurpose:
      "Develops the ability to bend and rotate the trunk at the same time, requiring spinal flexibility and shoulder-girdle coordination.",
    focus: ["Spine", "Trunk rotation", "Shoulder girdle"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance, arms straight out to the sides, palms down, fingers and thumbs extended and joined.",
        steps: [
          {
            label: "Count 1",
            text: "Bend the hips and knees while rotating the trunk left. Touch the outside of the left foot with the right hand and look to the rear, pulling the left arm back to keep the shoulders in line.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 to the right." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Perform 5–10 repetitions.",
        source: atp("3-9", "3-6", "Figures 3-8 and 3-9"),
      },
    ],
    cues: ["Look to the rear at the bottom of the movement.", "Keep both arms in line across the shoulders."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["mobility-flexibility"],
      impact: "no-jumping",
      movementPatterns: ["hinge", "trunk-rotation"],
    },
  },
  {
    ...base,
    id: "forward-lunge",
    name: "Forward Lunge",
    summary: "A short forward step into a lunge with the back straight, alternating legs.",
    officialPurpose:
      "Develops balance and leg strength and prepares for proper movement technique in lifts such as a litter carry.",
    focus: ["Legs", "Balance"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with hands on hips.",
        steps: [
          {
            label: "Count 1",
            text: "Step forward with the left leg until the left heel is 3–6 inches ahead of the right foot, bending the hips and knees to lunge forward with a straight back.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 stepping forward with the right foot." },
        ],
        cadence: "slow",
        sourceNotes: ["The ATP's printed steps end at count 3."],
        source: atp("3-10", "3-7", "Figure 3-10"),
      },
      {
        context: "Strength Training Circuit, station 3 (kettlebells)",
        position: "straddle-stance",
        startingPosition: "Straddle Stance holding a kettlebell at each side with a neutral grip.",
        steps: [
          { label: "Count 1", text: "Step forward with the left leg, bending the left knee until the left thigh is parallel to the ground. Lean slightly forward from the waist so the kettlebells come to either side of the forward leg." },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1, stepping forward with the right leg." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "controlled",
        officialPrescription: "One minute at station 3 of the Strength Training Circuit, resting or adjusting the weight if needed.",
        source: atp("13-5", "13-3 – 13-4", "Figure 13-3"),
      },
    ],
    cues: ["Step so the lead heel lands 3–6 inches ahead of the rear foot.", "Keep the back straight."],
    commonMistakes: ["Looking down.", "Bringing the feet closer together."],
    cautions: [],
    substitutions: [
      {
        exerciseId: "step-up",
        name: "8-Count Step-Up",
        difference: "Steps up onto a 12- to 18-inch step instead of forward on level ground.",
        source: atp("13-6", "13-4"),
      },
    ],
    tags: {
      ...bodyweight,
      equipment: ["none", "kettlebell"],
      purposes: ["strength", "balance-stability"],
      impact: "no-jumping",
      movementPatterns: ["lunge"],
    },
    aft: {
      events: ["SDC"],
      basis: "app",
      note: "RuckOn mapping: the ATP links this exercise to lifts such as a litter carry, similar to the drag and carry in the sprint-drag-carry.",
    },
  },
  {
    ...base,
    id: "prone-row",
    name: "Prone Row",
    summary: "Lying face down with arms off the ground, lift the chest and pull the arms back toward the shoulders.",
    officialPurpose:
      "Strengthens the neck, upper back, and shoulders to prepare for firing from the prone and carrying the weight of a helmet and body armor.",
    focus: ["Neck", "Upper back", "Shoulders"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "prone",
        startingPosition:
          "Prone, arms overhead with palms down and lifted 1–2 inches off the ground, fingers and thumbs extended and joined, toes pointed to the rear.",
        steps: [
          {
            label: "Count 1",
            text: "Raise the head and chest slightly while pulling the arms back, making fists as the hands move toward the shoulders. Feet stay together on the ground; arms and hands stay off it.",
          },
          {
            label: "Count 2",
            text: "Reverse the movement to the starting position, keeping the arms and hands off the ground.",
          },
          { label: "Count 3", text: "Repeat count 1." },
        ],
        cadence: "slow",
        sourceNotes: ["The ATP's printed steps end at count 3."],
        source: atp("3-11", "3-8", "Figure 3-11"),
      },
    ],
    cues: ["Keep the arms and hands off the ground throughout.", "Keep the feet together on the ground."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength"],
      impact: "no-jumping",
      movementPatterns: ["pull", "trunk-extension"],
    },
  },
  {
    ...base,
    id: "bent-leg-body-twist",
    name: "Bent-Leg Body Twist",
    summary: "Lying on the back with knees and hips at 90 degrees, lower both legs to one side and back.",
    officialPurpose:
      "Strengthens the trunk and hip muscles while promoting control of trunk rotation, as preparation for loaded trunk movements.",
    focus: ["Trunk", "Hips", "Rotation control"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "supine",
        startingPosition:
          "Supine with hips and knees bent to 90 degrees, knees and feet together, arms straight out to the sides with palms on the ground.",
        steps: [
          {
            label: "Count 1",
            text: "Rotate the legs to the left, letting them drop together toward the ground while the upper back and arms stay down.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1 to the right." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        source: atp("3-12", "3-8", "Figure 3-12"),
      },
    ],
    cues: ["Keep the upper back and arms on the ground.", "Move the knees and feet together."],
    commonMistakes: [],
    cautions: [],
    tags: {
      ...bodyweight,
      purposes: ["strength", "balance-stability"],
      impact: "no-jumping",
      movementPatterns: ["trunk-rotation"],
    },
  },
  {
    ...base,
    id: "push-up",
    name: "Push-Up",
    summary: "A push-up from the Front Leaning Rest with hands under the shoulders and a straight body line.",
    officialPurpose:
      "Strengthens the chest, shoulders, arms, and trunk; performed to standard it prepares for more vigorous pushing in training, testing, and combat tasks.",
    focus: ["Chest", "Shoulders", "Arms", "Trunk"],
    executions: [
      {
        drillId: "preparation-drill",
        position: "front-leaning-rest",
        startingPosition:
          "Front Leaning Rest, hands directly under the shoulders with fingers spread, feet together, body straight from head to heels throughout.",
        steps: [
          { label: "Count 1", text: "Bend the elbows to lower the body until the upper arms are parallel to the ground." },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
        ],
        cadence: "moderate",
        sourceNotes: ["The ATP's printed steps end at count 3."],
        source: atp("3-13", "3-8 – 3-9", "Figure 3-13"),
      },
    ],
    cues: ["Keep a straight line from the top of the head to the heels.", "Lower until the upper arms are parallel to the ground."],
    commonMistakes: [],
    cautions: [],
    substitutions: [
      {
        name: "Push-Up (modified, Six-Point Stance)",
        difference: "Hands and knees on the ground with the body straight from head to knees. The ATP uses it to limit range of motion and the load on the ankles, shoulders, arms, and wrists.",
        source: atp("3-24", "3-18"),
      },
      {
        exerciseId: "eight-count-t-push-up",
        name: "8-Count T-Push-Up",
        difference: "Lowers to the ground and moves the arms out to a T before pushing up, like the hand release in the AFT push-up.",
        source: atp("5-23", "5-12 – 5-13"),
      },
      {
        exerciseId: "supine-chest-press",
        name: "Supine Chest Press",
        difference: "Presses kettlebells while lying on the back, so the trunk does not have to hold a plank position.",
        source: atp("13-9", "13-7"),
      },
    ],
    tags: {
      ...bodyweight,
      purposes: ["strength"],
      impact: "no-jumping",
      movementPatterns: ["push"],
    },
    aft: {
      events: ["HRP", "PLK"],
      basis: "app",
      note: "RuckOn mapping: a pushing movement from the Front Leaning Rest, which the ATP names as the resting position for the hand-release push-up; holding the straight body line resembles the plank.",
    },
  },
];
