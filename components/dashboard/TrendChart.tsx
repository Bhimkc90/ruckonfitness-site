"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = {
  key: string;
  label: string; // full label for the tooltip
  shortLabel: string; // axis tick
  value: number;
  segment: number;
  details: string[];
};

// Recharts writes these as SVG attributes, so they are literal values matching the light theme tokens: a black
// line with yellow points outlined in black, so each point stays visible on white.
const LINE = "#111111"; // --color-ink
const POINT = "#facc15"; // --color-accent
const GRID = "#e2e0d8"; // --color-line
const MARKER = "#b9b5a9"; // --color-line-strong
const AXIS_TEXT = "#4a4a50"; // --color-ink-2

type Row = TrendPoint & Record<`s${number}`, number | undefined>;

function TooltipBox({
  active,
  payload,
  formatValue,
  valueLabel,
}: {
  active?: boolean;
  payload?: readonly { payload?: Row }[];
  formatValue: (value: number) => string;
  valueLabel: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">{row.label}</p>
      <p className="mt-1 text-ink">
        {valueLabel}: <span className="font-semibold">{formatValue(row.value)}</span>
      </p>
      {row.details.map((detail) => (
        <p key={detail} className="mt-0.5 text-ink-2">
          {detail}
        </p>
      ))}
    </div>
  );
}

export default function TrendChart({
  points,
  formatValue,
  formatTooltipValue,
  valueLabel,
  domain,
  ticks,
  reference,
  breaks = [],
  ariaLabel,
}: {
  points: TrendPoint[];
  formatValue: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  valueLabel: string;
  domain?: [number, number];
  ticks?: number[];
  reference?: { y: number; label: string };
  breaks?: { key: string; label: string }[];
  ariaLabel: string;
}) {
  const segments = Array.from(new Set(points.map((p) => p.segment)));
  const rows: Row[] = points.map((p) => ({ ...p, [`s${p.segment}`]: p.value }) as Row);

  return (
    <figure className="h-64 w-full" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="key"
            tickFormatter={(key: string) => rows.find((r) => r.key === key)?.shortLabel ?? ""}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            domain={domain ?? ["auto", "auto"]}
            ticks={ticks}
            tickFormatter={(value: number) => formatValue(value)}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
            allowDecimals={false}
          />
          {reference && (
            <ReferenceLine
              y={reference.y}
              stroke={AXIS_TEXT}
              strokeDasharray="4 4"
              label={{ value: reference.label, position: "insideBottomRight", fill: AXIS_TEXT, fontSize: 11 }}
            />
          )}
          {breaks.map((item) => {
            // Put the label on whichever side of the marker has room.
            const inRightHalf = rows.findIndex((r) => r.key === item.key) > (rows.length - 1) / 2;
            return (
              <ReferenceLine
                key={item.key}
                x={item.key}
                stroke={MARKER}
                label={{
                  value: item.label,
                  position: inRightHalf ? "insideTopRight" : "insideTopLeft",
                  fill: AXIS_TEXT,
                  fontSize: 11,
                }}
              />
            );
          })}
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: MARKER, strokeWidth: 1 }}
            content={(props) => (
              <TooltipBox
                active={props.active}
                payload={props.payload as readonly { payload?: Row }[] | undefined}
                formatValue={formatTooltipValue ?? formatValue}
                valueLabel={valueLabel}
              />
            )}
          />
          {segments.map((segment) => (
            <Line
              key={segment}
              dataKey={`s${segment}`}
              type="linear"
              stroke={LINE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={false}
              isAnimationActive={false}
              dot={{ r: 4, fill: POINT, stroke: LINE, strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: POINT, stroke: LINE, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
