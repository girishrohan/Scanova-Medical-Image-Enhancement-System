"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowLeftRight, 
  BarChart3, 
  FileImage, 
  Globe, 
  ImagePlay, 
  Search, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Camera,
  Check,
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, SAMPLE_IMAGES } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function DashboardPage() {
  const router = useRouter();
  const { hasImage, image } = useSharedImage();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
    setUserName(auth.username);
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const stats = [
    { label: "Images Uploaded", value: hasImage ? "1" : "0", icon: FileImage, color: hasImage ? COLORS.success : COLORS.muted },
    { label: "Enhanced", value: hasImage ? "1" : "0", icon: ImagePlay, color: hasImage ? COLORS.teal : COLORS.muted },
    { label: "AI Analyzed", value: "0", icon: Globe, color: COLORS.muted },
    { label: "Reports Generated", value: "0", icon: Search, color: COLORS.muted },
  ];

  const modules = [
    {
      title: "Image Enhancement",
      subtitle: "2D scan processing",
      description: "Upload a medical scan and apply denoising, contrast enhancement, and sharpening. View quantitative metrics and side-by-side comparisons.",
      href: "/image-enhancement",
      icon: FileImage,
      accent: COLORS.blue,
      features: ["6-stage enhancement pipeline", "CLAHE / histogram equalization", "Median & Gaussian denoising", "Unsharp-mask sharpening", "Quantitative metrics"],
    },
    {
      title: "X-Ray Mirror AR",
      subtitle: "Live anatomical tracking",
      description: "Real-time 3D anatomical visualization overlaid on your camera feed. Track facial landmarks and explore skull, brain, muscle, and eye models.",
      href: "/xray-mirror",
      icon: Camera,
      accent: COLORS.teal,
      features: ["MediaPipe face & hand tracking", "X-Ray shader with edge glow", "Anatomical layer toggles", "Transparency controls", "Split-screen comparison"],
    },
  ];

  const quickLinks = [
    { label: "AI Analysis", href: "/ai-analysis" },
    { label: "Histogram", href: "/histogram-analysis" },
    { label: "Image Info", href: "/image-information" },
    { label: "Comparison", href: "/image-comparison" },
    { label: "About", href: "/about" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "2rem",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        <div>
          <h1 style={{
            color: COLORS.navy,
            margin: "0 0 0.5rem 0",
            fontSize: "1.75rem",
            fontWeight: 800,
          }}>
            {APP_NAME} Dashboard
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            Welcome back, <strong>{userName}</strong> · Version {APP_VERSION}
          </p>
        </div>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}>
          <ShieldCheck style={{
            color: COLORS.teal,
            width: "20px",
            height: "20px",
          }} />
          <span style={{
            fontSize: "0.85rem",
            color: COLORS.muted,
          }}>
            Educational Edition
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1.5rem 0" }} />

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
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
        }}>
          <Check style={{ width: "16px", height: "16px", color: "#059669" }} />
          <span style={{ color: "#065f46" }}>
            Active scan: <strong>{image.name}</strong> ({image.width} × {image.height})
          </span>
        </div>
      )}

      {/* Overview Stats */}
      <h2 style={{
        color: COLORS.navy,
        margin: "0 0 1rem 0",
        fontSize: "1.25rem",
        fontWeight: 700,
      }}>
        Overview
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: `${stat.color}10`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <stat.icon style={{ width: "24px", height: "24px", color: stat.color }} />
            </div>
            <div>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.25rem 0",
                fontSize: "0.85rem",
              }}>
                {stat.label}
              </p>
              <p style={{
                color: COLORS.text,
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 700,
              }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <h2 style={{
        color: COLORS.navy,
        margin: "0 0 1rem 0",
        fontSize: "1.25rem",
        fontWeight: 700,
      }}>
        Modules
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem",
      }}>
        {modules.map((mod) => (
          <Link
            key={mod.title}
            href={mod.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              background: "white",
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
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                    {mod.title}
                  </h3>
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
      </div>

      {/* Quick links */}
      <h2 style={{
        color: COLORS.navy,
        margin: "0 0 1rem 0",
        fontSize: "1.25rem",
        fontWeight: 700,
      }}>
        Quick Access
      </h2>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginBottom: "2rem",
      }}>
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

      {/* Disclaimer */}
      <div style={{
        background: "#fef9f2",
        border: "1px solid #fed8b1",
        borderRadius: "8px",
        padding: "1rem",
        marginTop: "auto",
      }}>
        <p style={{
          color: COLORS.text,
          margin: 0,
          fontSize: "0.85rem",
          lineHeight: 1.5,
        }}>
          <strong>⚠️ Educational Use Only</strong> — This system is developed as an image-processing demonstration for academic purposes. Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation. Clinical use requires appropriate validation and qualified medical oversight.
        </p>
      </div>
    </div>
  );
}