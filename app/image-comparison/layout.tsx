import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Comparison",
  description: "Compare original and enhanced medical images side by side with quantitative metrics.",
};

export default function ImageComparisonLayout({ children }: { children: React.ReactNode }) {
  return children;
}