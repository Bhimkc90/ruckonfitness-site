import type { Exercise } from "./types";
import { VERIFIED_ON, atp } from "./sources";

// More ATP 7-22.02 exercises that support AFT preparation: Conditioning Drill 3 (ch. 5), the Strength Training
// Circuit (ch. 13), and Free Weight Training (ch. 14). Conditioning Drill 3 and the circuit are not included as
// full sequences, so each execution names its official context. Text is paraphrased from the cited paragraphs.
// AFT links are RuckOn mappings of plausible supporting movements unless the source itself mentions testing.

const base = {
  program: "army-h2f",
  verification: { status: "verified", checkedOn: VERIFIED_ON },
} as const;

const open = { locations: ["open-ground"] } as const;

const controlled = "Always lift a weight that can be controlled throughout the range of motion.";
const cd3Progression =
  "Conditioning Drill 3 is an advanced plyometric drill. Progress to it after mastering Conditioning Drills 1 and 2 and tolerating 10 repetitions of them.";
const stcStation = (n: number) => `One minute at station ${n} of the Strength Training Circuit, resting or adjusting the weight if needed.`;

export const moreAtpExercises: Exercise[] = [
  // Conditioning Drill 3 (ATP 7-22.02 paras 5-24 – 5-34)
  {
    ...base,
    id: "single-leg-deadlift",
    name: "Single-Leg Deadlift",
    summary: "Balance on one leg and hinge forward, reaching toward the ground as the other leg rises behind you, then return.",
    officialPurpose: "Develops strength and flexibility of the lower back and legs; the second exercise in Conditioning Drill 3.",
    focus: ["Hamstrings", "Lower back", "Hips", "Balance"],
    executions: [
      {
        context: "Conditioning Drill 3, exercise 2",
        position: "straddle-stance",
        startingPosition: "Straddle Stance with the hands on the hips.",
        steps: [
          { label: "Count 1", text: "Balance on the left leg and bend forward at the waist, reaching straight down toward the ground as the right leg rises to the rear." },
          { label: "Count 2", text: "Reverse the movement to return to the starting position." },
          { label: "Count 3", text: "Repeat count 1, balancing on the right leg." },
          { label: "Count 4", text: "Return to the starting position." },
        ],
        cadence: "slow",
        officialPrescription: "Build up to 10 correctly performed repetitions.",
        source: atp("5-26", "5-14 – 5-15", "Figure 5-17"),
      },
    ],
    cues: ["The hands may touch the ground, fingers spread, for balance at the end of counts 1 and 3."],
    commonMistakes: [],
    cautions: [cd3Progression],
    substitutions: [
      {
        exerciseId: "straight-leg-deadlift",
        name: "Straight-Leg Deadlift",
        difference: "Both feet stay on the ground and the hinge is loaded with kettlebells, a bar, or dumbbells, so it builds strength rather than balance.",
        source: atp("13-4", "13-2"),
      },
    ],
    tags: { ...open, equipment: ["none"], purposes: ["strength", "balance-stability"], impact: "no-jumping", movementPatterns: ["hinge"], phases: ["main"] },
    aft: {
      events: ["MDL"],
      basis: "app",
      note: "RuckOn mapping: bodyweight hip-hinge and balance practice related to the deadlift pattern. It is not loaded like the test lift.",
    },
  },
  {
    ...base,
    id: "half-squat-laterals",
    name: "Half-Squat Laterals",
    summary: "From a half squat with the feet facing forward, step-hop left and right while the trunk keeps facing the front.",
    officialPurpose: "Combines upper- and lower-body plyometric skill and anaerobic endurance; the seventh exercise in Conditioning Drill 3.",
    focus: ["Legs", "Lateral movement", "Anaerobic endurance"],
    executions: [
      {
        context: "Conditioning Drill 3, exercise 7",
        position: "straddle-stance",
        startingPosition: "Straddle Stance, slightly crouched in a half squat, hands facing forward at chest height. The feet point straight ahead throughout.",
        steps: [
          { label: "Count 1", text: "Keeping the trunk facing forward, make a half-squat step-hop to the left." },
          { label: "Count 2", text: "Make a half-squat step-hop to the right." },
          { label: "Count 3", text: "Make another half-squat step-hop to the right." },
          { label: "Count 4", text: "Make a half-squat step-hop to the left to return to the starting position." },
        ],
        cadence: "moderate",
        officialPrescription: "Repeat 5–10 times.",
        source: atp("5-31", "5-19 – 5-20", "Figure 5-22"),
      },
    ],
    cues: ["Keep the trunk facing the same direction throughout.", "Keep the feet pointing straight ahead."],
    commonMistakes: [],
    cautions: [cd3Progression],
    substitutions: [
      {
        exerciseId: "lateral",
        name: "Lateral (Military Movement Drill 1)",
        difference: "Continuous side-stepping down a 25-meter course instead of step-hops in place.",
        source: atp("8-4", "8-2"),
      },
    ],
    tags: { ...open, equipment: ["none"], purposes: ["agility", "anaerobic-conditioning"], impact: "jumping", movementPatterns: ["locomotion", "jump"], phases: ["main"] },
    aft: {
      events: ["SDC"],
      basis: "app",
      note: "RuckOn mapping: side-to-side movement with the trunk facing forward and the feet not crossing, as in the sprint-drag-carry lateral. It does not replace practicing the 25-meter lateral.",
    },
  },

  // Strength Training Circuit (ATP 7-22.02 ch. 13)
  {
    ...base,
    id: "step-up",
    name: "8-Count Step-Up",
    summary: "Holding a kettlebell at each side, step up onto a 12- to 18-inch step and back down, leading with each leg in turn.",
    officialPurpose: "The fourth station of the Strength Training Circuit, a total-body resistance circuit that promotes muscular endurance.",
    focus: ["Thighs", "Hips"],
    executions: [
      {
        context: "Strength Training Circuit, station 4",
        position: "straddle-stance",
        startingPosition: "Straddle Stance facing a 12- to 18-inch step, holding a kettlebell at each side with a neutral grip.",
        steps: [
          { label: "Count 1", text: "Step up onto the step with the left foot, keeping the kettlebells at the sides." },
          { label: "Count 2", text: "Step up with the right foot." },
          { label: "Count 3", text: "Step down with the left foot." },
          { label: "Count 4", text: "Step down with the right foot." },
          { label: "Counts 5–8", text: "Repeat, leading with the right foot: up right, up left, down right, down left." },
        ],
        cadence: "controlled",
        officialPrescription: stcStation(4),
        source: atp("13-6", "13-4 – 13-5", "Figure 13-4"),
      },
    ],
    cues: ["Keep the kettlebells at the sides of the body."],
    commonMistakes: [],
    cautions: ["Adjust the weight and range of movement to match the required performance."],
    substitutions: [
      {
        exerciseId: "forward-lunge",
        name: "Forward Lunge (Strength Training Circuit)",
        difference: "Steps forward on level ground instead of up onto a step; no step needed.",
        source: atp("13-5", "13-3 – 13-4"),
      },
    ],
    tags: { ...open, equipment: ["kettlebell"], purposes: ["muscular-endurance", "strength"], impact: "no-jumping", movementPatterns: ["lunge"], phases: ["main"] },
    aft: {
      events: ["SDC"],
      basis: "app",
      note: "RuckOn mapping: loaded single-leg stepping is a plausible support for the legs during the sprint-drag-carry. The ATP does not link it to the AFT.",
    },
  },
  {
    ...base,
    id: "supine-chest-press",
    name: "Supine Chest Press",
    summary: "Lying on your back with knees bent, press a kettlebell in each hand from the shoulders to straight arms.",
    officialPurpose:
      "Strengthens the chest, shoulder, and triceps muscles and develops the ability to push during combatives, testing, and combat tasks; the sixth station of the Strength Training Circuit.",
    focus: ["Chest", "Shoulders", "Triceps"],
    executions: [
      {
        context: "Strength Training Circuit, station 6",
        position: "supine",
        startingPosition:
          "Supine with the knees bent to 90 degrees, feet 8–12 inches apart and flat on the ground, head and upper arms resting on the ground. Hold a kettlebell of the same weight in each hand with a closed, partly pronated grip, elbows bent so the kettlebells rest on the front of the shoulders.",
        steps: [
          { label: "Press", text: "Extend the elbows to raise the kettlebells straight up in front of the shoulders, turning the hands to a fully pronated grip." },
          { label: "Lower", text: "Return to the starting position." },
          { label: "Continue", text: "Continue at your own pace for the station's minute." },
        ],
        cadence: "controlled",
        officialPrescription: stcStation(6),
        source: atp("13-9", "13-7", "Figure 13-7"),
      },
    ],
    cues: ["Press the kettlebells straight up in front of the shoulders."],
    commonMistakes: [],
    cautions: ["Change the kettlebell weight if needed, and continue only while the press can be done to standard."],
    substitutions: [
      {
        exerciseId: "bench-press",
        name: "Bench Press",
        difference: "Presses from a bench with a longer range of motion and heavier loads; a straight bar needs a rack and a spotter.",
        source: atp("14-10", "14-6"),
      },
    ],
    tags: { ...open, equipment: ["kettlebell"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["push"], phases: ["main"] },
    aft: {
      events: ["HRP"],
      basis: "source-mention",
      note: "The ATP says this exercise develops pushing ability for testing; RuckOn maps that to the hand-release push-up. It does not train the hand release or the straight-body position.",
    },
  },
  {
    ...base,
    id: "bent-over-row",
    name: "Bent-Over Row",
    summary: "Hinged forward with a straight back, pull kettlebells, dumbbells, or a bar toward the chest, then lower under control.",
    officialPurpose:
      "Strengthens the upper back, shoulder girdle, and biceps; heavier weight also challenges the lower back, gluteal muscles, and hamstrings. With free weights it supports core lifts such as the Deadlift.",
    focus: ["Upper back", "Shoulders", "Biceps", "Grip"],
    executions: [
      {
        context: "Strength Training Circuit, station 7",
        position: "forward-leaning-stance",
        startingPosition: "Forward Leaning Stance with the arms hanging in front of the legs, holding kettlebells of equal weight with a closed neutral grip (palms facing each other).",
        steps: [
          { label: "Pull", text: "Bend the elbows to pull the kettlebells toward the chest. The legs, torso, and head stay where they started." },
          { label: "Lower", text: "Return to the starting position." },
          { label: "Continue", text: "Continue at your own pace for the station's minute." },
        ],
        cadence: "controlled",
        officialPrescription: stcStation(7),
        source: atp("13-10", "13-8", "Figure 13-8"),
      },
      {
        context: "Free Weight Training (assistive exercise)",
        position: "forward-leaning-stance",
        startingPosition:
          "Forward Leaning Stance with the arms fully extended down in front of the legs, holding a bar with an overhand grip slightly wider than the shoulders, head in line with the spine. Kettlebells and dumbbells use a neutral grip.",
        steps: [
          { label: "Pull", text: "Pull the weight toward the chest until the upper arms are parallel to the ground, elbows up and pointing to the rear. The head and spine stay in position." },
          { label: "Pause", text: "Pause briefly at the top." },
          { label: "Lower", text: "Return to the down position. Repeat for the session's repetitions and sets." },
        ],
        cadence: "controlled",
        source: atp("14-16", "14-11 – 14-12", "Figure 14-13"),
      },
    ],
    cues: ["Keep the legs, torso, and head still; only the arms move.", "Keep the head in line with the spine."],
    commonMistakes: ["Letting the upper back and shoulders round forward as the weight and repetitions increase."],
    cautions: [controlled],
    substitutions: [
      {
        exerciseId: "single-arm-bent-over-row",
        name: "Single-Arm Bent-Over Row",
        difference: "One arm at a time with the other hand and knee on a bench, which supports the trunk.",
        source: atp("14-17", "14-12"),
      },
    ],
    tags: { ...open, equipment: ["kettlebell", "dumbbell", "barbell-or-hex-bar"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["pull", "hinge"], phases: ["main"] },
    aft: {
      events: ["MDL", "HRP"],
      basis: "app",
      note: "RuckOn mapping: the ATP says the row supports the Deadlift, and ATP 7-22.01 notes the hand-release push-up also works the upper back.",
    },
  },
  {
    ...base,
    id: "overhead-push-press",
    name: "Overhead Push-Press",
    summary: "Dip the hips and knees, then drive with the legs and press kettlebells or a bar overhead to straight arms.",
    officialPurpose:
      "Strengthens triceps and shoulder muscular endurance and builds skill in moving heavier weight overhead to develop muscular power and strength.",
    focus: ["Shoulders", "Triceps", "Legs"],
    executions: [
      {
        context: "Strength Training Circuit, station 8",
        position: "straddle-stance",
        startingPosition: "Straddle Stance holding the kettlebells at the collarbones in the rack position with a closed neutral grip (palms facing each other).",
        steps: [
          { label: "Dip", text: "Slightly flex the hips and knees into a mini-squat." },
          { label: "Drive", text: "Quickly and forcefully extend the elbows to push the weights overhead until they are above the shoulders, looking straight ahead." },
          { label: "Lower", text: "Mini-squat again as you return the weights to the starting position to absorb their descent." },
          { label: "Continue", text: "Continue at your own pace for the station's minute." },
        ],
        cadence: "controlled",
        officialPrescription: stcStation(8),
        source: atp("13-11", "13-8 – 13-9", "Figure 13-9"),
      },
      {
        context: "Free Weight Training (straight bar)",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with the knees slightly flexed, or with staggered legs, holding the bar near the top of the chest just below the collarbones with a closed overhand grip.",
        steps: [
          { label: "Drop and drive", text: "Flex the knees and hips, then forcefully extend them while extending the elbows and shoulders to raise the bar overhead. The neck may extend slightly so the bar passes in front of the face." },
          { label: "Hold", text: "Hold the bar overhead with the elbows straight. From a staggered stance, bring the feet into the Straddle Stance during the drive." },
          { label: "Lower", text: "After a brief pause, flex the elbows, hips, and knees to cushion the bar as it returns to the start." },
        ],
        cadence: "controlled",
        source: atp("14-19", "14-15", "Figure 14-17"),
      },
    ],
    cues: ["Start the press with the legs, then finish with the arms.", "Look straight ahead."],
    commonMistakes: ["Letting the upper back and shoulders round forward as the weight and repetitions increase."],
    cautions: [controlled],
    tags: { ...open, equipment: ["kettlebell", "barbell-or-hex-bar"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["push", "squat"], phases: ["main"] },
  },
  {
    ...base,
    id: "supine-body-twist",
    name: "Supine Body Twist",
    summary: "Lying with hips and knees bent to 90 degrees, rotate a kettlebell one way and the legs the other, then switch sides.",
    officialPurpose:
      "Strengthens the trunk muscles used for rotation and, by keeping the knees together, the hip adductor (groin) muscles; the ninth station of the Strength Training Circuit.",
    focus: ["Trunk rotation", "Obliques", "Hip adductors"],
    executions: [
      {
        context: "Strength Training Circuit, station 9",
        position: "supine",
        startingPosition:
          "Supine with the hips and knees bent to 90 degrees so the feet are off the ground and the head is off the ground. Hold one kettlebell by the handle with both hands, palms facing, in front of and off the chest, with the bell above the stomach rather than the head.",
        steps: [
          { label: "Twist", text: "Rotate the kettlebell to the left and the legs to the right as far as you can under control, keeping the weight away from the body and the arms and head off the ground." },
          { label: "Return", text: "Return to the starting position." },
          { label: "Other side", text: "Repeat to the opposite side: arms to the right, legs to the left." },
          { label: "Continue", text: "Continue at your own pace for the station's minute, keeping the full range of motion." },
        ],
        cadence: "controlled",
        officialPrescription: stcStation(9),
        source: atp("13-12", "13-9", "Figure 13-10"),
      },
    ],
    cues: ["Keep the knees together.", "The head may turn with the arms but should not lift more than 2–4 inches from the ground."],
    commonMistakes: [],
    cautions: ["Change the kettlebell weight if needed, and continue only while the exercise can be done to standard."],
    tags: { ...open, equipment: ["kettlebell"], purposes: ["muscular-endurance", "balance-stability"], impact: "no-jumping", movementPatterns: ["trunk-rotation"], phases: ["main"] },
  },

  // Free Weight Training (ATP 7-22.02 ch. 14)
  {
    ...base,
    id: "front-squat",
    name: "Front Squat",
    summary: "Holding the weight at the front of the shoulders, squat until the knees reach 90 degrees, then stand back up.",
    officialPurpose:
      "A Free Weight Core exercise used throughout a Soldier's career to improve lower-body muscular strength and endurance, and to improve training and testing performance.",
    focus: ["Thighs", "Hips", "Trunk"],
    executions: [
      {
        context: "Free Weight Training (core exercise)",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with the toes pointed slightly outward. Hold a bar across the top of the chest just below the collarbones with crossed arms and a pronated grip. Kettlebells are held in the rack position; dumbbells rest on top of the shoulders.",
        steps: [
          { label: "Lower", text: "Bend the knees and slowly lower the body until there is a 90-degree angle between the upper and lower leg." },
          { label: "Stand", text: "Return to the starting position." },
          { label: "Repeat", text: "Repeat for the session's repetitions and sets." },
        ],
        cadence: "controlled",
        source: atp("14-4", "14-1 – 14-2", "Figure 14-1"),
      },
    ],
    cues: ["Keep the knees aligned over the feet and the heels on the ground.", "Progress to deeper squat positions as strength improves."],
    commonMistakes: ["Rounding the upper back."],
    cautions: [
      "Use a spotter, who stands behind the lifter with the hands close to, but not touching, the lifter's trunk and moves with the lifter (para. 14-5).",
      controlled,
    ],
    substitutions: [
      {
        exerciseId: "back-squat",
        name: "Back Squat",
        difference: "The bar rests across the upper back, or a weight is held at each side, instead of in front of the shoulders.",
        source: atp("14-6", "14-3"),
      },
      {
        exerciseId: "sumo-squat",
        name: "Sumo Squat",
        difference: "One kettlebell held in front with a wider, toes-out stance; done for time in the Strength Training Circuit.",
        source: atp("13-3", "13-1"),
      },
    ],
    tags: { ...open, equipment: ["barbell-or-hex-bar", "kettlebell", "dumbbell"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["squat"], phases: ["main"] },
    aft: {
      events: ["MDL"],
      basis: "source-mention",
      note: "The ATP says the Front Squat can improve training and testing performance; RuckOn maps that to the deadlift, which is also driven by the legs and hips.",
    },
  },
  {
    ...base,
    id: "back-squat",
    name: "Back Squat",
    summary: "With a bar across the upper back, or a weight at each side, squat to a 90-degree knee angle and stand back up.",
    officialPurpose: "A common variation of the Front Squat in Free Weight Training, used to build lower-body muscular strength and endurance.",
    focus: ["Thighs", "Hips", "Lower back"],
    executions: [
      {
        context: "Free Weight Training (core exercise)",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with the toes pointed slightly outward and the bar across the upper back. With dumbbells or kettlebells, hold one at each side with a neutral grip.",
        steps: [
          { label: "Lower", text: "Bend the knees and slowly lower the body until there is a 90-degree angle between the upper and lower leg." },
          { label: "Stand", text: "Return to the starting position." },
          { label: "Repeat", text: "Repeat for the session's repetitions and sets." },
        ],
        cadence: "controlled",
        source: atp("14-6", "14-3", "Figure 14-2"),
      },
    ],
    cues: [
      "Keep a natural arch in the lower back, with the head and neck in line.",
      "Keep the knees aligned over the feet and the heels on the ground.",
    ],
    commonMistakes: ["Extending the neck.", "Rounding the upper back."],
    cautions: [
      "At first, do not squat deeper than 90 degrees; progress to deeper positions as strength improves.",
      "Use a spotter, who moves with the lifter and stays ready to assist (para. 14-7).",
      controlled,
    ],
    substitutions: [
      {
        exerciseId: "front-squat",
        name: "Front Squat",
        difference: "The weight is held in front of the shoulders, which keeps the trunk more upright.",
        source: atp("14-4", "14-1"),
      },
    ],
    tags: { ...open, equipment: ["barbell-or-hex-bar", "kettlebell", "dumbbell"], purposes: ["strength"], impact: "no-jumping", movementPatterns: ["squat"], phases: ["main"] },
    aft: {
      events: ["MDL"],
      basis: "app",
      note: "RuckOn mapping: a loaded leg and hip exercise that supports lifting from the ground. The ATP's Back Squat paragraph does not mention testing.",
    },
  },
  {
    ...base,
    id: "bench-press",
    name: "Bench Press",
    summary: "Lying on a bench, lower a bar, dumbbells, or kettlebells to just above the chest and press back to straight arms.",
    officialPurpose:
      "A free-weight exercise used to improve upper-body muscular strength and endurance; with free weights it also requires stability of the trunk, lower back, hips, and upper legs.",
    focus: ["Chest", "Shoulders", "Triceps"],
    executions: [
      {
        context: "Free Weight Training (core exercise)",
        // On a bench with the feet on the floor, which differs from the ATP's ground Supine position definition.
        startingPosition:
          "Supine on the bench with the feet on the floor and the shoulders, head, and lower back firmly against the bench. Grasp the weight with a closed pronated grip slightly wider than the shoulders; a bar starts above the upper chest in the rack.",
        steps: [
          { label: "Unrack", text: "Lift the bar from the supports and hold it over the chest with the elbows fully extended." },
          { label: "Lower", text: "Bend the elbows to lower the bar until it is just above the breastbone, breathing in on the way down." },
          { label: "Press", text: "After a brief pause, press back to the up position, keeping the bar parallel to the ground and breathing out on the way up." },
        ],
        cadence: "controlled",
        source: atp("14-10", "14-6 – 14-8", "Figures 14-6 to 14-9"),
      },
    ],
    cues: ["Keep the feet firmly on the ground.", "Breathe in as the weight comes down and out as you press; practice this with lighter weight first."],
    commonMistakes: ["Jerking the weight.", "Shrugging, arching the back, or letting the hips lift off the bench."],
    cautions: ["Use a spotter at the head of the bench who helps unrack the bar and assists if the lifter loses control (para. 14-12)."],
    substitutions: [
      {
        exerciseId: "supine-chest-press",
        name: "Supine Chest Press",
        difference: "Kettlebells pressed from the floor with the knees bent; no bench or rack, and the floor limits how far the elbows travel.",
        source: atp("13-9", "13-7"),
      },
      {
        name: "Incline Bench",
        difference: "The same press on an inclined bench, shifting more work to the shoulders.",
        source: atp("14-11", "14-8"),
      },
      {
        exerciseId: "push-up",
        name: "Push-Up",
        difference: "Bodyweight pressing from the Front Leaning Rest with no equipment; the trunk must also hold the body straight.",
        source: atp("3-13", "3-8 – 3-9"),
      },
    ],
    tags: { ...open, equipment: ["barbell-or-hex-bar", "dumbbell", "kettlebell"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["push"], phases: ["main"] },
    aft: {
      events: ["HRP"],
      basis: "app",
      note: "RuckOn mapping: trains the chest, shoulders, and triceps used to push up in the hand-release push-up. It does not train the hand release or the straight-body position.",
    },
  },
  {
    ...base,
    id: "heel-raise",
    name: "Heel Raise",
    summary: "Holding a bar across the upper back or a weight at each side, rise onto the balls of the feet and lower the heels as far as possible.",
    officialPurpose:
      "A free-weight exercise used to improve lower-leg muscular strength and endurance; with free weights it also requires stability of the trunk, lower back, hips, and upper legs.",
    focus: ["Calves", "Ankles"],
    executions: [
      {
        context: "Free Weight Training (assistive exercise)",
        position: "straddle-stance",
        startingPosition:
          "Straddle Stance with a bar across the upper back, or a dumbbell or kettlebell at each side with a neutral grip. Keep the knees straight to work the gastrocnemius, or slightly bent to work the soleus. The balls of the feet may be raised so the heels can drop below them.",
        steps: [
          { label: "Rise", text: "Rise up onto the balls of the feet." },
          { label: "Pause", text: "Pause briefly at the top." },
          { label: "Lower", text: "Reverse the movement, dropping the heels as far as possible. Repeat for the session's repetitions and sets." },
        ],
        cadence: "controlled",
        source: atp("14-15", "14-10 – 14-11", "Figure 14-12"),
      },
    ],
    cues: ["Adjust the knee bend slightly to target the lower-leg muscle you are working."],
    commonMistakes: [],
    cautions: [controlled],
    tags: { ...open, equipment: ["barbell-or-hex-bar", "dumbbell", "kettlebell"], purposes: ["muscular-endurance", "strength"], impact: "no-jumping", movementPatterns: ["ankle-extension"], phases: ["main"] },
    aft: {
      events: ["2MR", "SDC"],
      basis: "app",
      note: "RuckOn mapping: calf strength and endurance support running and sprinting. The ATP does not link this exercise to the AFT.",
    },
  },
  {
    ...base,
    id: "single-arm-bent-over-row",
    name: "Single-Arm Bent-Over Row",
    summary: "With one hand and knee supported on a bench, pull a dumbbell or kettlebell toward the chest, then switch sides.",
    officialPurpose: "A modified Bent-Over Row done one arm at a time with a single dumbbell or kettlebell, to build upper-back strength and endurance.",
    focus: ["Upper back", "Shoulders", "Biceps", "Grip"],
    executions: [
      {
        context: "Free Weight Training (assistive exercise)",
        startingPosition:
          "Right hand and right knee on a bench to support that side; left foot on the ground and left arm fully extended down in front of the body, holding a dumbbell with an overhand grip. Back straight, head in line with the spine.",
        steps: [
          { label: "Pull", text: "Pull the dumbbell toward the chest until the upper arm is parallel to the ground, elbow up and pointing to the rear. The head and spine stay in position." },
          { label: "Pause", text: "Pause briefly at the top." },
          { label: "Lower", text: "Return to the down position. After the set, switch sides and repeat with the right arm." },
        ],
        cadence: "controlled",
        source: atp("14-17", "14-12 – 14-13", "Figure 14-14"),
      },
    ],
    cues: ["Keep the back straight and the head in line with the spine."],
    commonMistakes: ["Letting the upper back and shoulder round forward as the weight and repetitions increase."],
    cautions: [controlled],
    substitutions: [
      {
        exerciseId: "bent-over-row",
        name: "Bent-Over Row",
        difference: "Both arms at once without a bench, so the lower back and hips also hold the hinged position.",
        source: atp("14-16", "14-11"),
      },
    ],
    tags: { ...open, equipment: ["dumbbell", "kettlebell"], purposes: ["strength", "muscular-endurance"], impact: "no-jumping", movementPatterns: ["pull"], phases: ["main"] },
    aft: {
      events: ["MDL", "HRP"],
      basis: "app",
      note: "RuckOn mapping: upper-back and grip work that the ATP says supports the Deadlift; ATP 7-22.01 notes the hand-release push-up also works the upper back.",
    },
  },
];
