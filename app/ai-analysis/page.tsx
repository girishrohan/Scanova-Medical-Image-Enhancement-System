"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowLeftRight, 
  BarChart3, 
  Check, 
  Crown, 
  FileImage, 
  Globe, 
  ShieldCheck, 
  UploadCloud,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";
import { analyzeImage, type AnalysisResult } from "@/lib/ai-analysis";

export default function AIAnalysisPage() {
  const router = useRouter();
  const { image: sharedImage, setImage: setSharedImage } = useSharedImage();
  const [image, setImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

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
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setAnalysisResult(null);
      setSharedImage({
        url,
        name: file.name,
        width: 0,
        height: 0,
        size: file.size,
      });
    }
  };

  const runAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      const result = await analyzeImage(image);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try a different image or check the file format.");
    } finally {
      setAnalyzing(false);
    }
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
            AI Analysis
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            Body part identification and visual feature analysis
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
        background: "#fef9f2",
        border: "1px solid #fed8b1",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1.5rem",
      }}>
        <p style={{
          color: COLORS.text,
          margin: 0,
          fontSize: "0.85rem",
          lineHeight: 1.5,
        }}>
          <strong>⚠️ Educational Use Only</strong> — AI analysis aids are investigational and must NOT replace professional medical interpretation. This tool highlights visual features for educational review only.
        </p>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          color: "#dc2626",
        }}>
          {error}
        </div>
      )}

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
            Upload Image for AI Analysis
          </h3>
          
          <div style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: "#f8fafc",
          }}>
            <UploadCloud style={{ width: "32px", height: "32px", color: COLORS.teal, margin: "0 auto 0.5rem" }} />
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: 500 }}>
              Click to upload medical image
            </p>
            <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>
              PNG, JPG, BMP, WebP files up to 30 MB
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ width: "100%", padding: "0.5rem", marginTop: "1rem" }}
            />
          </div>

          {image && (
            <div style={{ marginTop: "1.5rem" }}>
              <p style={{ color: COLORS.muted, margin: "0 0 0.5rem 0" }}>Preview:</p>
              <img 
                src={image} 
                alt="Uploaded for analysis" 
                style={{
                  maxWidth: "100%",
                  maxHeight: "200px",
                  objectFit: "contain",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                style={{
                  marginTop: "1rem",
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  background: analyzing ? "#cbd5e1" : COLORS.teal,
                  color: "white",
                  fontWeight: 600,
                  cursor: analyzing ? "not-allowed" : "pointer",
                }}
              >
                {analyzing ? "Analyzing..." : "Run AI Analysis"}
              </button>
            </div>
          )}
        </div>

        {/* Controls & Results */}
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
              Analysis Options
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}>
                <input type="checkbox" defaultChecked />
                <span>Body Part Identification</span>
              </label>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}>
                <input type="checkbox" defaultChecked />
                <span>Abnormality Detection</span>
              </label>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}>
                <input type="checkbox" />
                <span>Report Generation</span>
              </label>
            </div>
          </div>

          {/* Results */}
          {analysisResult && (
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
                Analysis Results
              </h3>

              {/* Body Region */}
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}>
                <span style={{ fontSize: "1.2rem" }}>🩻</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: COLORS.navy, fontSize: "0.9rem" }}>
                    Likely Body Region: {analysisResult.bodyRegion}
                  </p>
                  <p style={{ margin: "0.25rem 0 0 0", color: COLORS.muted, fontSize: "0.75rem" }}>
                    Confidence: {analysisResult.bodyRegionConfidence} — This is an estimate based on image proportions and features.
                  </p>
                </div>
              </div>

              {/* Urgent Finding Alert */}
              {analysisResult.urgentFinding && (
                <div style={{
                  background: "#fef2f2",
                  border: "2px solid #dc2626",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}>
                  <p style={{
                    color: "#dc2626",
                    margin: "0 0 0.25rem 0",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}>
                    ⚠️ Urgent Visual Finding
                  </p>
                  <p style={{
                    color: "#7f1d1d",
                    margin: 0,
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}>
                    {analysisResult.urgentFinding}
                  </p>
                </div>
              )}

              {/* Plain-language findings */}
              <h4 style={{
                color: COLORS.text,
                margin: "0 0 0.5rem 0",
                fontSize: "0.9rem",
              }}>
                What We Found
              </h4>
              <ul style={{
                color: COLORS.muted,
                margin: "0 0 1rem 0",
                paddingLeft: "1.25rem",
                listStyle: "none",
              }}>
                {analysisResult.findings.map((finding: any, idx: number) => (
                  <li key={idx} style={{
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    lineHeight: 1.5,
                  }}>
                    <span style={{
                      color: finding.risk === "high" ? "#dc2626" : finding.risk === "medium" ? COLORS.warning : COLORS.success,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {finding.risk === "high" ? "⚠" : finding.risk === "medium" ? "●" : "✓"}
                    </span>
                    <span style={{ fontSize: "0.875rem" }}>
                      {finding.type}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Summary */}
              <p style={{
                color: COLORS.muted,
                margin: "0 0 1rem 0",
                fontSize: "0.85rem",
                lineHeight: 1.6,
              }}>
                {analysisResult.summary}
              </p>

              <p style={{
                color: COLORS.muted,
                margin: "0 0 1rem 0",
                fontSize: "0.8rem",
              }}>
                Processing Time: {analysisResult.processingTime}
              </p>

              {/* Collapsible Technical Details */}
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                style={{
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: COLORS.muted,
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Technical Details</span>
                <span>{showTechnical ? "▲" : "▼"}</span>
              </button>

              {showTechnical && (
                <div style={{ marginTop: "0.75rem" }}>
                  <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                    {[
                      { label: "Dimensions", value: analysisResult.metrics.width + " x " + analysisResult.metrics.height },
                      { label: "Mean Intensity", value: analysisResult.metrics.meanIntensity.toFixed(1) },
                      { label: "Std Deviation", value: analysisResult.metrics.stdDev.toFixed(1) },
                      { label: "Edge Density", value: (analysisResult.metrics.edgeDensity * 100).toFixed(1) + "%" },
                      { label: "Contrast", value: (analysisResult.metrics.contrast * 100).toFixed(1) + "%" },
                      { label: "Entropy", value: analysisResult.metrics.entropy.toFixed(2) },
                      { label: "Dark Pixels", value: (analysisResult.metrics.darkPixelRatio * 100).toFixed(1) + "%" },
                      { label: "Bright Pixels", value: (analysisResult.metrics.brightPixelRatio * 100).toFixed(1) + "%" },
                    ].map((m) => (
                      <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                        <span style={{ color: COLORS.muted }}>{m.label}</span>
                        <span style={{ fontWeight: 500 }}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Detailed Findings</h4>
                  <ul style={{
                    color: COLORS.muted,
                    margin: "0 0 1rem 0",
                    paddingLeft: "1.25rem",
                    fontSize: "0.8rem",
                  }}>
                    {analysisResult.findings.map((finding: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: "0.25rem" }}>
                        {finding.type} ({finding.confidence}% confidence, risk: {finding.risk})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div style={{
                background: analysisResult.urgentFinding ? "#fef2f2" : "#f0f9ff",
                border: `1px solid ${analysisResult.urgentFinding ? "#fecaca" : "#bae6fd"}`,
                borderRadius: "8px",
                padding: "1rem",
                marginTop: "1rem",
              }}>
                <p style={{
                  color: analysisResult.urgentFinding ? "#dc2626" : COLORS.navy,
                  margin: "0 0 0.5rem 0",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}>
                  {analysisResult.urgentFinding ? "⚠️ Action Recommended" : "📋 Observation Summary"}
                </p>
                <p style={{
                  color: COLORS.muted,
                  margin: 0,
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                }}>
                  {analysisResult.recommendations}
                </p>
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
          <strong>⚠️ Important:</strong> Clinical use requires appropriate validation and qualified medical oversight. 
          Regulatory approval required for clinical deployment.
        </p>
      </div>
    </div>
  );
}