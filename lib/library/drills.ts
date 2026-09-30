import type { Drill } from "./types";
import { VERIFIED_ON, atp, fm } from "./sources";

const verification = { status: "verified", checkedOn: VERIFIED_ON } as const;

const cadenceGuidance = {
  text: "Leaders call cadence at a slow (50 counts per minute) or moderate (80 counts per minute) pace.",
  source: atp("1-17", "1-7"),
};

export const drills: Drill[] = [
  {
    id: "preparation-drill",
    name: "Preparation Drill",
    abbreviation: "PD",
    program: "army-h2f",
    officialCategory: "Preparation Drill",
    officialComponent: "Muscular Endurance",
    summary:
      "Ten low-intensity exercises that raise heart rate and body temperature, loosen joints and muscles, and prepare Soldiers for more rigorous training such as the AFT.",
    sequence: [
      "bend-and-reach",
      "rear-lunge",
      "high-jumper",
      "rower",
      "squat-bender",
      "windmill",
      "forward-lunge",
      "prone-row",
      "bent-leg-body-twist",
      "push-up",
    ],
    officialGuidance: [
      {
        text: "Intended to reduce the likelihood of musculoskeletal injury during more rigorous physical training such as the AFT.",
        source: atp("3-1", "3-1"),
      },
      cadenceGuidance,
      {
        text: "Soldiers return to the Position of Attention between exercises. Cadence stays the same so there is time for the full range of motion; leaders may keep the time between exercises short.",
        source: atp("1-19", "1-7"),
      },
      {
        text: "The drill may be shortened with fewer repetitions, fewer exercises, or substitutions when time is short, for special conditioning, or when the session targets one component such as power.",
        source: atp("1-20", "1-7"),
      },
    ],
    officialPrescription: {
      text: "Standard drill: 10 repetitions of each exercise. After basic combat training, Soldiers perform ten repetitions of the Preparation Drill to standard.",
      source: atp("1-20 – 1-21", "1-7"),
    },
    tags: { purposes: ["mobility-flexibility", "muscular-endurance"], phase: "warm-up" },
    modifiedVersionNote:
      "The ATP also describes a modified Preparation Drill (PD MOD) for Soldiers with physical profiles. It is not included in this library yet.",
    sources: [atp("1-17 – 1-21", "1-7"), atp("3-1 – 3-13", "3-1 – 3-9"), fm("Table 6-2", "6-5")],
    verification,
  },
  {
    id: "four-for-the-core",
    name: "Four for the Core",
    abbreviation: "4C",
    program: "army-h2f",
    officialCategory: "Preparation Drill",
    officialComponent: "Muscular Endurance",
    summary:
      "Four held core exercises that provide a foundation of stability for all physical readiness exercises, added to the ATP by Change 1.",
    sequence: ["bent-leg-raise", "side-bridge", "back-bridge", "quadraplex"],
    officialGuidance: [
      {
        text: "The core (abdomen, pelvis, and lower spine) provides stability and motion for the limbs and trunk; regular performance of Four for the Core builds a foundation of stability.",
        source: atp("4-14", "4-8"),
      },
      {
        text: "Returning to the Position of Attention between exercises resets posture and checks movement to and from the ground.",
        source: atp("4-14", "4-8"),
      },
      { text: "Four for the Core is one of the drills used to prepare for physical activity.", source: atp("1-17", "1-7") },
    ],
    officialPrescription: {
      text: "Each exercise is held for a count of 60 seconds (each side where applicable); the Back Bridge alternates legs every 5 seconds for 6 repetitions.",
      source: atp("4-15 – 4-18", "4-9 – 4-11"),
    },
    tags: { purposes: ["balance-stability", "strength"], phase: "warm-up" },
    sources: [atp("1-17", "1-7"), atp("4-14 – 4-18", "4-8 – 4-11"), fm("Table 6-2", "6-5")],
    verification,
  },
  {
    id: "military-movement-drill-1",
    name: "Military Movement Drill 1",
    abbreviation: "MMD1",
    program: "army-h2f",
    officialCategory: "Preparation Drill",
    officialComponent: "Aerobic Endurance",
    summary:
      "A dynamic preparation activity that develops coordination of foot movement in multiple planes at varying speeds before more vigorous endurance and mobility work.",
    sequence: ["vertical", "lateral", "shuttle-sprint"],
    officialGuidance: [
      {
        text: "A dynamic preparation activity for the more vigorous endurance and mobility activities in physical training.",
        source: atp("8-1", "8-1"),
      },
      { text: "Each exercise is performed over a 25-meter course.", source: atp("8-3 – 8-5", "8-1 – 8-2") },
      { text: "The Military Movement Drill is one of the drills used to prepare for physical activity.", source: atp("1-17", "1-7") },
    ],
    officialPrescription: {
      text: "Vertical: 25 meters and back. Lateral: 25 meters each direction. Shuttle Sprint: three 25-meter legs with two turns.",
      source: atp("8-3 – 8-5", "8-1 – 8-2"),
    },
    tags: { purposes: ["agility", "speed"], phase: "warm-up" },
    sources: [atp("1-17", "1-7"), atp("8-1 – 8-5", "8-1 – 8-2"), fm("Table 6-2", "6-5")],
    verification,
  },
  {
    id: "conditioning-drill-1",
    name: "Conditioning Drill 1",
    abbreviation: "CD1",
    program: "army-h2f",
    officialCategory: "Activity Drill",
    officialComponent: "Anaerobic Endurance",
    summary:
      "Five exercises that improve muscular strength and endurance as well as balance and coordination.",
    sequence: ["power-jump", "v-up", "mountain-climber", "leg-tuck-and-twist", "single-leg-push-up"],
    officialGuidance: [
      {
        text: "Conditioning Drills are moderate to advanced calisthenics that challenge core endurance, leg power, balance, and multi-planar coordination.",
        source: atp("1-23, Table 1-2", "1-8"),
      },
      { text: "All five exercises are performed at a moderate cadence.", source: atp("5-3 – 5-7", "5-1 – 5-5") },
      cadenceGuidance,
    ],
    officialPrescription: {
      text: "After basic combat training, Soldiers perform ten repetitions of the Conditioning Drills to standard.",
      source: atp("1-21", "1-7"),
    },
    tags: { purposes: ["strength", "balance-stability", "anaerobic-conditioning"], phase: "main" },
    modifiedVersionNote:
      "The ATP also describes a modified Conditioning Drill 1 (CD1 MOD) for Soldiers with limited range of motion. It is not included in this library yet.",
    sources: [atp("1-23", "1-8"), atp("5-1 – 5-7", "5-1 – 5-5"), fm("Table 6-2", "6-5")],
    verification,
  },
  {
    id: "conditioning-drill-2",
    name: "Conditioning Drill 2",
    abbreviation: "CD2",
    program: "army-h2f",
    officialCategory: "Activity Drill",
    officialComponent: "Anaerobic Endurance",
    summary: "Five exercises that develop and improve strength, agility, and mobility.",
    sequence: ["turn-and-lunge", "supine-bicycle", "half-jack", "swimmer", "eight-count-t-push-up"],
    officialGuidance: [
      {
        text: "Conditioning Drills are moderate to advanced calisthenics that challenge core endurance, leg power, balance, and multi-planar coordination.",
        source: atp("1-23, Table 1-2", "1-8"),
      },
      {
        text: "Turn and Lunge, Supine Bicycle, and Swimmer are performed at a slow cadence; Half Jack and 8-Count T Push-Up at a moderate cadence.",
        source: atp("5-19 – 5-23", "5-9 – 5-12"),
      },
      cadenceGuidance,
      {
        text: "Soldiers progress to Conditioning Drill 3 after mastering the movements and tolerating 10 repetitions of Conditioning Drills 1 and 2.",
        source: atp("5-24", "5-13"),
      },
    ],
    officialPrescription: {
      text: "Each exercise lists 5–10 repetitions. After basic combat training, Soldiers perform ten repetitions of the Conditioning Drills to standard.",
      source: atp("1-21; 5-19 – 5-23", "1-7; 5-9 – 5-12"),
    },
    tags: { purposes: ["agility", "strength", "anaerobic-conditioning"], phase: "main" },
    sources: [atp("1-23", "1-8"), atp("5-18 – 5-24", "5-9 – 5-13"), fm("Table 6-2", "6-5")],
    verification,
  },
  {
    id: "recovery-drill",
    name: "Recovery Drill",
    abbreviation: "RD",
    program: "army-h2f",
    officialCategory: "Recovery Drill",
    officialComponent: "Muscular Endurance",
    summary:
      "Eight held stretches that gradually and safely taper off activity and bring the body back toward its pre-exercise state.",
    sequence: [
      "overhead-arm-pull",
      "rear-lunge",
      "extend-and-flex",
      "thigh-stretch",
      "single-leg-over",
      "groin-stretch",
      "calf-stretch",
      "hamstring-stretch",
    ],
    officialGuidance: [
      {
        text: "Tapers off activity to bring the body back to its pre-exercise state; recovery continues through the day with nutrition and sleep.",
        source: atp("1-25", "1-9"),
      },
      {
        text: 'Stretches are led by command: "READY, STRETCH" to take the position and "STARTING POSITION, MOVE" to return.',
        source: atp("16-3 – 16-10", "16-1 – 16-6"),
      },
      {
        text: "Recovery includes rest between exercises, walking after running, and the Recovery Drill stretches.",
        source: fm("6-26", "6-6"),
      },
    ],
    officialPrescription: {
      text: "Hold each stretch 20–30 seconds, each side where applicable.",
      source: atp("16-3 – 16-10", "16-1 – 16-6"),
    },
    tags: { purposes: ["recovery", "mobility-flexibility"], phase: "recovery" },
    modifiedVersionNote:
      "The ATP also describes a modified Recovery Drill (RD MOD) with restricted range of motion. It is not included in this library yet.",
    sources: [atp("1-25", "1-9"), atp("16-1 – 16-10", "16-1 – 16-6"), fm("Table 6-2", "6-5")],
    verification,
  },
];
