"use client";

import { LoginPanel } from "@/features/auth/login-panel";
import { ProjectWorkspace } from "@/features/projects/project-workspace";
import { useAuthStore } from "@/lib/auth-store";

export default function HomePage() {
  const token = useAuthStore((state) => state.token);
  return token ? <ProjectWorkspace /> : <LoginPanel />;
}
