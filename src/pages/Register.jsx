import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { isLoggedIn, loading, registerClientAccount } = useAuth();

  const aliveRef = useRef(true);

  const [businessType, setBusinessType] = useState("self_assessment");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [services, setServices] = useState({
    self_assessment: true,
    landlords: false,
    limited_company: false,
    payroll: false,
    vat_mtd: false,
    bookkeeping: false,
    home_office: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ Success message + redirect countdown
  const [success, setSuccess] = useState("");
  const [redirectIn, setRedirectIn] = useState(null);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ If logged in, redirect away (don’t show form)
  useEffect(() => {
    if (!loading && isLoggedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isLoggedIn, navigate]);

  // Keep services aligned with businessType
  useEffect(() => {
    setServices((prev) => {
      const next = { ...prev };

      if (businessType === "self_assessment") {
        next.self_assessment = true;
        next.landlords = false;
        next.limited_company = false;
      } else if (businessType === "landlords") {
        next.landlords = true;
        next.self_assessment = false;
        next.limited_company = false;
      } else if (businessType === "limited_company") {
        next.limited_company = true;
        next.self_assessment = false;
        next.landlords = false;
      }
      return next;
    });
  }, [businessType]);

  const servicesArray = useMemo(() => {
    return Object.entries(services)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [services]);

  function toggleService(key) {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRedirectIn(null);

    const em = email.trim().toLowerCase();
    const pw = password.trim();

    if (!em) return setError("Email is required");
    if (pw.length < 8) return setError("Password must be at least 8 characters");

    if (businessType === "limited_company") {
      if (!companyName.trim()) return setError("Company name is required for limited companies");
    } else {
      if (!firstName.trim() || !lastName.trim()) return setError("First name and last name are required");
    }

    setSubmitting(true);

    try {
      const payload = {
        businessType,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
        email: em,
        password: pw,
        services: servicesArray,
      };

      const result = await registerClientAccount(payload, remember);
      if (!result?.token) throw new Error("Register failed: no token returned");

      if (!aliveRef.current) return;

      setSuccess("Registered successfully ✅");
      setError("");

      let seconds = 2;
      setRedirectIn(seconds);

      const timer = setInterval(() => {
        seconds -= 1;

        if (!aliveRef.current) {
          clearInterval(timer);
          return;
        }

        if (seconds <= 0) {
          clearInterval(timer);
          // ✅ go to Welcome first, then Check Email
          navigate("/welcome", { replace: true, state: { email: em } });
        } else {
          setRedirectIn(seconds);
        }
      }, 1000);
    } catch (err) {
      const msg = String(err?.message || "Register failed");
      setError(msg);
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  const locked = submitting || !!success;

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h2>Client Registration</h2>

      <p style={{ marginTop: 6, color: "#555" }}>
        Register here. Your folder will be created automatically in the backend.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>Business type</div>
          <select
            style={{ width: "100%", padding: 10 }}
            value={businessType}
            disabled={locked}
            onChange={(e) => {
              setBusinessType(e.target.value);
              if (error) setError("");
            }}
          >
            <option value="self_assessment">Self Assessment (Individual/Sole trader)</option>
            <option value="landlords">Landlords</option>
            <option value="limited_company">Limited Company</option>
          </select>
        </div>

        {businessType === "limited_company" ? (
          <div style={{ marginBottom: 10 }}>
            <input
              placeholder="Company name (e.g. Bubbly Day Nursery Ltd)"
              value={companyName}
              disabled={locked}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (error) setError("");
              }}
              style={{ width: "100%", padding: 10 }}
              autoComplete="organization"
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input
              placeholder="First name"
              value={firstName}
              disabled={locked}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (error) setError("");
              }}
              style={{ width: "100%", padding: 10 }}
              autoComplete="given-name"
            />
            <input
              placeholder="Last name"
              value={lastName}
              disabled={locked}
              onChange={(e) => {
                setLastName(e.target.value);
                if (error) setError("");
              }}
              style={{ width: "100%", padding: 10 }}
              autoComplete="family-name"
            />
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Email"
            value={email}
            disabled={locked}
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
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            disabled={locked}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            style={{ width: "100%", padding: 10 }}
            autoComplete="new-password"
          />
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
            opacity: locked ? 0.7 : 1,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Services (folders)</div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.self_assessment}
              onChange={() => toggleService("self_assessment")}
              disabled={locked || businessType === "self_assessment"}
            />
            Self Assessment
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.landlords}
              onChange={() => toggleService("landlords")}
              disabled={locked || businessType === "landlords"}
            />
            Landlords
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.limited_company}
              onChange={() => toggleService("limited_company")}
              disabled={locked || businessType === "limited_company"}
            />
            Limited Company
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.bookkeeping}
              onChange={() => toggleService("bookkeeping")}
              disabled={locked}
            />
            Bookkeeping
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.vat_mtd}
              onChange={() => toggleService("vat_mtd")}
              disabled={locked}
            />
            MTD VAT
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={services.payroll}
              onChange={() => toggleService("payroll")}
              disabled={locked}
            />
            Payroll
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={services.home_office}
              onChange={() => toggleService("home_office")}
              disabled={locked}
            />
            Home Office / Other
          </label>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={locked}
          />
          Remember me
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" disabled={locked} style={{ padding: "10px 14px" }}>
            {submitting ? "Registering…" : success ? "Registered ✅" : "Register"}
          </button>

          <button type="button" disabled={locked} onClick={() => navigate("/login")} style={{ padding: "10px 14px" }}>
            Back to login
          </button>
        </div>

        {success && (
          <p style={{ color: "#0a7", marginTop: 12 }}>
            {success}
            <br />
            Redirecting in {redirectIn}s…
          </p>
        )}

        {error && (
          <p style={{ color: "red", marginTop: 12, whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
