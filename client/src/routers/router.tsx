import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import PrincipalPage from "../pages/PrincipalPage";
import ExamAccessPage from "../pages/ExamAccessPage";
import ExamSolver from "../pages/ExamSolver";
import ExamFeedbackPage from "../pages/ExamFeedbackPage";
import LandingPage from "../pages/LandingPage";

// Componente para proteger rutas
function RutaProtegida({ children }: { children: React.ReactNode }) {
  const usuario = localStorage.getItem('usuario');

  // Si no hay usuario, redirige al login
  if (!usuario) {
    return <Navigate to="/teacher-login" replace />;
  }

  // Si hay usuario, muestra la página
  return <>{children}</>;
}

export function MyRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página de inicio: selección de rol */}
        <Route path="/" element={<LandingPage />} />

        {/* Ruta del Login (pública) */}
        <Route path="/teacher-login" element={<LoginPage />} />

        {/* Ruta del Registro (pública) */}
        <Route path="/teacher-registration" element={<RegisterPage />} />

        {/* Ruta de Acceso a Examen (pública) */}
        <Route path="/acceso-examen" element={<ExamAccessPage />} />

        {/* Ruta del Examen (pública) */}
        <Route path="/exam-solver" element={<ExamSolver />} />

        {/* Ruta de Revisión de Calificación (pública) */}
        <Route path="/exam-feedback" element={<ExamFeedbackPage />} />

        {/* Ruta Principal (protegida) - usa /* para permitir sub-rutas internas */}
        <Route
          path="/*"
          element={
            <RutaProtegida>
              <PrincipalPage />
            </RutaProtegida>
          }
        />

        {/* Cualquier otra ruta redirige a la landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}