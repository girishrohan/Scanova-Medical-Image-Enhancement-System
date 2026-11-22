// lib/image-context.tsx — Shared Image State Context
// Persists a single uploaded medical image across all SCANOVA sections.
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type SharedImage = {
  url: string;
  name: string;
  width: number;
  height: number;
  size: number;
  imageData?: ImageData;
} | null;

type ImageContextType = {
  image: SharedImage;
  setImage: (img: SharedImage) => void;
  clearImage: () => void;
  hasImage: boolean;
};

const ImageContext = createContext<ImageContextType | null>(null);

const STORAGE_KEY = "scanova-shared-image";

export function ImageProvider({ children }: { children: ReactNode }) {
  const [image, setImageState] = useState<SharedImage>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.url) {
          setImageState(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setImage = useCallback((img: SharedImage) => {
    setImageState(img);
    if (img) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(img));
      } catch {
        // Storage full or unavailable
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ImageContext.Provider value={{ image, setImage, clearImage, hasImage: !!image }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useSharedImage() {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error("useSharedImage must be used within ImageProvider");
  }
  return context;
}