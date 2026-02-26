import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, Moon, Sun, ChevronRight } from "lucide-react";
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";
import fondoImagen from "../../assets/fondo.webp";
import { authService } from "../services/Authservice";

export default function LandingPage() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Si ya hay sesión activa, ir directo al dashboard
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-cover bg-center relative transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 z-0 transition-all duration-300 ${
          darkMode ? "bg-black/75" : "bg-black/50"
        }`}
      />

      {/* Botón tema */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-6 right-6 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ${
          darkMode
            ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center" style={{ height: "100px" }}>
          <img
            src={darkMode ? logoUniversidadNoche : logoUniversidad}
            alt="Universidad de Ibagué"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Título */}
        <h1 className="text-white text-3xl md:text-4xl font-bold text-center mb-2 drop-shadow-lg">
          Plataforma de Evaluaciones
        </h1>
        <p className="text-white/70 text-base text-center mb-12 drop-shadow">
          Selecciona tu rol para continuar
        </p>

        {/* Tarjetas de selección */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* DOCENTE */}
          <button
            onClick={() => navigate("/teacher-login")}
            className={`group flex flex-col items-center gap-5 p-10 rounded-2xl border-2 shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
              darkMode
                ? "bg-slate-900 border-slate-700 hover:border-blue-500 hover:bg-slate-800"
                : "bg-white/90 border-transparent hover:border-[#003876] hover:bg-white"
            }`}
          >
            <div
              className={`p-5 rounded-2xl transition-colors duration-300 ${
                darkMode
                  ? "bg-blue-600/20 text-blue-400 group-hover:bg-blue-600/30"
                  : "bg-[#003876]/10 text-[#003876] group-hover:bg-[#003876]/20"
              }`}
            >
              <BookOpen className="w-12 h-12" />
            </div>
            <div className="text-center">
              <p
                className={`text-xl font-bold mb-1 transition-colors duration-300 ${
                  darkMode
                    ? "text-white group-hover:text-blue-400"
                    : "text-slate-800 group-hover:text-[#003876]"
                }`}
              >
                Soy Docente
              </p>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Accede al panel de gestión de exámenes
              </p>
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-semibold transition-colors duration-300 ${
                darkMode
                  ? "text-blue-400 group-hover:text-blue-300"
                  : "text-[#003876] group-hover:text-[#00508f]"
              }`}
            >
              Iniciar sesión <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* ESTUDIANTE */}
          <button
            onClick={() => navigate("/acceso-examen")}
            className={`group flex flex-col items-center gap-5 p-10 rounded-2xl border-2 shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
              darkMode
                ? "bg-slate-900 border-slate-700 hover:border-emerald-500 hover:bg-slate-800"
                : "bg-white/90 border-transparent hover:border-emerald-600 hover:bg-white"
            }`}
          >
            <div
              className={`p-5 rounded-2xl transition-colors duration-300 ${
                darkMode
                  ? "bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30"
                  : "bg-emerald-600/10 text-emerald-700 group-hover:bg-emerald-600/20"
              }`}
            >
              <GraduationCap className="w-12 h-12" />
            </div>
            <div className="text-center">
              <p
                className={`text-xl font-bold mb-1 transition-colors duration-300 ${
                  darkMode
                    ? "text-white group-hover:text-emerald-400"
                    : "text-slate-800 group-hover:text-emerald-700"
                }`}
              >
                Soy Estudiante
              </p>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Ingresa el código de tu examen
              </p>
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-semibold transition-colors duration-300 ${
                darkMode
                  ? "text-emerald-400 group-hover:text-emerald-300"
                  : "text-emerald-700 group-hover:text-emerald-800"
              }`}
            >
              Acceder al examen <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
