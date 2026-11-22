"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  FileImage,
  Globe,
  Telescope,
  UploadCloud,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, PROJECT_FULL_NAME } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function HomePage() {
  const router = useRouter();
  const { hasImage, image } = useSharedImage();
  const [userName, setUserName] = useState("User");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
    setUserName(auth.username);
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
      }}>
        <div style={{ color: "#475569", fontSize: "0.9rem" }}>Loading workspace…</div>
      </div>
    );
  }

  const modules = [
    {
      title: "Image Enhancement",
      subtitle: "2D scan processing",
      description:
        "Upload a medical scan and apply denoising, contrast enhancement, and sharpening. View quantitative metrics and side-by-side comparisons.",
      href: "/image-enhancement",
      icon: FileImage,
      accent: "#1e40af",
      features: [
        "6-stage enhancement pipeline",
        "CLAHE / histogram equalization",
        "Median & Gaussian denoising",
        "Unsharp-mask sharpening",
        "Quantitative metrics",
      ],
    },
    {
      title: "X-Ray Mirror AR",
      subtitle: "Live anatomical tracking",
      description:
        "Real-time 3D anatomical visualization overlaid on your camera feed. Track facial landmarks and explore skull, brain, muscle, and eye models.",
      href: "/xray-mirror",
      icon: Camera,
      accent: "#0d9488",
      features: [
        "MediaPipe face & hand tracking",
        "X-Ray shader with edge glow",
        "Anatomical layer toggles",
        "Transparency controls",
        "Split-screen comparison",
      ],
    },
  ];

  const quickLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "AI Analysis", href: "/ai-analysis" },
    { label: "Histogram", href: "/histogram-analysis" },
    { label: "Image Info", href: "/image-information" },
    { label: "Comparison", href: "/image-comparison" },
    { label: "About", href: "/about" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Top bar */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#0f2c4d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "1.1rem",
            fontWeight: 700,
          }}>
            S
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f2c4d" }}>{APP_NAME}</span>
            <span style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "0.5rem" }}>v{APP_VERSION}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>
            {userName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: "white",
              color: "#475569",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "2.5rem 2rem" }}>
        {/* Hero */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#0f2c4d",
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.02em",
          }}>
            {PROJECT_FULL_NAME}
          </h1>
          <p style={{
            fontSize: "1rem",
            color: "#475569",
            margin: 0,
            maxWidth: "560px",
            lineHeight: 1.6,
          }}>
            Select a module below to begin. Upload a medical scan once and it stays active across all analysis views.
          </p>
        </section>

        {/* Shared image status */}
        {hasImage && image && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
          }}>
            <Check style={{ width: "16px", height: "16px", color: "#059669" }} />
            <span style={{ color: "#065f46" }}>
              Active scan: <strong>{image.name}</strong> ({image.width} × {image.height})
            </span>
          </div>
        )}

        {/* Module cards */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}>
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1.5rem",
                transition: "border-color 0.15s, box-shadow 0.15s",
                cursor: "pointer",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mod.accent;
                e.currentTarget.style.boxShadow = `0 4px 12px ${mod.accent}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: `${mod.accent}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <mod.icon style={{ width: "20px", height: "20px", color: mod.accent }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                      {mod.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                      {mod.subtitle}
                    </p>
                  </div>
                </div>

                <p style={{
                  fontSize: "0.9rem",
                  color: "#475569",
                  lineHeight: 1.5,
                  margin: "0 0 1rem 0",
                }}>
                  {mod.description}
                </p>

                <ul style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 1rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}>
                  {mod.features.map((f) => (
                    <li key={f} style={{
                      fontSize: "0.8rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}>
                      <span style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        background: mod.accent,
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: mod.accent,
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}>
                  Open module <ArrowRight style={{ width: "14px", height: "14px" }} />
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Quick links */}
        <section style={{ marginBottom: "2rem" }}>
          <h3 style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 0.75rem 0",
          }}>
            Quick access
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#475569",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div style={{
          padding: "0.75rem 1rem",
          background: "#fef9f2",
          border: "1px solid #fed8b1",
          borderRadius: "8px",
          fontSize: "0.8rem",
          color: "#78350f",
          lineHeight: 1.5,
        }}>
          <strong>⚠ Educational use only.</strong> {DISCLAIMER} 3D models: BodyParts3D (CC BY-SA 2.1 Japan).
        </div>
      </main>
    </div>
  );
}