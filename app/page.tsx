"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Check,
  Camera,
  Cpu,
  Eye,
  FileImage,
  Globe,
  HeartPulse,
  ImagePlay,
  Layers,
  ShieldCheck,
  Sparkles,
  Telescope,
  UploadCloud,
  Zap,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, PROJECT_FULL_NAME } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
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
        background: COLORS.background,
      }}>
        <div style={{ color: COLORS.muted }}>Loading...</div>
      </div>
    );
  }

  const modules = [
    {
      title: "Medical Image Enhancement",
      subtitle: "2D DICOM / X-Ray Analysis",
      description:
        "Upload medical images and apply advanced denoising, contrast enhancement, and sharpening pipelines. View real-time quantitative metrics, histograms, and side-by-side comparisons.",
      href: "/image-enhancement",
      icon: FileImage,
      color: COLORS.blue,
      gradient: "linear-gradient(135deg, #1E40AF, #3B82F6)",
      features: [
        "6-Stage Enhancement Pipeline",
        "CLAHE / Histogram Equalization",
        "Median & Gaussian Denoising",
        "Unsharp Mask Sharpening",
        "Quantitative Image Metrics",
        "Side-by-Side Comparison",
      ],
    },
    {
      title: "X-Ray Mirror AR",
      subtitle: "Live 3D Anatomical Tracking",
      description:
        "Real-time AR visualization of anatomical structures overlaid on your live camera feed. Track facial landmarks and interact with 3D skull, brain, muscle, and eye models.",
      href: "/xray-mirror",
      icon: Camera,
      color: COLORS.teal,
      gradient: "linear-gradient(135deg, #0D9488, #14B8A6)",
      features: [
        "MediaPipe Face & Hand Tracking",
        "Realistic X-Ray Shader (Fresnel)",
        "Anatomical Layer Toggles",
        "Smooth 60fps Rendering",
        "Transparency Controls",
        "Split-Screen Comparison",
      ],
    },
  ];

  const quickLinks = [
    { label: "Dashboard", href: "/dashboard", icon: Activity },
    { label: "AI Analysis", href: "/ai-analysis", icon: Globe },
    { label: "Histogram", href: "/histogram-analysis", icon: BarChart3 },
    { label: "Image Info", href: "/image-information", icon: Eye },
    { label: "Comparison", href: "/image-comparison", icon: ArrowLeftRight },
    { label: "About", href: "/about", icon: Telescope },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F2C4D 0%, #1E3A5F 50%, #0A1F33 100%)",
      color: "white",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated background particles */}
      <div style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              borderRadius: "50%",
              background: "rgba(20, 184, 166, 0.3)",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.5rem 2rem",
        backdropFilter: "blur(10px)",
        background: "rgba(15, 44, 77, 0.6)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #14B8A6, #0D9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            boxShadow: "0 4px 20px rgba(20, 184, 166, 0.3)",
          }}>
            🩻
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}>
              {APP_NAME}
            </h1>
            <p style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              {PROJECT_FULL_NAME}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.7)",
          }}>
            Welcome, <strong>{userName}</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              transition: "all 0.2s",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        position: "relative",
        zIndex: 10,
        padding: "3rem 2rem 2rem",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "0.5rem 1rem",
          borderRadius: "9999px",
          background: "rgba(20, 184, 166, 0.15)",
          border: "1px solid rgba(20, 184, 166, 0.3)",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "#14B8A6",
        }}>
          <Sparkles style={{ width: "14px", height: "14px" }} />
          v{APP_VERSION} · Educational Edition
        </div>

        <h2 style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          margin: "0 0 1rem 0",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
        }}>
          A Clearer View of<br />
          <span style={{
            background: "linear-gradient(135deg, #14B8A6, #3B82F6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Every Scan
          </span>
        </h2>

        <p style={{
          fontSize: "clamp(1rem, 2vw, 1.25rem)",
          color: "rgba(255,255,255,0.7)",
          maxWidth: "600px",
          margin: "0 auto 2rem",
          lineHeight: 1.6,
        }}>
          Advanced medical image enhancement and real-time 3D anatomical AR visualization —
          all running client-side in your browser.
        </p>
      </section>

      {/* Module Cards */}
      <section style={{
        position: "relative",
        zIndex: 10,
        padding: "0 2rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
        }}>
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                  padding: "2rem",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 20px 60px ${mod.color}30`;
                  e.currentTarget.style.borderColor = mod.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                {/* Gradient accent */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: mod.gradient,
                  borderRadius: "20px 20px 0 0",
                }} />

                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: `${mod.color}20`,
                    border: `1px solid ${mod.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <mod.icon style={{ width: "28px", height: "28px", color: mod.color }} />
                  </div>
                  <div>
                    <h3 style={{
                      margin: "0 0 0.25rem 0",
                      fontSize: "1.35rem",
                      fontWeight: 700,
                    }}>
                      {mod.title}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: mod.color,
                      fontWeight: 500,
                    }}>
                      {mod.subtitle}
                    </p>
                  </div>
                </div>

                <p style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  marginBottom: "1.25rem",
                }}>
                  {mod.description}
                </p>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                }}>
                  {mod.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.8rem",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      <Check style={{ width: "14px", height: "14px", color: mod.color }} />
                      {f}
                    </div>
                  ))}
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: mod.color,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}>
                  Launch Module <ArrowRight style={{ width: "18px", height: "18px" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section style={{
        position: "relative",
        zIndex: 10,
        padding: "0 2rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <h3 style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "1rem",
        }}>
          Quick Access
        </h3>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}>
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.6rem 1rem",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                textDecoration: "none",
                fontSize: "0.85rem",
                transition: "all 0.2s",
              }}
            >
              <link.icon style={{ width: "16px", height: "16px" }} />
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{
        position: "relative",
        zIndex: 10,
        padding: "0 2rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <div style={{
          background: "rgba(254, 249, 242, 0.1)",
          border: "1px solid rgba(254, 216, 177, 0.3)",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
        }}>
          <p style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.85rem",
            margin: 0,
            lineHeight: 1.5,
          }}>
            <strong>⚠️ EDUCATIONAL USE ONLY:</strong> {DISCLAIMER}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative",
        zIndex: 10,
        padding: "1.5rem 2rem",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.4)",
        fontSize: "0.8rem",
      }}>
        <p style={{ margin: 0 }}>
          SCANOVA Medical Image Enhancement System · v{APP_VERSION} · {PROJECT_FULL_NAME}
        </p>
        <p style={{ margin: "0.25rem 0 0 0" }}>
          3D anatomical models: BodyParts3D (CC BY-SA 2.1 Japan) · Educational use only
        </p>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}