import type { AftEvent } from "./eventTypes";
import type { AftEventCode } from "./types";
import { OFFICIAL_VIDEO_NOTE, atp01 } from "./guideSources";

const ATP = {
  title: "ATP 7-22.01, Holistic Health and Fitness Testing",
  type: "Army",
  date: "12 March 2026",
  url: "https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN46104-ATP_7-22.01-000-WEB-1.pdf",
} as const;

const SCALES = {
  title: "AFT Scoring Scales",
  type: "Army",
  date: "Effective 1 June 2025",
  reference: "Score conversion tables named in ATP 7-22.01, para. 2-30",
  url: "https://www.army.mil/aft/",
} as const;

const ANATOMY = {
  title: "RuckOn anatomical explanation",
  type: "RuckOn",
  reference: "General exercise anatomy written by RuckOn; not an Army statement.",
} as const;

const channel = "U.S. Army Holistic Health and Fitness (YouTube)";

// Rules that apply across events (ATP 7-22.01 paras 2-38 and 2-39).
const gloves = "Gloves that conform to AR 670-1 may be worn for any event.";

export const aftEvents: AftEvent[] = [
  {
    code: "MDL",
    slug: "deadlift",
    order: 1,
    name: "3 Repetition Maximum Deadlift",
    shortName: "Deadlift",
    description: "Measures the lower-body muscular strength needed to lift heavy loads from the ground safely and effectively.",
    purpose:
      "The Army describes the MDL as a strong predictor of a Soldier's ability to lift and carry a casualty on a litter and to lift and move personnel and equipment. It relies on well-conditioned back and leg muscles that help with load carriage and with avoiding upper- and lower-back injuries.",
    rawScoreLabel: "Heaviest weight lifted for 3 correct repetitions (pounds)",
    equipment: [
      { name: "Hexagon (hex) bar, 60 pounds unloaded", quantity: 1, description: "One per lane. Other bar weights are allowed if the bar is weighed and plate loads are recalculated." },
      { name: "Barbell collars", quantity: 2, description: "Not counted in the load." },
      { name: "Bumper plates", description: "Loaded to the lane's weight using the ATP's plate arrangement table (120 to 340 pounds)." },
    ],
    setup: [
      "Set up MDL lanes in the space next to the field lanes.",
      "Weigh each hex bar before the test and load plates using the ATP's plate arrangement table. Recalculate if a bar is not 60 pounds.",
      "Inspect hex bars for stress cracks at the welded seams.",
      "Aim for 5–6 Soldiers per MDL lane; graders may change bar weights or move Soldiers to even out the stacks.",
      "Soldiers choose a lane with their preferred starting weight.",
    ],
    commands: [
      { command: "GET READY", description: "NCOIC: the first Soldier in each stack stands in front of the hex bar." },
      { command: "GRADERS READY", description: "NCOIC, once all Soldiers are ready; graders signal visually." },
      { command: "THE MAXIMUM DEADLIFT STARTS NOW", description: "NCOIC." },
      { command: "GET SET", description: "Grader: the Soldier steps inside the hex bar into the start position." },
      { command: "GO", description: "Grader: starts the attempt." },
      { command: "NEXT SOLDIER MOVE FORWARD", description: "Grader, after each Soldier finishes." },
    ],
    startingPosition:
      "Inside the hex bar with feet shoulder-width apart, gripping the center of the handles with a closed grip. Arms fully extended, back flat, head in line with the spine or slightly extended, and both heels on the ground. Every repetition starts from this position.",
    execution: [
      {
        id: "prepare",
        title: "Prepare",
        command: "GET SET",
        instructions: [
          "Step inside the hex bar, feet shoulder-width apart, and find the mid-point of the handles.",
          "Bend at the knees and hips, reach down, and grasp the center of the handles with a closed grip (thumb wrapped around the handle opposite the fingers).",
        ],
      },
      {
        id: "lift",
        title: "Lift",
        command: "GO",
        instructions: [
          "Straighten the hips and knees to stand up into the Straddle Stance.",
          "Do not let the hips rise before or above the shoulders. Keep the back straight and the feet in place, staying balanced and in control.",
        ],
      },
      {
        id: "lower",
        title: "Lower",
        instructions: [
          "Lower the bar to the ground under control with a straight back.",
          "Place the bar down; do not drop it. The plates must touch the ground to finish the repetition.",
        ],
      },
      {
        id: "repeat",
        title: "Repeat",
        instructions: ["Complete three continuous repetitions without resting on the ground."],
      },
    ],
    rules: {
      allowed: [
        "Adjusting the grip while keeping contact with the bar.",
        "Moving to another lane that already has the next target weight.",
        "Hex bars with adjustable handle width and walk-in hex bars.",
        gloves,
      ],
      faults: [
        "Knees moving closer together during any part of the lift (safety stop).",
        "Hips rising above the shoulders to start the lift (safety stop).",
        "Back or shoulders rounding during any part of the lift (safety stop).",
        "Losing balance, including stepping forward or backward (safety stop).",
      ],
      termination: [
        "Not fully extending the legs to reach the Straddle Stance.",
        "Dropping the bar.",
        "Taking the hands off the bar between repetitions while it is on the ground.",
        "Not touching the bar to the ground between repetitions.",
        "Resting on the ground (an obvious lack of effort to lift).",
        "A safety stop on the second or third repetition.",
      ],
      safetyTips: [
        "A safety stop on the first repetition is not a record attempt: the grader explains the error and the Soldier restarts the attempt. It exists to prevent repeated movements that could cause injury.",
        "Collars keep plates from moving during the lift.",
        "Soldiers should know their goal weight and have lifted it in training before the test.",
        "Chalk, powder, weightlifting belts, and wrist straps are not authorized.",
      ],
      considerations: [
        "Recommended 10-minute MDL warm-up: 8–10 reps at 25% of goal weight or the empty bar (rest 2 min), 6 reps at 40% (rest 3 min), 4 reps at 50% (rest 4 min or until the event starts), and an optional 1 rep at 80%.",
      ],
    },
    completion: [
      "A successful attempt is 3 continuous repetitions to standard.",
      "Each Soldier has two attempts. After a successful first attempt, the Soldier may make one attempt at a heavier weight. After a failed first attempt, the Soldier may make one more attempt at the same or a lower weight.",
      "The raw score is the heaviest weight successfully lifted.",
      "There is no programmed rest before the next event unless only one or two Soldiers are testing (then 5 minutes).",
    ],
    grading: {
      procedure: [
        "The grader gives \"GET SET\" and \"GO\" for each attempt.",
        "The grader records each attempt, checks the maximum weight successfully lifted, and initials the MDL box on DA Form 705-TEST.",
        "The grader returns the scorecard to the Soldier and reports to the OIC or NCOIC for HRP lane assignment.",
      ],
      responsibilities: [
        "Call a safety stop on an unsafe first repetition, explain the error, and let the Soldier restart.",
        "Terminate the attempt and record a failed attempt for a safety stop on the second or third repetition.",
        "After a successful attempt, record the weight and ask whether the Soldier wants to try a heavier weight.",
      ],
    },
    breathing: null,
    scoring: { rawUnit: "pounds", displayUnit: "lb", higherIsBetter: true, minimumPoints: 0, maximumPoints: 100 },
    performance: {
      fitnessComponents: ["Lower-body muscular strength"],
      primaryMuscles: ["Gluteus maximus", "Quadriceps", "Hamstrings", "Spinal erectors"],
      secondaryMuscles: ["Forearm and grip muscles", "Trapezius", "Abdominal and trunk muscles"],
      trainingFocus: ["Hip hinge with knee bend (hex-bar lift)", "Two-leg lift from the ground", "Grip and trunk bracing"],
    },
    media: { video: "https://www.youtube.com/watch?v=rTBrj1CuT8w" },
    video: { url: "https://www.youtube.com/watch?v=rTBrj1CuT8w", title: "ACFT Event 1 - 3 Repetition Maximum Deadlift", channel, note: OFFICIAL_VIDEO_NOTE },
    refs: {
      measures: atp01("2-41", "26"),
      equipment: atp01("2-21, Table 2-1; E-2 – E-8", "20–21, 87–89"),
      setup: atp01("2-43; E-3, E-6, E-30; equipment safety note", "20, 26, 87–88, 93"),
      commands: atp01("2-43", "26"),
      startingPosition: atp01("2-45 – 2-46", "27"),
      execution: atp01("2-46", "27"),
      completion: atp01("2-37, 2-43, 2-46, 2-48 – 2-52", "25–29"),
      faults: atp01("2-47 – 2-48", "28"),
      termination: atp01("2-50", "28–29"),
      grading: atp01("2-12, 2-43, 2-47 – 2-51", "18–19, 26–29"),
      safety: atp01("2-21 note, 2-42, 2-47; E-7", "21, 26, 28, 88"),
      allowed: atp01("2-39, 2-49 – 2-50; E-3", "25, 28–29, 87"),
    },
    discrepancies: [
      "The ATP's plate arrangement table goes up to 340 pounds, while the June 2025 score tables award points up to 350 pounds in some age groups. The ATP does not show a 350-pound arrangement.",
    ],
    sources: [{ ...ATP, reference: "Chapter 2, paras 2-41 – 2-52; Appendix E" }, SCALES, ANATOMY],
  },
  {
    code: "HRP",
    slug: "hand-release-push-up",
    order: 2,
    name: "Hand-Release Push-Up",
    shortName: "Push-ups",
    description: "A two-minute timed event that measures upper-body muscular endurance.",
    purpose:
      "The Army links the HRP to repetitive and sustained pushing in combat tasks: pushing an opponent away, pushing a stuck vehicle, and pushing up from the ground during evade and maneuver. It also works upper-back muscles used when reaching out from the prone position, taking cover, or low crawling.",
    rawScoreLabel: "Correct repetitions in 2 minutes",
    equipment: [
      { name: "Stopwatches", quantity: 2, description: "Used by the OIC or NCOIC and a back-up timer; one common clock times every lane." },
      { name: "Foam or rubber mats", description: "Optional. Sleeping mats are not authorized." },
    ],
    setup: [
      "Test one Soldier per lane with one grader per lane.",
      "The OIC or NCOIC (or timer) runs a common 2:00 clock for all lanes; individual graders do not time the HRP.",
      "Graders kneel or sit where they can check the Soldier's hands, chest, body, and feet.",
    ],
    commands: [
      { command: "GET READY", description: "NCOIC: the first Soldier in each lane moves to the start line." },
      { command: "GRADERS READY", description: "NCOIC; graders signal visually." },
      { command: "GET SET", description: "NCOIC: Soldiers take the HRP start position." },
      { command: "GO", description: "NCOIC: Soldiers begin and the common 2:00 clock starts." },
      { command: "ONE MINUTE REMAINING / 30 SECONDS REMAINING", description: "Timer." },
      { command: "10 SECONDS, 9, 8, 7, 6, 5, 4, 3, 2, 1, STOP", description: "Timer ends the event." },
      { command: "NEXT SOLDIER MOVE FORWARD", description: "NCOIC." },
    ],
    startingPosition:
      "Prone, with hands flat on the ground beneath the shoulders and index fingers inside the outer edge of the shoulders. Chest and the front of the hips and thighs on the ground, toes on the ground, feet together or up to a boot's width apart (measured by the grader), ankles flexed. The head does not have to touch the ground.",
    execution: [
      { id: "push", title: "Movement 1: push up", command: "GO", instructions: ["Push the whole body up as a single unit until the elbows are fully extended in the front leaning rest."] },
      { id: "lower", title: "Movement 2: lower", instructions: ["Bend the elbows to lower the body. Chest, hips, and thighs touch the ground together; the head or face does not have to."] },
      { id: "release", title: "Movement 3: hand release", instructions: ["Without moving the head, body, or legs, extend both arms straight out to the sides into a T. The arms and hands may touch or slide along the ground."] },
      { id: "return", title: "Movement 4: return", instructions: ["Immediately bring the hands back to the starting position to complete the repetition."] },
    ],
    rules: {
      allowed: [
        "Performing the exercise on the knuckles (hands in fists) and switching between fists and flat hands; a fist must be inside the outer edge of the shoulder.",
        "Resting only in the front leaning rest.",
        "Using an optional mat, as long as the whole body is on it except the arms during the hand release.",
        gloves,
      ],
      faults: [
        "Not keeping a straight body line from head to ankles, including extending the neck or arching the back to keep the chest off the ground.",
        "Not extending both arms into a generally straight T.",
        "Not fully extending the elbows in the up position.",
        "Not returning the hands to the starting position.",
        "Feet more than a boot's width apart.",
      ],
      termination: [
        "Bending at the shoulders, hips, or knees while in the front leaning rest.",
        "Lifting a foot at any time, or lifting a hand while in the front leaning rest.",
        "Placing a knee on the ground from the front leaning rest.",
        "Not making a continuous effort to rise from the ground (resting on the ground).",
        "Repeating the hand release before rising from the ground.",
      ],
      safetyTips: [
        "Sleeping mats are not authorized; if a mat is used, the whole body must be on it except the arms during the hand release.",
      ],
      considerations: [
        "Soldiers should not wear glasses during the HRP.",
        "Keep the head in line with the body and the eyes on the ground.",
        "Do not \"snake\" off the ground; the body moves as one unit.",
        "Correct a movement error immediately.",
      ],
    },
    completion: [
      "The raw score is the number of correct repetitions completed in two minutes.",
      "If the event is terminated for resting on the ground, the score earned before resting is recorded.",
    ],
    grading: {
      procedure: [
        "Graders kneel or sit to check the Soldier's hands, chest, body, and feet.",
        "Graders count correct repetitions aloud and record them on DA Form 705-TEST.",
        "The NCOIC starts each group; the timer runs the 2:00 clock for all lanes.",
      ],
      responsibilities: [
        "Measure foot width with the grader's boot.",
        "Give the Soldier the standard instructions before the event (glasses, head position, continuous effort, feet, elbow extension, immediate correction, knuckle option).",
      ],
    },
    breathing: null,
    scoring: { rawUnit: "repetitions", displayUnit: "reps", higherIsBetter: true, minimumPoints: 0, maximumPoints: 100 },
    performance: {
      fitnessComponents: ["Upper-body muscular endurance"],
      primaryMuscles: ["Pectoralis major", "Triceps brachii", "Anterior deltoids"],
      secondaryMuscles: ["Serratus anterior", "Upper-back muscles (rhomboids, middle trapezius, rear deltoids) during the hand release", "Abdominal and hip muscles holding the straight body line"],
      trainingFocus: ["Horizontal push", "Shoulder-blade retraction (T position)", "Trunk stability in a straight-body position"],
    },
    media: { video: "https://www.youtube.com/watch?v=9mO6ygDS7y4" },
    video: { url: "https://www.youtube.com/watch?v=9mO6ygDS7y4", title: "ACFT Event 3 - Hand Release Pushup", channel, note: OFFICIAL_VIDEO_NOTE },
    refs: {
      measures: atp01("2-56", "30"),
      equipment: atp01("2-22", "21"),
      setup: atp01("2-53 – 2-54, 2-62", "29–31"),
      commands: atp01("2-53 – 2-54", "29–30"),
      startingPosition: atp01("2-57 – 2-58", "30–31"),
      execution: atp01("2-58", "31"),
      completion: atp01("2-62 – 2-64", "31–32"),
      faults: atp01("2-59", "31"),
      termination: atp01("2-60, 2-62", "31"),
      grading: atp01("2-12, 2-54, 2-62 – 2-63", "18–19, 30–31"),
      safety: atp01("2-61", "31"),
      allowed: atp01("2-39, 2-61 – 2-62, 2-64", "25, 31–32"),
    },
    sources: [{ ...ATP, reference: "Chapter 2, paras 2-53 – 2-64" }, SCALES, ANATOMY],
  },
  {
    code: "SDC",
    slug: "sprint-drag-carry",
    order: 3,
    name: "Sprint-Drag-Carry",
    shortName: "SDC",
    description: "A timed 250-meter shuttle event (5 × 50 meters) that measures anaerobic capacity, muscular endurance, and muscular strength.",
    purpose:
      "The Army describes these as the capacities needed for high-intensity tasks lasting a few seconds to a few minutes, such as reacting to direct and indirect fire, building a hasty fighting position, and extracting a casualty and carrying them to safety.",
    rawScoreLabel: "Total time (mm:ss)",
    equipment: [
      { name: "Nylon sled with pull strap", quantity: 1, description: "Sled 22 × 19.5 inches, holds up to four 45-pound plates; one-piece strap 92 inches (±2) with a loop handle at each end." },
      { name: "45-pound bumper plates on the sled", quantity: 2, description: "Four plates (180 pounds) on a modified surface." },
      { name: "40-pound kettlebells", quantity: 2, description: "Within 2 pounds of 40 pounds, about 11 inches (±1) tall, flat base so the handle stands vertical." },
      { name: "Stopwatches", quantity: 2, description: "OIC or NCOIC and the lane grader; the start-line grader may use one or two to time both Soldiers in adjacent lanes." },
    ],
    setup: [
      "Lanes are 25 meters long and 2.5–3.0 meters wide, marked every 5 meters, with about 4 meters past the 25-meter line for the sled turn-around and about 8 meters behind the start line for staging and the finish.",
      "Use a standard surface (maintained grass or artificial turf, two 45-pound plates on the sled) when possible. On a modified surface (wood, packed dirt, vinyl, or smooth concrete) the OIC or NCOIC puts four 45-pound plates on the sled.",
      "Do not use restricted surfaces: unimproved dirt or gravel, rubberized track or gym floors, ice, or snow.",
      "Indoor lanes need enough space at both ends to turn and to sprint through the finish.",
      "Inspect the sled and pull strap for torn fabric or stitching.",
      "On \"GET READY,\" each Soldier arranges the SDC equipment at the start line.",
    ],
    commands: [
      { command: "GET READY", description: "NCOIC: the first Soldier in each lane arranges the equipment and takes the ready position." },
      { command: "GRADERS READY", description: "NCOIC; graders signal visually." },
      { command: "GET SET", description: "NCOIC: Soldiers take the prone start position." },
      { command: "GO", description: "NCOIC: the start-line grader starts the stopwatch." },
      { command: "NEXT SOLDIER, MOVE FORWARD", description: "NCOIC, once all lanes finish." },
    ],
    startingPosition: "Prone with the hands on the ground beneath the shoulders and the top of the head behind the start line.",
    execution: [
      { id: "sprint-1", title: "Shuttle 1: sprint", command: "GO", instructions: ["Get up from the prone position and sprint 25 meters. Touch the 25-meter line with a foot and a hand, turn, and sprint back to the start."] },
      {
        id: "drag",
        title: "Shuttle 2: drag",
        instructions: [
          "Grasp each strap handle and pull the sled backward until the whole sled crosses the 25-meter line, then turn and drag it back to the start line.",
          "The strap must pass freely through the sled's D-ring and may not be twisted, wrapped, or knotted.",
        ],
      },
      {
        id: "lateral",
        title: "Shuttle 3: lateral",
        instructions: [
          "Move laterally 25 meters leading with one foot, touch the 25-meter line with a foot and a hand, and return leading with the other foot.",
          "Face the same direction out and back. The feet do not cross and stay parallel to each other and perpendicular to the direction of travel.",
        ],
      },
      {
        id: "carry",
        title: "Shuttle 4: carry",
        instructions: [
          "Pick up both 40-pound kettlebells with a closed grip and carry them at your sides (farmer's carry only). Run 25 meters, touch the 25-meter line with a foot, and return.",
          "Keep the kettlebells upright with the handles up. After crossing the start line, set them down without dropping them.",
        ],
      },
      { id: "sprint-2", title: "Shuttle 5: sprint", instructions: ["Sprint 25 meters, touch the 25-meter line with a foot and a hand, then sprint back across the start line to finish."] },
    ],
    rules: {
      allowed: [
        "Three sled-strap grips only: fingers through the loops; hands completely through the loops gripping just below the sewn portion; or gripping below the loops at the sewn portion.",
        "Leading with either foot on the first lateral leg (then the other foot on the way back).",
        gloves,
      ],
      faults: [
        "Not touching the 25-meter line with a foot and a hand on the sprints and lateral: the grader calls the Soldier back to do so.",
        "Not getting the whole sled across the 25-meter line: the grader calls the Soldier back.",
        "Not touching the 25-meter line with a foot on the carry: the grader calls the Soldier back.",
        "Dropping the kettlebells at the start line: the grader calls the Soldier back to set them down under control.",
      ],
      termination: [],
      safetyTips: [
        "Each grader controls two adjacent lanes to keep Soldiers and graders safe and to prevent interference between lanes.",
        "Choose the safest surface; standard surfaces should be the primary choice. No adjustments to SDC standards or scoring are authorized other than the sled weight for a modified surface.",
        "Check the sled and strap for torn fabric or stitching before the test.",
      ],
      considerations: [],
    },
    completion: [
      "The event is five continuous 50-meter shuttles in order: sprint, drag, lateral, carry, sprint.",
      "The start-line grader records the time after both Soldiers in the adjacent lanes cross the finish line.",
    ],
    grading: {
      procedure: [
        "Two graders work together across two adjacent lanes and stay at the ends of the lanes; they do not run with the Soldiers.",
        "The start-line grader starts and records the time for both Soldiers and enforces standards at the start line.",
        "The 25-meter grader confirms correct foot and hand touches and that the sled crosses the line.",
      ],
      responsibilities: [
        "Call Soldiers back to fix a missed touch or a sled that did not cross the line.",
        "Record the SDC time on DA Form 705-TEST.",
      ],
    },
    breathing: null,
    scoring: { rawUnit: "seconds", displayUnit: "mm:ss", higherIsBetter: false, minimumPoints: 0, maximumPoints: 100 },
    performance: {
      fitnessComponents: ["Anaerobic capacity", "Muscular endurance", "Muscular strength"],
      primaryMuscles: ["Quadriceps", "Gluteal muscles", "Hamstrings", "Calves"],
      secondaryMuscles: ["Hip abductors and adductors (lateral)", "Grip, forearm, and trapezius muscles (drag and carry)", "Trunk muscles"],
      trainingFocus: ["Sprinting and turning", "Backward sled drag", "Lateral movement", "Loaded carry", "Getting up from the ground quickly"],
    },
    media: { video: "https://www.youtube.com/watch?v=Mv2T2bpbJpw" },
    video: { url: "https://www.youtube.com/watch?v=Mv2T2bpbJpw", title: "ACFT Event 4 Sprint Drag Carry", channel, note: OFFICIAL_VIDEO_NOTE },
    refs: {
      measures: atp01("2-67", "33"),
      equipment: atp01("2-23; E-9 – E-14", "21–22, 89–90"),
      setup: atp01("2-16 – 2-18, 2-66; E-10 – E-11, E-29; equipment safety note", "19–20, 32, 89, 93"),
      commands: atp01("2-66", "32"),
      startingPosition: atp01("2-68, 2-70", "33–34"),
      execution: atp01("2-68, 2-70", "33–34"),
      completion: atp01("2-68 – 2-70", "33–34"),
      faults: atp01("2-68", "33–34"),
      grading: atp01("2-12 – 2-13, 2-65 – 2-66, 2-69", "18–19, 32, 34"),
      safety: atp01("2-12, 2-18; E-11; equipment safety note", "19–20, 89"),
      allowed: atp01("2-39, 2-68", "25, 33"),
    },
    discrepancies: [
      "The ATP lists call-backs for missed touches but does not list termination criteria for the SDC.",
      "The restricted-surface list in para. 2-17 includes \"rubberized track or gym floors\"; the list in para. E-10 names only rubberized track.",
    ],
    sources: [{ ...ATP, reference: "Chapter 2, paras 2-65 – 2-70; Appendix E" }, SCALES, ANATOMY],
  },
  {
    code: "PLK",
    slug: "plank",
    order: 4,
    name: "Plank",
    shortName: "Plank",
    description: "A test of core-static strength and endurance.",
    purpose: "The ATP describes the plank as a test of core-static strength and endurance and does not state a further purpose.",
    rawScoreLabel: "Time held in the proper plank position (mm:ss)",
    equipment: [
      { name: "Stopwatch", quantity: 1, description: "One per lane, used by the grader." },
      { name: "Foam or rubber mats", description: "Optional. Sleeping mats are not authorized." },
    ],
    setup: [
      "Graders test each Soldier in their lane individually, positioned to observe the plank position.",
      "If a mat is used, the Soldier's entire body must be on it.",
    ],
    commands: [
      { command: "GET READY", description: "NCOIC: Soldiers take the ready position on the ground." },
      { command: "GRADERS READY", description: "NCOIC; graders signal visually." },
      { command: "GET SET", description: "Soldiers lift into the plank start position." },
      { command: "GO", description: "Soldiers hold the plank and the grader starts the stopwatch. From the second Soldier on, the lane grader gives GET SET and GO." },
      { command: "15-second time calls", description: "The grader announces elapsed time every 15 seconds." },
    ],
    startingPosition:
      "On \"GET READY\": hands on the ground as fists (pinky side down) or flat with palms down, elbows bent under the shoulders, forearms flat forming a triangle, fingers not interlocked or interlaced, hips bent with one or both knees on the ground. On \"GET SET\": lift both knees and bring the hips into a straight line with the legs, shoulders, and head, eyes on the ground, feet up to the grader's boot width apart, ankles flexed with the bottom of the toes on the ground.",
    execution: [
      { id: "ready", title: "Ready position", command: "GET READY", instructions: ["Take the forearm ready position with one or both knees on the ground."] },
      { id: "set", title: "Set", command: "GET SET", instructions: ["Lift both knees and bring the body into a straight line from head to ankles, similar to the front leaning rest."] },
      {
        id: "hold",
        title: "Hold",
        command: "GO",
        instructions: [
          "Hold a straight line through the head, shoulders, back, hips, and legs.",
          "Keep the feet, forearms, and fists or palms in contact with the ground for the whole event.",
        ],
      },
    ],
    rules: {
      allowed: [
        "Switching between fists (pinky side down) and palms down, as long as the hands stay in contact with the ground.",
        "Shaking or trembling from maximum effort, as long as the proper position is held.",
        gloves,
      ],
      faults: [
        "Losing the straight-line position, or the hands or feet sliding out of position: the grader gives one verbal warning to correct it.",
      ],
      termination: [
        "Touching the ground with any part of the body other than the feet, forearms, and fists or palms.",
        "Raising a foot or hand off the ground.",
        "Failing to hold the straight-line position from head to heels.",
        "Not correcting a deficiency after the one verbal warning.",
      ],
      safetyTips: ["Sleeping mats are not authorized; if a mat is used, the Soldier's entire body must be on it."],
      considerations: ["Fingers of the two hands may not be interlocked, interlaced, or touching."],
    },
    completion: [
      "The raw score is the time the Soldier holds the proper plank position.",
      "When the last Soldier finishes the plank, the OIC or NCOIC starts a 10-minute rest before the 2-mile run.",
    ],
    grading: {
      procedure: [
        "The grader starts the stopwatch on \"GO\" and calls the elapsed time every 15 seconds.",
        "The grader records the plank time on DA Form 705-TEST.",
        "Soldiers rotate through the lane; from the second Soldier on, the grader gives \"GET SET\" and \"GO.\"",
      ],
      responsibilities: [
        "Measure hand and foot spacing against the grader's fist or boot.",
        "Give one verbal warning for a position error, then terminate the event if the Soldier cannot correct it.",
      ],
    },
    breathing: null,
    scoring: { rawUnit: "seconds", displayUnit: "mm:ss", higherIsBetter: true, minimumPoints: 0, maximumPoints: 100 },
    performance: {
      fitnessComponents: ["Core-static strength", "Core endurance"],
      primaryMuscles: ["Rectus abdominis", "Transversus abdominis", "Obliques"],
      secondaryMuscles: ["Spinal erectors", "Gluteal muscles", "Shoulder muscles (deltoids, serratus anterior)", "Quadriceps"],
      trainingFocus: ["Holding the trunk still against gravity (anti-extension)", "Shoulder stability on the forearms"],
    },
    media: { video: "https://www.youtube.com/watch?v=XuprZeJa7G0" },
    video: { url: "https://www.youtube.com/watch?v=XuprZeJa7G0", title: "ACFT Event 5 - Plank", channel, note: OFFICIAL_VIDEO_NOTE },
    refs: {
      measures: atp01("2-72", "35"),
      equipment: atp01("2-24", "22"),
      setup: atp01("2-71, 2-73", "34–36"),
      commands: atp01("2-71, 2-73", "34–35"),
      startingPosition: atp01("2-73", "35"),
      execution: atp01("2-73", "35"),
      completion: atp01("2-71, 2-75", "34–36"),
      faults: atp01("2-73", "35"),
      termination: atp01("2-73", "35"),
      grading: atp01("2-71, 2-73 – 2-74", "34–36"),
      safety: atp01("2-73", "36"),
      allowed: atp01("2-39, 2-73", "25, 35–36"),
    },
    discrepancies: [
      "Hand spacing: para. 2-73 first says the hands are no more than the grader's fist-width apart, then says no more than a boot width apart.",
      "Ready position: para. 2-73 says one or both legs rest on the ground; the Soldier instructions in para. 2-74 say one or both knees.",
      "The equipment list refers to para. 2-88 for mat guidance; the mat rules themselves are in para. 2-73.",
    ],
    sources: [{ ...ATP, reference: "Chapter 2, paras 2-71 – 2-74" }, SCALES, ANATOMY],
  },
  {
    code: "2MR",
    slug: "two-mile-run",
    order: 5,
    name: "2-Mile Run",
    shortName: "2-mile run",
    description: "A test of aerobic endurance.",
    purpose: "The Army ties the 2-mile run to common Soldier tasks such as dismounted movement, ruck marching, and infiltration.",
    rawScoreLabel: "Time to complete 2 miles (mm:ss)",
    equipment: [
      { name: "Stopwatches", description: "2 to 17: one for the OIC or NCOIC and one for each grader." },
      { name: "Outdoor timing clock", description: "Not required, but assists testing." },
      { name: "Numbers or vests", description: "Issued to Soldiers by graders during the 10-minute rest." },
    ],
    setup: [
      "Use an indoor or outdoor track or another measured course with a solid, improved surface, no more than a 3% uphill grade, and no overall decline (start and finish at the same altitude). No survey is required.",
      "Keep the course free of significant hazards such as traffic, slippery road surfaces, and areas with heavy air pollution. Do not use unimproved terrain.",
      "Put the start and finish at the same location as the other events.",
      "Make sure Soldiers know the course, start and finish points, turn-around points, or number of laps before the event.",
    ],
    commands: [
      { command: "GET READY", description: "NCOIC, at the end of the 10-minute rest: Soldiers move to the start line." },
      { command: "GET SET", description: "NCOIC." },
      { command: "GO", description: "NCOIC: Soldiers start and the timer starts the clock." },
      { command: "Finish-line time calls", description: "The timer calls minutes and seconds as Soldiers approach the finish (for example, \"FOURTEEN-FIFTY-EIGHT, FOURTEEN-FIFTY-NINE, FIFTEEN MINUTES\"), and at each lap on a track." },
    ],
    startingPosition:
      "At the start line: Soldiers move up to it when the NCOIC calls \"GET READY\" at the end of the 10-minute rest. The ATP does not prescribe a body position.",
    execution: [
      { id: "start", title: "Start", command: "GO", instructions: ["Begin running at your own pace when the NCOIC says \"GO.\""] },
      { id: "run", title: "Run the course", instructions: ["Complete the full 2-mile distance on the course. On a track, graders count completed laps."] },
      { id: "finish", title: "Finish", instructions: ["Your time is recorded as you cross the finish line at the 2-mile point. Sign your scorecard after the run."] },
    ],
    rules: {
      allowed: [
        "Walking or pausing.",
        "Pacing another Soldier or being paced by another Soldier.",
        "Verbal encouragement.",
        "Biometric devices such as watches, heart rate monitors, step counters, and fitness trackers.",
        gloves,
      ],
      faults: ["Receiving physical help: a Soldier cannot be picked up, pulled, or pushed in any way."],
      termination: ["Leaving the running course at any time before completing the 2-mile distance."],
      safetyTips: [
        "Select a course free of significant hazards such as traffic, slippery road surfaces, and heavy air pollution.",
        "Plan so that weather and environmental conditions do not degrade performance and the uniform suits the conditions.",
      ],
      considerations: ["The run starts no more than 10 minutes after the last Soldier completes the plank."],
    },
    completion: ["The raw score is the time recorded when the Soldier crosses the finish line at the 2-mile point."],
    grading: {
      procedure: [
        "During the 10-minute rest, graders issue numbers or vests to their Soldiers.",
        "On a track, graders record each Soldier's completed laps.",
        "The NCOIC announces elapsed time as Soldiers finish; graders enter the time on DA Form 705-TEST.",
        "Graders make sure Soldiers sign their scorecards after the run.",
      ],
      responsibilities: [
        "After the run, the OIC, NCOIC, or grader converts raw scores to points for every event, enters the total, and confirms scores with the Soldier.",
      ],
    },
    breathing: null,
    scoring: { rawUnit: "seconds", displayUnit: "mm:ss", higherIsBetter: false, minimumPoints: 0, maximumPoints: 100 },
    performance: {
      fitnessComponents: ["Aerobic endurance"],
      primaryMuscles: ["Heart and lungs (cardiorespiratory system)", "Quadriceps", "Hamstrings", "Calves"],
      secondaryMuscles: ["Gluteal muscles", "Hip flexors", "Trunk muscles"],
      trainingFocus: ["Sustained running", "Pacing"],
    },
    media: { video: "https://www.youtube.com/watch?v=NRvQA5UXNMk" },
    video: { url: "https://www.youtube.com/watch?v=NRvQA5UXNMk", title: "AFT Event 6 - 2 Mile Run", channel, note: OFFICIAL_VIDEO_NOTE },
    refs: {
      measures: atp01("2-77", "37"),
      equipment: atp01("2-25, 2-75; E-1", "22, 36, 87"),
      setup: atp01("2-19, 2-77, 2-80", "19–20, 37"),
      commands: atp01("2-75 – 2-76", "36"),
      startingPosition: atp01("2-75", "36"),
      execution: atp01("2-75, 2-78 – 2-80", "36–37"),
      completion: atp01("2-79", "37"),
      faults: atp01("2-78", "37"),
      termination: atp01("2-78", "37"),
      grading: atp01("2-12, 2-75, 2-79", "18–19, 36–37"),
      safety: atp01("2-8, 2-19", "18–20"),
      allowed: atp01("2-39, 2-78, 2-80", "25, 37"),
    },
    discrepancies: [
      "The official video linked from army.mil/aft is titled \"AFT Event 6\", from the earlier six-event numbering; the 2-mile run is the fifth AFT event.",
    ],
    sources: [{ ...ATP, reference: "Chapter 2, paras 2-15 – 2-19, 2-75 – 2-80" }, SCALES, ANATOMY],
  },
];

export function getAftEvent(slug: string): AftEvent | undefined {
  return aftEvents.find((event) => event.slug === slug);
}

export function getAftEventByCode(code: AftEventCode): AftEvent {
  return aftEvents.find((event) => event.code === code)!;
}

export const aftGuideHref = (slug: string) => `/aft-guide/${slug}`;
