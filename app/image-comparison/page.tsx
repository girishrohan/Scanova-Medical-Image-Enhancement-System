"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeftRight, 
  ArrowUpDown, 
  BarChart3, 
  Check, 
  FileImage, 
  RotateCcw, 
  SlidersHorizontal,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function ImageComparisonPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { image: sharedImage, setImage: setSharedImage } = useSharedImage();
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
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
    if (sharedImage && !original) {
      setOriginal(sharedImage.url);
    }
  }, [sharedImage, original]);

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
    setOriginal(url);
    setEnhanced(null);
    setSharedImage({
      url,
      name: file.name,
      width: 0,
      height: 0,
      size: file.size,
    });
  };

  const loadSample = (sample: string) => {
    setOriginal(sample);
    setEnhanced(null);
  };

  const runEnhancement = () => {
    if (!original) return;
    // In a real app, this would process the image
    setEnhanced(original);
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
            Image Comparison
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            Compare original vs enhanced side by side
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
            Upload Images
          </h3>
          
          {!original ? (
            <div style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
              background: "#f8fafc",
              marginBottom: "1rem",
            }}
            onClick={() => fileRef.current?.click()}
            >
              <UploadCloud style={{ width: "32px", height: "32px", color: COLORS.teal, margin: "0 auto 0.5rem" }} />
              <p style={{ margin: "0 0 0.5rem 0" }}>Choose images to compare</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="sr-only"
              />
            </div>
          ) : (
            <div style={{ padding: "0.75rem 1rem", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "0.85rem", color: "#065f46", marginBottom: "1rem" }}>
              Using active scan from shared workspace.
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <p style={{ color: COLORS.muted, margin: "0 0 0.5rem 0" }}>Sample Images:</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => loadSample("/samples/chest_xray_demo.png")} style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}>Chest X-Ray</button>
              <button onClick={() => loadSample("/samples/brain_mri_demo.png")} style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}>Brain MRI</button>
              <button onClick={() => loadSample("/samples/knee_ct_demo.png")} style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}>Knee CT</button>
            </div>
          </div>

          {original && (
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FileImage style={{ width: "16px", height: "16px", color: COLORS.teal }} />
                <strong>Image Loaded</strong>
              </div>
              <p style={{ color: COLORS.muted, fontSize: "0.85rem", margin: 0 }}>
                Click "Run Enhancement" to compare before/after
              </p>
              <button
                onClick={runEnhancement}
                disabled={enhanced !== null}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  background: enhanced !== null ? "#cbd5e1" : COLORS.blue,
                  color: "white",
                  fontWeight: 600,
                  cursor: enhanced !== null ? "not-allowed" : "pointer",
                }}
              >
                Run Enhancement
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              Comparison Mode
            </h3>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ color: COLORS.muted, fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                Split Ratio
              </label>
              <input
                type="range"
                min="30"
                max="70"
                value={splitRatio}
                onChange={(e) => setSplitRatio(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: COLORS.muted }}>
                <span>Original</span>
                <span>{splitRatio}%</span>
                <span>Enhanced</span>
              </div>
            </div>
          </div>

          {/* Comparison View */}
          {original && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1rem",
              border: "1px solid #e2e8f0",
            }}>
              <h3 style={{
                color: COLORS.navy,
                margin: "0 0 0.75rem 0",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}>
                Comparison Results
              </h3>
              
              <div style={{
                position: "relative",
                height: "300px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}>
                {original && (
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}>
                    <img 
                      src={original} 
                      alt="Original" 
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: `${splitRatio}%`,
                      height: "100%",
                      background: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}>
                      Original
                    </div>
                    {enhanced && (
                      <div style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        width: `${100 - splitRatio}%`,
                        height: "100%",
                        background: "rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                      }}>
                        Enhanced
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "1rem" }}>
                <Link href="/image-enhancement" style={{
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
                  Full Enhancement Tool
                </Link>
              </div>
            </div>
          )}
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