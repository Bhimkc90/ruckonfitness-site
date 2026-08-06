"use client";

import { useState } from "react";

import {
  calculateMdlScore,
  calculateHrpScore,
  calculateSdcScore,
  calculatePlankScore,
  calculateTwoMileRunScore,
} from "@/lib/aft/scoring";

export default function AftCalculatorPage() {

  const [age, setAge] = useState("34");
  const [gender, setGender] = useState<"M" | "F">("M");

  const [deadlift, setDeadlift] = useState("250");
  const [pushups, setPushups] = useState("40");

  const [sdcMinutes, setSdcMinutes] = useState("2");
  const [sdcSeconds, setSdcSeconds] = useState("15");

  const [plankMinutes, setPlankMinutes] = useState("3");
  const [plankSeconds, setPlankSeconds] = useState("20");

  const [runMinutes, setRunMinutes] = useState("16");
  const [runSeconds, setRunSeconds] = useState("30");

  const mdlScore = calculateMdlScore({
    age: Number(age),
    gender,
    weight: Number(deadlift),
  });

  const hrpScore = calculateHrpScore({
    age: Number(age),
    gender,
    reps: Number(pushups),
  });

  const sdcTotalSeconds =
    Number(sdcMinutes) * 60 + Number(sdcSeconds);

  const sdcScore = calculateSdcScore({
    age: Number(age),
    gender,
    seconds: sdcTotalSeconds,
  });

  const plankTotalSeconds =
    Number(plankMinutes) * 60 + Number(plankSeconds);

  const plankScore = calculatePlankScore({
    age: Number(age),
    gender,
    seconds: plankTotalSeconds,
  });

  const runTotalSeconds =
    Number(runMinutes) * 60 + Number(runSeconds);

  const runScore = calculateTwoMileRunScore({
    age: Number(age),
    gender,
    seconds: runTotalSeconds,
  });


  const eventScores = [
    { event: "Deadlift", points: mdlScore },
    { event: "Push-Ups", points: hrpScore },
    { event: "SDC", points: sdcScore },
    { event: "Plank", points: plankScore },
    { event: "2MR", points: runScore },
  ];
  
  const totalScore = eventScores.reduce(
    (sum, item) => sum + item.points,
    0
  );
  
  const weakestEvent = eventScores.reduce((lowest, current) =>
    current.points < lowest.points ? current : lowest
  );
  
  const strongestEvent = eventScores.reduce((highest, current) =>
    current.points > highest.points ? current : highest
  );









  return (
    <main className="min-h-screen bg-black p-8 text-white">

<div className="mb-6 rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
            <h3 className="text-2xl font-black uppercase text-yellow-400">
              AFT Calculator
            </h3>

            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div>
                <label className="text-sm font-bold uppercase text-zinc-400">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold uppercase text-zinc-400">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "M" | "F")}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold uppercase text-zinc-400">
                  Deadlift Weight
                </label>
                <input
                  type="number"
                  value={deadlift}
                  onChange={(e) => setDeadlift(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </div>

              <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
                <p className="text-sm font-bold uppercase text-zinc-400">
                  MDL Score
                </p>
                <p className="mt-2 text-4xl font-black text-yellow-400">
                  {mdlScore}
                </p>
              </div>

              <div>
                <label className="text-sm font-bold uppercase text-zinc-400">
                  Hand-Release Push-Ups
                </label>
                <input
                  type="number"
                  value={pushups}
                  onChange={(e) => setPushups(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </div>

              <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
                <p className="text-sm font-bold uppercase text-zinc-400">
                  HRP Score
                </p>
                <p className="mt-2 text-4xl font-black text-yellow-400">
                  {hrpScore}
                </p>
              </div>

              <div>
                  <label className="text-sm font-bold uppercase text-zinc-400">
                    Sprint-Drag-Carry Minutes
                  </label>
                  <input
                    type="number"
                    value={sdcMinutes}
                    onChange={(e) => setSdcMinutes(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold uppercase text-zinc-400">
                    Sprint-Drag-Carry Seconds
                  </label>
                  <input
                    type="number"
                    value={sdcSeconds}
                    onChange={(e) => setSdcSeconds(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                  />
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
                  <p className="text-sm font-bold uppercase text-zinc-400">
                    SDC Score
                  </p>
                  <p className="mt-2 text-4xl font-black text-yellow-400">
                    {sdcScore}
                  </p>
                </div>
                              

                <div>
                    <label className="text-sm font-bold uppercase text-zinc-400">
                      Plank Minutes
                    </label>
                    <input
                      type="number"
                      value={plankMinutes}
                      onChange={(e) => setPlankMinutes(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold uppercase text-zinc-400">
                      Plank Seconds
                    </label>
                    <input
                      type="number"
                      value={plankSeconds}
                      onChange={(e) => setPlankSeconds(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                    />
                  </div>

                  <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
                    <p className="text-sm font-bold uppercase text-zinc-400">
                      Plank Score
                    </p>
                    <p className="mt-2 text-4xl font-black text-yellow-400">
                      {plankScore}
                    </p>
                </div>


                <div>
                  <label className="text-sm font-bold uppercase text-zinc-400">
                    2-Mile Run Minutes
                  </label>
                  <input
                    type="number"
                    value={runMinutes}
                    onChange={(e) => setRunMinutes(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold uppercase text-zinc-400">
                    2-Mile Run Seconds
                  </label>
                  <input
                    type="number"
                    value={runSeconds}
                    onChange={(e) => setRunSeconds(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                  />
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
                  <p className="text-sm font-bold uppercase text-zinc-400">
                    2MR Score
                  </p>
                  <p className="mt-2 text-4xl font-black text-yellow-400">
                    {runScore}
                  </p>
                </div>




            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">

  <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
    <p className="text-sm font-bold uppercase text-zinc-400">
      Total Score
    </p>

    <h2 className="mt-2 text-5xl font-black text-yellow-400">
      {totalScore}
    </h2>

    <p className="mt-2 text-zinc-400">
      Out of 500
    </p>
  </div>

  <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
    <p className="text-sm font-bold uppercase text-zinc-400">
      Pass Status
    </p>

    <h2 className="mt-2 text-4xl font-black text-green-500">
      {totalScore >= 300 ? "PASS" : "FAIL"}
    </h2>
  </div>

  <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
    <p className="text-sm font-bold uppercase text-zinc-400">
      Strongest Event
    </p>

    <h2 className="mt-2 text-3xl font-black text-green-500">
      {strongestEvent.event}
    </h2>

    <p className="mt-2 text-zinc-400">
      {strongestEvent.points} points
    </p>
  </div>

  <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
    <p className="text-sm font-bold uppercase text-zinc-400">
      Weakest Event
    </p>

    <h2 className="mt-2 text-3xl font-black text-yellow-400">
      {weakestEvent.event}
    </h2>

    <p className="mt-2 text-zinc-400">
      {weakestEvent.points} points
    </p>
  </div>

</div>

    </main>
  );
}