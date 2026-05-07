"use client";

import type { Phase } from "@/lib/types";

interface Props {
  /** 0-100 conviction reading */
  value: number;
  phase: Phase;
}

const ARC_RADIUS = 165;
const STROKE_WIDTH = 22;
const CENTER_X = 220;
const CENTER_Y = 220;

// Arc spans -135deg → +135deg (270deg total)
const START_ANGLE = -225; // start at lower-left
const END_ANGLE = 45; // end at lower-right (270deg sweep)
const TOTAL_ANGLE = END_ANGLE - START_ANGLE; // 270

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Build an SVG arc path between two angles. */
function arcPath(from: number, to: number, r = ARC_RADIUS) {
  const start = polar(CENTER_X, CENTER_Y, r, from);
  const end = polar(CENTER_X, CENTER_Y, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const PHASE_GLOW: Record<Phase, string> = {
  "heavy-buying": "rgb(var(--emerald) / 0.45)",
  balanced: "rgb(var(--amber) / 0.4)",
  "heavy-selling": "rgb(var(--crimson) / 0.45)",
};

const PHASE_NEEDLE: Record<Phase, string> = {
  "heavy-buying": "rgb(var(--emerald))",
  balanced: "rgb(var(--amber))",
  "heavy-selling": "rgb(var(--crimson))",
};

const PHASE_LABEL_COMPACT: Record<Phase, string> = {
  "heavy-buying": "Strong buying",
  balanced: "Mixed",
  "heavy-selling": "Cautious",
};

export function ConvictionDial({ value, phase }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const valueAngle = START_ANGLE + (clamped / 100) * TOTAL_ANGLE;

  // Three colored arc segments: 0-40 (crimson), 40-70 (amber), 70-100 (emerald)
  const seg1End = START_ANGLE + (40 / 100) * TOTAL_ANGLE;
  const seg2End = START_ANGLE + (70 / 100) * TOTAL_ANGLE;

  // Tick marks every 10 points
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = START_ANGLE + (i * 10 / 100) * TOTAL_ANGLE;
    const inner = polar(CENTER_X, CENTER_Y, ARC_RADIUS - 18, angle);
    const outer = polar(CENTER_X, CENTER_Y, ARC_RADIUS - 28, angle);
    return { i, inner, outer, isMajor: i % 5 === 0 };
  });

  const needleEnd = polar(CENTER_X, CENTER_Y, ARC_RADIUS - 8, valueAngle);

  return (
    <svg viewBox="0 0 440 320" className="w-full h-auto" aria-label={`Insider conviction ${clamped} of 100, ${PHASE_LABEL_COMPACT[phase]}`}>
      <defs>
        <radialGradient id="dial-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={PHASE_GLOW[phase]} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="seg-crimson" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(var(--crimson) / 0.85)" />
          <stop offset="100%" stopColor="rgb(var(--crimson) / 0.6)" />
        </linearGradient>
        <linearGradient id="seg-amber" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(var(--amber) / 0.65)" />
          <stop offset="100%" stopColor="rgb(var(--amber) / 0.85)" />
        </linearGradient>
        <linearGradient id="seg-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(var(--emerald) / 0.65)" />
          <stop offset="100%" stopColor="rgb(var(--emerald) / 0.95)" />
        </linearGradient>
      </defs>

      {/* Soft phase-coded glow underneath */}
      <circle cx={CENTER_X} cy={CENTER_Y} r="180" fill="url(#dial-glow)" opacity="0.7" />

      {/* Background arc track */}
      <path
        d={arcPath(START_ANGLE, END_ANGLE)}
        fill="none"
        stroke="rgb(var(--border))"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Three colored segments */}
      <path d={arcPath(START_ANGLE, seg1End)} fill="none" stroke="url(#seg-crimson)" strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <path d={arcPath(seg1End, seg2End)} fill="none" stroke="url(#seg-amber)" strokeWidth={STROKE_WIDTH} />
      <path d={arcPath(seg2End, END_ANGLE)} fill="none" stroke="url(#seg-emerald)" strokeWidth={STROKE_WIDTH} strokeLinecap="round" />

      {/* Tick marks */}
      {ticks.map((t) => (
        <line
          key={t.i}
          x1={t.inner.x}
          y1={t.inner.y}
          x2={t.outer.x}
          y2={t.outer.y}
          stroke="rgb(var(--fg-subtle) / 0.6)"
          strokeWidth={t.isMajor ? 1.5 : 1}
        />
      ))}

      {/* Tick labels at 0, 50, 100 */}
      <text x={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, START_ANGLE).x} y={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, START_ANGLE).y + 5} textAnchor="middle" className="font-mono fill-current text-fg-subtle" style={{ fontSize: 11 }}>0</text>
      <text x={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, START_ANGLE + TOTAL_ANGLE / 2).x} y={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, START_ANGLE + TOTAL_ANGLE / 2).y - 6} textAnchor="middle" className="font-mono fill-current text-fg-subtle" style={{ fontSize: 11 }}>50</text>
      <text x={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, END_ANGLE).x} y={polar(CENTER_X, CENTER_Y, ARC_RADIUS + 14, END_ANGLE).y + 5} textAnchor="middle" className="font-mono fill-current text-fg-subtle" style={{ fontSize: 11 }}>100</text>

      {/* Needle */}
      <line
        x1={CENTER_X}
        y1={CENTER_Y}
        x2={needleEnd.x}
        y2={needleEnd.y}
        stroke={PHASE_NEEDLE[phase]}
        strokeWidth={3.5}
        strokeLinecap="round"
        style={{ transition: "all 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      {/* Needle pivot */}
      <circle cx={CENTER_X} cy={CENTER_Y} r="9" fill="rgb(var(--surface))" stroke={PHASE_NEEDLE[phase]} strokeWidth="2.5" />
      <circle cx={CENTER_X} cy={CENTER_Y} r="3" fill={PHASE_NEEDLE[phase]} />

      {/* Score readout */}
      <text
        x={CENTER_X}
        y={CENTER_Y - 30}
        textAnchor="middle"
        className="fill-current text-fg font-mono tab-num"
        style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em" }}
      >
        {clamped}
      </text>
      <text
        x={CENTER_X}
        y={CENTER_Y - 4}
        textAnchor="middle"
        className="fill-current text-fg-subtle font-mono"
        style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}
      >
        out of 100
      </text>

      {/* Phase label below */}
      <text
        x={CENTER_X}
        y={CENTER_Y + 64}
        textAnchor="middle"
        className="fill-current"
        style={{ fontSize: 14, letterSpacing: "0.02em", fontWeight: 600, fill: PHASE_NEEDLE[phase] }}
      >
        {PHASE_LABEL_COMPACT[phase]}
      </text>
    </svg>
  );
}
