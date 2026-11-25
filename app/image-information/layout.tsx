import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Information",
  description: "View detailed image metadata and technical specifications for medical scans.",
};

export default function ImageInformationLayout({ children }: { children: React.ReactNode }) {
  return children;
}