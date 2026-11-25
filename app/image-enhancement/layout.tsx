import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Enhancement",
  description: "Upload and enhance medical images with denoising, contrast, and sharpening pipelines.",
};

export default function ImageEnhancementLayout({ children }: { children: React.ReactNode }) {
  return children;
}