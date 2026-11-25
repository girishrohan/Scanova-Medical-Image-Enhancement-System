import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Scanova — Medical Image Enhancement",
    template: "%s | Scanova",
  },
  description:
    "An educational workspace for medical image enhancement, comparison, and analysis. Upload scans, apply denoising/contrast/sharpening pipelines, and explore 3D anatomical AR visualization.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Scanova — Medical Image Enhancement",
    description:
      "An educational workspace for medical image enhancement, comparison, and analysis.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f8fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflowX: "hidden" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}