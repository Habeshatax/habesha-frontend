// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ClientFiles from "./pages/ClientFiles.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      {/* ✅ Public */}
      <Route path="/login" element={<Login />} />

      {/* ✅ Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients/:client" element={<ClientFiles />} />
      </Route>

      {/* ✅ Root */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ✅ Catch-all (prevents white page) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
