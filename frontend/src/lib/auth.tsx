"use client";
// "use client" is needed because this file uses React state, effects and
// localStorage, which only exist in the browser (not during server rendering).

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setUnauthorizedHandler, tokenStorage } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

// "loading"       = we don't know yet (still checking the saved token)
// "authenticated" = we have a valid token and know who the user is
// "anonymous"     = nobody is logged in
type Status = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: Status;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Wrap the whole app in <AuthProvider> (see layout.tsx) so any page can call
// useAuth() to read the current user or log in / out.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // On a 401 from any request: forget the token and go to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStorage.clear();
      setUser(null);
      setStatus("anonymous");
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  // On first load, check whether the saved token is still valid by asking
  // the API who we are. An invalid token gives a 401, handled above.
  useEffect(() => {
    async function checkSavedToken() {
      if (!tokenStorage.get()) {
        setStatus("anonymous");
        return;
      }
      try {
        setUser(await api<User>("/auth/me/"));
        setStatus("authenticated");
      } catch {
        // 401 is already handled; for other errors (e.g. server down) we
        // also treat the user as logged out so the page doesn't hang.
        setStatus("anonymous");
      }
    }
    checkSavedToken();
  }, []);

  const saveSession = useCallback((data: AuthResponse) => {
    tokenStorage.set(data.token);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      saveSession(await api<AuthResponse>("/auth/login/", { method: "POST", body: { username, password } }));
    },
    [saveSession],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      saveSession(
        await api<AuthResponse>("/auth/register/", { method: "POST", body: { username, email, password } }),
      );
    },
    [saveSession],
  );

  const logout = useCallback(async () => {
    try {
      // Tell the server to delete the token so it can't be reused.
      await api("/auth/logout/", { method: "POST" });
    } finally {
      // Even if that request fails, log out locally.
      tokenStorage.clear();
      setUser(null);
      setStatus("anonymous");
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
