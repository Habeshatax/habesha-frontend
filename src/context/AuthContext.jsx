// src/context/AuthContext.jsx (FULL FILE)

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, clientLoginRequest, clientRegister, getMe } from "../services/api";

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
  const [token, setToken] = useState(readToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!token;

  // Admin login
  const loginAdmin = async ({ email, password, remember = true }) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();
    if (!cleanEmail || !cleanPassword) throw new Error("Please enter email and password");

    const data = await loginRequest(cleanEmail, cleanPassword);
    if (!data?.token) throw new Error("Login failed: token not returned by server");

    saveToken(data.token, remember);
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  // Client login
  const loginClient = async ({ email, password, remember = true }) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();
    if (!cleanEmail || !cleanPassword) throw new Error("Please enter email and password");

    const data = await clientLoginRequest(cleanEmail, cleanPassword);
    if (!data?.token) throw new Error("Login failed: token not returned by server");

    saveToken(data.token, remember);
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  // Client registration -> backend creates folder + user entry + returns token
  const registerClientAccount = async (payload, remember = true) => {
    const data = await clientRegister(payload);
    if (!data?.token) throw new Error("Register failed: token not returned by server");

    saveToken(data.token, remember);
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  // Logout
  const logout = () => {
    clearToken();
    setToken("");
    setUser(null);
  };

  // On app load: validate token
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
        const me = await getMe();
        if (!cancelled) {
          setToken(t);
          setUser(me?.user || null);
        }
      } catch {
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
      loginAdmin,
      loginClient,
      registerClientAccount,
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
