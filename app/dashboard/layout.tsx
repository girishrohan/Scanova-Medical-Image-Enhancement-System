import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Scanova dashboard — overview of your medical imaging workspace and quick access to all tools.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}