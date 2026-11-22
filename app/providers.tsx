"use client";

import { ImageProvider } from "@/lib/image-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ImageProvider>{children}</ImageProvider>;
}