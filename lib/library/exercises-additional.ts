import type { Exercise } from "./types";
import { VERIFIED_ON, atp } from "./sources";

const base = {
  program: "army-h2f",
  verification: { status: "verified", checkedOn: VERIFIED_ON },
} as const;

const open = { locations: ["open-ground"] } as const;

// Four for the Core (ATP 7-22.02 para 4-14 – 4-18, added by Change 1).
export const fourForTheCoreExercises: Exercise[] = [
  {
    ...base,
    id: "bent-leg-raise",
    name: "Bent-Leg Raise",
    summary: "Lying on the back with hands under the small of the back, slowly straighten the raised legs while keeping the spine pressed into the hands.",
    officialPurpose:
      "Improves awareness of spinal control while moving the legs. Placing the hands under the back rather than the pelvis puts the emphasis on the abdominal core muscles rather than the hip flexors.",
    focus: ["Abdominal core", "Spinal control"],
    executions: [
      {
        drillId: "four-for-the-core",
        position: "supine",
        startingPosition:
          "Supine with knees bent to 90 degrees and feet flat. Hands under the small of the back (not the pelvis), palms down. Head 2–4 inches off the ground.",
        steps: [
          {
            label: "READY, EXERCISE",
            text: "Raise both feet until the hips and knees are at 90 degrees. Keeping the spine pressing on the hands, slowly straighten the legs and hold that pressure for up to 60 seconds.",
          },
          {
            label: "To rest",
            text: "If the pressure on the hands drops or you need a rest, bring the knees to the chest for 3–5 seconds, then resume.",
          },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: "Up to 60 seconds.",
        source: atp("4-15", "4-9", "Figure 4-12"),
      },
    ],
    cues: ["Keep steady pressure of the spine on the hands.", "Rest by bringing the knees to the chest, not by letting the back lift."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["strength", "balance-stability"], impact: "no-jumping", movementPatterns: ["trunk-stability"] },
    aft: { events: ["PLK"], basis: "app", note: "RuckOn mapping: holding the trunk steady against movement relates to the plank." },
  },
  {
    ...base,
    id: "side-bridge",
    name: "Side Bridge",
    summary: "From lying on one side on the forearm, lift the hips until the body forms a straight line, then hold.",
    officialPurpose:
      "Strengthens the muscles on the side nearest the ground, from the spine to the side of the trunk and pelvis. The ATP describes it as a safe way to work the obliques and hip abductors without compressing or loading the spine.",
    focus: ["Obliques", "Hip abductors", "Side of the trunk"],
    executions: [
      {
        drillId: "four-for-the-core",
        position: "side-lying",
        startingPosition:
          "Lying on the left side, upper body supported by the left shoulder with the left elbow directly under it. Legs straight with the left foot resting on top of the right foot. Right hand resting on the abdomen.",
        steps: [
          {
            label: "READY, EXERCISE",
            text: "Raise the trunk until the trunk, pelvis, and legs form a straight line viewed from the front and above. Keep the head in line with the spine and hold for 60 seconds.",
          },
          { label: "To rest", text: "Return to the starting position for 3–5 seconds, then resume." },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          {
            label: "CHANGE POSITION, READY, EXERCISE",
            text: "Swing the legs and body through the Sitting position to lie on the right side and repeat.",
          },
        ],
        cadence: "hold",
        officialPrescription: "Hold 60 seconds on each side.",
        sourceNotes: ["The ATP places the left (lower) foot on top of the right foot; this is reproduced as printed."],
        source: atp("4-16", "4-9 – 4-10", "Figure 4-13"),
      },
    ],
    cues: ["Keep the elbow directly under the shoulder.", "Hold a straight line through trunk, pelvis, and legs."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["strength", "balance-stability"], impact: "no-jumping", movementPatterns: ["trunk-stability"] },
    aft: { events: ["PLK"], basis: "app", note: "RuckOn mapping: a held trunk position related to the plank." },
  },
  {
    ...base,
    id: "back-bridge",
    name: "Back Bridge",
    summary: "Lying on the back with knees bent, lift the hips and straighten one leg, switching legs every 5 seconds.",
    officialPurpose: "Strengthens the muscles of the spine, buttocks, and hamstrings (the posterior chain).",
    focus: ["Spinal muscles", "Gluteal muscles", "Hamstrings"],
    executions: [
      {
        drillId: "four-for-the-core",
        position: "supine",
        startingPosition: "Supine with arms out to the sides at 45 degrees, knees bent to 90 degrees, feet flat.",
        steps: [
          {
            label: "READY, EXERCISE",
            text: "Lift the buttocks while straightening the left knee until the trunk, pelvis, and left leg form a straight line from the side. Keep the head on the ground and hold for 5 seconds.",
          },
          { label: "CHANGE POSITION", text: "Switch legs. Keep switching every 5 seconds for a total of 6 repetitions." },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
        ],
        cadence: "hold",
        officialPrescription: "6 repetitions, switching legs every 5 seconds.",
        source: atp("4-17", "4-10", "Figure 4-14"),
      },
    ],
    cues: ["Form a straight line from trunk through the straight leg.", "Keep the head on the ground."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["strength"], impact: "no-jumping", movementPatterns: ["trunk-stability", "trunk-extension"] },
    aft: { events: ["MDL"], basis: "app", note: "RuckOn mapping: posterior-chain strength is used in the deadlift." },
  },
  {
    ...base,
    id: "quadraplex",
    name: "Quadraplex",
    summary: "From hands and knees, extend the opposite arm and leg and hold without letting the trunk sag.",
    officialPurpose: "Improves balance, coordination, and strength of the core muscles in the posterior chain.",
    focus: ["Posterior chain", "Balance", "Shoulder stability"],
    executions: [
      {
        drillId: "four-for-the-core",
        position: "six-point-stance",
        startingPosition: "Six-point position with the knees on the ground beneath the hips.",
        steps: [
          {
            label: "READY, EXERCISE",
            text: "Raise the left leg and right hand until both are straight and parallel to the ground. Keep the head in line with the spine, stay tall on the supporting shoulder, and hold for 60 seconds.",
          },
          { label: "To rest", text: "Return to the starting position for 3–5 seconds, then resume." },
          { label: "STARTING POSITION, MOVE", text: "Return to the starting position." },
          { label: "CHANGE POSITION, READY, EXERCISE", text: "Repeat with the right leg and left hand." },
        ],
        cadence: "hold",
        officialPrescription: "Hold 60 seconds on each side.",
        source: atp("4-18", "4-11", "Figure 4-15"),
      },
    ],
    cues: ["Keep the raised arm and leg parallel to the ground.", "Stay tall on the supporting shoulder."],
    commonMistakes: ["Letting the low back, shoulder, or trunk sag."],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["balance-stability", "strength"], impact: "no-jumping", movementPatterns: ["trunk-stability"] },
    aft: { events: ["PLK"], basis: "app", note: "RuckOn mapping: holding the trunk level on the hands relates to the plank." },
  },
];

// Military Movement Drill 1 (ATP 7-22.02 para 8-1 – 8-5).
export const militaryMovementExercises: Exercise[] = [
  {
    ...base,
    id: "vertical",
    name: "Vertical",
    summary: "An exaggerated high-knee skip with opposite arm swing, performed down a 25-meter course and back.",
    officialPurpose: "Improves single-leg jumping and landing skill in preparation for more vigorous training, testing, and combat activities.",
    focus: ["Legs", "Single-leg landing", "Coordination"],
    executions: [
      {
        drillId: "military-movement-drill-1",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with staggered legs, right foot forward with the right heel even with the toes of the left foot. Head up, knees slightly bent, left arm forward.",
        steps: [
          { label: "Movement", text: "Swing the left thigh up to 90 degrees and the right arm forward, then step forward with the left foot." },
          { label: "Movement", text: "As the left foot lands, raise the right thigh to 90 degrees and the left arm forward, then step forward with the right foot." },
          { label: "Distance", text: "Repeat down a 25-meter course, stop, and repeat once to return to the start line." },
        ],
        cadence: "course",
        officialPrescription: "25 meters out and 25 meters back.",
        source: atp("8-3", "8-1", "Figure 8-1"),
      },
    ],
    cues: ["Drive the thigh to 90 degrees.", "Swing the opposite arm forward."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["balance-stability", "speed"], impact: "jumping", movementPatterns: ["jump", "locomotion"] },
  },
  {
    ...base,
    id: "lateral",
    name: "Lateral",
    summary: "A side step with the trail leg brought toward the lead leg, 25 meters one way and back the other, always facing the same direction.",
    officialPurpose:
      "Develops the ability to move laterally. The ATP notes it is the third leg of the AFT sprint-drag-carry.",
    focus: ["Hips", "Lateral movement"],
    executions: [
      {
        drillId: "military-movement-drill-1",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with the left side facing the direction of movement. Crouch slightly with elbows bent to 90 degrees and palms facing forward.",
        steps: [
          { label: "Movement", text: "Step out with the lead leg, then bring the trail leg up toward it." },
          { label: "Distance", text: "Face the same direction throughout: move left for the first 25 meters and right for the second 25 meters." },
          { label: "Progression", text: "Increase speed as skill improves." },
        ],
        cadence: "course",
        officialPrescription: "25 meters each direction.",
        source: atp("8-4", "8-2", "Figure 8-2"),
      },
    ],
    cues: ["Keep facing the same direction out and back.", "Stay in a slight crouch."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["agility"], impact: "no-jumping", movementPatterns: ["locomotion"] },
    aft: { events: ["SDC"], basis: "source-mention", note: "The ATP states the Lateral is the third leg of the sprint-drag-carry." },
  },
  {
    ...base,
    id: "shuttle-sprint",
    name: "Shuttle Sprint",
    summary: "Sprint to a 25-meter turn-around, touch the ground, sprint back, touch again, and accelerate through the finish.",
    officialPurpose: "Prepares the Soldier for more vigorous endurance and agility activities.",
    focus: ["Sprinting", "Turning", "Acceleration"],
    executions: [
      {
        drillId: "military-movement-drill-1",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with staggered legs, right foot forward with the right heel even with the toes of the left foot. Head up, knees slightly bent, left arm forward.",
        steps: [
          { label: "Out", text: "Run quickly to the 25-meter turn-around point." },
          { label: "Turn", text: "Plant the left foot and turn clockwise, squatting to touch the ground with the left hand." },
          { label: "Back", text: "Run quickly back to the start line, plant the right foot, turn counterclockwise, and touch the ground with the right hand." },
          { label: "Finish", text: "Run back to the 25-meter turn-around, accelerating to maximum speed through the finish." },
        ],
        cadence: "course",
        officialPrescription: "3 × 25 meters with two turns.",
        source: atp("8-5", "8-2", "Figure 8-3"),
      },
    ],
    cues: ["Squat to touch the ground at each turn.", "Accelerate through the finish."],
    commonMistakes: [],
    cautions: [],
    tags: { ...open, equipment: ["none"], purposes: ["speed", "agility", "anaerobic-conditioning"], impact: "no-jumping", movementPatterns: ["run"] },
    aft: { events: ["SDC"], basis: "app", note: "RuckOn mapping: sprinting, turning, and touching the ground are part of the sprint-drag-carry." },
  },
];

// Loaded lower-body exercises from the Strength Training Circuit (ch. 13) and Free Weight Training (ch. 14).
export const loadedExercises: Exercise[] = [
  {
    ...base,
    id: "sumo-squat",
    name: "Sumo Squat",
    summary: "A wide-stance squat holding one kettlebell in front of the body.",
    officialPurpose: "The first station of the Strength Training Circuit, a total-body resistance circuit that promotes muscular endurance.",
    focus: ["Thighs", "Hips"],
    executions: [
      {
        context: "Strength Training Circuit, station 1",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with the feet slightly wider than the shoulders and toes pointing out, holding one kettlebell with both hands in front of the body, palms facing the body.",
        steps: [
          { label: "Count 1", text: "Squat, leaning slightly forward from the waist with the head up, until the upper legs are parallel to the ground." },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "One minute of repetitions at the station, resting if necessary or adjusting the weight and range of movement.",
        source: atp("13-1, 13-3", "13-1", "Figure 13-1"),
      },
    ],
    cues: ["Keep the head up.", "Squat until the upper legs are parallel to the ground."],
    commonMistakes: [],
    cautions: ["Adjust the weight and range of movement to match the required performance."],
    tags: {
      ...open,
      equipment: ["kettlebell"],
      purposes: ["strength", "muscular-endurance"],
      impact: "no-jumping",
      movementPatterns: ["squat"],
      phases: ["main"],
    },
    aft: { events: ["MDL"], basis: "app", note: "RuckOn mapping: loaded squatting strength supports lifting from the ground." },
  },
  {
    ...base,
    id: "straight-leg-deadlift",
    name: "Straight-Leg Deadlift",
    summary: "With knees slightly bent and back straight, hinge forward until the back is parallel to the ground, then return.",
    officialPurpose:
      "A deadlift variation that further challenges the muscles of the lower back, hips, and legs; the second station of the Strength Training Circuit.",
    focus: ["Hamstrings", "Lower back", "Hips"],
    executions: [
      {
        context: "Strength Training Circuit, station 2 (kettlebells)",
        position: "straddle-stance",
        startingPosition: "Straddle Stance holding the kettlebells in front of the legs with a pronated grip. Knees slightly bent, not locked, and kept at the same bend throughout.",
        steps: [
          {
            label: "Count 1",
            text: "Hinge forward from the waist with the head in line with the spine and the back straight until the back is parallel to the ground. Adjust knee bend slightly to feel the hamstrings.",
          },
          { label: "Count 2", text: "Reverse the movement to the starting position." },
          { label: "Count 3", text: "Repeat count 1." },
        ],
        cadence: "slow",
        officialPrescription: "One minute of repetitions at the station, resting if necessary or adjusting the weight and range of movement.",
        sourceNotes: ["The ATP's printed steps for this station end at count 3."],
        source: atp("13-4", "13-2", "Figure 13-2"),
      },
      {
        context: "Free Weight Training (straight bar or dumbbells)",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance holding the bar with a grip suited to your capability, the equipment, and the session goal. Knees slightly bent, not locked, and kept at the same bend throughout.",
        steps: [
          { label: "Down", text: "Hinge forward from the waist with the head in line with the spine, keeping the back straight until it is parallel to the ground." },
          { label: "Pause", text: "Pause briefly, adjusting knee bend slightly to engage the hamstrings." },
          { label: "Up", text: "Reverse the movement to the starting position. Repeat for the session's repetitions and sets." },
        ],
        cadence: "controlled",
        source: atp("14-9", "14-5", "Figure 14-5"),
      },
    ],
    cues: ["Keep the knees at the same slight bend.", "Keep the head in line with the spine and the back straight."],
    commonMistakes: ["Extending the neck to look up."],
    cautions: ["Always lift a weight that can be controlled throughout the range of motion."],
    tags: {
      ...open,
      equipment: ["kettlebell", "dumbbell", "barbell-or-hex-bar"],
      purposes: ["strength", "muscular-endurance"],
      impact: "no-jumping",
      movementPatterns: ["hinge"],
      phases: ["main"],
    },
    aft: { events: ["MDL"], basis: "app", note: "RuckOn mapping: loaded hip hinge practice related to the deadlift." },
  },
  {
    ...base,
    id: "deadlift",
    name: "Deadlift",
    summary: "Lift a barbell, hex bar, or pair of weights from the ground by extending the hips and knees with a straight spine, then lower under control.",
    officialPurpose:
      "A Free Weight Core exercise used throughout a Soldier's career to improve lower-body muscular strength and endurance, and training and testing performance. It requires trunk and shoulder stability and strength.",
    focus: ["Hips", "Thighs", "Back", "Grip"],
    executions: [
      {
        context: "Free Weight Training (core exercise)",
        position: "forward-leaning-stance",
        startingPosition:
          "Forward Leaning Stance. Grasp the barbell below the knees near the shins, arms fully extended, with a closed overhand or alternating grip. A hex bar uses a neutral grip; with kettlebells or dumbbells, hold one at each side with a neutral grip.",
        steps: [
          { label: "Lift", text: "Extend the hips and knees while keeping the spine straight and the arms extended. As the weight leaves the ground, move the hips forward to meet it." },
          { label: "Pause", text: "Pause standing upright." },
          { label: "Lower", text: "Return the weight to the starting position under control. Do not drop it." },
          { label: "Repeat", text: "Repeat for the session's repetitions and sets, keeping the knees in line over the feet." },
        ],
        cadence: "controlled",
        source: atp("14-8", "14-4", "Figures 14-3 and 14-4"),
      },
    ],
    cues: ["Keep the spine straight and the arms extended.", "Keep the knees in line over the feet."],
    commonMistakes: ["Letting the spine or shoulders round forward.", "Dropping the weight."],
    cautions: ["Throughout the lift, do not let the spine or shoulders round forward."],
    tags: {
      ...open,
      equipment: ["barbell-or-hex-bar", "kettlebell", "dumbbell"],
      purposes: ["strength"],
      impact: "no-jumping",
      movementPatterns: ["hinge", "squat"],
      phases: ["main"],
    },
    aft: {
      events: ["MDL"],
      basis: "source-mention",
      note: "The ATP says the Deadlift can be used to improve training and testing performance; RuckOn maps that to the 3 Repetition Maximum Deadlift.",
    },
  },
];
