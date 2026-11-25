// components/ui/skeleton.tsx — Skeleton loader components
"use client";

import { COLORS } from "@/lib/config";

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "4px",
};

export function Skeleton({ width = "100%", height = "1rem", style }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width,
        height,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "1.5rem",
      border: "1px solid #e2e8f0",
    }}>
      <Skeleton width="60%" height="1.25rem" style={{ marginBottom: "0.75rem" }} />
      <Skeleton width="100%" height="0.875rem" style={{ marginBottom: "0.5rem" }} />
      <Skeleton width="80%" height="0.875rem" style={{ marginBottom: "1rem" }} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Skeleton width="80px" height="2rem" />
        <Skeleton width="80px" height="2rem" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} height="1rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #f1f5f9" }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} width={`${100 / cols}%`} height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} height="0.875rem" />
      ))}
    </div>
  );
}

// Add shimmer keyframes to global styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
  document.head.appendChild(style);
}