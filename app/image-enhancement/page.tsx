"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowDownToLine, 
  ArrowLeftRight, 
  RotateCcw, 
  FileImage, 
  UploadCloud,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, SAMPLE_IMAGES, DEFAULT_SETTINGS } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { ImageStats, processImage, measureImage, ProcessingSettings } from "@/lib/image-processing";
import { useSharedImage } from "@/lib/image-context";

type Frame = { 
  url: string; 
  name: string; 
  width: number; 
  height: number; 
  size: number; 
};

const defaults: ProcessingSettings = { ...DEFAULT_SETTINGS };

const samples = [
  { label: "Chest X-ray", path: "/samples/chest_xray_demo.png", kind: "Radiograph", tone: "blue" },
  { label: "Brain MRI", path: "/samples/brain_mri_demo.png", kind: "Magnetic resonance", tone: "violet" },
  { label: "Knee CT", path: "/samples/knee_ct_demo.png", kind: "Computed tomography", tone: "teal" },
];

function canvasData(image: HTMLImageElement): ImageData {
  const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not open this image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function toDataURL(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d")?.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export default function ImageEnhancementPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { image: sharedImage, setImage: setSharedImage, clearImage: clearSharedImage } = useSharedImage();
  const [original, setOriginal] = useState<Frame | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [stats, setStats] = useState<{ before: ImageStats; after: ImageStats } | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>({ ...defaults });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // Sync shared image to local state
  useEffect(() => {
    if (sharedImage && !original) {
      setOriginal({
        url: sharedImage.url,
        name: sharedImage.name,
        width: sharedImage.width,
        height: sharedImage.height,
        size: sharedImage.size,
      });
    }
  }, [sharedImage, original]);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const loadFile = async (file: File) => {
    setError("");
    setEnhanced(null);
    setStats(null);
    
    if (file.size > 30 * 1024 * 1024) {
      setError("Choose an image under 30 MB.");
      return;
    }
    
    if (!/^image\/(png|jpeg|bmp|webp)$/i.test(file.type)) {
      setError("Use a PNG, JPG, BMP, or WebP image.");
      return;
    }
    
    try {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = url;
      await image.decode();
      
      if (image.naturalWidth < 8 || image.naturalHeight < 8 || image.naturalWidth > 8192 || image.naturalHeight > 8192) {
        URL.revokeObjectURL(url);
        setError("Image dimensions must be between 8 and 8192 pixels per side.");
        return;
      }
      
      const frame = { 
        url, 
        name: file.name, 
        width: image.naturalWidth, 
        height: image.naturalHeight, 
        size: file.size 
      };
      setOriginal(frame);
      setSharedImage(frame);
    } catch {
      setError("This image could not be decoded. Try a PNG or JPEG file.");
    }
  };

  const loadSample = async (sample: (typeof samples)[number]) => {
    setError("");
    setEnhanced(null);
    setStats(null);
    
    try {
      const response = await fetch(sample.path);
      if (!response.ok) throw new Error("Could not load sample.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();
      
      const frame = { 
        url, 
        name: `${sample.label} · Demo`, 
        width: image.naturalWidth, 
        height: image.naturalHeight, 
        size: blob.size 
      };
      setOriginal(frame);
      setSharedImage(frame);
    } catch {
      setError("The selected demo image could not be loaded.");
    }
  };

  const enhanceImage = () => {
    if (!original) return;
    setBusy(true);
    setError("");
    
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = original.width;
        canvas.height = original.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");
        
        const img = new Image();
        img.src = original.url;
        ctx.drawImage(img, 0, 0, original.width, original.height);
        const imageData = ctx.getImageData(0, 0, original.width, original.height);
        
        const result = processImage(imageData, settings);
        const enhancedDataUrl = toDataURL(result);
        const beforeStats = measureImage(imageData);
        const afterStats = measureImage(result);
        
        setEnhanced(enhancedDataUrl);
        setStats({ before: beforeStats, after: afterStats });
      } catch {
        setError("Processing did not complete. Try a smaller image or simpler settings.");
      } finally {
        setBusy(false);
      }
    }, 40);
  };

  const reset = () => {
    setOriginal(null);
    setEnhanced(null);
    setStats(null);
    setError("");
    setSettings({ ...defaults });
    if (fileRef.current) fileRef.current.value = "";
    clearSharedImage();
  };

  const download = () => {
    if (!enhanced) return;
    const link = document.createElement("a");
    link.href = enhanced;
    link.download = "scanova-enhanced.png";
    link.click();
  };

  const updateSetting = <K extends keyof ProcessingSettings>(key: K, value: ProcessingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "2rem",
    }}>
      {/* Header with Back and Logout */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        <Link href="/dashboard" style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: COLORS.blue,
          textDecoration: "none",
          fontSize: "0.9rem",
        }}>
          <ArrowLeftRight style={{ width: "16px", height: "16px" }} />
          Back to Dashboard
        </Link>
        
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            cursor: "pointer",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            borderRadius: "6px",
          }}
        >
          🚪 Logout
        </button>
      </div>

      <h1 style={{
        color: COLORS.navy,
        margin: "0 0 0.5rem 0",
        fontSize: "1.75rem",
        fontWeight: 800,
      }}>
        Image Enhancement
      </h1>
      <p style={{
        color: COLORS.muted,
        margin: "0 0 1rem 0",
      }}>
        Upload a medical image, adjust enhancement settings, then click Enhance Image to run the processing pipeline.
      </p>

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
        }}>
          <strong>⚠️ Educational Use Only</strong> — Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation.
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

      {/* Upload Section */}
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
          <p style={{
            color: COLORS.muted,
            margin: "0 0 1rem 0",
          }}>
            Drag and drop an image file or click to browse.
          </p>
          
          {!original ? (
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) loadFile(file); }}
                style={{
                  width: "100%",
                  padding: "2rem",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  background: dragging ? "#ecfdf5" : "white",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <UploadCloud style={{ width: "32px", height: "32px", color: COLORS.teal, margin: "0 auto 0.5rem" }} />
                <strong>Drop your image here, or <em>browse files</em></strong>
                <p style={{
                  color: COLORS.muted,
                  margin: "0.5rem 0 0 0",
                }}>
                  PNG, JPG, BMP, WebP · up to 30 MB · stays on device
                </p>
              </button>
              
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/bmp,image/webp"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) loadFile(file); }}
              />
              
              <div style={{ marginTop: "1.5rem" }}>
                <p style={{
                  color: COLORS.muted,
                  margin: "0 0 0.5rem 0",
                }}>
                  OR TRY A SAMPLE
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.5rem",
                }}>
                  {samples.map((sample) => (
                    <button
                      key={sample.label}
                      onClick={() => loadSample(sample)}
                      style={{
                        padding: "0.5rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        background: "white",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}>
                <FileImage style={{ width: "16px", height: "16px", color: COLORS.teal }} />
                <strong>{original.name}</strong>
              </div>
              <p style={{
                color: COLORS.muted,
                margin: 0,
              }}>
                {original.width} × {original.height} px · {(original.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={reset}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.muted,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                }}
              >
                <RotateCcw style={{ width: "14px", height: "14px", marginRight: "4px", display: "inline" }} />
                Clear image
              </button>
            </div>
          )}
        </div>

        {/* Processing Controls */}
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
            Pipeline Settings
          </h3>

          <div style={{
            display: "grid",
            gap: "1rem",
          }}>
            {/* Noise Reduction */}
            <div>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: 500,
              }}>
                Noise Reduction: {settings.noiseMethod === "median" ? "Median" : "Gaussian"}
              </label>
              <div style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}>
                <button
                  onClick={() => updateSetting("noiseMethod", "median")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: settings.noiseMethod === "median" ? `2px solid ${COLORS.blue}` : "1px solid #cbd5e1",
                    background: settings.noiseMethod === "median" ? `${COLORS.blue}10` : "white",
                    cursor: "pointer",
                    fontWeight: settings.noiseMethod === "median" ? 600 : 400,
                  }}
                >
                  Median
                </button>
                <button
                  onClick={() => updateSetting("noiseMethod", "gaussian")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: settings.noiseMethod === "gaussian" ? `2px solid ${COLORS.blue}` : "1px solid #cbd5e1",
                    background: settings.noiseMethod === "gaussian" ? `${COLORS.blue}10` : "white",
                    cursor: "pointer",
                    fontWeight: settings.noiseMethod === "gaussian" ? 600 : 400,
                  }}
                >
                  Gaussian
                </button>
              </div>
              <label style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
                color: COLORS.muted,
              }}>
                Kernel Size: {settings.kernelSize} × {settings.kernelSize}
              </label>
              <input
                type="range"
                min="3"
                max="9"
                step="2"
                value={settings.kernelSize}
                onChange={(e) => updateSetting("kernelSize", Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Contrast Enhancement */}
            <div>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: 500,
              }}>
                Contrast Enhancement: {settings.contrastMethod === "clahe" ? "CLAHE" : "Equalize"}
              </label>
              <select
                value={settings.contrastMethod}
                onChange={(e) => updateSetting("contrastMethod", e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  marginBottom: "0.5rem",
                }}
              >
                <option value="clahe">CLAHE · adaptive</option>
                <option value="equalize">Histogram equalization</option>
              </select>
              
              {settings.contrastMethod === "clahe" && (
                <>
                  <label style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                    color: COLORS.muted,
                  }}>
                    Clip Limit: {settings.clipLimit.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={settings.clipLimit}
                    onChange={(e) => updateSetting("clipLimit", Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <label style={{
                    display: "block",
                    marginTop: "0.5rem",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                    color: COLORS.muted,
                  }}>
                    Tile Grid: {settings.tileGrid} × {settings.tileGrid}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    step="2"
                    value={settings.tileGrid}
                    onChange={(e) => updateSetting("tileGrid", Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </div>

            {/* Sharpening */}
            <div>
              <label style={{
                display: "block",
                marginBottom: "0.25rem",
                fontWeight: 500,
              }}>
                Strength: {settings.sharpenStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={settings.sharpenStrength}
                onChange={(e) => updateSetting("sharpenStrength", Number(e.target.value))}
                style={{ width: "100%", marginBottom: "0.5rem" }}
              />
              <label style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
                color: COLORS.muted,
              }}>
                Blur Radius (σ): {settings.sharpenSigma.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={settings.sharpenSigma}
                onChange={(e) => updateSetting("sharpenSigma", Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Grayscale checkbox */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "#f8fafc",
              borderRadius: "8px",
            }}>
              <input
                type="checkbox"
                checked={settings.forceGrayscale}
                onChange={(e) => updateSetting("forceGrayscale", e.target.checked)}
              />
              <span style={{ fontSize: "0.9rem" }}>
                <strong>Force grayscale</strong> - Convert color images before processing
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                <RotateCcw style={{ width: "16px", height: "16px", marginRight: "4px", display: "inline" }} />
                Reset
              </button>
              
              <button
                onClick={enhanceImage}
                disabled={!original || busy}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  background: busy ? "#cbd5e1" : COLORS.blue,
                  color: "white",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {busy ? "Processing..." : (
                  <>
                    <Sparkles style={{ width: "16px", height: "16px", marginRight: "4px", display: "inline" }} />
                    Enhance Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {original && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{
            color: COLORS.navy,
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Image Preview
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}>
            {/* Original Image */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1rem",
              border: "1px solid #e2e8f0",
            }}>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.5rem 0",
              }}>
                <strong>Original</strong>
              </p>
              <img 
                src={original.url} 
                alt="Original medical scan" 
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  display: "block",
                }}
              />
            </div>

            {/* Enhanced Image */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1rem",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}>
                <p style={{
                  color: COLORS.muted,
                  margin: 0,
                }}>
                  <strong>Enhanced</strong>
                </p>
                {enhanced && (
                  <button
                    onClick={download}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      border: "none",
                      background: COLORS.teal,
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowDownToLine style={{ width: "14px", height: "14px" }} />
                    Export PNG
                  </button>
                )}
              </div>
              
              {enhanced ? (
                <div style={{ position: "relative" }}>
                  <img 
                    src={enhanced} 
                    alt="Enhanced medical scan" 
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}>
                    Enhanced Result
                  </div>
                </div>
              ) : (
                <div style={{
                  height: "280px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.muted,
                }}>
                  Your enhanced image will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Section */}
      {stats && (
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          marginBottom: "2rem",
        }}>
          <h3 style={{
            color: COLORS.navy,
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Image Analysis
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}>
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              textAlign: "center",
            }}>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.25rem 0",
                fontSize: "0.8rem",
              }}>
                Mean Pixel
              </p>
              <p style={{
                color: COLORS.text,
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 700,
              }}>
                {stats.after.mean.toFixed(1)}
              </p>
            </div>
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              textAlign: "center",
            }}>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.25rem 0",
                fontSize: "0.8rem",
              }}>
                Contrast (σ)
              </p>
              <p style={{
                color: COLORS.text,
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 700,
              }}>
                {stats.after.contrast.toFixed(1)}
              </p>
            </div>
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              textAlign: "center",
            }}>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.25rem 0",
                fontSize: "0.8rem",
              }}>
                Entropy
              </p>
              <p style={{
                color: COLORS.text,
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 700,
              }}>
                {stats.after.entropy.toFixed(2)}
              </p>
            </div>
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              textAlign: "center",
            }}>
              <p style={{
                color: COLORS.muted,
                margin: "0 0 0.25rem 0",
                fontSize: "0.8rem",
              }}>
                Sharpness
              </p>
              <p style={{
                color: COLORS.text,
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 700,
              }}>
                {stats.after.sharpness.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}