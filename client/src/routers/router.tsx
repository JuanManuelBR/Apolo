import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const ExamAccessPage = lazy(() => import("../pages/ExamAccessPage"));
const ExamSolverPage = lazy(() => import("../pages/ExamSolverPage"));
const ExamFeedbackPage = lazy(() => import("../pages/ExamFeedbackPage"));
const LandingPage = lazy(() => import("../pages/LandingPage"));

// Componente para proteger rutas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const usuario = localStorage.getItem('usuario');

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function MyRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Landing page: role selection */}
          <Route path="/" element={<LandingPage />} />

          {/* Login (public) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Register (public) */}
          <Route path="/register" element={<RegisterPage />} />

          {/* Exam access (public) */}
          <Route path="/exam-access" element={<ExamAccessPage />} />

          {/* Exam solver (public) */}
          <Route path="/exam-solver" element={<ExamSolverPage />} />

          {/* Grade review (public) */}
          <Route path="/exam-feedback" element={<ExamFeedbackPage />} />

          {/* Dashboard (protected) - uses /* to allow internal sub-routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/teacher-login" element={<Navigate to="/login" replace />} />
          <Route path="/teacher-registration" element={<Navigate to="/register" replace />} />
          <Route path="/acceso-examen" element={<Navigate to="/exam-access" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
