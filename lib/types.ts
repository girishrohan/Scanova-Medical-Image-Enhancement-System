// lib/types.ts — SCANOVA TypeScript Types

export type ProcessingSettings = {
  noiseMethod: "median" | "gaussian";
  kernelSize: number;
  contrastMethod: "clahe" | "equalize";
  clipLimit: number;
  tileGrid: number;
  sharpenStrength: number;
  sharpenSigma: number;
  forceGrayscale: boolean;
};

export type ImageStats = {
  width: number;
  height: number;
  mean: number;
  contrast: number;
  entropy: number;
  sharpness: number;
};

export type PipelineStage = {
  name: string;
  description: string;
};

export type PipelineResult = {
  original: string; // base64 data URL
  enhanced: string; // base64 data URL
  originalMetrics: ImageStats;
  enhancedMetrics: ImageStats;
  delta: Record<string, number | string>;
  stages: PipelineStage[];
  totalTimeMs: number;
  warnings: string[];
  edgeOverlay?: string;
};

export type User = {
  username: string;
  authenticated: boolean;
};

export type XRayLayer = "full_body" | "skull" | "brain" | "facial_muscles" | "eyes" | "hand_bones" | "all";

export type XRayMirrorState = {
  cameraOn: boolean;
  xRayMode: boolean;
  currentLayer: XRayLayer;
  opacity: number;
  showLandmarks: boolean;
  showWireframe: boolean;
};

export type AuthFormState = {
  username: string;
  password: string;
  rememberMe: boolean;
  error?: string;
};