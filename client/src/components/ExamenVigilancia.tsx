import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import AlertasModal from "./AlertasModal";
import { examsService } from "../services/examsService";
import { examsAttemptsService } from "../services/examsAttempts";

// ============================================
// INTERFACES
// ============================================
interface Examen {
  id: number;
  nombre: string;
  codigoExamen: string;
  descripcion?: string;
  duracion?: number;
}

interface ExamenVigilanciaProps {
  selectedExam: Examen;
  onVolver: () => void;
  darkMode: boolean;
  usuarioData: any;
}

interface ExamAttempt {
  id: number;
  nombre_estudiante: string;
  correo_estudiante: string | null;
  estado: string;
  tiempoTranscurrido: string;
  progreso: number;
  alertas: number;
  alertasNoLeidas?: number;
}

interface Alerta {
  id: number;
  tipo_evento: string;
  descripcion?: string;
  fecha_envio: string;
  leida: boolean;
  leido: boolean;  // Propiedad requerida por AlertasModal
  leida_ts?: string | null;
}

type EstadoDisplay = "Activo" | "Bloqueado" | "Pausado" | "Terminado" | "Abandonado";

// ============================================
// COMPONENTE DE TARJETA DE ESTUDIANTE
// ============================================
interface StudentCardProps {
  id: number;
  nombre: string;
  email: string;
  examen: string;
  estado: EstadoDisplay;
  tiempoTranscurrido: string;
  progreso: number;
  alertas: number;
  alertasNoLeidas: number;
  darkMode: boolean;
  onRestablecerAcceso: (id: number) => void;
  onVerDetalles: (id: number) => void;
  onVerAlertas: (id: number) => void;
}

function StudentCard({
  id,
  nombre,
  email,
  examen,
  estado,
  tiempoTranscurrido,
  progreso,
  alertas,
  alertasNoLeidas,
  darkMode,
  onRestablecerAcceso,
  onVerDetalles,
  onVerAlertas,
}: StudentCardProps) {
  return (
    <div
      className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"} border rounded-lg p-4 hover:shadow-md transition-shadow`}
    >
      {/* Header con nombre y estado */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {nombre
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div>
            <h3
              className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              {nombre}
            </h3>
            <p
              className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              estado === "Activo"
                ? "bg-green-100 text-green-800"
                : estado === "Bloqueado" || estado === "Pausado"
                  ? "bg-red-100 text-red-800"
                  : estado === "Terminado"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {estado}
          </span>

          {/* Badge de alertas */}
          {alertas > 0 && (
            <button
              onClick={() => onVerAlertas(id)}
              className="relative px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
            >
              {alertas} alerta{alertas > 1 ? "s" : ""}
              {alertasNoLeidas > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-pulse border-2 border-white"></span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info del examen */}
      <div
        className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        <p className="mb-1">
          <span className="font-medium">Examen:</span> {examen}
        </p>
        <p>
          <span className="font-medium">Tiempo:</span> {tiempoTranscurrido}
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Progreso
          </span>
          <span
            className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            {progreso}%
          </span>
        </div>
        <div
          className={`w-full h-2 ${darkMode ? "bg-slate-700" : "bg-gray-200"} rounded-full overflow-hidden`}
        >
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {estado === "Abandonado" && (
          <button
            onClick={() => onRestablecerAcceso(id)}
            className="flex-1 py-2 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Restablecer Acceso
          </button>
        )}
        <button
          onClick={() => onVerDetalles(id)}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            darkMode
              ? "bg-slate-700 text-gray-200 hover:bg-slate-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Ver Detalles
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL DE VIGILANCIA
// ============================================
export default function ExamenVigilancia({
  selectedExam,
  onVolver,
  darkMode,
  usuarioData,
}: ExamenVigilanciaProps) {
  // ============================================
  // ESTADOS
  // ============================================
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [alertasDetalle, setAlertasDetalle] = useState<Alerta[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [modalAlertas, setModalAlertas] = useState({
    show: false,
    attemptId: null as number | null,
    nombre: "",
  });

  // ============================================
  // SOCKET.IO - MONITOREO EN TIEMPO REAL
  // ============================================
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!selectedExam) return;

    const socketUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000";
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket conectado:", newSocket.id);
      newSocket.emit("joinExamMonitoring", selectedExam.id);
    });

    newSocket.on("examAttemptUpdate", (data) => {
      console.log("📊 Actualización de intento recibida:", data);
      setExamAttempts((prev) => {
        const index = prev.findIndex((a) => a.id === data.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return [...prev, data];
      });
    });

    newSocket.on("newAlert", (data) => {
      console.log("🚨 Nueva alerta recibida:", data);
      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? {
                ...attempt,
                alertas: (attempt.alertas || 0) + 1,
                alertasNoLeidas: (attempt.alertasNoLeidas || 0) + 1,
              }
            : attempt
        )
      );
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket desconectado");
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leaveExamMonitoring", selectedExam.id);
      newSocket.disconnect();
    };
  }, [selectedExam]);

  // ============================================
  // CARGAR INTENTOS INICIALES
  // ============================================
  useEffect(() => {
    if (!selectedExam) return;

    const cargarIntentos = async () => {
      try {
        // Usar getActiveAttemptsByExam que es el método que existe en el servicio
        const data = await examsAttemptsService.getActiveAttemptsByExam(
          selectedExam.id
        );
        console.log("📥 Intentos cargados:", data);
        setExamAttempts(data);
      } catch (error) {
        console.error("❌ Error al cargar intentos:", error);
      }
    };

    cargarIntentos();
  }, [selectedExam]);

  // ============================================
  // FUNCIONES DE MANEJO
  // ============================================
  const handleUnlockAttempt = async (attemptId: number) => {
    try {
      await examsAttemptsService.unlockAttempt(attemptId);
      console.log(`🔓 Intento ${attemptId} desbloqueado`);

      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === attemptId
            ? { ...attempt, estado: "activo" }
            : attempt
        )
      );
    } catch (error) {
      console.error("❌ Error al desbloquear intento:", error);
    }
  };

  const handleViewDetails = (attemptId: number) => {
    console.log(`👁️ Ver detalles del intento ${attemptId}`);
  };

  const handleVerAlertas = async (attemptId: number, nombre: string) => {
    try {
      // Usar getAttemptEvents que es el método correcto del servicio
      const eventos = await examsAttemptsService.getAttemptEvents(attemptId);
      setAlertasDetalle(eventos);
      setModalAlertas({ show: true, attemptId, nombre });

      // Marcar eventos como leídos usando el método correcto
      await examsAttemptsService.markEventsAsRead(attemptId);

      // Actualizar contador de alertas no leídas
      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === attemptId
            ? { ...attempt, alertasNoLeidas: 0 }
            : attempt
        )
      );
    } catch (error) {
      console.error("❌ Error al cargar eventos/alertas:", error);
      // Mostrar modal vacío en caso de error
      setAlertasDetalle([]);
      setModalAlertas({ show: true, attemptId, nombre });
    }
  };

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================
  const traducirEstado = (estado: string): EstadoDisplay => {
    const traducciones: Record<string, EstadoDisplay> = {
      active: "Activo",
      activo: "Activo",
      blocked: "Bloqueado",
      bloqueado: "Bloqueado",
      paused: "Pausado",
      pausado: "Pausado",
      finished: "Terminado",
      terminado: "Terminado",
      abandonado: "Abandonado",
      abandoned: "Abandonado",
    };
    return traducciones[estado.toLowerCase()] || "Abandonado";
  };

  // Normalizar estado para comparación en filtros (minúsculas)
  const normalizarEstado = (estado: string): string => {
    return traducirEstado(estado).toLowerCase();
  };

  // ============================================
  // FILTRADO Y CONTADORES
  // ============================================
  const intentosFiltrados = examAttempts.filter((attempt) => {
    if (filtroEstado === "todos") return true;
    return normalizarEstado(attempt.estado) === filtroEstado.toLowerCase();
  });

  const contadores = {
    total: examAttempts.length,
    activos: examAttempts.filter((a) => normalizarEstado(a.estado) === "activo")
      .length,
    bloqueados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "bloqueado"
    ).length,
    pausados: examAttempts.filter((a) => normalizarEstado(a.estado) === "pausado")
      .length,
    terminados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "terminado"
    ).length,
    abandonados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "abandonado"
    ).length,
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="p-6">
      {/* Header con botón de volver */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-6 mb-6`}
      >
        <div className="mb-4">
          <button
            onClick={onVolver}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-slate-800 hover:bg-slate-700 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>
        </div>

        <div className="mb-6">
          <h2
            className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            {selectedExam.nombre}
          </h2>
          <div
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Código: {selectedExam.codigoExamen}
          </div>
        </div>

        {/* Contadores por estado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div
              className={`text-xs font-semibold mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              Total
            </div>
            <div
              className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              {contadores.total}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-green-400">
              Activos
            </div>
            <div className="text-2xl font-bold text-green-400">
              {contadores.activos}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-red-400">
              Bloqueados
            </div>
            <div className="text-2xl font-bold text-red-400">
              {contadores.bloqueados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-yellow-400">
              En Pausa
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {contadores.pausados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-blue-400">
              Terminados
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {contadores.terminados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-400">
              Abandonados
            </div>
            <div className="text-2xl font-bold text-gray-400">
              {contadores.abandonados}
            </div>
          </div>
        </div>

        {/* Botones de filtro */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado("todos")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "todos"
                ? darkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos ({contadores.total})
          </button>

          <button
            onClick={() => setFiltroEstado("activo")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "activo"
                ? "bg-green-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Activos ({contadores.activos})
          </button>

          <button
            onClick={() => setFiltroEstado("bloqueado")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "bloqueado"
                ? "bg-red-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bloqueados ({contadores.bloqueados})
          </button>

          <button
            onClick={() => setFiltroEstado("pausado")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "pausado"
                ? "bg-yellow-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            En Pausa ({contadores.pausados})
          </button>

          <button
            onClick={() => setFiltroEstado("terminado")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "terminado"
                ? "bg-blue-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Terminados ({contadores.terminados})
          </button>

          <button
            onClick={() => setFiltroEstado("abandonado")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "abandonado"
                ? "bg-gray-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Abandonados ({contadores.abandonados})
          </button>
        </div>
      </div>

      {/* Lista de estudiantes FILTRADA */}
      {intentosFiltrados.length === 0 ? (
        <div
          className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-12 text-center`}
        >
          <p
            className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            {filtroEstado === "todos"
              ? "No hay estudiantes en este momento"
              : `No hay estudiantes en estado "${filtroEstado}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intentosFiltrados.map((attempt) => (
            <StudentCard
              key={attempt.id}
              id={attempt.id}
              nombre={attempt.nombre_estudiante}
              email={attempt.correo_estudiante || "Sin correo"}
              examen={selectedExam.nombre}
              estado={traducirEstado(attempt.estado)}
              tiempoTranscurrido={attempt.tiempoTranscurrido}
              progreso={attempt.progreso}
              alertas={attempt.alertas}
              alertasNoLeidas={attempt.alertasNoLeidas || 0}
              darkMode={darkMode}
              onRestablecerAcceso={handleUnlockAttempt}
              onVerDetalles={handleViewDetails}
              onVerAlertas={(id) =>
                handleVerAlertas(id, attempt.nombre_estudiante)
              }
            />
          ))}
        </div>
      )}

      {/* Modal de Alertas */}
      {modalAlertas.show && (
        <AlertasModal
          mostrar={modalAlertas.show}
          darkMode={darkMode}
          alertas={alertasDetalle}
          nombreEstudiante={modalAlertas.nombre}
          onCerrar={() =>
            setModalAlertas({ show: false, attemptId: null, nombre: "" })
          }
        />
      )}
    </div>
  );
}