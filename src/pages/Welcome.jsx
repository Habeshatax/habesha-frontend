import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  const emailFromState = location?.state?.email || "";
  const [email, setEmail] = useState(String(emailFromState).trim());
  const [seconds, setSeconds] = useState(2);

  useEffect(() => {
    // If state is missing (page refresh), still work
    if (!emailFromState && !email) setEmail("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const masked = useMemo(() => maskEmail(email), [email]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      navigate("/check-email", { replace: true, state: { email } });
    }
  }, [seconds, navigate, email]);

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2>Welcome 🎉</h2>

      <p style={{ marginTop: 8, color: "#555" }}>
        Your account has been created{email ? ` for ${masked}` : ""}.
      </p>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>What happens next</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#333" }}>
          <li style={{ marginBottom: 6 }}>Your folders are ready.</li>
          <li style={{ marginBottom: 6 }}>We’ve notified the admin.</li>
          <li>You’ll now be taken to the “Check your email” screen.</li>
        </ul>
      </div>

      <div style={{ marginTop: 14, color: "#777", fontSize: 13 }}>
        Redirecting in {seconds}s…
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/check-email", { state: { email } })} style={{ padding: "10px 14px" }}>
          Continue
        </button>

        {isLoggedIn && (
          <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 14px" }}>
            Go to dashboard
          </button>
        )}
      </div>
    </div>
  );
}

function maskEmail(email) {
  const e = String(email || "").trim();
  if (!e.includes("@")) return e;

  const [name, domain] = e.split("@");
  if (!name || !domain) return e;

  const safeName = name.length <= 2 ? `${name[0] || ""}*` : `${name.slice(0, 2)}***`;

  const parts = domain.split(".");
  const root = parts[0] || domain;
  const tld = parts.slice(1).join(".") || "";

  const safeRoot = root.length <= 2 ? `${root[0] || ""}*` : `${root.slice(0, 2)}***`;

  return `${safeName}@${safeRoot}${tld ? "." + tld : ""}`;
}
