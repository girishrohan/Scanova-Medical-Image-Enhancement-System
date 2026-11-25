// components/ui/empty-state.tsx — Empty state component
"use client";

import { FileImage, UploadCloud } from "lucide-react";
import { COLORS } from "@/lib/config";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 2rem",
      textAlign: "center",
      background: "#f8fafc",
      borderRadius: "12px",
      border: "1px dashed #cbd5e1",
    }}>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "12px",
        background: `${COLORS.teal}10`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1rem",
        color: COLORS.teal,
      }}>
        {icon || <FileImage style={{ width: "28px", height: "28px" }} />}
      </div>
      <h3 style={{
        color: COLORS.navy,
        margin: "0 0 0.5rem 0",
        fontSize: "1.1rem",
        fontWeight: 600,
      }}>
        {title}
      </h3>
      <p style={{
        color: COLORS.muted,
        margin: "0 0 1.5rem 0",
        fontSize: "0.9rem",
        maxWidth: "360px",
        lineHeight: 1.5,
      }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: COLORS.blue,
            color: "white",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <UploadCloud style={{ width: "16px", height: "16px" }} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}