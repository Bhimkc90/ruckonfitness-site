// Original RuckOn diagrams drawn from ATP 7-22.01 (12 March 2026). They are illustrative and are not
// official Army graphics. Dimensions come only from the cited paragraphs.

function DiagramFigure({
  id,
  title,
  description,
  caption,
  viewBox,
  maxWidth = "max-w-xl",
  children,
}: {
  id: string;
  title: string;
  description: string;
  caption: React.ReactNode;
  viewBox: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-xl border border-line bg-canvas p-3 sm:p-4">
      <svg
        viewBox={viewBox}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className={`mx-auto h-auto w-full ${maxWidth}`}
        fontFamily="inherit"
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{description}</desc>
        {children}
      </svg>
      <figcaption className="mt-3 text-xs leading-relaxed text-ink-2">
        {caption}{" "}
        <span className="font-medium text-ink">Illustrative RuckOn drawing, not an official Army graphic.</span>
      </figcaption>
    </figure>
  );
}

const text = "fill-ink-2";
const strong = "fill-ink";

// ---------------------------------------------------------------------------
// SDC lane, drawn to scale for two adjacent 3.0 m lanes (14 px per meter).
// ---------------------------------------------------------------------------
export function SdcLaneDiagram() {
  const s = 14;
  const turnTop = 40;
  const line25 = turnTop + 4 * s; // 96
  const start = line25 + 25 * s; // 446
  const stagingBottom = start + 8 * s; // 558
  const laneX = 120;
  const laneW = 3 * s; // 42
  const ticks = [5, 10, 15, 20];

  return (
    <DiagramFigure
      id="sdc-lane"
      viewBox="0 0 360 620"
      maxWidth="max-w-md"
      title="Sprint-drag-carry lanes with dimensions"
      description="Two adjacent 25-meter lanes, each 3 meters wide, marked every 5 meters. About 4 meters beyond the 25-meter line for the sled turn-around and about 8 meters behind the start line for staging and the finish, about 37 meters in total. One grader stands at the start line and times both lanes; the other stands at the 25-meter line."
      caption="Two adjacent SDC lanes drawn to scale for 3.0 m lanes (the ATP allows 2.5–3.0 m). Lane length, 5 m markings, turn-around, and staging distances from ATP 7-22.01 para. 2-16 and E-29; grader positions from para. 2-65."
    >
      {/* Zones */}
      <rect x={laneX} y={turnTop} width={laneW * 2} height={4 * s} className="fill-surface-2" />
      <rect x={laneX} y={start} width={laneW * 2} height={8 * s} className="fill-surface-2" />
      {/* Lanes */}
      {[0, 1].map((i) => (
        <rect key={i} x={laneX + i * laneW} y={turnTop} width={laneW} height={stagingBottom - turnTop} className="fill-none stroke-line-strong" strokeWidth={1} />
      ))}
      {/* 5 m markings */}
      {ticks.map((m) => (
        <g key={m}>
          <line x1={laneX} x2={laneX + laneW * 2} y1={start - m * s} y2={start - m * s} className="stroke-line-strong" strokeDasharray="3 3" />
          <text x={laneX - 6} y={start - m * s + 4} textAnchor="end" fontSize={11} className={text}>
            {m} m
          </text>
        </g>
      ))}
      {/* Start and 25 m lines */}
      <line x1={laneX - 4} x2={laneX + laneW * 2 + 4} y1={start} y2={start} className="stroke-accent-ink" strokeWidth={3} />
      <line x1={laneX - 4} x2={laneX + laneW * 2 + 4} y1={line25} y2={line25} className="stroke-accent-ink" strokeWidth={3} />
      <text x={laneX - 6} y={start + 4} textAnchor="end" fontSize={11} className={strong}>
        Start
      </text>
      <text x={laneX - 6} y={line25 + 4} textAnchor="end" fontSize={11} className={strong}>
        25 m
      </text>
      {/* Lane numbers and equipment staged behind the start line */}
      {[0, 1].map((i) => (
        <g key={i}>
          <text x={laneX + i * laneW + laneW / 2} y={turnTop - 8} textAnchor="middle" fontSize={11} className={text}>
            Lane {i + 1}
          </text>
          <rect x={laneX + i * laneW + 9} y={start + 18} width={14} height={16} rx={2} className="fill-ink-2" />
          <circle cx={laneX + i * laneW + 31} cy={start + 22} r={4} className="fill-ink-2" />
          <circle cx={laneX + i * laneW + 31} cy={start + 34} r={4} className="fill-ink-2" />
        </g>
      ))}
      <text x={laneX + laneW} y={stagingBottom - 10} textAnchor="middle" fontSize={10} className={text}>
        sled · kettlebells
      </text>
      {/* Width dimension */}
      <line x1={laneX} x2={laneX + laneW} y1={stagingBottom + 14} y2={stagingBottom + 14} className="stroke-ink-2" />
      <text x={laneX + laneW / 2} y={stagingBottom + 30} textAnchor="middle" fontSize={11} className={text}>
        2.5–3.0 m
      </text>
      {/* Length dimensions (left) */}
      <g className="stroke-ink-2">
        <line x1={40} x2={40} y1={turnTop} y2={stagingBottom} />
        {[turnTop, line25, start, stagingBottom].map((y) => (
          <line key={y} x1={34} x2={46} y1={y} y2={y} />
        ))}
      </g>
      <text x={30} y={(turnTop + line25) / 2 + 4} textAnchor="end" fontSize={10} className={text}>
        ≈4 m
      </text>
      <text x={30} y={(line25 + start) / 2} textAnchor="end" fontSize={11} className={strong}>
        25 m
      </text>
      <text x={30} y={(start + stagingBottom) / 2 + 4} textAnchor="end" fontSize={10} className={text}>
        ≈8 m
      </text>
      <text x={40} y={stagingBottom + 48} textAnchor="middle" fontSize={11} className={strong}>
        ≈37 m total
      </text>
      {/* Graders */}
      {[
        { y: line25, label: ["25-m line grader:", "checks touches and", "that the sled crosses"] },
        { y: start, label: ["Start-line grader:", "times both lanes,", "enforces standards"] },
      ].map((g) => (
        <g key={g.y}>
          <circle cx={laneX + laneW * 2 + 18} cy={g.y} r={9} className="fill-accent" />
          <text x={laneX + laneW * 2 + 18} y={g.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#000">
            G
          </text>
          {g.label.map((line, i) => (
            <text key={line} x={laneX + laneW * 2 + 34} y={g.y - 10 + i * 13} fontSize={10.5} className={i === 0 ? strong : text}>
              {line}
            </text>
          ))}
        </g>
      ))}
      <text x={laneX + laneW * 2 + 34} y={turnTop + 20} fontSize={10.5} className={text}>
        Sled turn-around
      </text>
      <text x={laneX + laneW * 2 + 34} y={start + 58} fontSize={10.5} className={text}>
        Staging and finish
      </text>
    </DiagramFigure>
  );
}

// ---------------------------------------------------------------------------
// SDC movement sequence: 5 × 50 m shuttles.
// ---------------------------------------------------------------------------
const shuttles = [
  { name: "Sprint", out: "Sprint from prone", back: "Sprint back", touch: "foot + hand" },
  { name: "Drag", out: "Drag sled backward", back: "Drag sled back", touch: "whole sled crosses" },
  { name: "Lateral", out: "Lateral, lead one foot", back: "Lead with the other foot", touch: "foot + hand" },
  { name: "Carry", out: "Carry 2 × 40-lb kettlebells", back: "Carry back, set down", touch: "foot" },
  { name: "Sprint", out: "Sprint", back: "Sprint through finish", touch: "foot + hand" },
];

export function SdcSequenceDiagram() {
  const x0 = 78;
  const x25 = 270;
  const rowH = 70;
  const top = 36;
  return (
    <DiagramFigure
      id="sdc-sequence"
      viewBox="0 0 360 400"
      title="Sprint-drag-carry sequence"
      description="Five 50-meter shuttles in order: sprint, drag, lateral, carry, sprint. Each goes 25 meters out to the 25-meter line and 25 meters back, for 250 meters in total. Sprints and laterals touch the line with a foot and a hand, the whole sled must cross on the drag, and the carry touches with a foot."
      caption="Order, distances, and line touches from ATP 7-22.01 para. 2-68 and 2-70. Not to scale."
    >
      <text x={x0} y={20} textAnchor="middle" fontSize={11} className={strong}>
        Start
      </text>
      <text x={x25} y={20} textAnchor="middle" fontSize={11} className={strong}>
        25 m line
      </text>
      <line x1={x0} x2={x0} y1={26} y2={top + rowH * 5 - 10} className="stroke-accent-ink" strokeWidth={2.5} />
      <line x1={x25} x2={x25} y1={26} y2={top + rowH * 5 - 10} className="stroke-accent-ink" strokeWidth={2.5} />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-ink-2" />
        </marker>
      </defs>
      {shuttles.map((shuttle, i) => {
        const y = top + i * rowH + 18;
        return (
          <g key={i}>
            <text x={8} y={y + 4} fontSize={11} fontWeight={600} className={strong}>
              {i + 1}. {shuttle.name}
            </text>
            <line x1={x0 + 4} x2={x25 - 4} y1={y - 8} y2={y - 8} className="stroke-ink-2" markerEnd="url(#arrow)" />
            <text x={(x0 + x25) / 2} y={y - 13} textAnchor="middle" fontSize={10} className={text}>
              {shuttle.out}
            </text>
            <line x1={x25 - 4} x2={x0 + 4} y1={y + 12} y2={y + 12} className="stroke-ink-2" markerEnd="url(#arrow)" />
            <text x={(x0 + x25) / 2} y={y + 26} textAnchor="middle" fontSize={10} className={text}>
              {shuttle.back}
            </text>
            <text x={x25 + 6} y={y + 4} fontSize={9.5} className={strong}>
              {shuttle.touch}
            </text>
            <text x={352} y={y + 26} textAnchor="end" fontSize={9.5} className={text}>
              {(i + 1) * 50} m
            </text>
          </g>
        );
      })}
    </DiagramFigure>
  );
}

// ---------------------------------------------------------------------------
// Field overview (sample arrangement, approximate).
// ---------------------------------------------------------------------------
export function FieldOverviewDiagram() {
  const s = 4.2;
  const left = 40;
  const top = 40;
  const lanes = 16;
  const laneW = 3 * s;
  const length = 37 * s;
  const startY = top + length - 8 * s;
  const line25 = startY - 25 * s;
  return (
    <DiagramFigure
      id="field-overview"
      viewBox="0 0 360 260"
      title="Sample AFT field arrangement"
      description="Sixteen 3-meter lanes side by side, about 48 to 50 meters wide and about 37 meters long, with the start line near one end and the 25-meter line near the other. The deadlift area, the Preparation and Recovery Drill area, and equipment storage sit beside the lanes."
      caption="Sample arrangement with 16 lanes, the ATP's ideal. Commanders may use as many lanes as needed (para. 2-15). Area of about 37 × 40–50 m from para. 2-16; para. E-29 instead gives about 30 × 50 m. MDL space beside the lanes and storage from E-30 – E-31. Approximately to scale."
    >
      <rect x={left} y={top} width={laneW * lanes} height={length} className="fill-surface-2 stroke-line-strong" />
      {Array.from({ length: lanes - 1 }, (_, i) => (
        <line key={i} x1={left + laneW * (i + 1)} x2={left + laneW * (i + 1)} y1={top} y2={top + length} className="stroke-line-strong" strokeWidth={0.75} />
      ))}
      <line x1={left} x2={left + laneW * lanes} y1={startY} y2={startY} className="stroke-accent-ink" strokeWidth={2} />
      <line x1={left} x2={left + laneW * lanes} y1={line25} y2={line25} className="stroke-accent-ink" strokeWidth={2} />
      <text x={left + (laneW * lanes) / 2} y={startY + 18} textAnchor="middle" fontSize={10} className={strong}>
        Start / finish line
      </text>
      <text x={left + (laneW * lanes) / 2} y={line25 - 6} textAnchor="middle" fontSize={10} className={strong}>
        25-m line
      </text>
      <text x={left + (laneW * lanes) / 2} y={top - 8} textAnchor="middle" fontSize={10} className={text}>
        16 lanes (ideal) · HRP, SDC, plank
      </text>
      {/* Dimensions */}
      <line x1={left} x2={left + laneW * lanes} y1={top + length + 14} y2={top + length + 14} className="stroke-ink-2" />
      <text x={left + (laneW * lanes) / 2} y={top + length + 28} textAnchor="middle" fontSize={10} className={text}>
        ≈40–50 m (16 × 2.5–3.0 m lanes)
      </text>
      <line x1={left - 14} x2={left - 14} y1={top} y2={top + length} className="stroke-ink-2" />
      <text x={left - 18} y={top + length / 2} textAnchor="middle" fontSize={10} className={text} transform={`rotate(-90 ${left - 18} ${top + length / 2})`}>
        ≈37 m
      </text>
      {/* Side areas */}
      {[
        { y: top, h: 52, label: ["MDL area", "(hex bars)"] },
        { y: top + 60, h: 44, label: ["PD / RD", "area"] },
        { y: top + 112, h: 44, label: ["Equipment", "storage"] },
      ].map((area) => (
        <g key={area.label[0]}>
          <rect x={left + laneW * lanes + 14} y={area.y} width={84} height={area.h} rx={4} className="fill-none stroke-line-strong" strokeDasharray="4 3" />
          {area.label.map((line, i) => (
            <text key={line} x={left + laneW * lanes + 56} y={area.y + area.h / 2 + (i - 0.3) * 13} textAnchor="middle" fontSize={10} className={i === 0 ? strong : text}>
              {line}
            </text>
          ))}
        </g>
      ))}
    </DiagramFigure>
  );
}

// ---------------------------------------------------------------------------
// Position drawings (side views facing right; proportions approximate).
// ---------------------------------------------------------------------------
const limb = "stroke-ink";

export function DeadliftPositionDiagram() {
  return (
    <DiagramFigure
      id="mdl-positions"
      viewBox="0 0 360 170"
      title="Deadlift start and top positions"
      description="Left: the start position inside the hex bar with arms straight, back flat, hips below the shoulders, and heels down. Right: the top position standing tall in the Straddle Stance with hips and knees straight."
      caption="Start and top positions from ATP 7-22.01 para. 2-46 (official figures 2-3 and 2-4, p. 27). Dashed circle: bumper plate beside the legs; dot: hands on the hex-bar handle. Proportions approximate."
    >
      <line x1={10} x2={350} y1={130} y2={130} className="stroke-line-strong" />
      {/* Start position: plate drawn first so the body reads in front of it */}
      <circle cx={140} cy={114} r={16} className="fill-none stroke-accent-ink" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 3" />
      <g className={limb} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M112 130 L132 130" />
        <path d="M118 129 L132 102" />
        <path d="M132 102 L96 84" />
        <path d="M96 84 L148 54" />
        <path d="M146 56 L141 110" />
      </g>
      <circle cx={141} cy={111} r={3} className="fill-accent" />
      <circle cx={159} cy={47} r={8} className="fill-ink" />
      <text x={20} y={152} fontSize={10.5} className={strong}>
        GET SET: arms straight, back flat,
      </text>
      <text x={20} y={165} fontSize={10.5} className={text}>
        hips below shoulders, heels down
      </text>
      {/* Top position */}
      <circle cx={265} cy={82} r={16} className="fill-none stroke-accent-ink" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 3" />
      <g className={limb} strokeWidth={3.5} strokeLinecap="round" fill="none">
        <path d="M254 130 L272 130" />
        <path d="M262 130 L262 100 L262 72" />
        <path d="M262 72 L262 38" />
        <path d="M262 40 L265 80" />
      </g>
      <circle cx={265} cy={81} r={3} className="fill-accent" />
      <circle cx={262} cy={28} r={8} className="fill-ink" />
      <text x={200} y={152} fontSize={10.5} className={strong}>
        Top: hips and knees straight
      </text>
      <text x={200} y={165} fontSize={10.5} className={text}>
        (Straddle Stance), then lower
      </text>
    </DiagramFigure>
  );
}

export function HandReleasePositionDiagram() {
  const ground = "stroke-line-strong";
  return (
    <DiagramFigure
      id="hrp-positions"
      viewBox="0 0 360 250"
      title="Hand-release push-up movements"
      description="Four panels. One: prone start with chest, hips, and thighs on the ground and hands under the shoulders. Two: up position with elbows fully extended and a straight line from head to ankles. Three: lowered with chest, hips, and thighs touching the ground. Four, seen from above: arms extended straight out to the sides in a T."
      caption="Movements 1–4 and the starting position from ATP 7-22.01 paras 2-57 – 2-58 (official figures 2-8 and 2-9, p. 30). Proportions approximate."
    >
      {/* Panel 1: start (prone) */}
      <g>
        <line x1={10} x2={170} y1={90} y2={90} className={ground} />
        <path d="M20 88 L125 86" className={limb} strokeWidth={4} strokeLinecap="round" />
        <path d="M118 86 L108 74 L120 89" className={limb} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <circle cx={134} cy={83} r={7} className="fill-ink" />
        <text x={10} y={110} fontSize={10.5} className={strong}>1. Start: prone, hands</text>
        <text x={10} y={123} fontSize={10.5} className={text}>under the shoulders</text>
      </g>
      {/* Panel 2: up */}
      <g>
        <line x1={190} x2={350} y1={90} y2={90} className={ground} />
        <path d="M200 88 L305 52" className={limb} strokeWidth={4} strokeLinecap="round" />
        <path d="M303 54 L303 89" className={limb} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={314} cy={48} r={7} className="fill-ink" />
        <text x={190} y={110} fontSize={10.5} className={strong}>2. Up: elbows locked,</text>
        <text x={190} y={123} fontSize={10.5} className={text}>straight line head to ankles</text>
      </g>
      {/* Panel 3: down */}
      <g>
        <line x1={10} x2={170} y1={200} y2={200} className={ground} />
        <path d="M20 198 L125 196" className={limb} strokeWidth={4} strokeLinecap="round" />
        <path d="M118 196 L108 184 L120 199" className={limb} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <circle cx={134} cy={193} r={7} className="fill-ink" />
        <text x={10} y={220} fontSize={10.5} className={strong}>3. Down: chest, hips,</text>
        <text x={10} y={233} fontSize={10.5} className={text}>and thighs touch together</text>
      </g>
      {/* Panel 4: T position, top view */}
      <g>
        <circle cx={270} cy={146} r={7} className="fill-ink" />
        <path d="M270 154 L270 188" className={limb} strokeWidth={4} strokeLinecap="round" />
        <path d="M270 188 L266 206 M270 188 L274 206" className={limb} strokeWidth={3} strokeLinecap="round" />
        <path d="M210 160 L330 160" className="stroke-accent-ink" strokeWidth={3} strokeLinecap="round" />
        <text x={190} y={220} fontSize={10.5} className={strong}>4. Release: arms out in a T</text>
        <text x={190} y={233} fontSize={10.5} className={text}>(top view), then hands back</text>
      </g>
    </DiagramFigure>
  );
}

export function PlankPositionDiagram() {
  return (
    <DiagramFigure
      id="plk-position"
      viewBox="0 0 360 150"
      title="Plank position"
      description="Side view: forearms flat on the ground with elbows under the shoulders, body in a straight line from head to heels, eyes on the ground, ankles flexed with toes on the ground."
      caption="Plank position from ATP 7-22.01 para. 2-73 (official figure 2-12, p. 35). Proportions approximate."
    >
      <line x1={10} x2={350} y1={100} y2={100} className="stroke-line-strong" />
      <path d="M40 98 L232 70" className={limb} strokeWidth={4} strokeLinecap="round" />
      <path d="M230 71 L230 98 L276 98" className={limb} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={244} cy={66} r={8} className="fill-ink" />
      <path d="M40 98 L34 100" className={limb} strokeWidth={3} strokeLinecap="round" />
      <line x1={40} x2={232} y1={80} y2={52} className="stroke-accent-ink" strokeDasharray="5 4" strokeWidth={1.5} />
      <text x={60} y={46} fontSize={10.5} className={strong}>straight line head to heels</text>
      <text x={250} y={122} fontSize={10.5} className={text} textAnchor="middle">elbows under shoulders,</text>
      <text x={250} y={135} fontSize={10.5} className={text} textAnchor="middle">forearms flat</text>
      <text x={30} y={122} fontSize={10.5} className={text}>toes on ground,</text>
      <text x={30} y={135} fontSize={10.5} className={text}>ankles flexed</text>
    </DiagramFigure>
  );
}
