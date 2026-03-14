import { createContext, useContext, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "eventmart_auth_v1";

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: "", user: null };
  } catch (_error) {
    return { token: "", user: null };
  }
}

function withSavedAt(next) {
  return {
    token: next?.token || "",
    user: next?.user || null,
    saved_at: new Date().toISOString()
  };
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  function persist(next) {
    const normalized = withSavedAt(next);
    setSession(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  async function login(payload) {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: payload
    });
    persist({ token: result.token, user: result.user });
    return result;
  }

  async function register(payload) {
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      body: payload
    });
    persist({ token: result.token, user: result.user });
    return result;
  }

  function logout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Ignore storage errors.
    }
    setSession({ token: "", user: null });
  }

  function updateSession(nextSession) {
    persist(nextSession);
  }

  const firstName = String(session?.user?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || "";

  const value = useMemo(
    () => ({
      token: session.token || "",
      user: session.user || null,
      firstName,
      isAuthenticated: Boolean(session.token && session.user),
      login,
      register,
      logout,
      updateSession
    }),
    [session, firstName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export { AuthProvider, useAuth };
