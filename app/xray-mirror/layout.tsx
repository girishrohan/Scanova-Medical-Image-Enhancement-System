import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "X-Ray Mirror AR",
  description: "Real-time 3D anatomical visualization with AR overlays using your camera.",
};

export default function XRMMirrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}