import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, School, Moon, Sun, ChevronRight } from "lucide-react";
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

  const [showEasterEgg] = useState(() => window.innerWidth >= 768 && Math.random() < 1 / 10);

  const galaxyBg = useMemo(() => {
    const cols = 10, rows = 7;
    const cw = 100 / cols, rh = 100 / rows;
    const stars: string[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x  = (col * cw + Math.random() * cw).toFixed(1);
        const y  = (row * rh + Math.random() * rh).toFixed(1);
        const r  = (Math.random() * 2.2 + 0.8).toFixed(1);
        const op = (Math.random() * 0.45 + 0.55).toFixed(2);
        stars.push(`radial-gradient(circle ${r}px at ${x}% ${y}%, rgba(255,255,255,${op}) 0%, transparent 100%)`);
      }
    }

    const nebulas = [
      `radial-gradient(ellipse 35% 60% at 20% 50%, rgba(139,92,246,0.55) 0%, transparent 70%)`,
      `radial-gradient(ellipse 30% 50% at 75% 40%, rgba(59,130,246,0.45) 0%, transparent 70%)`,
      `radial-gradient(ellipse 25% 45% at 50% 70%, rgba(236,72,153,0.35) 0%, transparent 70%)`,
    ];

    const base = "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899, #3b82f6, #06b6d4, #8b5cf6, #6366f1)";
    return [...nebulas, ...stars, base].join(", ");
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 z-0 transition-all duration-500 ${
          darkMode
            ? "bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90 backdrop-blur-[3px]"
            : "bg-gradient-to-b from-sky-950/55 via-sky-900/30 to-sky-950/55 backdrop-blur-[5px]"
        }`}
      />

      {/* Botón tema */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 hover:rotate-12 ${
          darkMode
            ? "bg-slate-800/80 backdrop-blur-xl border-slate-600 text-yellow-400 hover:bg-slate-700"
            : "bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      {/* Contenido Principal */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 md:gap-10 anim-fadeIn">

        {/* Encabezado */}
        <div className="flex flex-col items-center text-center animate-fade-in-down">
          <div className="mb-5">
            <img
              src={logoUniversidadNoche}
              alt="Universidad de Ibagué"
              className="h-24 md:h-36 object-contain drop-shadow-2xl"
            />
          </div>

          <style>{`
            @keyframes rotateBorder {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes galaxyFlow {
              0%, 100% { background-position: 0% 50%; }
              50%       { background-position: 100% 50%; }
            }
`}</style>

          <h1 className="text-white text-2xl sm:text-4xl md:text-6xl font-black tracking-tighter mb-3 [text-shadow:0_4px_20px_rgba(0,0,0,0.8)]">
            Portal de{" "}
            <span
              className={darkMode && showEasterEgg ? "text-transparent bg-clip-text" : "text-white"}
              style={darkMode && showEasterEgg ? {
                backgroundImage: galaxyBg,
                backgroundSize: "300% 100%",
                animation: "galaxyFlow 45s ease-in-out infinite",
              } : undefined}
            >
              Evaluaciones
            </span>
          </h1>
          <p className={`text-base md:text-lg font-light max-w-xl mx-auto drop-shadow-lg ${
            darkMode ? "text-slate-300" : "text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]"
          }`}>
            Gestión académica y presentación de exámenes en línea
          </p>
        </div>

        {/* Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl px-4">

          {/* DOCENTE */}
          <button
            onClick={() => navigate("/teacher-login")}
            className={`group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] ${
              darkMode ? "" : "bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600"
            }`}
          >
            {/* Luz giratoria del borde — solo el borde se mueve */}
            <div
              className="absolute inset-0 z-0"
              aria-hidden="true"
              style={{ borderRadius: "inherit" }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "250%",
                  height: "250%",
                  top: "-75%",
                  left: "-75%",
                  background:
                    "conic-gradient(transparent 0% 82%, rgba(147,197,253,0.4) 85%, #93c5fd 88%, #c4b5fd 91%, #67e8f9 93%, transparent 96% 100%)",
                  animation: "rotateBorder 7s linear infinite",
                }}
              />
            </div>

            {/* Contenido tarjeta */}
            <div
              className={`relative z-10 flex flex-col items-center justify-center p-7 m-[2px] rounded-[22px] backdrop-blur-xl transition-all duration-500 ${
                darkMode
                  ? "bg-slate-950 group-hover:bg-slate-900"
                  : "bg-white shadow-2xl shadow-black/20 group-hover:bg-slate-50"
              }`}
            >
              <div className={`mb-4 p-5 rounded-2xl transition-all duration-500 shadow-lg group-hover:scale-110 ${
                darkMode
                  ? "bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-500/50"
                  : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-500/30"
              }`}>
                <School className="w-12 h-12" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold mb-1 tracking-tight text-primary">Docentes</h2>
              <p className="text-center mb-5 text-secondary text-sm transition-colors group-hover:text-primary">
                Acceso administrativo para gestión
              </p>
              <div className={`flex items-center gap-2 font-bold uppercase tracking-widest text-sm group-hover:gap-4 transition-all ${
                darkMode ? "text-blue-400 group-hover:text-blue-300" : "text-accent group-hover:text-blue-700"
              }`}>
                Ingresar <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* ESTUDIANTE */}
          <button
            onClick={() => navigate("/acceso-examen")}
            className={`group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] ${
              darkMode ? "" : "bg-gradient-to-br from-emerald-600 via-teal-600 to-lime-600"
            }`}
          >
            {/* Luz giratoria del borde — solo el borde se mueve */}
            <div
              className="absolute inset-0 z-0"
              aria-hidden="true"
              style={{ borderRadius: "inherit" }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "250%",
                  height: "250%",
                  top: "-75%",
                  left: "-75%",
                  background:
                    "conic-gradient(transparent 0% 82%, rgba(110,231,183,0.4) 85%, #6ee7b7 88%, #5eead4 91%, #d9f99d 93%, transparent 96% 100%)",
                  animation: "rotateBorder 7s linear infinite",
                  animationDelay: "-3.5s",
                }}
              />
            </div>

            {/* Contenido tarjeta */}
            <div
              className={`relative z-10 flex flex-col items-center justify-center p-7 m-[2px] rounded-[22px] backdrop-blur-xl transition-all duration-500 ${
                darkMode
                  ? "bg-slate-950 group-hover:bg-slate-900"
                  : "bg-white shadow-2xl shadow-black/20 group-hover:bg-slate-50"
              }`}
            >
              <div className={`mb-4 p-5 rounded-2xl transition-all duration-500 shadow-lg group-hover:scale-110 ${
                darkMode
                  ? "bg-emerald-900/30 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-emerald-500/50"
                  : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-emerald-500/30"
              }`}>
                <GraduationCap className="w-12 h-12" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold mb-1 tracking-tight text-primary">Estudiantes</h2>
              <p className="text-center mb-5 text-secondary text-sm transition-colors group-hover:text-primary">
                Acceso para presentar evaluaciones
              </p>
              <div className={`flex items-center gap-2 font-bold uppercase tracking-widest text-sm group-hover:gap-4 transition-all ${
                darkMode ? "text-emerald-400 group-hover:text-emerald-300" : "text-emerald-600 group-hover:text-emerald-700"
              }`}>
                Ingresar <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
