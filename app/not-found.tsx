"use client";

import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION } from "@/lib/config";
import { getAuth } from "@/lib/auth-context";

export default function NotFound() {
  const auth = typeof window !== "undefined" ? getAuth() : null;
  const homeHref = auth?.authenticated ? "/dashboard" : "/login";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: COLORS.background,
      padding: "2rem",
      textAlign: "center",
    }}>
      <div>
        <div style={{
          fontSize: "6rem",
          fontWeight: 800,
          color: COLORS.navy,
          lineHeight: 1,
          marginBottom: "1rem",
        }}>
          404
        </div>
        <h1 style={{
          color: COLORS.navy,
          margin: "0 0 0.5rem 0",
          fontSize: "1.5rem",
          fontWeight: 700,
        }}>
          Page Not Found
        </h1>
        <p style={{
          color: COLORS.muted,
          margin: "0 0 2rem 0",
          fontSize: "1rem",
          maxWidth: "400px",
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href={homeHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            background: COLORS.blue,
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          ← Go to {auth?.authenticated ? "Dashboard" : "Login"}
        </Link>
        <p style={{
          color: COLORS.muted,
          fontSize: "0.8rem",
          marginTop: "2rem",
        }}>
          {APP_NAME} v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}