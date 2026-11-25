import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About SCANOVA Medical Image Enhancement System — algorithms, methodology, and limitations.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}