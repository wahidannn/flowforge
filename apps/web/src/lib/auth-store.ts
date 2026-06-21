"use client";

import { create } from "zustand";

type AuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window === "undefined" ? null : localStorage.getItem("flowforge_token"),
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("flowforge_token", token);
      else localStorage.removeItem("flowforge_token");
    }
    set({ token });
  },
}));
