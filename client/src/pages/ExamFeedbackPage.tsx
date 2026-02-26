import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RevisarCalificacion from "../components/RevisarCalificacion";

export default function ExamFeedbackPage() {
  const navigate = useNavigate();

  // Leer directamente de localStorage (síncrono, sin eliminar para evitar problema de StrictMode)
  const revisionCode = localStorage.getItem("revisionCode");
  const darkMode = (() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  })();

  useEffect(() => {
    if (!revisionCode) {
      navigate("/acceso-examen", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!revisionCode) return null;

  return (
    <div className={`h-screen flex flex-col ${darkMode ? "bg-slate-900" : "bg-white"}`}>
      <RevisarCalificacion
        intentoId={0}
        codigoRevision={revisionCode}
        readOnly={true}
        darkMode={darkMode}
        onVolver={() => {
          localStorage.removeItem("revisionCode");
          navigate("/acceso-examen", { replace: true });
        }}
        onGradeUpdated={() => {}}
      />
    </div>
  );
}
