export const aftScoringFile = {
  title: "Army Fitness Test Score Tables",

  fileName: "AFT_Scoring_Scales_250601.pdf",

  path: "/docs/AFT_Scoring_Scales_250601.pdf",

  approvedDate: "2025-05-15",

  effectiveDate: "2025-06-01",

  events: [
    {
      code: "MDL",
      name: "3-Rep Max Deadlift",
      pages: [1],
      unit: "pounds",
      maxPoints: 100,
    },

    {
      code: "HRP",
      name: "Hand-Release Push-Up",
      pages: [2],
      unit: "repetitions",
      maxPoints: 100,
    },

    {
      code: "SDC",
      name: "Sprint-Drag-Carry",
      pages: [3, 4],
      unit: "time",
      maxPoints: 100,
    },

    {
      code: "PLK",
      name: "Plank",
      pages: [5, 6],
      unit: "time",
      maxPoints: 100,
    },

    {
      code: "2MR",
      name: "2-Mile Run",
      pages: [7, 8],
      unit: "time",
      maxPoints: 100,
    },

    {
      code: "ALT",
      name: "Alternate Events",
      pages: [9],
      unit: "go-no-go",
      maxPoints: null,
    },
  ],
};