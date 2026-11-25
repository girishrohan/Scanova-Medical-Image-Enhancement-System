"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COLORS, APP_NAME, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { Check, ArrowRight } from "lucide-react";

const ROLES = ["Student", "Researcher", "Radiologist", "Developer", "Other"];
const USE_CASES = ["Image Enhancement", "X-Ray AR Visualization", "AI Analysis", "Academic Research", "Clinical Demo"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
    }
  }, [router]);

  const toggleUseCase = (uc: string) => {
    setUseCases((prev) =>
      prev.includes(uc) ? prev.filter((u) => u !== uc) : [...prev, uc]
    );
  };

  const handleComplete = () => {
    // Store preferences
    if (typeof window !== "undefined") {
      localStorage.setItem("scanova-onboarding", JSON.stringify({ role, useCases, completed: true }));
    }
    setCompleted(true);
  };

  if (completed) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.background,
        padding: "2rem",
      }}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #14B8A6, #0D9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "2rem",
          }}>
            ✅
          </div>
          <h1 style={{ color: COLORS.navy, margin: "0 0 0.5rem 0", fontSize: "1.75rem", fontWeight: 800 }}>
            You're All Set!
          </h1>
          <p style={{ color: COLORS.muted, margin: "0 0 2rem 0", fontSize: "1rem", lineHeight: 1.6 }}>
            Your preferences have been saved. Explore the dashboard to get started.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              border: "none",
              background: COLORS.blue,
              color: "white",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Go to Dashboard <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: COLORS.background,
      padding: "2rem",
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "2.5rem",
        maxWidth: "520px",
        width: "100%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: COLORS.navy, margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: 800 }}>
            Welcome to {APP_NAME}
          </h1>
          <p style={{ color: COLORS.muted, margin: 0, fontSize: "0.9rem" }}>
            Step {step} of 2 — Let's personalize your experience
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            {[1, 2].map((s) => (
              <div key={s} style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: s <= step ? COLORS.teal : "#e2e8f0",
              }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <h2 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>
              What's your role?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: role === r ? `2px solid ${COLORS.teal}` : "1px solid #e2e8f0",
                    background: role === r ? `${COLORS.teal}10` : "white",
                    color: COLORS.text,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {role === r && <Check style={{ width: "16px", height: "16px", color: COLORS.teal }} />}
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!role}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "none",
                background: !role ? "#cbd5e1" : COLORS.blue,
                color: "white",
                fontWeight: 600,
                cursor: !role ? "not-allowed" : "pointer",
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>
              What will you use Scanova for?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
              {USE_CASES.map((uc) => (
                <button
                  key={uc}
                  onClick={() => toggleUseCase(uc)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: useCases.includes(uc) ? `2px solid ${COLORS.teal}` : "1px solid #e2e8f0",
                    background: useCases.includes(uc) ? `${COLORS.teal}10` : "white",
                    color: COLORS.text,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {useCases.includes(uc) && <Check style={{ width: "16px", height: "16px", color: COLORS.teal }} />}
                  {uc}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: COLORS.muted,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={useCases.length === 0}
                style={{
                  flex: 2,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  background: useCases.length === 0 ? "#cbd5e1" : COLORS.blue,
                  color: "white",
                  fontWeight: 600,
                  cursor: useCases.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Complete Setup
              </button>
            </div>
          </>
        )}

        <p style={{
          color: COLORS.muted,
          fontSize: "0.75rem",
          marginTop: "1.5rem",
          textAlign: "center",
        }}>
          {DISCLAIMER.substring(0, 80)}...
        </p>
      </div>
    </div>
  );
}