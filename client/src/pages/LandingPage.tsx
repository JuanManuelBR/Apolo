import { useEffect, useState } from "react";
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

  // Campo de estrellas — efecto espacio
  // [tamaño_px, x%, y%]  |  x en espacio del gradiente (0-100% = 3× ancho visible)
  // Opacidad por tamaño: 0.8px→dim, 1px→media, 1.5px→media-alta, 2px→brillante, 2.5px→muy brillante
  const starDots: [number, number, number][] = [
    // Estrellas de fondo tenues (0.8px)
    [0.8, 1, 42], [0.8, 4, 80], [0.8, 9, 22],
    [0.8, 13, 68], [0.8, 17, 35], [0.8, 21, 88],
    [0.8, 26, 15], [0.8, 30, 55], [0.8, 35, 78],
    [0.8, 40, 28], [0.8, 45, 62], [0.8, 50, 10],
    [0.8, 54, 75], [0.8, 59, 45], [0.8, 64, 90],
    [0.8, 69, 30], [0.8, 74, 68], [0.8, 79, 18],
    [0.8, 84, 52], [0.8, 89, 85], [0.8, 94, 38],
    [0.8, 98, 72],
    // Estrellas pequeñas (1px)
    [1, 2, 58],  [1, 7, 32],  [1, 12, 85],
    [1, 18, 48], [1, 23, 72], [1, 28, 18],
    [1, 33, 62], [1, 38, 38], [1, 43, 92],
    [1, 48, 25], [1, 53, 65], [1, 58, 12],
    [1, 63, 55], [1, 68, 82], [1, 73, 28],
    [1, 78, 60], [1, 83, 42], [1, 88, 78],
    [1, 93, 15], [1, 97, 50],
    // Estrellas medianas (1.5px)
    [1.5, 5, 50],  [1.5, 11, 20], [1.5, 20, 75],
    [1.5, 29, 40], [1.5, 37, 65], [1.5, 46, 8],
    [1.5, 55, 82], [1.5, 62, 35], [1.5, 70, 58],
    [1.5, 77, 88], [1.5, 86, 22], [1.5, 95, 68],
    // Estrellas brillantes (2px)
    [2, 8, 45],  [2, 22, 25], [2, 36, 80],
    [2, 51, 55], [2, 65, 18], [2, 80, 72],
    [2, 91, 40], [2, 99, 12],
    // Estrellas muy brillantes (2.5px)
    [2.5, 15, 60], [2.5, 44, 30], [2.5, 72, 85], [2.5, 87, 50],
  ];
  const starGradients = starDots
    .map(([r, x, y]) => {
      const opacity = r <= 0.8 ? 0.38 : r <= 1 ? 0.55 : r <= 1.5 ? 0.72 : 0.92;
      return `radial-gradient(circle ${r}px at ${x}% ${y}%, rgba(255,255,255,${opacity}) 0%, transparent 100%)`;
    })
    .join(", ");

  // Colores vibrantes 400-level — funcionan en ambos modos
  const galaxyGradient = "linear-gradient(135deg, #818cf8, #a78bfa, #e879f9, #c084fc, #60a5fa, #22d3ee, #34d399, #a78bfa, #818cf8)";
  const galaxyDark = `${starGradients}, ${galaxyGradient}`;
  const galaxyDay  = `${starGradients}, ${galaxyGradient}`;

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
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 md:gap-10">

        {/* Encabezado */}
        <div className="flex flex-col items-center text-center animate-fade-in-down">
          <div className="mb-5 transition-all duration-500 hover:scale-105">
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
              className="text-transparent bg-clip-text"
              style={{
                WebkitTextStroke: darkMode ? "0px" : "1.5px rgba(0,0,0,0.5)",
                backgroundImage: darkMode ? galaxyDark : galaxyDay,
                backgroundSize: "300% 100%",
                animation: "galaxyFlow 28s ease-in-out infinite",
              }}
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
                    "conic-gradient(transparent 0% 50%, #93c5fd 63%, #c4b5fd 78%, #67e8f9 88%, transparent 94% 100%)",
                  animation: "rotateBorder 7s linear infinite",
                }}
              />
            </div>

            {/* Contenido tarjeta */}
            <div
              className={`relative z-10 flex flex-col items-center justify-center p-7 m-[2px] rounded-[22px] backdrop-blur-xl transition-all duration-500 ${
                darkMode
                  ? "bg-slate-950/95 group-hover:bg-slate-900/95"
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
                    "conic-gradient(transparent 0% 50%, #6ee7b7 63%, #5eead4 78%, #d9f99d 88%, transparent 94% 100%)",
                  animation: "rotateBorder 7s linear infinite",
                  animationDelay: "-3.5s",
                }}
              />
            </div>

            {/* Contenido tarjeta */}
            <div
              className={`relative z-10 flex flex-col items-center justify-center p-7 m-[2px] rounded-[22px] backdrop-blur-xl transition-all duration-500 ${
                darkMode
                  ? "bg-slate-950/95 group-hover:bg-slate-900/95"
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
