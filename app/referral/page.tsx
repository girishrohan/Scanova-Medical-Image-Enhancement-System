"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COLORS, APP_NAME, APP_VERSION } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";
import { Copy, Check, Share2, Gift, Users, TrendingUp } from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [referralCode] = useState("SCANOVA-" + Math.random().toString(36).substring(2, 8).toUpperCase());

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = referralCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stats = [
    { label: "Invites Sent", value: "0", icon: Share2 },
    { label: "Sign-ups", value: "0", icon: Users },
    { label: "Credits Earned", value: "0", icon: Gift },
    { label: "Conversion Rate", value: "0%", icon: TrendingUp },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "2rem",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
      }}>
        <div>
          <h1 style={{ color: COLORS.navy, margin: "0 0 0.5rem 0", fontSize: "1.75rem", fontWeight: 800 }}>
            Referral & Invite
          </h1>
          <p style={{ color: COLORS.muted, margin: 0, fontSize: "0.9rem" }}>
            Share Scanova with your colleagues and earn credits
          </p>
        </div>
        <button onClick={handleLogout} style={{
          background: "none", border: "none", color: COLORS.muted, cursor: "pointer",
          padding: "0.5rem 1rem", fontSize: "0.9rem",
        }}>
          🚪 Logout
        </button>
      </div>

      {/* Referral Code Card */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "2rem",
        border: "1px solid #e2e8f0",
        marginBottom: "1.5rem",
        textAlign: "center",
      }}>
        <h2 style={{ color: COLORS.navy, margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700 }}>
          Your Referral Code
        </h2>
        <p style={{ color: COLORS.muted, margin: "0 0 1.5rem 0", fontSize: "0.9rem" }}>
          Share this code with friends and colleagues
        </p>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}>
          <code style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: COLORS.navy,
            background: COLORS.background,
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            letterSpacing: "0.1em",
          }}>
            {referralCode}
          </code>
          <button
            onClick={handleCopy}
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: copied ? COLORS.teal : "white",
              color: copied ? "white" : COLORS.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {copied ? <Check style={{ width: "18px", height: "18px" }} /> : <Copy style={{ width: "18px", height: "18px" }} />}
          </button>
        </div>
        <p style={{ color: COLORS.muted, fontSize: "0.8rem", margin: 0 }}>
          {copied ? "Copied to clipboard!" : "Click to copy your referral code"}
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.25rem",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}>
            <stat.icon style={{ width: "24px", height: "24px", color: COLORS.teal, marginBottom: "0.5rem" }} />
            <p style={{ color: COLORS.muted, margin: "0 0 0.25rem 0", fontSize: "0.8rem" }}>{stat.label}</p>
            <p style={{ color: COLORS.navy, margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "1.5rem",
        border: "1px solid #e2e8f0",
      }}>
        <h2 style={{ color: COLORS.navy, margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>
          How Referrals Work
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            "Share your referral code with colleagues",
            "They sign up using your code",
            "You both earn credits when they become active users",
            "Redeem credits for premium features",
          ].map((step, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: COLORS.teal,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {idx + 1}
              </div>
              <span style={{ color: COLORS.text, fontSize: "0.9rem" }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: "2rem",
        padding: "0.75rem 1rem",
        background: "#fef9f2",
        border: "1px solid #fed8b1",
        borderRadius: "8px",
        fontSize: "0.8rem",
        color: "#78350f",
      }}>
        <strong>⚠ Educational use only.</strong> Referral system is for demonstration purposes.
      </div>
    </div>
  );
}