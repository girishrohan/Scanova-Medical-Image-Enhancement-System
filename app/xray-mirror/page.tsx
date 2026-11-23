"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

export default function XRMMirrorPage() {
  const router = useRouter();

  // Auth check
  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#090c13",
      overflow: "hidden",
      zIndex: 0,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top Navigation Bar */}
      <div style={{
        height: "64px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 1.5rem",
        background: "rgba(9, 12, 19, 0.95)",
        borderBottom: "1px solid #262d42",
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "white",
              textDecoration: "none",
              fontSize: "0.9rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            ← Home
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "white" }}>
              X-Ray Mirror AR
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
              Real-time 3D anatomical visualization
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Logout
        </button>
      </div>

      {/* X-Ray Mirror iframe - full viewport */}
      <iframe
        src="/xray-mirror/index.html"
        allow="camera; microphone; fullscreen"
        title="X-Ray Mirror AR"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "#090c13",
        }}
      />

      {/* Disclaimer footer */}
      <div style={{
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 1.5rem",
        background: "rgba(9, 12, 19, 0.95)",
        borderTop: "1px solid #262d42",
        flexShrink: 0,
        zIndex: 10,
      }}>
        <p style={{
          margin: 0,
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
        }}>
          ⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. {DISCLAIMER.substring(0, 60)}... · 3D models: BodyParts3D (CC BY-SA 2.1 Japan) · SCANOVA v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}