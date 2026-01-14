import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, loading, login, loginClient } = useAuth();

  const [mode, setMode] = useState("admin"); // "admin" | "client"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && isLoggedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isLoggedIn, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const em = email.trim();
    if (!em || !password) {
      setError("Please enter email and password");
      return;
    }

    setSubmitting(true);

    try {
      const doLogin = mode === "client" ? loginClient : login;

      if (mode === "client" && typeof loginClient !== "function") {
        throw new Error("Client login not wired yet (loginClient missing in AuthContext)");
      }

      const result = await doLogin({ email: em, password, remember });

      if (!result || !result.token) {
        throw new Error("Login failed: no token returned");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = String(err?.message || "Login failed");
      setError(msg === "Failed to fetch" ? "Failed to fetch" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2>Login</h2>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode("admin")}
          disabled={submitting}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: submitting ? "not-allowed" : "pointer",
            background: mode === "admin" ? "#111" : "#fff",
            color: mode === "admin" ? "#fff" : "#111",
          }}
        >
          Admin
        </button>

        <button
          type="button"
          onClick={() => setMode("client")}
          disabled={submitting}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: submitting ? "not-allowed" : "pointer",
            background: mode === "client" ? "#111" : "#fff",
            color: mode === "client" ? "#fff" : "#111",
          }}
        >
          Client
        </button>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#666", alignSelf: "center" }}>
          Mode: <strong>{mode === "admin" ? "Admin" : "Client"}</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <input
            name="email"
            placeholder={mode === "client" ? "Client Email" : "Admin Email"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            style={{ width: "100%", padding: 10 }}
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            style={{ width: "100%", padding: 10 }}
            autoComplete="current-password"
          />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={submitting} style={{ padding: "10px 14px" }}>
            {submitting ? "Logging in…" : mode === "client" ? "Login as Client" : "Login as Admin"}
          </button>
        </div>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 12, whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}

      {mode === "client" && (
        <div style={{ marginTop: 14, fontSize: 12, color: "#666" }}>
          <div style={{ marginBottom: 6 }}>
            Client login is restricted to your assigned client folder.
          </div>
          <div>
            If you get <code>Forbidden (client mismatch)</code>, it means you tried to open another client’s folder.
          </div>
        </div>
      )}
    </div>
  );
}
