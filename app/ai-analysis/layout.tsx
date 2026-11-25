import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Analysis",
  description: "AI-assisted body part identification and abnormality detection for medical scans.",
};

export default function AIAnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}