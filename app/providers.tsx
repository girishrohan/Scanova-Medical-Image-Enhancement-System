"use client";

import { ImageProvider } from "@/lib/image-context";
import { CommandPalette } from "@/components/ui/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ImageProvider>
      {children}
      <CommandPalette />
    </ImageProvider>
  );
}