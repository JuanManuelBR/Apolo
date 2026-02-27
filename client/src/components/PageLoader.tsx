interface PageLoaderProps {
  darkMode?: boolean;
  /** Texto debajo del spinner. Por defecto "Cargando..." */
  mensaje?: string;
  /** Si true, ocupa solo el espacio disponible (sin fixed). Por defecto false. */
  inline?: boolean;
}

/**
 * PageLoader — Pantalla de carga universal.
 * Úsalo en cualquier página mientras se esperan datos del servidor.
 *
 * Uso:
 *   if (cargando) return <PageLoader darkMode={darkMode} mensaje="Cargando exámenes..." />;
 */
export default function PageLoader({
  darkMode = false,
  mensaje = "Cargando...",
  inline = false,
}: PageLoaderProps) {
  const wrapper = inline
    ? "flex flex-col items-center justify-center w-full h-full min-h-[300px]"
    : "flex flex-col items-center justify-center w-full h-full";

  return (
    <div className={`${wrapper} anim-fadeIn`}>
      {/* Spinner triple anillo */}
      <div className="relative w-16 h-16 mb-5">
        {/* Anillo exterior */}
        <span
          className={`absolute inset-0 rounded-full border-4 border-transparent anim-spin-slow ${
            darkMode ? "border-t-blue-400" : "border-t-blue-600"
          }`}
          style={{ animationDuration: "1.1s" }}
        />
        {/* Anillo medio */}
        <span
          className={`absolute inset-[6px] rounded-full border-4 border-transparent ${
            darkMode ? "border-t-indigo-400" : "border-t-indigo-500"
          }`}
          style={{ animation: "spin-slow 0.8s linear infinite reverse" }}
        />
        {/* Punto central */}
        <span
          className={`absolute inset-[22px] rounded-full ${
            darkMode ? "bg-blue-400/40" : "bg-blue-500/30"
          }`}
          style={{ animation: "fadeIn 0.6s ease-out both" }}
        />
      </div>

      {/* Texto */}
      <p
        className={`text-sm font-medium tracking-wide anim-slideUp anim-delay-1 ${
          darkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {mensaje}
      </p>

      {/* Barra de progreso indeterminada */}
      <div
        className={`mt-4 w-40 h-1 rounded-full overflow-hidden anim-fadeIn anim-delay-2 ${
          darkMode ? "bg-slate-700" : "bg-slate-200"
        }`}
      >
        <div
          className={`h-full rounded-full ${
            darkMode ? "bg-blue-400" : "bg-blue-500"
          }`}
          style={{
            animation: "progressBar 1.6s ease-in-out infinite",
            width: "40%",
          }}
        />
      </div>

      <style>{`
        @keyframes progressBar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
