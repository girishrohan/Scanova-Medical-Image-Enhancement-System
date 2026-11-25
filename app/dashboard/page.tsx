"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  BarChart3,
  Check,
  FileImage,
  Image as ImageIcon,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, SAMPLE_IMAGES, DEFAULT_SETTINGS, TECH_STACK, PROJECT_FULL_NAME } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";
import { ImageStats, processImage, measureImage, ProcessingSettings } from "@/lib/image-processing";
import { analyzeImage, type AnalysisResult } from "@/lib/ai-analysis";

type Frame = {
  url: string;
  name: string;
  width: number;
  height: number;
  size: number;
};

const defaults: ProcessingSettings = { ...DEFAULT_SETTINGS };

const samples = [
  { label: "Chest X-ray", path: "/samples/chest_xray_demo.png", kind: "Radiograph" },
  { label: "Brain MRI", path: "/samples/brain_mri_demo.png", kind: "Magnetic resonance" },
  { label: "Knee CT", path: "/samples/knee_ct_demo.png", kind: "Computed tomography" },
];

function toDataURL(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d")?.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export default function DashboardPage() {
  const router = useRouter();
  const { image: sharedImage, setImage: setSharedImage, clearImage: clearSharedImage } = useSharedImage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState("User");
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("enhance");

  // Enhancement state
  const [original, setOriginal] = useState<Frame | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [stats, setStats] = useState<{ before: ImageStats; after: ImageStats } | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>({ ...defaults });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // Histogram / info state
  const [histogram, setHistogram] = useState<number[]>(new Array(256).fill(0));
  const [imgStats, setImgStats] = useState<ImageStats | null>(null);
  const [mimeType, setMimeType] = useState("");

  // AI state
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showTech, setShowTech] = useState(false);

  // Comparison state
  const [splitRatio, setSplitRatio] = useState(50);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
    setUserName(auth.username);
    setAuthChecked(true);
  }, [router]);

  const computeImageMetrics = async (url: string) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const m = measureImage(imageData);
      setImgStats(m);
      const hist = new Array(256).fill(0);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        hist[v]++;
      }
      const max = Math.max(...hist, 1);
      setHistogram(hist.map((v) => (v / max) * 100));
    } catch {
      // ignore
    }
  };

  // Sync shared image -> local
  useEffect(() => {
    if (sharedImage && !original) {
      const frame: Frame = {
        url: sharedImage.url,
        name: sharedImage.name,
        width: sharedImage.width,
        height: sharedImage.height,
        size: sharedImage.size,
      };
      setOriginal(frame);
      computeImageMetrics(sharedImage.url);
    }
  }, [sharedImage, original]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const loadFile = async (file: File) => {
    setError("");
    setEnhanced(null);
    setStats(null);
    setAiResult(null);

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

      const frame: Frame = {
        url,
        name: file.name,
        width: image.naturalWidth,
        height: image.naturalHeight,
        size: file.size,
      };
      setOriginal(frame);
      setSharedImage(frame);
      setMimeType(file.type);
      computeImageMetrics(url);
    } catch {
      setError("This image could not be decoded. Try a PNG or JPEG file.");
    }
  };

  const loadSample = async (sample: (typeof samples)[number]) => {
    setError("");
    setEnhanced(null);
    setStats(null);
    setAiResult(null);

    try {
      const response = await fetch(sample.path);
      if (!response.ok) throw new Error("Could not load sample.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();

      const frame: Frame = {
        url,
        name: `${sample.label} · Demo`,
        width: image.naturalWidth,
        height: image.naturalHeight,
        size: blob.size,
      };
      setOriginal(frame);
      setSharedImage(frame);
      setMimeType(blob.type || "image/png");
      computeImageMetrics(url);
    } catch {
      setError("The selected demo image could not be loaded.");
    }
  };

  const replaceScan = () => {
    fileRef.current?.click();
  };

  const clearScan = () => {
    setOriginal(null);
    setEnhanced(null);
    setStats(null);
    setAiResult(null);
    setImgStats(null);
    setHistogram(new Array(256).fill(0));
    setError("");
    clearSharedImage();
    if (fileRef.current) fileRef.current.value = "";
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

  const runAnalysis = async () => {
    if (!original) return;
    setAnalyzing(true);
    setError("");
    setAiResult(null);
    try {
      const result = await analyzeImage(original.url);
      setAiResult(result);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try a different image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const download = () => {
    if (!enhanced) return;
    const link = document.createElement("a");
    link.href = enhanced;
    link.download = "scanova-enhanced.png";
    link.click();
  };

  const updateSetting = <K extends keyof ProcessingSettings>(key: K, value: ProcessingSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ color: "#475569", fontSize: "0.9rem" }}>Loading workspace…</div>
      </div>
    );
  }

  const tabs = [
    { id: "enhance", label: "Enhancement", icon: Sparkles },
    { id: "comparison", label: "Comparison", icon: ArrowLeftRight },
    { id: "histogram", label: "Histogram", icon: BarChart3 },
    { id: "info", label: "Image Info", icon: FileImage },
    { id: "ai", label: "AI Analysis", icon: Search },
    { id: "about", label: "About", icon: ShieldCheck },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.background, padding: "1.5rem" }}>
      {/* Top toolbar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}>
        <div>
          <h1 style={{ color: COLORS.navy, margin: "0 0 0.25rem 0", fontSize: "1.5rem", fontWeight: 800 }}>
            {APP_NAME} Workspace
          </h1>
          <p style={{ color: COLORS.muted, margin: 0, fontSize: "0.85rem" }}>
            Welcome back, <strong>{userName}</strong> · v{APP_VERSION}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {original && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.75rem",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "#065f46",
            }}>
              <Check style={{ width: "14px", height: "14px", color: "#059669" }} />
              <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {original.name} ({original.width}×{original.height})
              </span>
            </div>
          )}

          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/bmp,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
          />

          <button
            onClick={replaceScan}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: `1px solid ${COLORS.blue}`,
              background: "white",
              color: COLORS.blue,
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <UploadCloud style={{ width: "16px", height: "16px" }} />
            {original ? "Replace Scan" : "Select Image"}
          </button>

          {original && (
            <button
              onClick={clearScan}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                color: COLORS.muted,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Clear
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background: COLORS.blue,
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: "0.5rem",
      }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px 8px 0 0",
                border: "none",
                borderBottom: active ? `2px solid ${COLORS.blue}` : "2px solid transparent",
                background: active ? `${COLORS.blue}10` : "transparent",
                color: active ? COLORS.blue : COLORS.muted,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: active ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Icon style={{ width: "16px", height: "16px" }} />
              {t.label}
            </button>
          );
        })}
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

      {/* Tab content */}
      <div style={{ minHeight: "400px" }}>
        {/* ENHANCEMENT TAB */}
        {tab === "enhance" && (
          <div>
            {!original ? (
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "2rem",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}>
                <UploadCloud style={{ width: "48px", height: "48px", color: COLORS.teal, margin: "0 auto 1rem" }} />
                <h3 style={{ color: COLORS.navy, margin: "0 0 0.5rem 0" }}>Select a medical scan to begin</h3>
                <p style={{ color: COLORS.muted, margin: "0 0 1.5rem 0" }}>
                  Drag & drop or browse. PNG, JPG, BMP, WebP · up to 30 MB · stays on device
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
                  style={{
                    width: "100%",
                    maxWidth: "480px",
                    padding: "2rem",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "12px",
                    background: dragging ? "#ecfdf5" : "white",
                    cursor: "pointer",
                    margin: "0 auto 1.5rem",
                    display: "block",
                  }}
                >
                  <strong>Drop your image here, or <em>browse files</em></strong>
                </button>

                <p style={{ color: COLORS.muted, margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>OR TRY A SAMPLE</p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {samples.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => loadSample(s)}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        background: "white",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                {/* Image + results */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Image Preview</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <p style={{ color: COLORS.muted, fontSize: "0.85rem", margin: "0 0 0.5rem 0" }}><strong>Original</strong></p>
                        <img src={original.url} alt="Original" style={{ maxWidth: "100%", borderRadius: "8px", display: "block" }} />
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <p style={{ color: COLORS.muted, fontSize: "0.85rem", margin: 0 }}><strong>Enhanced</strong></p>
                          {enhanced && (
                            <button
                              onClick={download}
                              style={{
                                padding: "0.4rem 0.75rem",
                                borderRadius: "6px",
                                border: "none",
                                background: COLORS.teal,
                                color: "white",
                                cursor: "pointer",
                                fontSize: "0.8rem",
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
                          <img src={enhanced} alt="Enhanced" style={{ maxWidth: "100%", borderRadius: "8px", display: "block" }} />
                        ) : (
                          <div style={{ minHeight: "200px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>
                            Enhanced image will appear here
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {stats && (
                    <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                      <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Image Analysis</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                        {[
                          { label: "Mean Pixel", value: stats.after.mean.toFixed(1) },
                          { label: "Contrast (σ)", value: stats.after.contrast.toFixed(1) },
                          { label: "Entropy", value: stats.after.entropy.toFixed(2) },
                          { label: "Sharpness", value: stats.after.sharpness.toFixed(0) },
                        ].map((m) => (
                          <div key={m.label} style={{ background: "#f8fafc", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
                            <p style={{ color: COLORS.muted, margin: "0 0 0.25rem 0", fontSize: "0.8rem" }}>{m.label}</p>
                            <p style={{ color: COLORS.text, margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Pipeline Settings</h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {/* Noise */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                        Denoising: {settings.noiseMethod === "median" ? "Median" : "Gaussian"}
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        {(["median", "gaussian"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => updateSetting("noiseMethod", m)}
                            style={{
                              padding: "0.5rem 1rem",
                              borderRadius: "6px",
                              border: settings.noiseMethod === m ? `2px solid ${COLORS.blue}` : "1px solid #cbd5e1",
                              background: settings.noiseMethod === m ? `${COLORS.blue}10` : "white",
                              cursor: "pointer",
                              fontWeight: settings.noiseMethod === m ? 600 : 400,
                              textTransform: "capitalize",
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: COLORS.muted }}>
                        Kernel Size: {settings.kernelSize} × {settings.kernelSize}
                      </label>
                      <input type="range" min="3" max="9" step="2" value={settings.kernelSize}
                        onChange={(e) => updateSetting("kernelSize", Number(e.target.value))} style={{ width: "100%" }} />
                    </div>

                    {/* Contrast */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                        CLAHE / Contrast: {settings.contrastMethod === "clahe" ? "CLAHE" : "Equalize"}
                      </label>
                      <select
                        value={settings.contrastMethod}
                        onChange={(e) => updateSetting("contrastMethod", e.target.value as any)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "0.5rem" }}
                      >
                        <option value="clahe">CLAHE · adaptive</option>
                        <option value="equalize">Histogram equalization</option>
                      </select>
                      {settings.contrastMethod === "clahe" && (
                        <>
                          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: COLORS.muted }}>
                            Clip Limit: {settings.clipLimit.toFixed(1)}
                          </label>
                          <input type="range" min="0.5" max="5" step="0.5" value={settings.clipLimit}
                            onChange={(e) => updateSetting("clipLimit", Number(e.target.value))} style={{ width: "100%" }} />
                          <label style={{ display: "block", marginTop: "0.5rem", marginBottom: "0.25rem", fontSize: "0.85rem", color: COLORS.muted }}>
                            Tile Grid: {settings.tileGrid} × {settings.tileGrid}
                          </label>
                          <input type="range" min="4" max="16" step="2" value={settings.tileGrid}
                            onChange={(e) => updateSetting("tileGrid", Number(e.target.value))} style={{ width: "100%" }} />
                        </>
                      )}
                    </div>

                    {/* Sharpening */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                        Unsharp Mask Strength: {settings.sharpenStrength.toFixed(1)}
                      </label>
                      <input type="range" min="0" max="2.5" step="0.1" value={settings.sharpenStrength}
                        onChange={(e) => updateSetting("sharpenStrength", Number(e.target.value))} style={{ width: "100%", marginBottom: "0.5rem" }} />
                      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: COLORS.muted }}>
                        Blur Radius (σ): {settings.sharpenSigma.toFixed(1)}
                      </label>
                      <input type="range" min="0.5" max="3" step="0.5" value={settings.sharpenSigma}
                        onChange={(e) => updateSetting("sharpenSigma", Number(e.target.value))} style={{ width: "100%" }} />
                    </div>

                    {/* Grayscale */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "8px" }}>
                      <input type="checkbox" checked={settings.forceGrayscale}
                        onChange={(e) => updateSetting("forceGrayscale", e.target.checked)} />
                      <span style={{ fontSize: "0.9rem" }}>
                        <strong>Force grayscale</strong> — Convert color images before processing
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        onClick={() => { setSettings({ ...defaults }); setEnhanced(null); setStats(null); }}
                        style={{ flex: 1, padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "0.9rem" }}
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
            )}
          </div>
        )}

        {/* COMPARISON TAB */}
        {tab === "comparison" && (
          <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
            <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Side-by-Side Comparison</h3>
            {!original ? (
              <p style={{ color: COLORS.muted }}>Select an image first using the toolbar above.</p>
            ) : (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ color: COLORS.muted, fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                    Split Ratio: {splitRatio}%
                  </label>
                  <input type="range" min="30" max="70" value={splitRatio}
                    onChange={(e) => setSplitRatio(Number(e.target.value))} style={{ width: "100%" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: COLORS.muted }}>
                    <span>Original</span>
                    <span>Enhanced</span>
                  </div>
                </div>
                <div style={{ position: "relative", height: "400px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={original.url} alt="Original" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${splitRatio}%`,
                    height: "100%",
                    background: "rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}>
                    Original
                  </div>
                  {enhanced && (
                    <>
                      <img src={enhanced} alt="Enhanced" style={{ position: "absolute", right: 0, top: 0, width: `${100 - splitRatio}%`, height: "100%", objectFit: "cover", left: `${splitRatio}%` }} />
                      <div style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        width: `${100 - splitRatio}%`,
                        height: "100%",
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        left: `${splitRatio}%`,
                      }}>
                        Enhanced
                      </div>
                    </>
                  )}
                </div>
                {!enhanced && (
                  <p style={{ color: COLORS.muted, fontSize: "0.85rem", marginTop: "0.75rem" }}>
                    Run "Enhance Image" on the Enhancement tab to see the enhanced result here.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* HISTOGRAM TAB */}
        {tab === "histogram" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Intensity Distribution</h3>
              {!original ? (
                <p style={{ color: COLORS.muted }}>Select an image first using the toolbar above.</p>
              ) : (
                <>
                  <div style={{ height: "200px", background: "#f8fafc", borderRadius: "8px", position: "relative", overflow: "hidden", marginBottom: "0.5rem" }}>
                    <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
                      <polyline
                        fill="none"
                        stroke={COLORS.blue}
                        strokeWidth="2"
                        points={histogram.map((v, i) => `${(i / 255) * 400} ${200 - (v / 100) * 200}`).join(" ")}
                      />
                    </svg>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: COLORS.muted }}>
                    <span>0</span><span>64</span><span>128</span><span>192</span><span>255</span>
                  </div>
                </>
              )}
            </div>
            <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Statistical Summary</h3>
              {imgStats ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {[
                    { label: "Mean", value: imgStats.mean.toFixed(1) },
                    { label: "Std Dev", value: imgStats.contrast.toFixed(1) },
                    { label: "Entropy", value: imgStats.entropy.toFixed(2) },
                    { label: "Sharpness", value: imgStats.sharpness.toFixed(0) },
                    { label: "Width", value: imgStats.width },
                    { label: "Height", value: imgStats.height },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px", fontSize: "0.85rem" }}>
                      <span style={{ color: COLORS.muted }}>{s.label}</span>
                      <span style={{ fontWeight: 500 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Image statistics will appear here</p>
              )}
            </div>
          </div>
        )}

        {/* IMAGE INFO TAB */}
        {tab === "info" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Image Details</h3>
              {!original ? (
                <p style={{ color: COLORS.muted }}>Select an image first using the toolbar above.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {[
                    { label: "Filename", value: original.name },
                    { label: "File Size", value: `${(original.size / 1024 / 1024).toFixed(2)} MB` },
                    { label: "Dimensions", value: `${original.width} × ${original.height} pixels` },
                    { label: "MIME Type", value: mimeType || "Unknown" },
                    { label: "Aspect Ratio", value: original.width > 0 ? (original.width / original.height).toFixed(2) : "N/A" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                      <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>{row.label}</span>
                      <span style={{ fontWeight: 500 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>Preview</h3>
              {original ? (
                <img src={original.url} alt="Preview" style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", display: "block" }} />
              ) : (
                <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>No image loaded.</p>
              )}
            </div>
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {tab === "ai" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0" }}>AI Analysis</h3>
              {!original ? (
                <p style={{ color: COLORS.muted }}>Select an image first using the toolbar above.</p>
              ) : (
                <>
                  <img src={original.url} alt="For analysis" style={{ maxWidth: "100%", maxHeight: "240px", objectFit: "contain", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }} />
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    style={{
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

                  {aiResult && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>🩻</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: COLORS.navy, fontSize: "0.9rem" }}>
                            Likely Body Region: {aiResult.bodyRegion}
                          </p>
                          <p style={{ margin: "0.25rem 0 0 0", color: COLORS.muted, fontSize: "0.75rem" }}>
                            Confidence: {aiResult.bodyRegionConfidence}
                          </p>
                        </div>
                      </div>

                      {aiResult.urgentFinding && (
                        <div style={{ background: "#fef2f2", border: "2px solid #dc2626", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
                          <p style={{ color: "#dc2626", margin: "0 0 0.25rem 0", fontWeight: 700, fontSize: "0.95rem" }}>⚠️ Urgent Visual Finding</p>
                          <p style={{ color: "#7f1d1d", margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }}>{aiResult.urgentFinding}</p>
                        </div>
                      )}

                      <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>What We Found</h4>
                      <ul style={{ color: COLORS.muted, margin: "0 0 1rem 0", paddingLeft: "1.25rem", listStyle: "none" }}>
                        {aiResult.findings.map((finding: any, idx: number) => (
                          <li key={idx} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "flex-start", gap: "0.5rem", lineHeight: 1.5 }}>
                            <span style={{ color: finding.risk === "high" ? "#dc2626" : finding.risk === "medium" ? COLORS.warning : COLORS.success, fontWeight: 700, flexShrink: 0 }}>
                              {finding.risk === "high" ? "⚠" : finding.risk === "medium" ? "●" : "✓"}
                            </span>
                            <span style={{ fontSize: "0.875rem" }}>{finding.type}</span>
                          </li>
                        ))}
                      </ul>

                      <p style={{ color: COLORS.muted, margin: "0 0 1rem 0", fontSize: "0.85rem", lineHeight: 1.6 }}>{aiResult.summary}</p>

                      <button
                        onClick={() => setShowTech(!showTech)}
                        style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.8rem", color: COLORS.muted, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span>Technical Details</span>
                        <span>{showTech ? "▲" : "▼"}</span>
                      </button>

                      {showTech && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                            {[
                              { label: "Dimensions", value: aiResult.metrics.width + " x " + aiResult.metrics.height },
                              { label: "Mean Intensity", value: aiResult.metrics.meanIntensity.toFixed(1) },
                              { label: "Std Deviation", value: aiResult.metrics.stdDev.toFixed(1) },
                              { label: "Edge Density", value: (aiResult.metrics.edgeDensity * 100).toFixed(1) + "%" },
                              { label: "Contrast", value: (aiResult.metrics.contrast * 100).toFixed(1) + "%" },
                              { label: "Entropy", value: aiResult.metrics.entropy.toFixed(2) },
                            ].map((m) => (
                              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                                <span style={{ color: COLORS.muted }}>{m.label}</span>
                                <span style={{ fontWeight: 500 }}>{m.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{
                        background: aiResult.urgentFinding ? "#fef2f2" : "#f0f9ff",
                        border: `1px solid ${aiResult.urgentFinding ? "#fecaca" : "#bae6fd"}`,
                        borderRadius: "8px",
                        padding: "1rem",
                        marginTop: "1rem",
                      }}>
                        <p style={{ color: aiResult.urgentFinding ? "#dc2626" : COLORS.navy, margin: "0 0 0.5rem 0", fontWeight: 600, fontSize: "0.9rem" }}>
                          {aiResult.urgentFinding ? "⚠️ Action Recommended" : "📋 Observation Summary"}
                        </p>
                        <p style={{ color: COLORS.muted, margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>
                          {aiResult.recommendations}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                <h3 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 600 }}>Analysis Options</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {["Body Part Identification", "Abnormality Detection", "Report Generation"].map((opt, i) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input type="checkbox" defaultChecked={i < 2} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fef9f2", border: "1px solid #fed8b1", borderRadius: "8px", padding: "1rem" }}>
                <p style={{ color: COLORS.text, fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                  <strong>⚠️ Educational Use Only</strong> — AI analysis aids are investigational.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {tab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <section style={{ background: "white", borderRadius: "12px", padding: "2rem", border: "1px solid #e2e8f0" }}>
              <h2 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: 700 }}>Project Overview</h2>
              <p style={{ color: COLORS.text, fontSize: "0.95rem", lineHeight: 1.7, margin: "0 0 1rem 0" }}>
                {PROJECT_FULL_NAME} — an educational platform for medical image enhancement and real-time 3D anatomical visualization.
              </p>
              <p style={{ color: COLORS.text, fontSize: "0.95rem", lineHeight: 1.7, margin: 0 }}>
                All processing runs client-side — your images never leave your device.
              </p>
            </section>

            <section style={{ background: "white", borderRadius: "12px", padding: "2rem", border: "1px solid #e2e8f0" }}>
              <h2 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: 700 }}>Technology Stack</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                {TECH_STACK.map((tech) => (
                  <div key={tech} style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem", color: COLORS.text }}>
                    {tech}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: "#fef9f2", border: "1px solid #fed8b1", borderRadius: "8px", padding: "1rem" }}>
              <p style={{ color: COLORS.text, fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                <strong>⚠️ Educational Use Only</strong> — {DISCLAIMER}
              </p>
            </section>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{ background: "#fef9f2", border: "1px solid #fed8b1", borderRadius: "8px", padding: "1rem", marginTop: "1.5rem" }}>
        <p style={{ color: COLORS.text, fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
          <strong>⚠️ Educational Use Only</strong> — Enhanced images are NOT guaranteed to be diagnostically superior.
        </p>
      </div>
    </div>
  );
}