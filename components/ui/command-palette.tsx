// components/ui/command-palette.tsx — Cmd/Ctrl+K command palette
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Home, FileImage, Camera, Globe, BarChart3, Eye, ArrowLeftRight, Telescope, LogOut } from "lucide-react";
import { COLORS } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: "home", label: "Home", description: "Landing workspace", icon: <Home style={{ width: "16px", height: "16px" }} />, action: () => router.push("/"), keywords: ["dashboard", "main"] },
    { id: "enhance", label: "Image Enhancement", description: "Upload and process medical images", icon: <FileImage style={{ width: "16px", height: "16px" }} />, action: () => router.push("/image-enhancement"), keywords: ["upload", "filter", "enhance"] },
    { id: "xray", label: "X-Ray Mirror AR", description: "Live 3D anatomical tracking", icon: <Camera style={{ width: "16px", height: "16px" }} />, action: () => router.push("/xray-mirror"), keywords: ["ar", "camera", "3d", "anatomy"] },
    { id: "ai", label: "AI Analysis", description: "Body part identification", icon: <Globe style={{ width: "16px", height: "16px" }} />, action: () => router.push("/ai-analysis"), keywords: ["analysis", "ai", "detection"] },
    { id: "histogram", label: "Histogram Analysis", description: "Intensity distribution", icon: <BarChart3 style={{ width: "16px", height: "16px" }} />, action: () => router.push("/histogram-analysis"), keywords: ["histogram", "stats"] },
    { id: "comparison", label: "Image Comparison", description: "Side-by-side comparison", icon: <ArrowLeftRight style={{ width: "16px", height: "16px" }} />, action: () => router.push("/image-comparison"), keywords: ["compare", "diff"] },
    { id: "info", label: "Image Information", description: "Metadata and specs", icon: <Eye style={{ width: "16px", height: "16px" }} />, action: () => router.push("/image-information"), keywords: ["info", "metadata"] },
    { id: "about", label: "About", description: "Project information", icon: <Telescope style={{ width: "16px", height: "16px" }} />, action: () => router.push("/about"), keywords: ["about", "docs"] },
    { id: "dashboard", label: "Dashboard", description: "Main dashboard", icon: <Home style={{ width: "16px", height: "16px" }} />, action: () => router.push("/dashboard"), keywords: ["dashboard", "home"] },
    { id: "logout", label: "Sign Out", description: "Log out of Scanova", icon: <LogOut style={{ width: "16px", height: "16px" }} />, action: () => { clearAuth(); router.push("/login"); }, keywords: ["logout", "signout", "exit"] },
  ];

  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : commands;

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-command-palette]")) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const executeCommand = (cmd: Command) => {
    cmd.action();
    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div
      data-command-palette
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: "520px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* Search input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <Search style={{ width: "20px", height: "20px", color: "#94a3b8" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "1rem",
              color: COLORS.text,
            }}
          />
          <kbd style={{
            fontSize: "0.7rem",
            color: COLORS.muted,
            background: "#f1f5f9",
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            border: "1px solid #e2e8f0",
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{
          maxHeight: "320px",
          overflowY: "auto",
          padding: "0.5rem",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: COLORS.muted, fontSize: "0.9rem" }}>
              No results found
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "none",
                  background: "transparent",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: COLORS.teal }}>{cmd.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: COLORS.text }}>{cmd.label}</div>
                  {cmd.description && (
                    <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>{cmd.description}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "0.5rem 1rem",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.7rem",
          color: COLORS.muted,
        }}>
          <span>Navigate with ↑↓ Enter</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}