"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileImage,
  Globe,
  Telescope,
  UploadCloud,
  Zap,
  ShieldCheck,
  Activity,
  Camera,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, PROJECT_FULL_NAME } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function HomePage() {
  const router = useRouter();
  const { hasImage, image } = useSharedImage();
  const [userName, setUserName] = useState("User");
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "280px",
              height: "100%",
              background: "white",
              padding: "1.5rem",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f2c4d" }}>Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#475569" }}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Image Enhancement", href: "/image-enhancement" },
                { label: "X-Ray Mirror AR", href: "/xray-mirror" },
                { label: "AI Analysis", href: "/ai-analysis" },
                { label: "Histogram Analysis", href: "/histogram-analysis" },
                { label: "Image Comparison", href: "/image-comparison" },
                { label: "Image Information", href: "/image-information" },
                { label: "About", href: "/about" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    color: "#0f2c4d",
                    textDecoration: "none",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    background: "#f8fafc",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => { clearAuth(); router.push("/login"); }}
              style={{
                marginTop: "1.5rem",
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                color: "#475569",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

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
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
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
            }} aria-label="Scanova Home">
              S
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f2c4d" }}>{APP_NAME}</span>
              <span style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "0.5rem" }}>v{APP_VERSION}</span>
            </div>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          style={{
            display: "none",
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "0.5rem",
            cursor: "pointer",
            color: "#475569",
          }}
          className="mobile-menu-btn"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

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
            fontSize: "2rem",
            fontWeight: 800,
            color: "#0f2c4d",
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.02em",
          }}>
            Welcome to {APP_NAME}
          </h1>
          <p style={{
            fontSize: "1.05rem",
            color: "#475569",
            margin: "0 0 1.5rem 0",
            maxWidth: "640px",
            lineHeight: 1.6,
          }}>
            {PROJECT_FULL_NAME} — an educational platform for medical image enhancement
            and real-time 3D anatomical visualization.
          </p>
        </section>

        {/* What is Scanova */}
        <section style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          border: "1px solid #e2e8f0",
          marginBottom: "2rem",
        }}>
          <h2 style={{
            color: "#0f2c4d",
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            What is SCANOVA?
          </h2>
          <p style={{
            color: "#475569",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            margin: "0 0 1rem 0",
          }}>
            SCANOVA is an educational medical imaging workspace that lets you upload, enhance,
            and analyze medical scans (X-rays, MRI, CT) entirely in your browser. It also
            provides a real-time 3D X-Ray Mirror AR experience that overlays anatomical
            structures on your live camera feed.
          </p>
          <p style={{
            color: "#475569",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            margin: 0,
          }}>
            All processing runs client-side — your images never leave your device.
          </p>
        </section>

        {/* Capabilities */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{
            color: "#0f2c4d",
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Capabilities
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}>
            {[
              { title: "Image Enhancement", desc: "6-stage pipeline: denoising, contrast (CLAHE), sharpening. Quantitative metrics and histograms.", icon: "🔬" },
              { title: "X-Ray Mirror AR", desc: "Real-time 3D anatomical visualization with MediaPipe tracking and Fresnel X-Ray shader.", icon: "🩻" },
              { title: "AI Analysis", desc: "Automated body region identification and visual feature observation.", icon: "🤖" },
              { title: "Image Comparison", desc: "Side-by-side original vs. enhanced with delta metrics.", icon: "⚖️" },
            ].map((cap) => (
              <div key={cap.title} style={{
                background: "white",
                borderRadius: "10px",
                padding: "1.25rem",
                border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{cap.icon}</div>
                <h3 style={{ color: "#0f2c4d", margin: "0 0 0.4rem 0", fontSize: "1rem", fontWeight: 600 }}>
                  {cap.title}
                </h3>
                <p style={{ color: "#475569", margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Shared Scan Workflow */}
        <section style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          border: "1px solid #e2e8f0",
          marginBottom: "2rem",
        }}>
          <h2 style={{
            color: "#0f2c4d",
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            How the Shared Scan Workflow Works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              "Upload a medical scan once from any module (Enhancement, AI Analysis, Comparison, etc.)",
              "The scan stays active across all sections — no need to re-upload",
              "Switch between Enhancement, Comparison, Histogram, and AI Analysis freely",
              "Replace the scan anytime with the 'Clear image' / 'Replace' action",
              "All processing runs in your browser — images never leave your device",
            ].map((step, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: COLORS.teal,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: "2px",
                }}>
                  {idx + 1}
                </div>
                <p style={{ color: "#475569", margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Active scan status */}
        {hasImage && image && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            marginBottom: "2rem",
            fontSize: "0.85rem",
          }}>
            <Check style={{ width: "16px", height: "16px", color: "#059669" }} />
            <span style={{ color: "#065f46" }}>
              Active scan: <strong>{image.name}</strong> ({image.width} × {image.height})
            </span>
          </div>
        )}

        {/* CTA to Dashboard */}
        <section style={{
          textAlign: "center",
          marginBottom: "2rem",
        }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              background: COLORS.blue,
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Go to Dashboard <ArrowRight style={{ width: "18px", height: "18px" }} />
          </Link>
          <p style={{
            color: COLORS.muted,
            fontSize: "0.8rem",
            marginTop: "0.75rem",
          }}>
            Access all modules, tools, and your active scan
          </p>
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
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Image Enhancement", href: "/image-enhancement" },
              { label: "X-Ray Mirror AR", href: "/xray-mirror" },
              { label: "AI Analysis", href: "/ai-analysis" },
              { label: "Histogram", href: "/histogram-analysis" },
              { label: "Image Info", href: "/image-information" },
              { label: "Comparison", href: "/image-comparison" },
              { label: "About", href: "/about" },
            ].map((link) => (
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

      <style>{`
        @media (min-width: 768px) {
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
      </main>
    </div>
  );
}