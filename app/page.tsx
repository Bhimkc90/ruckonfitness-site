"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

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

  const sdcTotalSeconds = Number(sdcMinutes) * 60 + Number(sdcSeconds);
  const sdcScore = calculateSdcScore({
    age: Number(age),
    gender,
    seconds: sdcTotalSeconds,
  });

  const plankTotalSeconds = Number(plankMinutes) * 60 + Number(plankSeconds);
  const plankScore = calculatePlankScore({
    age: Number(age),
    gender,
    seconds: plankTotalSeconds,
  });

  const runTotalSeconds = Number(runMinutes) * 60 + Number(runSeconds);
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

  const totalScore = eventScores.reduce((sum, event) => sum + event.points, 0);

  const weakestEvent = eventScores.reduce((lowest, current) =>
    current.points < lowest.points ? current : lowest
  );

  const strongestEvent = eventScores.reduce((highest, current) =>
    current.points > highest.points ? current : highest
  );

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase text-yellow-400">
          AFT Calculator
        </h1>
        <p className="mt-2 text-zinc-400">
          Enter raw AFT performance. Scores calculate automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <InputBox label="Age" value={age} setValue={setAge} />

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

          <InputBox label="Deadlift Weight" value={deadlift} setValue={setDeadlift} />
          <ScoreBox label="MDL Score" score={mdlScore} />

          <InputBox label="Hand-Release Push-Ups" value={pushups} setValue={setPushups} />
          <ScoreBox label="HRP Score" score={hrpScore} />

          <InputBox label="SDC Minutes" value={sdcMinutes} setValue={setSdcMinutes} />
          <InputBox label="SDC Seconds" value={sdcSeconds} setValue={setSdcSeconds} />
          <ScoreBox label="SDC Score" score={sdcScore} />

          <InputBox label="Plank Minutes" value={plankMinutes} setValue={setPlankMinutes} />
          <InputBox label="Plank Seconds" value={plankSeconds} setValue={setPlankSeconds} />
          <ScoreBox label="Plank Score" score={plankScore} />

          <InputBox label="2-Mile Run Minutes" value={runMinutes} setValue={setRunMinutes} />
          <InputBox label="2-Mile Run Seconds" value={runSeconds} setValue={setRunSeconds} />
          <ScoreBox label="2MR Score" score={runScore} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryBox label="Total Score" value={`${totalScore} / 500`} />
        <SummaryBox label="Pass Status" value={totalScore >= 300 ? "PASS" : "FAIL"} />
        <SummaryBox label="Strongest Event" value={`${strongestEvent.event}: ${strongestEvent.points}`} />
        <SummaryBox label="Weakest Event" value={`${weakestEvent.event}: ${weakestEvent.points}`} />
      </div>
    </AppShell>
  );
}

function InputBox({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-bold uppercase text-zinc-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
      />
    </div>
  );
}

function ScoreBox({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-black p-4">
      <p className="text-sm font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-2 text-4xl font-black text-yellow-400">{score}</p>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
      <p className="text-sm font-bold uppercase text-zinc-400">{label}</p>
      <h2 className="mt-2 text-3xl font-black text-yellow-400">{value}</h2>
    </div>
  );
}