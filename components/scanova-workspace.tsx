"use client";

import { useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowLeftRight, Check, ChevronDown, FileImage, ImagePlus, Info, Microscope, RotateCcw, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { ImageStats, measureImage, processImage, ProcessingSettings } from "@/lib/image-processing";

type Frame = { url: string; name: string; width: number; height: number; size: number; image: ImageData };
const defaults: ProcessingSettings = { noiseMethod: "median", kernelSize: 5, contrastMethod: "clahe", clipLimit: 2, tileGrid: 8, sharpenStrength: 1.2, sharpenSigma: 1, forceGrayscale: false };
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

function imageUrl(image: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")?.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function Metric({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}<small>{suffix}</small></strong></div>;
}

export default function ScanovaWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<Frame | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [stats, setStats] = useState<{ before: ImageStats; after: ImageStats } | null>(null);
  const [settings, setSettings] = useState(defaults);
  const [compare, setCompare] = useState(52);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("Enhancement");

  const loadFile = async (file: File) => {
    setError("");
    setEnhanced(null);
    setStats(null);
    if (file.size > 30 * 1024 * 1024) { setError("Choose an image under 30 MB."); return; }
    if (!/^image\/(png|jpeg|bmp|webp)$/i.test(file.type)) { setError("Use a PNG, JPG, BMP, or WebP image. DICOM files are not supported in this browser version."); return; }
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
      const data = canvasData(image);
      setOriginal({ url, name: file.name, width: image.naturalWidth, height: image.naturalHeight, size: file.size, image: data });
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
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      await image.decode();
      setOriginal({ url: sample.path, name: `${sample.label} · Demo`, width: image.naturalWidth, height: image.naturalHeight, size: blob.size, image: canvasData(image) });
    } catch {
      setError("The selected demo image could not be loaded.");
    }
  };

  const enhanceImage = () => {
    if (!original) return;
    setBusy(true);
    setError("");
    window.setTimeout(() => {
      try {
        const result = processImage(original.image, settings);
        setEnhanced(imageUrl(result));
        setStats({ before: measureImage(original.image), after: measureImage(result) });
      } catch {
        setError("Processing did not complete. Try a smaller image or simpler settings.");
      } finally {
        setBusy(false);
      }
    }, 40);
  };

  const reset = () => { setOriginal(null); setEnhanced(null); setStats(null); setError(""); setSettings(defaults); if (fileRef.current) fileRef.current.value = ""; };
  const update = <K extends keyof ProcessingSettings>(key: K, value: ProcessingSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const download = () => {
    if (!enhanced) return;
    const link = document.createElement("a"); link.href = enhanced; link.download = "scanova-enhanced.png"; link.click();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Scanova home"><span className="brand-mark"><Activity /></span><span>scanova<small>IMAGING WORKSPACE</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {[{ label: "Enhancement", icon: Sparkles }, { label: "Comparison", icon: ArrowLeftRight }, { label: "Analysis", icon: Activity }].map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeTab === label ? "active" : ""}`} onClick={() => { setActiveTab(label); const targetId = label === "Comparison" ? "preview-section" : label === "Analysis" ? "analysis-section" : "source-section"; document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Icon />{label}{label === "Enhancement" && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck /><div><strong>Private by design</strong><span>Images stay on your device</span></div></div><div className="user-mini"><div className="avatar">S</div><div><strong>Scanova</strong><span>Educational edition</span></div><ChevronDown /></div></div>
      </aside>

      <main className="main-area" id="home">
        <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>{activeTab}</strong></div><div className="top-actions"><span className="status-pill"><i /> Processing ready</span><button className="icon-button" aria-label="About Scanova" title="About Scanova"><Info /></button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><div className="eyebrow"><Microscope /> MEDICAL IMAGE WORKSPACE</div><h1>{activeTab === "Enhancement" ? "Image enhancement" : activeTab === "Comparison" ? "Image comparison" : "Image analysis"}</h1><p>Bring detail into focus with a clear, reproducible enhancement workflow.</p></div><div className="heading-tag"><span className="tag-icon"><ShieldCheck /></span><span><strong>Local processing</strong><small>No image uploads</small></span></div></section>
          <div className="disclaimer"><span className="disclaimer-icon">i</span><p><strong>For educational use only.</strong> Enhanced images are not diagnostic and must not replace professional medical interpretation.</p><button aria-label="More about this disclaimer" title="Educational demonstration only"><Info /></button></div>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="workspace-grid">
            <section className="center-column">
              <div className="panel upload-panel" id="source-section">
                <div className="panel-heading"><div><h2>Source image</h2><p>Upload a scan or start with a sample image</p></div>{original && <button className="text-button" onClick={reset}><RotateCcw /> Clear image</button>}</div>
                {!original ? <>
                  <button className={`dropzone ${dragging ? "dragging" : ""}`} onClick={() => fileRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void loadFile(file); }}>
                    <span className="upload-icon"><UploadCloud /></span><strong>Drop your image here, or <em>browse files</em></strong><span>PNG, JPG, BMP, or WebP · up to 30 MB · stays on device</span>
                  </button>
                  <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/bmp,image/webp" aria-label="Choose a medical image" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} />
                  <div className="samples-heading"><span>OR TRY A SAMPLE</span><span className="samples-rule" /></div>
                  <div className="sample-grid">{samples.map((sample) => <button className="sample-card" key={sample.label} onClick={() => void loadSample(sample)}><span className={`sample-thumb ${sample.tone}`}><img src={sample.path} alt="" /><span className="sample-open"><ImagePlus /></span></span><span className="sample-info"><strong>{sample.label}</strong><small>{sample.kind}</small></span><span className="sample-arrow">↗</span></button>)}</div>
                </> : <div className="loaded-file"><img src={original.url} alt="Uploaded medical scan preview"/><div className="loaded-info"><span className="file-chip"><FileImage /> IMAGE LOADED</span><strong>{original.name}</strong><span>{original.width} × {original.height} px <i>·</i> {(original.size / 1024 / 1024).toFixed(2)} MB</span></div><button className="remove-file" onClick={reset} aria-label="Remove image">×</button></div>}
              </div>

              <div className="panel preview-panel" id="preview-section">
                <div className="panel-heading"><div><h2>Image preview</h2><p>{enhanced ? "Drag the divider to compare original and enhanced" : "Your processed image will appear here"}</p></div>{enhanced && <button className="download-button" onClick={download}><ArrowDownToLine /> Export PNG</button>}</div>
                {original ? <div className={`image-stage ${enhanced ? "has-result" : ""}`}>
                  {!enhanced ? <><img src={original.url} alt="Original medical scan"/><div className="stage-label original-label">ORIGINAL</div><div className="stage-empty"><span><Sparkles /></span><strong>Ready to enhance</strong><small>Adjust your settings, then run the pipeline</small></div></> : <><img className="enhanced-full" src={enhanced} alt="Enhanced medical scan"/><div className="original-clip" style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}><img src={original.url} alt="Original medical scan for comparison"/></div><div className="stage-label original-label">ORIGINAL</div><div className="stage-label enhanced-label">ENHANCED</div><input className="compare-range" type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} aria-label="Adjust comparison divider" /><div className="compare-divider" style={{ left: `${compare}%` }}><span><ArrowLeftRight /></span></div></>}
                </div> : <div className="empty-preview"><span><ImagePlus /></span><strong>No image to preview</strong><small>Upload a scan or choose one of the demo images above</small></div>}
                {original && <div className="preview-footer"><span><span className="legend-dot original-dot" /> Original</span><span><span className="legend-dot enhanced-dot" /> Enhanced result</span><span className="preview-resolution">Preview scaled for performance</span></div>}
              </div>

              {stats && <div className="panel results-panel" id="analysis-section"><div className="panel-heading"><div><h2>Image analysis</h2><p>Quantitative image statistics before and after processing</p></div><span className="complete-badge"><Check /> Complete</span></div><div className="metrics-grid"><Metric label="Mean intensity" value={stats.after.mean.toFixed(1)} /><Metric label="Contrast · σ" value={stats.after.contrast.toFixed(1)} /><Metric label="Entropy" value={stats.after.entropy.toFixed(2)} suffix=" bits"/><Metric label="Laplacian variance" value={stats.after.sharpness.toFixed(0)} /></div><div className="metric-compare"><span>BEFORE <strong>{stats.before.contrast.toFixed(1)}</strong> contrast</span><span>AFTER <strong>{stats.after.contrast.toFixed(1)}</strong> contrast</span><span className="educational-note">Metrics describe pixel statistics—not diagnostic quality.</span></div></div>}
            </section>

            <aside className="settings-column">
              <section className="panel settings-panel"><div className="panel-heading settings-heading"><div><h2>Pipeline settings</h2><p>Fine-tune each processing stage</p></div><button className="reset-icon" onClick={() => setSettings(defaults)} title="Reset settings" aria-label="Reset settings"><RotateCcw /></button></div>
                <div className="pipeline-list"><div className="pipeline-step"><span className="step-number">01</span><div className="step-content"><strong>Noise reduction</strong><p>Reduce grain and artifacts</p><div className="segmented-control"><button className={settings.noiseMethod === "median" ? "selected" : ""} onClick={() => update("noiseMethod", "median")}>Median</button><button className={settings.noiseMethod === "gaussian" ? "selected" : ""} onClick={() => update("noiseMethod", "gaussian")}>Gaussian</button></div><label className="range-label" htmlFor="kernel">Kernel size <strong>{settings.kernelSize} × {settings.kernelSize}</strong></label><input id="kernel" type="range" min="3" max="9" step="2" value={settings.kernelSize} onChange={(event) => update("kernelSize", Number(event.target.value))}/></div></div>
                  <div className="pipeline-step"><span className="step-number">02</span><div className="step-content"><strong>Contrast enhancement</strong><p>Reveal subtle image detail</p><label className="select-label" htmlFor="contrast-method">Method</label><select id="contrast-method" value={settings.contrastMethod} onChange={(event) => update("contrastMethod", event.target.value as ProcessingSettings["contrastMethod"])}><option value="clahe">CLAHE · adaptive</option><option value="equalize">Histogram equalization</option></select>{settings.contrastMethod === "clahe" && <><label className="range-label" htmlFor="clip">Clip limit <strong>{settings.clipLimit.toFixed(1)}</strong></label><input id="clip" type="range" min="0.5" max="5" step="0.5" value={settings.clipLimit} onChange={(event) => update("clipLimit", Number(event.target.value))}/><label className="range-label" htmlFor="tiles">Tile grid <strong>{settings.tileGrid} × {settings.tileGrid}</strong></label><input id="tiles" type="range" min="4" max="16" step="2" value={settings.tileGrid} onChange={(event) => update("tileGrid", Number(event.target.value))}/></>}</div></div>
                  <div className="pipeline-step"><span className="step-number">03</span><div className="step-content"><strong>Edge enhancement</strong><p>Sharpen boundaries with unsharp mask</p><label className="range-label" htmlFor="strength">Strength <strong>{settings.sharpenStrength.toFixed(1)}</strong></label><input id="strength" type="range" min="0" max="2.5" step="0.1" value={settings.sharpenStrength} onChange={(event) => update("sharpenStrength", Number(event.target.value))}/><label className="range-label" htmlFor="sigma">Blur radius <strong>{settings.sharpenSigma.toFixed(1)}</strong></label><input id="sigma" type="range" min="0.5" max="3" step="0.5" value={settings.sharpenSigma} onChange={(event) => update("sharpenSigma", Number(event.target.value))}/></div></div>
                </div>
                <label className="checkbox-row"><input type="checkbox" checked={settings.forceGrayscale} onChange={(event) => update("forceGrayscale", event.target.checked)}/><span className="checkbox-copy"><strong>Force grayscale</strong><small>Convert color images before processing</small></span></label>
                <button className="run-button" onClick={enhanceImage} disabled={!original || busy}>{busy ? <><span className="spinner"/> Processing image…</> : <><Sparkles /> Enhance image</>}</button>
                <div className="pipeline-foot"><span><Check /> 3-stage pipeline</span><span>Runs locally</span></div>
              </section>
              <div className="workflow-note"><span><Info /></span><p><strong>Processing note</strong>Large images are scaled to a maximum 1,800 px side for responsive browser processing. The source image remains unchanged on your device.</p></div>
              <div className="medical-note"><ShieldCheck /><p><strong>Not for diagnosis</strong>Scanova is an educational image-processing demonstration. Always rely on qualified clinicians for medical interpretation.</p></div>
            </aside>
          </div>
          <footer className="page-footer"><span>SCANOVA <i>·</i> EDUCATIONAL IMAGING TOOL</span><span>Client-side processing · No data stored</span></footer>
        </div>
      </main>
    </div>
  );
}
