"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowDownToLine, 
  ArrowLeftRight, 
  Check, 
  ChevronDown, 
  FileImage, 
  ImagePlus, 
  RotateCcw, 
  Sparkles,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, SAMPLE_IMAGES, DEFAULT_SETTINGS } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { ImageStats, processImage, measureImage, ProcessingSettings } from "@/lib/image-processing";

type Frame = { 
  url: string; 
  name: string; 
  width: number; 
  height: number; 
  size: number; 
};

const defaults: ProcessingSettings = { ...DEFAULT_SETTINGS };

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

export default function ScanovaWorkspace() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<Frame | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [stats, setStats] = useState<{ before: ImageStats; after: ImageStats } | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>({ ...defaults });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

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
      
      setOriginal({ 
        url, 
        name: file.name, 
        width: image.naturalWidth, 
        height: image.naturalHeight, 
        size: file.size 
      });
    } catch {
      setError("This image could not be decoded. Try a PNG or JPEG file.");
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
    
    localStorage.removeItem("scanova-image-data");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "2rem",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        <h1 style={{
          color: COLORS.navy,
          margin: 0,
        }}>
          {APP_NAME}
        </h1>
        <button onClick={handleLogout} style={{
          padding: "0.5rem 1rem",
          border: "none",
          background: COLORS.blue,
          color: "white",
          borderRadius: "6px",
          cursor: "pointer",
        }}>
          Logout
        </button>
      </div>

      <p style={{ color: COLORS.muted, marginBottom: "2rem" }}>
        {APP_VERSION} · A Clearer View of Every Scan
      </p>

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
          }}>
            Upload Image
          </h3>
          
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
                <p style={{ color: COLORS.muted, margin: "0.5rem 0 0 0" }}>
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
          }}>
            Pipeline Settings
          </h3>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ fontWeight: 500 }}>Noise Reduction: {settings.noiseMethod}</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select 
                  value={settings.noiseMethod}
                  onChange={(e) => setSettings(prev => ({ ...prev, noiseMethod: e.target.value as any }))}
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="median">Median</option>
                  <option value="gaussian">Gaussian</option>
                </select>
              </div>
              <label style={{ fontSize: "0.85rem", color: COLORS.muted }}>
                Kernel Size: {settings.kernelSize}
              </label>
              <input
                type="range"
                min="3"
                max="9"
                step="2"
                value={settings.kernelSize}
                onChange={(e) => setSettings(prev => ({ ...prev, kernelSize: Number(e.target.value) }))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 500 }}>Contrast Enhancement: {settings.contrastMethod}</label>
              <select
                value={settings.contrastMethod}
                onChange={(e) => setSettings(prev => ({ ...prev, contrastMethod: e.target.value as any }))}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="clahe">CLAHE</option>
                <option value="equalize">Equalize</option>
              </select>
              <label style={{ fontSize: "0.85rem", color: COLORS.muted }}>
                Clip Limit: {settings.clipLimit}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={settings.clipLimit}
                onChange={(e) => setSettings(prev => ({ ...prev, clipLimit: Number(e.target.value) }))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 500 }}>Sharpening Strength: {settings.sharpenStrength}</label>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={settings.sharpenStrength}
                onChange={(e) => setSettings(prev => ({ ...prev, sharpenStrength: Number(e.target.value) }))}
                style={{ width: "100%" }}
              />
            </div>

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
                  fontWeight: 600,
                }}
              >
                {busy ? "Processing..." : (
                  <>
                    <Sparkles style={{ width: "16px", height: "16px", marginRight: "4px", display: "inline" }} />
                    Enhance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {original && (
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          marginBottom: "2rem",
        }}>
          <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Results</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Original</p>
              {original?.url && (
                <img src={original.url} alt="Original" style={{ maxWidth: "100%", borderRadius: "8px" }} />
              )}
            </div>
            <div>
              <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Enhanced</p>
              {enhanced ? (
                <img src={enhanced} alt="Enhanced" style={{ maxWidth: "100%", borderRadius: "8px" }} />
              ) : (
                <div style={{ minHeight: "200px", background: "#f8fafc", borderRadius: "8px" }}>
                  Enhanced image will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {DISCLAIMER && (
        <div style={{
          background: "#fef9f2",
          border: "1px solid #fed8b1",
          borderRadius: "8px",
          padding: "1rem",
        }}>
          <p style={{ color: COLORS.text, fontSize: "0.85rem", margin: 0 }}>
            <strong>⚠️ Educational Use Only</strong> — Enhanced images are NOT guaranteed to be diagnostically superior.
          </p>
        </div>
      )}
    </div>
  );
}