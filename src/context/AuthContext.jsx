// src/context/AuthContext.jsx (FULL FILE)

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, getMe } from "../services/api";

// --------------------------------------------
// Helpers for token storage
// --------------------------------------------
function readToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function saveToken(token, remember = true) {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  if (remember) localStorage.setItem("token", token);
  else sessionStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

// --------------------------------------------
// Context
// --------------------------------------------
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken()); // boot from storage
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Logged in if token exists. (User may load after /api/me)
  const isLoggedIn = !!token;

  // Login (calls POST /login)
  // backend returns: { ok:true, token, user }
  const login = async ({ email, password, remember = true }) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error("Please enter email and password");
    }

    const data = await loginRequest(cleanEmail, cleanPassword);

    if (!data?.token) {
      throw new Error("Login failed: token not returned by server");
    }

    saveToken(data.token, remember);

    // ✅ update state immediately
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  // Logout (client-side only)
  const logout = () => {
    clearToken();
    setToken("");
    setUser(null);
  };

  // On app load/refresh:
  // If token exists -> call /api/me to validate + load user
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);

      const t = readToken();

      if (!t) {
        if (!cancelled) {
          setToken("");
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        // token exists locally; validate by calling /api/me
        const me = await getMe(); // expected: { ok:true, user }

        if (!cancelled) {
          setToken(t);
          setUser(me?.user || null);
        }
      } catch {
        // token invalid/expired OR backend said 401
        clearToken();
        if (!cancelled) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoggedIn,
      loading,
      login,
      logout,
    }),
    [token, user, isLoggedIn, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
