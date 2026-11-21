// lib/auth.ts — SCANOVA Authentication utilities
import { DEMO_USERS } from "./config";

// ─── Authentication ───────────────────────────────────────────────────────────

export function authenticate(username: string, password: string): boolean {
  return DEMO_USERS[username as keyof typeof DEMO_USERS] === password;
}

export function isValidUser(username: string): boolean {
  return username in DEMO_USERS;
}

export function getDemoUsername(): string {
  return "demo";
}

export function getDemoPassword(): string {
  return DEMO_USERS.demo;
}