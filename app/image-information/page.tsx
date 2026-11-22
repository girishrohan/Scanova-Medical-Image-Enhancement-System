"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowLeftRight, 
  BarChart3, 
  FileText, 
  Image as ImageIcon, 
  ShieldCheck, 
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { useSharedImage } from "@/lib/image-context";

export default function ImageInformationPage() {
  const router = useRouter();
  const { image: sharedImage, setImage: setSharedImage } = useSharedImage();
  const [image, setImage] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [mimeType, setMimeType] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  // Sync shared image
  useEffect(() => {
    if (sharedImage && !image) {
      setImage(sharedImage.url);
      setFilename(sharedImage.name);
      setFileSize(sharedImage.size);
      setWidth(sharedImage.width);
      setHeight(sharedImage.height);
    }
  }, [sharedImage, image]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 30 * 1024 * 1024) {
      setError("Image must be under 30 MB");
      return;
    }
    
    setError("");
    setFilename(file.name);
    setFileSize(file.size);
    setMimeType(file.type);
    
    const url = URL.createObjectURL(file);
    setImage(url);
    setSharedImage({
      url,
      name: file.name,
      width: 0,
      height: 0,
      size: file.size,
    });
    
    const img = new Image();
    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setSharedImage({
        url,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
      });
    };
    img.src = url;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "2rem",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        <div>
          <h1 style={{
            color: COLORS.navy,
            margin: "0 0 0.5rem 0",
            fontSize: "1.75rem",
            fontWeight: 800,
          }}>
            Image Information
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            View detailed image metadata and technical specifications
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            cursor: "pointer",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
          }}
        >
          🚪 Logout
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        {/* Image Upload */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
        }}>
          <h3 style={{
            color: COLORS.navy,
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Upload Image
          </h3>
          
          <div style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: "#f8fafc",
            marginBottom: "1rem",
          }}
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          >
            <ImageIcon style={{ width: "32px", height: "32px", color: COLORS.teal, margin: "0 auto 0.5rem" }} />
            <p style={{ margin: "0 0 0.5rem 0" }}>Choose an image for analysis</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#dc2626",
            }}>
              {error}
            </div>
          )}

          {image && (
            <div style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
            }}>
              <p style={{ color: COLORS.muted, margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                <strong>Image Loaded</strong> — Analysis completed
              </p>
            </div>
          )}
        </div>

        {/* Image Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            border: "1px solid #e2e8f0",
          }}>
            <h3 style={{
              color: COLORS.navy,
              margin: "0 0 1rem 0",
              fontSize: "1rem",
              fontWeight: 600,
            }}>
              Image Details
            </h3>
            
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Filename</span>
                <span style={{ fontWeight: 500 }}>{filename || "Upload an image"}</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>File Size</span>
                <span style={{ fontWeight: 500 }}>{formatBytes(fileSize)}</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Dimensions</span>
                <span style={{ fontWeight: 500 }}>{width} × {height} pixels</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>MIME Type</span>
                <span style={{ fontWeight: 500 }}>{mimeType || "Unknown"}</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Aspect Ratio</span>
                <span style={{ fontWeight: 500 }}>{width > 0 ? (width / height).toFixed(2) : "N/A"}</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Bits/Pixel</span>
                <span style={{ fontWeight: 500 }}>{mimeType.includes("gif") ? "8" : "24"} (typical)</span>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {image && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
            }}>
              <h3 style={{
                color: COLORS.navy,
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                fontWeight: 600,
              }}>
                Preview
              </h3>
              <img 
                src={image} 
                alt="Uploaded image" 
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  display: "block",
                }}
              />
            </div>
          )}

          <Link href="/dashboard" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "0.75rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            textDecoration: "none",
            color: COLORS.blue,
          }}>
            <ArrowLeftRight style={{ width: "16px", height: "16px" }} />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{
        background: "#fef9f2",
        border: "1px solid #fed8b1",
        borderRadius: "8px",
        padding: "1rem",
      }}>
        <p style={{
          color: COLORS.text,
          fontSize: "0.85rem",
          margin: 0,
          lineHeight: 1.5,
        }}>
          <strong>⚠️ Educational Use Only</strong> — This system is developed as an image-processing demonstration for academic purposes.
        </p>
      </div>
    </div>
  );
}