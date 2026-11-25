import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Histogram Analysis",
  description: "Image intensity distribution and statistical analysis for medical scans.",
};

export default function HistogramAnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}