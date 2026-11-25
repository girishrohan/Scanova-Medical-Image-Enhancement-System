// components/ui/tier-badge.tsx — Tier/plan indicator
"use client";

import { COLORS } from "@/lib/config";
import { Lock, Zap } from "lucide-react";

interface TierBadgeProps {
  tier: "free" | "pro" | "enterprise";
  label?: string;
  showLock?: boolean;
}

export function TierBadge({ tier, label, showLock = false }: TierBadgeProps) {
  const colors = {
    free: { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" },
    pro: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
    enterprise: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  };
  const c = colors[tier];

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "0.2rem 0.6rem",
      borderRadius: "9999px",
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: "0.7rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    }}>
      {showLock && <Lock style={{ width: "10px", height: "10px" }} />}
      {tier === "pro" && <Zap style={{ width: "10px", height: "10px" }} />}
      {label || tier}
    </span>
  );
}

interface UsageCounterProps {
  used: number;
  limit: number;
  label: string;
}

export function UsageCounter({ used, limit, label }: UsageCounterProps) {
  const percent = Math.min(100, (used / limit) * 100);
  const isNearLimit = percent > 80;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
        <span style={{ color: COLORS.muted }}>{label}</span>
        <span style={{ fontWeight: 600, color: isNearLimit ? "#dc2626" : COLORS.text }}>
          {used} / {limit}
        </span>
      </div>
      <div style={{
        height: "4px",
        background: "#e2e8f0",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${percent}%`,
          background: isNearLimit ? "#dc2626" : COLORS.teal,
          borderRadius: "2px",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}