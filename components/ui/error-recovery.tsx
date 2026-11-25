// components/ui/error-recovery.tsx — Graceful error recovery with retry
"use client";

import { COLORS } from "@/lib/config";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorRecoveryProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorRecovery({ title = "Something went wrong", message, onRetry, retryLabel = "Try Again" }: ErrorRecoveryProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center",
      background: "#fef2f2",
      borderRadius: "12px",
      border: "1px solid #fecaca",
    }}>
      <AlertCircle style={{ width: "32px", height: "32px", color: "#dc2626", marginBottom: "0.75rem" }} />
      <h3 style={{
        color: "#dc2626",
        margin: "0 0 0.5rem 0",
        fontSize: "1rem",
        fontWeight: 600,
      }}>
        {title}
      </h3>
      <p style={{
        color: "#7f1d1d",
        margin: "0 0 1.25rem 0",
        fontSize: "0.875rem",
        maxWidth: "360px",
        lineHeight: 1.5,
      }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: "#dc2626",
            color: "white",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <RefreshCw style={{ width: "16px", height: "16px" }} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}