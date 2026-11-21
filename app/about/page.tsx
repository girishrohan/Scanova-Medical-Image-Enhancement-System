"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Award, 
  BookOpen, 
  Code, 
  Globe, 
  GraduationCap, 
  ShieldCheck, 
  Telescope, 
  Users,
  ArrowLeftRight
} from "lucide-react";
import Link from "next/link";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER, PROJECT_FULL_NAME } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

export default function AboutPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
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
            About {APP_NAME}
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: "0.9rem",
          }}>
            {PROJECT_FULL_NAME}
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
        {/* Main Content */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
        }}>
          <h2 style={{
            color: COLORS.navy,
            margin: "0 0 1rem 0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}>
            Project Overview
          </h2>
          
          <p style={{
            color: COLORS.text,
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}>
            {APP_NAME} is a medical image enhancement system developed for educational and research purposes. 
            The system implements advanced denoising, contrast enhancement, and sharpening algorithms to improve 
            image quality for diagnostic visualization and teaching demonstrations.
          </p>

          <h3 style={{
            color: COLORS.navy,
            margin: "1rem 0 0.5rem 0",
            fontSize: "1.1rem",
            fontWeight: 600,
          }}>
            Core Features
          </h3>
          
          <ul style={{
            color: COLORS.text,
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}>
            <li>• <strong>Image Enhancement Pipeline</strong> — 6-stage processing: noise reduction, contrast adjustment, and sharpening</li>
            <li>• <strong>X-Ray Mirror AR</strong> — Real-time anatomical visualization with webcam integration</li>
            <li>• <strong>AI Analysis Dashboard</strong> — Automated body part identification and abnormality detection</li>
            <li>• <strong>Statistical Analysis</strong> — Histogram, entropy, contrast, and sharpness metrics</li>
            <li>• <strong>FPGA-Accelerated Processing</strong> — Hardware-accelerated algorithms for real-time performance</li>
          </ul>

          <h3 style={{
            color: COLORS.navy,
            margin: "1rem 0 0.5rem 0",
            fontSize: "1.1rem",
            fontWeight: 600,
          }}>
            Supported Modalities
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}>
            {["Chest X-Ray", "Brain MRI", "Knee CT", "Other DICOM/RAW formats"]?.map((modality) => (
              <div key={modality} style={{
                padding: "0.5rem",
                background: "#f8fafc",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center",
              }}>
                {modality}
              </div>
            ))}
          </div>

          <h3 style={{
            color: COLORS.navy,
            margin: "1rem 0 0.5rem 0",
            fontSize: "1.1rem",
            fontWeight: 600,
          }}>
            Educational Use
          </h3>
          
          <p style={{
            color: COLORS.text,
            lineHeight: 1.6,
          }}>
            This system is intended for educational demonstrations only. The visualizations and analyses 
            should not be used for clinical diagnosis. Professional medical oversight is required for 
            any clinical application.
          </p>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            background: COLORS.navy,
            borderRadius: "12px",
            padding: "1.5rem",
            color: "white",
            textAlign: "center",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.blue})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}>
              <Telescope style={{ width: "32px", height: "32px", color: "white" }} />
            </div>
            <h3 style={{
              color: "white",
              margin: "0 0 0.5rem 0",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}>
              {APP_NAME}
            </h3>
            <p style={{
              color: "#e2e8f0",
              margin: 0,
              fontSize: "0.9rem",
            }}>
              Educational Edition
            </p>
            <p style={{
              color: "#cbd5e1",
              margin: "0.25rem 0 0 0",
              fontSize: "0.85rem",
            }}>
              v{APP_VERSION}
            </p>
          </div>

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
              Resources
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: COLORS.blue,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <BookOpen style={{ width: "16px", height: "16px" }} />
                GitHub Repository
              </a>
              <a
                href="https://docs.example.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: COLORS.blue,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <BookOpen style={{ width: "16px", height: "16px" }} />
                Documentation
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: COLORS.blue,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Code style={{ width: "16px", height: "16px" }} />
                Source Code
              </a>
            </div>
          </div>

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