"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { authenticate, getDemoPassword, getDemoUsername, isValidUser } from "@/lib/auth";
import { COLORS, DISCLAIMER, APP_NAME, APP_VERSION } from "@/lib/config";
import { ShieldCheck, AlertCircle, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";

type View = "login" | "forgot" | "forgot-sent";

function LoginForm() {
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password state
  const [view, setView] = useState<View>("login");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (authenticate(username, password)) {
      if (rememberMe) {
        const authData = {
          authenticated: true,
          username: username,
          timestamp: Date.now(),
        };
        localStorage.setItem("scanova-auth", JSON.stringify(authData));
      }
      router.push(callbackUrl);
    } else {
      setError("Invalid username or password. Try demo credentials.");
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);

    // Simulate network delay for reset request
    await new Promise((resolve) => setTimeout(resolve, 800));

    // In a real app, this would call an API endpoint:
    // POST /api/auth/forgot-password { identifier: forgotIdentifier }
    // The endpoint should NOT reveal whether the account exists (security).
    // For demo: accept any non-empty identifier and show success.
    if (forgotIdentifier.trim().length === 0) {
      setForgotError("Please enter your username or email.");
      setForgotLoading(false);
      return;
    }

    // Demo: check if user exists (in production, the API handles this silently)
    if (!isValidUser(forgotIdentifier.trim())) {
      // Security: don't reveal whether account exists
      // In production, always show success to prevent account enumeration
      setForgotSuccess(true);
      setView("forgot-sent");
      setForgotLoading(false);
      return;
    }

    // In production, the backend would send a reset email here.
    // For demo, we show a success message.
    setForgotSuccess(true);
    setView("forgot-sent");
    setForgotLoading(false);
  };

  const resetForgotState = () => {
    setForgotIdentifier("");
    setForgotError("");
    setForgotSuccess(false);
    setForgotLoading(false);
  };

  const goBackToLogin = () => {
    resetForgotState();
    setView("login");
  };

  // ─── Forgot Password: Sent Confirmation ───────────────────────────────────
  if (view === "forgot-sent") {
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
            ✉️
          </div>

          <h1 style={{
            color: COLORS.navy,
            margin: "0 0 0.5rem 0",
            fontSize: "1.5rem",
            fontWeight: 800,
          }}>
            Check Your Email
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: "0 0 2rem 0",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}>
            If an account exists for <strong>{forgotIdentifier}</strong>, a password reset link has been sent. Please check your inbox (and spam folder).
          </p>

          <div style={{
            background: COLORS.background,
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "left",
          }}>
            <p style={{
              margin: 0,
              color: COLORS.muted,
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}>
              <strong>Note:</strong> In this demo environment, no actual email is sent. In production, configure your email provider (SendGrid, Resend, etc.) via the <code>EMAIL_API_KEY</code> environment variable and the <code>/api/auth/forgot-password</code> endpoint.
            </p>
          </div>

          <button
            onClick={goBackToLogin}
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
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ─── Forgot Password: Request Form ──────────────────────────────────────────
  if (view === "forgot") {
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
          <button
            onClick={goBackToLogin}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              padding: "0.5rem",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "1rem",
            }}
          >
            <ArrowLeft style={{ width: "16px", height: "16px" }} /> Back to Sign In
          </button>

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
            🔑
          </div>

          <h1 style={{
            color: COLORS.navy,
            margin: "0 0 0.5rem 0",
            fontSize: "1.5rem",
            fontWeight: 800,
          }}>
            Reset Password
          </h1>
          <p style={{
            color: COLORS.muted,
            margin: "0 0 2rem 0",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}>
            Enter your username or email and we'll send you a link to reset your password.
          </p>

          {forgotError && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#dc2626",
              fontSize: "0.9rem",
            }}>
              {forgotError}
            </div>
          )}

          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="text"
                placeholder="Username or email"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
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
                disabled={forgotLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              style={{
                width: "100%",
                padding: "1rem",
                background: forgotLoading ? "#cbd5e1" : `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.blueDim})`,
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: forgotLoading ? "not-allowed" : "pointer",
              }}
            >
              {forgotLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div style={{
            background: COLORS.background,
            borderRadius: "12px",
            padding: "1rem",
            marginTop: "1.5rem",
            textAlign: "left",
          }}>
            <p style={{
              margin: 0,
              color: COLORS.muted,
              fontSize: "0.8rem",
              lineHeight: 1.5,
            }}>
              <strong>Demo note:</strong> No actual email is sent. In production, wire this to <code>/api/auth/forgot-password</code> with an email provider (SendGrid, Resend, etc.) via the <code>EMAIL_API_KEY</code> env var.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login Form ─────────────────────────────────────────────────────────────
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

          <div style={{ marginBottom: "1.5rem", position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "1rem",
                paddingRight: "3rem",
                fontSize: "1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              disabled={isLoading}
              required
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: COLORS.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showPassword ? (
                <EyeOff style={{ width: "20px", height: "20px" }} />
              ) : (
                <Eye style={{ width: "20px", height: "20px" }} />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
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

            <button
              type="button"
              onClick={() => {
                setError("");
                setView("forgot");
              }}
              style={{
                background: "none",
                border: "none",
                color: COLORS.blue,
                textDecoration: "none",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Forgot password?
            </button>
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