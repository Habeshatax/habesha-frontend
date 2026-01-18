// src/pages/Registered.jsx (FULL FILE)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Registered() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    // Optional: auto-redirect if token already stored
    if (isLoggedIn) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [isLoggedIn, navigate]);

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2>✅ Registration successful</h2>

      <p style={{ color: "#444" }}>
        Your account has been created and your client folder is ready.
      </p>

      {user?.email && (
        <p style={{ marginTop: 8, color: "#555" }}>
          Signed in as <strong>{user.email}</strong>
        </p>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/dashboard", { replace: true })} style={{ padding: "10px 14px" }}>
          Go to dashboard
        </button>

        <button onClick={() => navigate("/login", { replace: true })} style={{ padding: "10px 14px" }}>
          Back to login
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: "#666" }}>
        Tip: If you refresh and you’re already logged in, you’ll go straight to the dashboard.
      </div>
    </div>
  );
}
