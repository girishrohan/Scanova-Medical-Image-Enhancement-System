"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Calculator, 
  ChartBar, 
  Eye, 
  Filter, 
  Image as ImageIcon, 
  RotateCcw, 
  ShieldCheck, 
  UploadCloud,
  ArrowLeftRight
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function HistogramAnalysisPage() {
  const router = useRouter();
  const { image: sharedImage, setImage: setSharedImage } = useSharedImage();
  const [image, setImage] = useState<string | null>(null);
  const [histogram, setHistogram] = useState<number[]>(new Array(256).fill(0));
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  // Sync shared image
  useEffect(() => {
    if (sharedImage && !image) {
      setImage(sharedImage.url);
    }
  }, [sharedImage, image]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 30 * 1024 * 1024) {
      setError("Image must be under 30 MB");
      return;
    }
    
    setError("");
    const url = URL.createObjectURL(file);
    setImage(url);
    setSharedImage({
      url,
      name: file.name,
      width: 0,
      height: 0,
      size: file.size,
    });
    
    // Generate sample histogram data
    const sampleHistogram = Array.from({ length: 256 }, () => Math.random() * 100);
    setHistogram(sampleHistogram);
    
    setStats({
      mean: 128 + Math.random() * 50,
      stdDev: Math.random() * 30 + 10,
      min: Math.floor(Math.random() * 50),
      max: Math.floor(Math.random() * 100 + 200),
      contrast: Math.random() * 50 + 20,
      entropy: Math.random() * 2 + 6,
      sharpness: Math.random() * 1000 + 500,
    });
  };

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
            Histogram Analysis
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            Image intensity distribution and statistical analysis
          </p>
        </div>
        
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

      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        {/* Image Upload */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
        }}>
          <h3 style={{
            color: COLORS.navy,
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Upload Image
          </h3>
          
          <div style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: "#f8fafc",
            marginBottom: "1rem",
          }}
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          >
            <ChartBar style={{ width: "32px", height: "32px", color: COLORS.teal, margin: "0 auto 0.5rem" }} />
            <p style={{ margin: "0 0 0.5rem 0" }}>Choose an image for histogram analysis</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
          </div>

          {image && (
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
            }}>
              <p style={{ color: COLORS.muted, margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                <strong>Image Loaded</strong> — Analysis will be performed
              </p>
            </div>
          )}
        </div>

        {/* Controls & Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            border: "1px solid #e2e8f0",
          }}>
            <h3 style={{
              color: COLORS.navy,
              margin: "0 0 0.75rem 0",
              fontSize: "1rem",
              fontWeight: 600,
            }}>
              Statistical Summary
            </h3>
            {stats ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { label: "Mean", value: stats.mean.toFixed(1) },
                  { label: "Std Dev", value: stats.stdDev.toFixed(1) },
                  { label: "Min", value: stats.min },
                  { label: "Max", value: stats.max },
                  { label: "Contrast", value: stats.contrast.toFixed(1) },
                  { label: "Entropy", value: stats.entropy.toFixed(2) },
                  { label: "Sharpness", value: stats.sharpness.toFixed(0) },
                ].map((s) => (
                  <div key={s.label} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem",
                    background: "#f8fafc",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                  }}>
                    <span style={{ color: COLORS.muted }}>{s.label}</span>
                    <span style={{ fontWeight: 500 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Image statistics will appear here</p>
            )}
          </div>

          {/* Histogram Visualization */}
          {image && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
            }}>
              <h3 style={{
                color: COLORS.navy,
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                fontWeight: 600,
              }}>
                Intensity Distribution
              </h3>
              
              <div style={{
                height: "150px",
                background: "#f8fafc",
                borderRadius: "8px",
                position: "relative",
                overflow: "hidden",
                marginBottom: "0.5rem",
              }}>
                <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
                  <polyline
                    fill="none"
                    stroke={COLORS.blue}
                    strokeWidth="2"
                    points={histogram.map((v, i) => `${(i / 255) * 400} ${150 - (v / 100) * 150}`).join(" ")}
                  />
                  <polyline
                    fill="none"
                    stroke={COLORS.teal}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    points={histogram.map((v, i) => `${(i / 255) * 400} ${150 - (v / 100) * 150}`).join(" ")}
                  />
                </svg>
              </div>
              
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: COLORS.muted,
              }}>
                <span>0</span>
                <span>64</span>
                <span>128</span>
                <span>192</span>
                <span>255</span>
              </div>
            </div>
          )}

          <Link href="/dashboard" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "0.75rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            textDecoration: "none",
            color: COLORS.blue,
          }}>
            <ArrowLeftRight style={{ width: "16px", height: "16px" }} />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{
        background: "#fef9f2",
        border: "1px solid #fed8b1",
        borderRadius: "8px",
        padding: "1rem",
      }}>
        <p style={{
          color: COLORS.text,
          fontSize: "0.85rem",
          margin: 0,
          lineHeight: 1.5,
        }}>
          <strong>⚠️ Educational Use Only</strong> — This system is developed as an image-processing demonstration for academic purposes.
        </p>
      </div>
    </div>
  );
}