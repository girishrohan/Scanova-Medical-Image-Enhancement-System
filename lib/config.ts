// lib/config.ts — SCANOVA Configuration
// Central configuration: colors, limits, and default processing parameters.

export const APP_NAME = "Scanova";
export const APP_TAGLINE = "A Clearer View of Every Scan.";
export const APP_VERSION = "1.0.0";
export const PROJECT_FULL_NAME = "CGIP – Medical Image Enhancement System";

// ─── Premium Medical Technology Color Palette ─────────────────────────────────
export const COLORS = {
  // Core brand colors
  navy: "#0F2C4D",
  navyLight: "#1E3A5F",
  navyDim: "#0A1F33",
  blue: "#1E40AF",
  blueLight: "#3B82F6",
  blueDim: "#1D4ED8",
  teal: "#0D9488",
  tealLight: "#14B8A6",
  tealDim: "#0F766E",

  // Gradients
  blueTealGradient: "#0F2C4D",
  navyEnd: "#1E40AF",

  // Backgrounds
  background: "#F8FAFC",
  backgroundDark: "#F1F5F9",
  white: "#FFFFFF",
  surface: "#FFFFFF",

  // Text colors
  text: "#0F172A",
  textDim: "#1E293B",
  muted: "#475569",
  mutedLight: "#64748B",

  // Status colors
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",

  // Borders & dividers
  border: "#E2E8F0",
  borderDim: "#CBD5E1",
};

// ─── Design System Constants ──────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
};

export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
};

export const TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSizeSm: 0.875,
  fontSizeBase: 1,
  fontSizeMd: 1.125,
  fontSizeLg: 1.25,
  fontSizeXl: 1.5,
  fontSize2xl: 1.75,
  fontSize3xl: 2,
  fontSize4xl: 2.5,
};

// ─── File & Upload Constraints ────────────────────────────────────────────────
export const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "webp"];
export const MAX_FILE_SIZE_MB = 30;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8192;
export const MIN_IMAGE_DIMENSION = 8;

// ─── Default Processing Parameters ───────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  noiseMethod: "median" as const,
  kernelSize: 5,
  contrastMethod: "clahe" as const,
  clipLimit: 2.0,
  tileGrid: 8,
  sharpenStrength: 1.2,
  sharpenSigma: 1.0,
  forceGrayscale: false,
};

// ─── Parameter Boundaries ────────────────────────────────────────────────────
export const PARAM_BOUNDS = {
  kernelSizeMin: 3,
  kernelSizeMax: 21,
  gaussianSigmaMin: 0.1,
  gaussianSigmaMax: 5.0,
  claheClipMin: 0.5,
  claheClipMax: 10.0,
  claheTileMin: 2,
  claheTileMax: 32,
  sharpenMin: 0.0,
  sharpenMax: 3.0,
};

// ─── Sample Images ────────────────────────────────────────────────────────────
export const SAMPLE_IMAGES = {
  "Chest X-Ray (Demo)": "/samples/chest_xray_demo.png",
  "Brain MRI (Demo)": "/samples/brain_mri_demo.png",
  "Knee CT (Demo)": "/samples/knee_ct_demo.png",
};

// ─── Export ──────────────────────────────────────────────────────────────────
export const EXPORT_FORMAT = "PNG";
export const EXPORT_QUALITY = 95;

// ─── Disclaimer (displayed prominently in UI) ─────────────────────────────────
export const DISCLAIMER = (
  "⚠️  Educational Use Only — This system is developed as an image-processing "
  + "demonstration for academic purposes. Enhanced images are NOT guaranteed to be "
  + "diagnostically superior and must NOT replace professional medical interpretation. "
  + "Clinical use requires appropriate validation and qualified medical oversight."
);

// ─── Technology Stack ────────────────────────────────────────────────────────
export const TECH_STACK = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript",
  "Turbopack",
  "Three.js",
  "MediaPipe",
  "Canvas API",
  "Client-side Processing",
];

// ─── Demo Credentials ────────────────────────────────────────────────────────
export const DEMO_USERS = {
  demo: "scanova2024",
  admin: "admin123",
  researcher: "research2024",
};