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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, SAMPLE_IMAGES } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
    setUserName(auth.username);
    
    const imageData = localStorage.getItem("scanova-image-data");
    if (imageData) {
      setHasImage(true);
    }
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

  const actions = [
    { label: "Enhance Image", description: "Upload and process medical images", href: "/image-enhancement", color: COLORS.blue },
    { label: "AI Analysis", description: "Body part identification and abnormality detection", href: "/ai-analysis", color: COLORS.teal },
    { label: "X-Ray Mirror", description: "Real-time anatomical visualization with AR", href: "/xray-mirror", color: COLORS.teal },
    { label: "Image Comparison", description: "Compare original vs enhanced side by side", href: "/image-comparison", color: COLORS.navy },
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

      {/* Quick Actions */}
      <h2 style={{
        color: COLORS.navy,
        margin: "0 0 1rem 0",
        fontSize: "1.25rem",
        fontWeight: 700,
      }}>
        Quick Actions
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${action.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Activity style={{
                    width: "20px",
                    height: "20px",
                    color: COLORS.teal,
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: COLORS.navy,
                    margin: "0 0 0.5rem 0",
                    fontSize: "1rem",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}>
                    {action.label}
                  </h3>
                  <p style={{
                    color: COLORS.muted,
                    margin: 0,
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                  }}>
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
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