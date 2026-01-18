// src/pages/Login.jsx (FULL FILE)

import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { loading, isLoggedIn, loginAdmin, loginClient } = useAuth();

  const aliveRef = useRef(true);

  const [mode, setMode] = useState("client"); // "client" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ Success + redirect countdown
  const [success, setSuccess] = useState("");
  const [redirectIn, setRedirectIn] = useState(null);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ If already logged in, send to dashboard
  useEffect(() => {
    if (!loading && isLoggedIn) navigate("/dashboard", { replace: true });
  }, [loading, isLoggedIn, navigate]);

  // ✅ guard to avoid flashing login form when logged in
  if (!loading && isLoggedIn) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRedirectIn(null);

    const em = email.trim().toLowerCase();
    const pw = password.trim();

    if (!em) return setError("Email is required");
    if (!pw) return setError("Password is required");

    setSubmitting(true);

    try {
      // ✅ IMPORTANT: AuthContext expects an OBJECT, not (email, password)
      if (mode === "admin") {
        await loginAdmin({ email: em, password: pw, remember });
      } else {
        await loginClient({ email: em, password: pw, remember });
      }

      if (!aliveRef.current) return;

      setSuccess("Signed in successfully ✅");
      setError("");

      let seconds = 2;
      setRedirectIn(seconds);

      const timer = setInterval(() => {
        seconds -= 1;
        if (!aliveRef.current) return clearInterval(timer);

        if (seconds <= 0) {
          clearInterval(timer);
          navigate("/dashboard", { replace: true });
        } else {
          setRedirectIn(seconds);
        }
      }, 1000);
    } catch (err) {
      setError(String(err?.message || "Login failed"));
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }

  if (loading) return <div className="ui-shell">Loading…</div>;

  const locked = submitting || !!success;

  return (
    <div className="ui-shell" style={{ maxWidth: 560 }}>
      <div className="ui-topbar" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="ui-title" style={{ fontSize: 28 }}>
            Sign in
          </h1>
          <div className="ui-sub">
            Choose <strong>Client</strong> or <strong>Admin</strong> login.
          </div>
        </div>
      </div>

      <div className="ui-card ui-card-pad">
        {/* Mode switch */}
        <div className="ui-row" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={`ui-tab ${mode === "client" ? "ui-tab-active" : ""}`}
            onClick={() => {
              setMode("client");
              setError("");
              setSuccess("");
              setRedirectIn(null);
              setPassword("");
            }}
            disabled={locked}
          >
            Client login
          </button>

          <button
            type="button"
            className={`ui-tab ${mode === "admin" ? "ui-tab-active" : ""}`}
            onClick={() => {
              setMode("admin");
              setError("");
              setSuccess("");
              setRedirectIn(null);
              setPassword("");
            }}
            disabled={locked}
          >
            Admin login
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="email"
              className="ui-note"
              style={{ display: "block", marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              className="ui-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={locked}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="password"
              className="ui-note"
              style={{ display: "block", marginBottom: 6 }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              className="ui-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Your password"
              autoComplete="current-password"
              disabled={locked}
            />
          </div>

          <label className="ui-row" style={{ marginTop: 10 }}>
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={locked}
            />
            <span className="ui-note">Remember me</span>
          </label>

          <div className="ui-row" style={{ marginTop: 14 }}>
            <button className="ui-btn ui-btn-primary" type="submit" disabled={locked}>
              {submitting ? "Signing in…" : success ? "Signed in ✅" : "Sign in"}
            </button>

            <Link to="/register" style={{ textDecoration: "none" }}>
              <button className="ui-btn" type="button" disabled={locked}>
                Create account
              </button>
            </Link>
          </div>

          {success && (
            <div className="ui-ok" style={{ marginTop: 12 }}>
              {success}
              <div style={{ marginTop: 6 }}>
                {typeof redirectIn === "number"
                  ? `Redirecting to dashboard in ${redirectIn}s…`
                  : "Redirecting…"}
              </div>
            </div>
          )}

          {error ? (
            <div className="ui-err" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}

          <div style={{ marginTop: 14 }} className="ui-note">
            {mode === "admin" ? (
              <>Admin login is for you (practice owner). Clients should use Client login.</>
            ) : (
              <>Clients can register and instantly access their folders after login.</>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
