import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import RevisarCalificacion from "../components/RevisarCalificacion";
import fondoImagen from "../../assets/fondo.webp";

export default function ExamFeedbackPage() {
  const navigate = useNavigate();

  const revisionCode = localStorage.getItem("revisionCode");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!revisionCode) {
      navigate("/acceso-examen", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!revisionCode) return null;

  return (
    <div
      className="min-h-screen relative bg-cover bg-center bg-fixed transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay día/noche */}
      <div className={`absolute inset-0 transition-all duration-500 ${
        darkMode
          ? "bg-slate-950/88 backdrop-blur-[3px]"
          : "bg-gradient-to-br from-white/88 via-gray-50/85 to-white/88 backdrop-blur-sm"
      }`} />

      {/* Contenido Principal */}
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center min-h-screen">
        
        {/* Header de la página */}
        <div className="mb-8 text-center space-y-2">
          <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-800"}`}>
            Resultados del Examen
          </h1>
          <p className={`text-lg ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Revisión detallada de tus respuestas y calificación.
          </p>
        </div>

        {/* Tarjeta de Cristal (Glassmorphism) que contiene el examen */}
        <div className={`w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border backdrop-blur-xl transition-all duration-500 ${darkMode ? "bg-slate-900/60 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
          <RevisarCalificacion
            intentoId={0}
            codigoRevision={revisionCode}
            readOnly={true}
            studentMode={true}
            darkMode={darkMode}
            onVolver={() => {
              localStorage.removeItem("revisionCode");
              navigate("/acceso-examen", { replace: true });
            }}
            onGradeUpdated={() => {}}
          />
        </div>
      </div>

      {/* Toggle día/noche — mismo patrón que el resto de páginas */}
      <button
        onClick={() => setDarkMode(prev => !prev)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 hover:rotate-12 ${
          darkMode
            ? "bg-slate-800/80 backdrop-blur-xl border-slate-600 text-yellow-400 hover:bg-slate-700"
            : "bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>
    </div>
  );
}
