// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return isLoggedIn ? <Outlet /> : <Navigate to="/" replace />;
}
