import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, loading, login } = useAuth();

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
      const result = await login({ email: em, password, remember });

      if (!result || !result.token) {
        throw new Error("Login failed: no token returned");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      // Keep message simple for fetch/CORS issues
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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <input
            name="email"
            placeholder="Email"
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
            {submitting ? "Logging in…" : "Login"}
          </button>
        </div>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 12, whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}
    </div>
  );
}
