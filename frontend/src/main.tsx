import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { DataProvider } from "./DataContext";
import RegisterPage from "./pages/RegisterPage";
import ConfigPage from "./pages/ConfigPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = '<div style="color:red;padding:20px;">Error: root element not found</div>';
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RegisterPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    );
  } catch (e: any) {
    rootEl.innerHTML = `<div style="color:red;padding:20px;background:#111;font-family:monospace;"><h2>App Error</h2><pre>${e.message || e}</pre></div>`;
  }
}
