// components/ui/confirm-dialog.tsx — Destructive action confirmation
"use client";

import { useState } from "react";
import { COLORS } from "@/lib/config";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireTypedConfirmation?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  requireTypedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const canConfirm = requireTypedConfirmation
    ? typed === requireTypedConfirmation
    : true;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          color: destructive ? "#dc2626" : COLORS.navy,
          margin: "0 0 0.75rem 0",
          fontSize: "1.25rem",
          fontWeight: 700,
        }}>
          {title}
        </h3>
        <p style={{
          color: COLORS.muted,
          margin: "0 0 1.5rem 0",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}>
          {description}
        </p>

        {requireTypedConfirmation && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{
              color: COLORS.muted,
              fontSize: "0.8rem",
              marginBottom: "0.5rem",
            }}>
              Type <strong>{requireTypedConfirmation}</strong> to confirm:
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "0.9rem",
                outline: "none",
              }}
              placeholder={requireTypedConfirmation}
              autoFocus
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={() => { setTyped(""); onCancel(); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "white",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { setTyped(""); onConfirm(); }}
            disabled={!canConfirm}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: !canConfirm ? "#cbd5e1" : destructive ? "#dc2626" : COLORS.blue,
              color: "white",
              cursor: !canConfirm ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}