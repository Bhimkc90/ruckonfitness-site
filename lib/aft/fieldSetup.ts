import { atp01 } from "./guideSources";

// Field setup facts from ATP 7-22.01 (12 March 2026). Every item carries its citation.
export type Cited = { text: string; ref: string };
export type ChecklistItem = Cited & { origin: "atp" | "ruckon" };

export const testOverview: Cited[] = [
  {
    text: "Five events, in order, on the same day: 3 Repetition Maximum Deadlift, Hand-Release Push-Up, Sprint-Drag-Carry, Plank, and 2-Mile Run.",
    ref: atp01("2-5, 2-34", "17, 25"),
  },
  {
    text: "The AFT predicts a Soldier's ability to perform warrior tasks and high-demand common Soldier tasks, and assesses muscular strength and endurance, aerobic and anaerobic endurance, explosive power, speed, agility, flexibility, balance, and coordination.",
    ref: atp01("2-2", "17"),
  },
  {
    text: "Soldiers must attempt all five events and cannot stop after failing one. Failing to reach the minimum on any event is a test failure.",
    ref: atp01("2-31, 2-35", "23, 25"),
  },
  {
    text: "Soldiers must not start the test if they are ill, injured, or on a temporary profile that limits them physically; starting the test acknowledges readiness.",
    ref: atp01("2-31", "23"),
  },
  {
    text: "Results are recorded on DA Form 705-TEST, which the Soldier signs to confirm the raw scores.",
    ref: atp01("2-30, 2-32", "23"),
  },
];

export const standards: Cited[] = [
  {
    text: "General standard: sex- and age-normed; at least 60 points on each event.",
    ref: atp01("2-30", "23"),
  },
  {
    text: "Combat standard: sex-neutral and age-normed; at least 60 points on each event and a total of at least 350.",
    ref: atp01("2-30", "23"),
  },
  {
    text: "Combat specialties per Army Directive 2026-07: 11A, 11B, 11C, 11Z, 12A, 12B, 12D, 13A, 13F, 180A, 18A, 18B, 18C, 18D, 18E, 18F, 18Z, 19A, 19C, 19D, 19K, 19Z, 89D, and 89E. The directive adds 12D, 89D, and 89E to the list in the ATP and controls where it conflicts with other guidance.",
    ref: "Army Directive 2026-07, para. 4b(2) and enclosure 2",
  },
  {
    text: "Army Directive 2026-07 also adds a separate pass/fail Combat Field Test for combat specialties. It is not a substitute for the AFT and is not covered in this guide.",
    ref: "Army Directive 2026-07, para. 4a",
  },
];

export const personnelDependencies: Cited[] = [
  { text: "Each test has an OIC or NCOIC and one grader for every four Soldiers tested. Soldiers may not self-administer a record AFT.", ref: atp01("2-9", "18") },
  { text: "Each lane has a grader. On the SDC, two graders work together across two adjacent lanes.", ref: atp01("2-12 – 2-13, 2-65", "18–19, 32") },
  {
    text: "With only one grader available for an individual or small group, the OIC or NCOIC may act as the second grader (for example, timing events and watching the 25-meter line).",
    ref: atp01("2-13", "19"),
  },
  { text: "Use of support personnel depends on local policy and unit standard operating procedures.", ref: atp01("2-10", "18") },
  { text: "Medical support on site is not required unless local policy says so, but the OIC or NCOIC must have a medical support plan as required.", ref: atp01("2-10", "18") },
  {
    text: "The ideal site has 16 lanes and tests 64 Soldiers (4 per lane) in 120 minutes or less. If 16 lanes are not feasible, commanders may use as many lanes as they need.",
    ref: atp01("2-15", "19"),
  },
];

export type EquipmentRow = { item: string; singleLane: string; sixteenLanes: string; ref: string };

export const equipmentTable: EquipmentRow[] = [
  { item: "Hexagon bar (60 lb)", singleLane: "1", sixteenLanes: "16", ref: atp01("2-21", "20") },
  { item: "Barbell collars", singleLane: "2", sixteenLanes: "32", ref: atp01("2-21", "20") },
  {
    item: "Bumper plates for the MDL",
    singleLane: "Minimum (120-lb) lane: 4 × 15 lb. Maximum (340-lb) lane: 4 × 45, 2 × 35, 4 × 15 lb",
    sixteenLanes: "About 4,000 lb: 42 × 45, 24 × 35, 22 × 25, 22 × 15, 10 × 10 lb",
    ref: atp01("2-21, Table 2-1", "20–21"),
  },
  { item: "5-lb bumper or cast-iron plates", singleLane: "Optional", sixteenLanes: "36 encouraged, to make weight changes easier and safer", ref: atp01("2-21", "20") },
  { item: "Nylon sled with pull strap", singleLane: "1", sixteenLanes: "16", ref: atp01("2-23", "21–22") },
  { item: "45-lb bumper plates for the sled", singleLane: "2 (4 on a modified surface)", sixteenLanes: "32", ref: atp01("2-23", "21–22") },
  { item: "40-lb kettlebells", singleLane: "2", sixteenLanes: "32", ref: atp01("2-23", "21–22") },
  {
    item: "Stopwatches",
    singleLane: "HRP: 2 (OIC/NCOIC and back-up timer). SDC: 2. Plank: 1. Run: 2–17",
    sixteenLanes: "SDC: 17. Plank: 16. Run: one for the OIC/NCOIC and one per grader",
    ref: atp01("2-22 – 2-25", "21–22"),
  },
  { item: "Foam or rubber mats (HRP, plank)", singleLane: "Optional", sixteenLanes: "Optional", ref: atp01("2-22, 2-24", "21–22") },
  { item: "Metric measuring tape (30 m minimum)", singleLane: "1 recommended", sixteenLanes: "Two lanes may share one", ref: atp01("E-15 – E-16", "89–90") },
  { item: "DA Form 705-TEST scorecards", singleLane: "1 per Soldier", sixteenLanes: "1 per Soldier", ref: atp01("2-27, 2-30", "22–23") },
  { item: "Cones, one stopwatch per lane, outdoor timing clock for the run", singleLane: "Not required; assist testing", sixteenLanes: "Not required; assist testing", ref: atp01("E-1", "87") },
];

export const equipmentSpecs: { item: string; specs: string[]; ref: string }[] = [
  {
    item: "Hex bar",
    specs: [
      "60 pounds unloaded; other weights allowed if weighed unloaded and loads recalculated.",
      "Sleeves long enough for four 45-pound bumper plates plus a collar on each end.",
      "Parallel handles about 1.34 inches in diameter, about 25 inches apart.",
      "Preferably no D-handles (face them down if present). Adjustable-handle and walk-in bars are allowed.",
      "The OIC or NCOIC verifies the bar's weight before the AFT.",
    ],
    ref: atp01("E-2 – E-3", "87"),
  },
  {
    item: "Bumper plates",
    specs: [
      "Per lane: 4 × 10 lb (1 3/8 in wide), 4 × 15 lb (1 7/8 in), 2 × 25 lb (2 1/4 in), 2 × 35 lb (3 1/8 in), 8 × 45 lb (3 3/4 in).",
      "Standard diameter 450 mm (17.7 in); insert opening 50.4 mm (1.98 in); weight within ±1% of the stated weight; thickness within 1/16 in.",
      "Other plate types (iron, steel, plastic) are authorized if they meet the basic design and are verified by the OIC or NCOIC. OICs measure and weigh plates.",
    ],
    ref: atp01("E-4 – E-6, Table E-1", "88"),
  },
  {
    item: "Hex bar collars",
    specs: ["Two per lane, plastic or metal, about 0.5 pound per pair.", "Not included in weight calculations."],
    ref: atp01("E-7 – E-8", "88–89"),
  },
  {
    item: "Sled and pull strap",
    specs: [
      "Thick, heavy-duty nylon; 22 inches long and 19.5 inches wide; holds up to four 45-pound plates.",
      "One-piece pull strap 92 inches (±2 inches) with a loop handle on both ends.",
    ],
    ref: atp01("E-12", "90"),
  },
  {
    item: "40-pound kettlebells",
    specs: [
      "Two per lane, within 2 pounds of 40 pounds, cast iron or cast steel, coated to resist rust.",
      "About 11 inches (±1 inch) tall with a flat base so the handle stands vertically.",
    ],
    ref: atp01("E-13 – E-14", "90"),
  },
  {
    item: "Measuring tape",
    specs: ["At least 30 meters long, marked in meters and centimeters.", "Vinyl-coated fiberglass recommended; metal tapes allowed but need more maintenance."],
    ref: atp01("E-15 – E-16", "89–90"),
  },
];

export const fieldLayout: Cited[] = [
  { text: "Outdoor grass or artificial turf that is flat and free of debris, and includes the start and finish point for the 2-mile run.", ref: atp01("2-16", "19") },
  { text: "An area of approximately 37 meters by 40–50 meters holds up to 16 lanes for the field events.", ref: atp01("2-16", "19") },
  { text: "Each lane is 25 meters long and 2.5 to 3.0 meters wide, subdivided and marked in 5-meter increments.", ref: atp01("2-16; E-29", "19, 93") },
  { text: "Allow approximately 4.0 meters past the 25-meter line for the sled turn-around and approximately 8.0 meters behind the start line for staging equipment and running through the finish.", ref: atp01("2-16", "19") },
  { text: "Leave space next to the lanes for up to 16 hex bars for the MDL, and an area for the Preparation Drill and Recovery Drill.", ref: atp01("2-16; E-30", "19, 93") },
  { text: "A storage shed or container with enough space and security for all equipment. Permanent or portable lighting is required when testing in limited visibility.", ref: atp01("E-31", "93") },
];

export const runCourse: Cited[] = [
  { text: "An indoor or outdoor track, or a generally flat, measured course with a solid, improved surface.", ref: atp01("2-19, 2-77", "19–20, 37") },
  { text: "No more than a 3-percent uphill grade and no overall decline: the start and finish must be at the same altitude.", ref: atp01("2-19", "20") },
  { text: "There is no requirement to survey the course.", ref: atp01("2-19", "20") },
  { text: "Free of significant hazards such as traffic, slippery road surfaces, and heavy air pollution. Not on unimproved terrain.", ref: atp01("2-19, 2-77", "20, 37") },
  { text: "The start and finish line is at the same location as the other events.", ref: atp01("2-77", "37") },
  { text: "Soldiers learn the course, start and finish points, turn-around points, or number of laps before the event. On a track, graders count laps.", ref: atp01("2-75, 2-80", "36–37") },
];

export const sequence: { title: string; detail: string; ref: string }[] = [
  { title: "Instructions and scorecards", detail: "Before the Preparation Drill is completed, supervisors read the AFT, scorecard, and conclusion instructions aloud and hand out DA Form 705-TEST.", ref: atp01("2-26 – 2-29", "22–23") },
  { title: "Preparation Drill", detail: "Starts the 2-hour clock. Led by an instructor who is not testing; Soldiers perform it at their own pace.", ref: atp01("2-34, 2-40", "25") },
  { title: "MDL warm-up (10 minutes)", detail: "Recommended graduated sets, then Soldiers stack behind the weight they intend to lift.", ref: atp01("2-42 – 2-43", "26") },
  { title: "1. 3 Repetition Maximum Deadlift", detail: "Two attempts per Soldier.", ref: atp01("2-43", "26") },
  { title: "2. Hand-Release Push-Up", detail: "Soldiers rotate in stacks of four with a common start for each group.", ref: atp01("2-36, 2-53", "25, 29") },
  { title: "3. Sprint-Drag-Carry", detail: "Two graders per pair of adjacent lanes.", ref: atp01("2-65", "32") },
  { title: "4. Plank", detail: "When the last Soldier finishes, the 10-minute rest starts.", ref: atp01("2-71", "34–35") },
  { title: "10-minute rest", detail: "Graders issue numbers or vests; Soldiers move to the run start line.", ref: atp01("2-75", "36") },
  { title: "5. 2-Mile Run", detail: "Starts at the end of the 10 minutes. The 2-hour limit ends at the start of the run.", ref: atp01("2-34, 2-75", "25, 36") },
  { title: "Recovery Drill", detail: "After all events, as a group or individually.", ref: atp01("2-40", "25") },
];

export const timingRules: Cited[] = [
  {
    text: "The test period may not exceed 120 minutes from the first Bend and Reach of the Preparation Drill to the start of the 2-mile run (or alternate aerobic event). This applies to every scenario, including Soldiers testing alone or in pairs.",
    ref: atp01("2-34", "25"),
  },
  { text: "Apart from the 10 minutes after the plank, there is no programmed rest between events and no required rest per Soldier.", ref: atp01("2-37", "25") },
  { text: "When only one or two Soldiers are tested, 5 minutes of rest are programmed between each of the first five events.", ref: atp01("2-37", "25") },
  { text: "There are no event restarts. Incorrect repetitions are not counted.", ref: atp01("2-38", "25") },
  { text: "The OIC informs the unit commander if the time standard is not met, and resolves score questions within the 120 minutes.", ref: atp01("2-34, 2-38", "25") },
];

export const roles: { role: string; duties: string[]; ref: string }[] = [
  {
    role: "OIC and NCOIC",
    duties: [
      "The OIC supervises the AFT; the NCOIC manages the test, including the running clock.",
      "Brief Soldiers during the week before the test, post the testing manual, and demonstrate the events.",
      "Procure and inspect equipment, lay out the test area, and train and validate graders and support personnel.",
      "Make sure events are administered and scored to standard, and report results.",
    ],
    ref: atp01("2-11, 2-13", "18–19"),
  },
  {
    role: "Event graders",
    duties: [
      "Score events to standard: count repetitions aloud, time events, measure distances, and correct performance.",
      "Test each Soldier individually on the MDL, HRP, and plank; work in pairs across two adjacent lanes on the SDC.",
      "Record raw scores and initial DA Form 705-TEST, confirm scores with the Soldier, and return signed forms to the OIC or NCOIC.",
      "Make sure lane equipment is on hand and serviceable.",
    ],
    ref: atp01("2-12 – 2-13", "18–19"),
  },
  {
    role: "Timers",
    duties: ["Run the common 2:00 HRP clock with a back-up timer and call time at the finish of the 2-mile run."],
    ref: atp01("2-22, 2-53, 2-76", "21, 29–30, 36"),
  },
  {
    role: "Support personnel",
    duties: ["Help prevent unsafe acts and keep the test running smoothly. How many are used depends on local policy and unit SOPs."],
    ref: atp01("2-10", "18"),
  },
  {
    role: "Preparation Drill instructor",
    duties: ["Leads the Preparation Drill and must not be one of the Soldiers being tested."],
    ref: atp01("2-40", "25"),
  },
];

export const warmupRecovery: Cited[] = [
  { text: "Include an area for the Preparation Drill, the Recovery Drill, and the MDL.", ref: atp01("2-16", "19") },
  { text: "The Preparation Drill is the dynamic warm-up before the test; Soldiers do it at their own pace to avoid undue fatigue.", ref: atp01("2-40", "25") },
  { text: "During the events, Soldiers may do their own choice of preparation activities.", ref: atp01("2-29", "23") },
  { text: "After all events, Soldiers do the Recovery Drill as a group or individually.", ref: atp01("2-40", "25") },
];

export const safety: Cited[] = [
  { text: "Visually inspect all equipment before the test, especially hex bars for stress cracks at welded seams and sleds or pull straps for torn fabric or stitching.", ref: atp01("Section II equipment safety note", "20") },
  { text: "Complete and approve DD Form 2977 (Deliberate Risk Assessment Worksheet).", ref: atp01("2-8", "18") },
  { text: "Do not test Soldiers who are fatigued, ill, or on a physically limiting temporary profile, or who have done fatiguing duties before the test.", ref: atp01("2-8", "18") },
  { text: "Schedule so weather and environmental conditions do not degrade performance, with a uniform suited to the conditions.", ref: atp01("2-8", "18") },
  { text: "Have a plan for medical support. On-site medical support depends on local policy.", ref: atp01("2-10", "18") },
  { text: "Select a site free of significant hazards and an SDC surface that is safe and level. Never run the SDC on unimproved dirt or gravel, rubberized surfaces, ice, or snow.", ref: atp01("2-16 – 2-18; E-10 – E-11", "19, 89") },
  { text: "Provide permanent or portable lighting when testing during limited visibility.", ref: atp01("E-31", "93") },
  { text: "SDC graders control two adjacent lanes to keep Soldiers and graders safe and prevent interference.", ref: atp01("2-12", "19") },
];

export const uniformRules: Cited[] = [
  { text: "Only prescribed APFU components may be worn. Gloves that conform to AR 670-1 are allowed for any event.", ref: atp01("2-39", "25") },
  { text: "Not allowed: nasal strips, back braces, elastic bandages, kinesiology tape, limb braces, music players, and cell phones.", ref: atp01("2-39", "25") },
  { text: "Allowed: biometric devices such as watches, heart rate monitors, step counters, and fitness trackers.", ref: atp01("2-39", "25") },
  { text: "Chalk, powder, weightlifting belts, and wrist straps are not authorized.", ref: atp01("2-21 note", "21") },
];

export const setupChecklist: ChecklistItem[] = [
  { text: "Select and train the OIC or NCOIC, graders, timers, and support personnel.", ref: atp01("2-7, 2-11", "18"), origin: "atp" },
  { text: "Brief Soldiers during the week before the test and post the testing manual; make each event's instructions available.", ref: atp01("2-11, 2-52, 2-64, 2-70, 2-74, 2-80", "18, 29–37"), origin: "atp" },
  { text: "Complete and approve DD Form 2977 and confirm the medical support plan.", ref: atp01("2-8, 2-10", "18"), origin: "atp" },
  { text: "Inventory and inspect all equipment (hex bar welds, sled and strap stitching).", ref: atp01("2-7; equipment safety note", "18, 20"), origin: "atp" },
  { text: "Weigh each hex bar and verify plate weights and dimensions.", ref: atp01("E-3, E-6", "87–88"), origin: "atp" },
  { text: "Lay out lanes: 25 m × 2.5–3.0 m, marked every 5 m, with turn-around and staging space.", ref: atp01("2-16; E-29", "19, 93"), origin: "atp" },
  { text: "Classify the SDC surface and load two 45-lb plates per sled, or four on a modified surface.", ref: atp01("2-17, 2-23", "19, 21"), origin: "atp" },
  { text: "Load MDL bars using the plate arrangement table.", ref: atp01("2-21, Table 2-1", "20–21"), origin: "atp" },
  { text: "Set up the MDL area, the Preparation and Recovery Drill area, and the 2-mile course start and finish.", ref: atp01("2-16, 2-77; E-30", "19, 37, 93"), origin: "atp" },
  { text: "Prepare DA Form 705-TEST scorecards, stopwatches, and numbers or vests for the run.", ref: atp01("2-22 – 2-27, 2-75", "21–22, 36"), origin: "atp" },
];

export const closeoutChecklist: ChecklistItem[] = [
  { text: "Graders confirm scores with each Soldier, and each Soldier signs DA Form 705-TEST before leaving.", ref: atp01("2-12, 2-38", "18–19, 25"), origin: "atp" },
  { text: "Convert raw scores to points for every event, enter the total, and make sure each event is initialed.", ref: atp01("2-12", "18"), origin: "atp" },
  { text: "Graders return all signed scorecards to the OIC or NCOIC; resolve any scoring questions.", ref: atp01("2-12", "18–19"), origin: "atp" },
  { text: "Report results in the Army's system of record.", ref: atp01("2-11, 2-32", "18, 23"), origin: "atp" },
  { text: "Soldiers complete the Recovery Drill.", ref: atp01("2-40", "25"), origin: "atp" },
  { text: "Secure equipment in the site's storage shed or container.", ref: atp01("E-31", "93"), origin: "atp" },
  { text: "Note any damaged equipment so it can be replaced before the next test.", ref: "RuckOn suggestion; the ATP does not list teardown steps", origin: "ruckon" },
];

export const fieldDiscrepancies: Cited[] = [
  { text: "Field size: para. 2-16 gives approximately 37 × 40–50 meters, while para. E-29 says approximately 30 meters long by 50 meters wide. The sample layout (figure E-8) shows 37 × 50 meters.", ref: atp01("2-16; E-29; figure E-8", "19, 93–94") },
  { text: "Plates per lane: para. E-4 says each lane requires 550 pounds of bumper plates, but the quantities in table E-1 add up to 580 pounds.", ref: atp01("E-4 – E-5, Table E-1", "88") },
  { text: "Reporting: para. 2-11 says results are reported in the Digital Training Management System, while para. 2-32 names the Army Training Information System as the system of record.", ref: atp01("2-11, 2-32", "18, 23") },
  { text: "Restricted SDC surfaces: para. 2-17 lists rubberized track or gym floors; para. E-10 lists only rubberized track.", ref: atp01("2-17; E-10", "19, 89") },
];
