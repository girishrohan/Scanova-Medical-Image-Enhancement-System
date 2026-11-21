// app/api/enhance/route.ts — Image Enhancement API
// Vercel serverless function for medical image enhancement

import { NextRequest, NextResponse } from "next/server";
import { ProcessingSettings } from "@/lib/types";

// Default processing settings
const DEFAULT_SETTINGS: ProcessingSettings = {
  noiseMethod: "median",
  kernelSize: 5,
  contrastMethod: "clahe",
  clipLimit: 2.0,
  tileGrid: 8,
  sharpenStrength: 1.2,
  sharpenSigma: 1.0,
  forceGrayscale: false,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const settings = formData.get("settings") as string;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate file size
    if (image.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 30 MB)" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/bmp", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ 
        error: `Invalid file type: ${image.type}. Allowed: ${allowedTypes.join(", ")}` 
      }, { status: 400 });
    }

    // Parse settings
    const parsedSettings: ProcessingSettings = settings 
      ? JSON.parse(settings) 
      : DEFAULT_SETTINGS;

    // Read image as array buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // In a production environment, this would process the image with a backend service.
    // For Vercel deployment, we simulate the response since Python ML models
    // would need a separate backend service.
    // The frontend component already handles client-side processing.

    return NextResponse.json({
      success: true,
      message: "Image received. Processing will be handled client-side for security.",
      filename: image.name,
      size: image.size,
      type: image.type,
    });

  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json({ 
      error: "Failed to process image" 
    }, { status: 500 });
  }
}

export const GET = async () => {
  return NextResponse.json({ 
    status: "ok", 
    message: "SCANOVA Image Enhancement API",
    version: "1.0.0"
  });
};