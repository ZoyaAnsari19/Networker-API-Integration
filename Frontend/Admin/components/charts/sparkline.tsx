"use client";
import React, { useId, useRef, useEffect, useState } from "react";

function catmullRomToBezier(points: [number, number][]): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

  const d: string[] = [`M ${points[0][0]},${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const tension = 6;
    const cp1x = p1[0] + (p2[0] - p0[0]) / tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) / tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) / tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) / tension;
    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }
  return d.join(" ");
}

export const Sparkline = ({
  data,
  width = 200,
  height = 48,
  className = "",
  strokeColor = "#6366f1",
  fillColor = "rgba(99, 102, 241, 0.15)",
  animate = true,
  showDot = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  fillColor?: string;
  animate?: boolean;
  showDot?: boolean;
}) => {
  const uid = useId();
  const lineRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = useState(!animate);

  useEffect(() => {
    if (!animate || !lineRef.current) { setDrawn(true); return; }
    const el = lineRef.current;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.strokeDashoffset = "0";
    });
    const t = setTimeout(() => setDrawn(true), 1250);
    return () => clearTimeout(t);
  }, [animate, data]);

  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const stepX = w / (data.length - 1);
  const pts: [number, number][] = data.map((v, i) => [pad + i * stepX, pad + h - ((v - min) / range) * h]);
  const pathLine = catmullRomToBezier(pts);
  const last = pts[pts.length - 1];
  const pathArea = `${pathLine} L ${pad + w},${pad + h} L ${pad},${pad + h} Z`;
  const gradId = `sp-grad-${uid.replace(/:/g, "")}`;
  const glowId = `sp-glow-${uid.replace(/:/g, "")}`;

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
        {showDot && (
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path d={pathArea} fill={`url(#${gradId})`} style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.6s ease-out 0.8s" }} />
      <path ref={lineRef} d={pathLine} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && (
        <g style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.3s ease-out" }}>
          <circle cx={last[0]} cy={last[1]} r="6" fill={strokeColor} opacity={0.18} filter={`url(#${glowId})`}>
            <animate attributeName="r" values="5;8;5" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.08;0.2" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={last[0]} cy={last[1]} r="3" fill="white" stroke={strokeColor} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
};

export default Sparkline;
