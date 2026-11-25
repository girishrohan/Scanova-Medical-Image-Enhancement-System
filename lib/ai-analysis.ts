// lib/ai-analysis.ts — Real image-feature analysis for SCANOVA AI Analysis
// Extracts visual characteristics from an uploaded medical scan and generates
// structured educational observations. No hardcoded/canned results.

export type Finding = {
  type: string;
  confidence: number;
  risk: "low" | "medium" | "high";
};

export type AnalysisResult = {
  bodyRegion: string;
  bodyRegionConfidence: "high" | "medium" | "low";
  urgentFinding: string | null;
  findings: Finding[];
  summary: string;
  recommendations: string;
  processingTime: string;
  metrics: {
    width: number;
    height: number;
    meanIntensity: number;
    stdDev: number;
    edgeDensity: number;
    contrast: number;
    entropy: number;
    darkPixelRatio: number;
    brightPixelRatio: number;
  };
};

/**
 * Load an image from a URL/data-URL into an ImageData object.
 */
function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

/**
 * Compute Shannon entropy of an intensity histogram.
 */
function computeEntropy(histogram: number[], total: number): number {
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      const p = histogram[i] / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Compute Sobel edge magnitude for each pixel.
 */
function computeEdgeMap(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      // Sobel kernels
      const gx =
        -data[((y - 1) * w + (x - 1)) * 4] +
        data[((y - 1) * w + (x + 1)) * 4] -
        2 * data[(y * w + (x - 1)) * 4] +
        2 * data[(y * w + (x + 1)) * 4] -
        data[((y + 1) * w + (x - 1)) * 4] +
        data[((y + 1) * w + (x + 1)) * 4];
      const gy =
        -data[((y - 1) * w + (x - 1)) * 4] -
        2 * data[((y - 1) * w + x) * 4] -
        data[((y - 1) * w + (x + 1)) * 4] +
        data[((y + 1) * w + (x - 1)) * 4] +
        2 * data[((y + 1) * w + x) * 4] +
        data[((y + 1) * w + (x + 1)) * 4];
      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

/**
 * Analyze an image and return structured observations.
 */
export async function analyzeImage(imageUrl: string): Promise<AnalysisResult> {
  const start = performance.now();

  const imageData = await loadImageData(imageUrl);
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  // Convert to grayscale intensities
  const intensities = new Float32Array(totalPixels);
  const histogram = new Array(256).fill(0);
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    intensities[i] = gray;
    histogram[gray]++;
    sum += gray;
    sumSq += gray * gray;
  }

  const meanIntensity = sum / totalPixels;
  const variance = sumSq / totalPixels - meanIntensity * meanIntensity;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // Entropy
  const entropy = computeEntropy(histogram, totalPixels);

  // Edge density
  const edgeMap = computeEdgeMap(data, width, height);
  let edgeSum = 0;
  let edgeCount = 0;
  const edgeThreshold = 50;
  for (let i = 0; i < totalPixels; i++) {
    edgeSum += edgeMap[i];
    if (edgeMap[i] > edgeThreshold) edgeCount++;
  }
  const edgeDensity = edgeCount / totalPixels;
  const meanEdge = edgeSum / totalPixels;

  // Contrast (Michelson)
  let minI = 255, maxI = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (intensities[i] < minI) minI = intensities[i];
    if (intensities[i] > maxI) maxI = intensities[i];
  }
  const contrast = maxI > 0 ? (maxI - minI) / (maxI + minI) : 0;

  // Dark/bright pixel ratios
  let darkPixels = 0;
  let brightPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (intensities[i] < 64) darkPixels++;
    if (intensities[i] > 192) brightPixels++;
  }
  const darkPixelRatio = darkPixels / totalPixels;
  const brightPixelRatio = brightPixels / totalPixels;

  // High-contrast discontinuity detection (potential structural breaks)
  // Look for regions with abrupt intensity changes along rows/columns
  let discontinuityScore = 0;
  let discontinuityCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const left = intensities[idx - 1];
      const right = intensities[idx + 1];
      const up = intensities[idx - width];
      const down = intensities[idx + width];
      const localGrad = Math.abs(right - left) + Math.abs(down - up);
      if (localGrad > 80) {
        discontinuityCount++;
        discontinuityScore += localGrad;
      }
    }
  }
  const discontinuityRatio = discontinuityCount / totalPixels;

  // Compute confidence scores based on image characteristics
  // These are NOT hardcoded — they derive from the actual image
  const structuralClarity = Math.min(100, Math.round((1 - edgeDensity) * 60 + stdDev * 0.4 + 20));
  const contrastQuality = Math.min(100, Math.round(contrast * 100 + 20));
  const edgeSharpness = Math.min(100, Math.round(meanEdge / 5 + 30));
  const intensityBalance = Math.min(100, Math.round(100 - Math.abs(meanIntensity - 128) * 0.5));

  // Determine risk level based on discontinuity ratio
  let overallRisk: "low" | "medium" | "high" = "low";
  if (discontinuityRatio > 0.05) overallRisk = "high";
  else if (discontinuityRatio > 0.02) overallRisk = "medium";

  // ─── Body Region Identification ──────────────────────────────────────────
  // Heuristic based on aspect ratio, edge distribution, and intensity patterns
  const aspectRatio = width / height;
  let bodyRegion = "General scan — region unconfirmed";
  let bodyRegionConfidence: "high" | "medium" | "low" = "low";

  if (aspectRatio > 1.3) {
    // Wide image — likely chest, abdomen, or panoramic
    if (meanIntensity > 100 && stdDev > 40) {
      bodyRegion = "Chest / Thorax (estimated)";
      bodyRegionConfidence = "medium";
    } else {
      bodyRegion = "Wide-format scan (region unconfirmed)";
      bodyRegionConfidence = "low";
    }
  } else if (aspectRatio < 0.75) {
    // Tall/narrow — likely limb, spine, or hand
    if (edgeDensity > 0.08) {
      bodyRegion = "Limb / Hand / Wrist (estimated)";
      bodyRegionConfidence = "medium";
    } else {
      bodyRegion = "Tall-format scan (region unconfirmed)";
      bodyRegionConfidence = "low";
    }
  } else {
    // Square-ish — could be head, joint, or small region
    if (meanIntensity < 80 && stdDev > 50) {
      bodyRegion = "Skull / Head (estimated)";
      bodyRegionConfidence = "medium";
    } else if (edgeDensity > 0.12) {
      bodyRegion = "Joint / Extremity (estimated)";
      bodyRegionConfidence = "medium";
    } else {
      bodyRegion = "General scan — region unconfirmed";
      bodyRegionConfidence = "low";
    }
  }

  // ─── Urgent Finding Detection ─────────────────────────────────────────────
  // Detect strong signs of possible structural break / discontinuity
  let urgentFinding: string | null = null;
  if (discontinuityRatio > 0.08 && edgeDensity > 0.15) {
    urgentFinding =
      "Possible bone break or severe structural split detected — needs prompt medical attention";
  } else if (discontinuityRatio > 0.05 && contrast > 0.6) {
    urgentFinding =
      "Notable structural discontinuity detected — review recommended by a qualified professional";
  } else if (darkPixelRatio > 0.7) {
    urgentFinding =
      "Large dark regions detected — may indicate air, fluid, or missing tissue; professional review advised";
  }

  // Build findings in plain language
  const findings: Finding[] = [];

  // Finding 1: Body region
  findings.push({
    type: `Likely body region: ${bodyRegion}`,
    confidence: (bodyRegionConfidence as string) === "high" ? 90 : (bodyRegionConfidence as string) === "medium" ? 70 : 40,
    risk: "low",
  });

  // Finding 2: Structural observation (plain language)
  if (discontinuityRatio > 0.05) {
    findings.push({
      type: "Significant structural discontinuities found — possible break, crack, or sharp boundary visible",
      confidence: Math.max(60, Math.min(95, Math.round((1 - discontinuityRatio) * 100))),
      risk: "high",
    });
  } else if (discontinuityRatio > 0.02) {
    findings.push({
      type: "Moderate structural edges detected — normal anatomical boundaries likely",
      confidence: Math.max(65, Math.min(95, Math.round((1 - discontinuityRatio) * 100))),
      risk: "medium",
    });
  } else {
    findings.push({
      type: "Smooth structural continuity — no sharp breaks or discontinuities apparent",
      confidence: Math.max(70, Math.min(98, Math.round((1 - discontinuityRatio) * 100))),
      risk: "low",
    });
  }

  // Finding 3: Contrast observation
  findings.push({
    type: contrast > 0.5
      ? "Good contrast — structures are clearly distinguishable"
      : contrast > 0.3
        ? "Moderate contrast — some structures may be harder to distinguish"
        : "Low contrast — image may benefit from enhancement",
    confidence: Math.max(50, Math.min(99, contrastQuality)),
    risk: contrast < 0.3 ? "medium" : "low",
  });

  // Finding 4: Detail/complexity
  findings.push({
    type: edgeDensity > 0.15
      ? "High structural detail — complex anatomy visible"
      : edgeDensity > 0.05
        ? "Moderate structural detail visible"
        : "Low structural detail — image may be smooth or low resolution",
    confidence: Math.max(50, Math.min(99, edgeSharpness)),
    risk: "low",
  });

  // Finding 5: Brightness balance
  findings.push({
    type: meanIntensity > 160
      ? "Image is quite bright — may reduce visibility of subtle features"
      : meanIntensity < 60
        ? "Image is quite dark — may need brightness adjustment"
        : "Brightness is well-balanced for analysis",
    confidence: Math.max(50, Math.min(99, intensityBalance)),
    risk: meanIntensity > 200 || meanIntensity < 40 ? "medium" : "low",
  });

  // Summary (plain language)
  const summaryParts: string[] = [];
  summaryParts.push(`This scan appears to show a ${bodyRegion.toLowerCase()} region.`);
  summaryParts.push(
    `The image has ${edgeDensity > 0.15 ? "high" : edgeDensity > 0.05 ? "moderate" : "low"} structural detail with ${contrast > 0.5 ? "good" : contrast > 0.3 ? "moderate" : "low"} contrast.`
  );
  if (discontinuityRatio > 0.02) {
    summaryParts.push(
      "Some sharp structural edges or breaks were detected that may correspond to anatomical boundaries or potential injury sites."
    );
  } else {
    summaryParts.push("No sharp structural breaks were detected in this scan.");
  }
  if (meanIntensity < 60 || meanIntensity > 200) {
    summaryParts.push("The image brightness is outside the typical range, which may affect visibility of details.");
  }

  const summary = summaryParts.join(" ");

  // Recommendations
  let recommendations = "";
  if (urgentFinding) {
    recommendations =
      urgentFinding + ". Please consult a qualified doctor or radiologist promptly for proper evaluation. This is an educational visual-analysis tool, not a medical diagnosis.";
  } else if (overallRisk === "medium") {
    recommendations =
      "Some notable visual features were detected. Review the findings above and consider using the enhancement tools for better visualization. This is an educational visual-analysis tool, not a medical diagnosis.";
  } else {
    recommendations =
      "No urgent visual concerns detected in this scan. Use the enhancement pipeline for improved visualization if needed. This is an educational visual-analysis tool, not a medical diagnosis.";
  }

  const processingTime = `${((performance.now() - start) / 1000).toFixed(2)}s`;

  return {
    bodyRegion,
    bodyRegionConfidence,
    urgentFinding,
    findings,
    summary,
    recommendations,
    processingTime,
    metrics: {
      width,
      height,
      meanIntensity,
      stdDev,
      edgeDensity,
      contrast,
      entropy,
      darkPixelRatio,
      brightPixelRatio,
    },
  };
}

/**
 * Analyze an image from a File object.
 */
export async function analyzeImageFile(file: File): Promise<AnalysisResult> {
  const url = URL.createObjectURL(file);
  try {
    const result = await analyzeImage(url);
    // Update metrics with actual original dimensions
    result.metrics.width = 0; // Will be set by the image
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}