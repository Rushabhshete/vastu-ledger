import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SocietyConfigProvider } from "./context/SocietyConfigContext.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";

// Pages
import LoginPage from "./pages/auth/LoginPage.jsx";
import CommandCenterPage from "./pages/dashboard/CommandCenterPage.jsx";
import MaintenanceBillsPage from "./pages/ledger/MaintenanceBillsPage.jsx";
import ExpenseVaultPage from "./pages/ledger/ExpenseVaultPage.jsx";
import AgmPollsPage from "./pages/governance/AgmPollsPage.jsx";
import AdminControlPanelPage from "./pages/admin/AdminControlPanelPage.jsx";
import PlatformSocietiesPage from "./pages/admin/PlatformSocietiesPage.jsx";

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocietyConfigProvider>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Society Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <CommandCenterPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/bills"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <MaintenanceBillsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ExpenseVaultPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/governance"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <AgmPollsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AppShell>
                      <AdminControlPanelPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/platform/societies"
                element={
                  <ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN"]}>
                    <AppShell>
                      <PlatformSocietiesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocietyConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
