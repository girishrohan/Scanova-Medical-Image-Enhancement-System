"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { authenticate, getDemoPassword, getDemoUsername } from "@/lib/auth";
import { COLORS, DISCLAIMER, APP_NAME, APP_VERSION } from "@/lib/config";
import { ShieldCheck, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Demo credentials
    const demoUsername = getDemoUsername();
    const demoPassword = getDemoPassword();

    if (authenticate(username, password)) {
      // Store auth state in localStorage for persistence
      if (rememberMe) {
        const authData = {
          authenticated: true,
          username: username,
          timestamp: Date.now(),
        };
        localStorage.setItem("scanova-auth", JSON.stringify(authData));
      }
      
      // Redirect to dashboard or callback URL
      router.push(callbackUrl);
    } else {
      setError("Invalid username or password. Try demo credentials.");
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f5f8fc 0%, #e8ecf4 100%)",
      padding: "2rem",
    }}>
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "3rem 2.5rem",
        boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          width: "80px",
          height: "80px",
          background: "linear-gradient(135deg, #14B8A6, #0D9488)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.5rem",
          margin: "0 auto 1.5rem",
          boxShadow: "0 8px 24px rgba(20, 184, 166, 0.3)",
        }}>
          🩻
        </div>
        
        {/* Title */}
        <h1 style={{
          color: COLORS.navy,
          margin: "0 0 0.5rem 0",
          fontSize: "2rem",
          fontWeight: 800,
        }}>
          {APP_NAME}
        </h1>
        <p style={{
          color: COLORS.muted,
          margin: "0 0 2rem 0",
          fontSize: "1rem",
          fontStyle: "italic",
        }}>
          Scanova Medical Imaging System
        </p>

        {/* Demo Credentials Box */}
        <div style={{
          background: COLORS.background,
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          textAlign: "left",
        }}>
          <p style={{
            margin: "0 0 0.75rem 0",
            color: COLORS.muted,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}>
            Demo Credentials
          </p>
          <div style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: COLORS.text,
            lineHeight: "1.8",
          }}>
            <strong>Username:</strong> demo<br />
            <strong>Password:</strong> scanova2024
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              disabled={isLoading}
              required
            />
          </div>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              disabled={isLoading}
              required
            />
          </div>

          {/* Remember Me */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              Remember me
            </label>
            
            <a 
              href="#" 
              style={{
                color: COLORS.blue,
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
              onClick={(e) => {
                e.preventDefault();
                // Handle forgot password
                alert("Password reset would be implemented in production");
              }}
            >
              Forgot password?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#dc2626",
              fontSize: "0.9rem",
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "1rem",
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.blueDim})`,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.target as HTMLButtonElement).style.boxShadow = `0 4px 12px rgba(30, 64, 175, 0.3)`;
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Disclaimer */}
        <div style={{ marginTop: "2rem" }}>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1.5rem 0" }} />
          <p style={{
            fontSize: "0.85rem",
            color: COLORS.muted,
            margin: 0,
          }}>
            ⚠️ {DISCLAIMER.substring(0, 100)}...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}