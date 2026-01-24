import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Ban,
  Search,
  Eye,
  Activity,
  Send,
  FileText,
  Download,
  Mail,
  Zap,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import AlertasModal from "./AlertasModal";
import { examsService } from "../services/examsService";
import { examsAttemptsService } from "../services/examsAttempts";

// ============================================
// INTERFACES (Sin cambios)
// ============================================
interface Examen {
  id: number;
  nombre: string;
  codigoExamen: string;
  estado: "open" | "closed";
  descripcion?: string;
  duracion?: number;
  mostrarCalificaciones?: boolean;
  tipo?: string;
  archivoPDF?: string | null;
}

interface VigilanciaExamenesListaProps {
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
  calificacion?: number;
}

interface Alerta {
  id: number;
  tipo_evento: string;
  descripcion?: string;
  fecha_envio: string;
  leida: boolean;
  leido: boolean;
  leida_ts?: string | null;
}

type EstadoDisplay = "Activo" | "Bloqueado" | "Pausado" | "Terminado" | "Abandonado";
type FiltroEstado = "todos" | "activos" | "bloqueados" | "pausados" | "terminados" | "abandonados";

const obtenerColoresExamen = (tipo: string): { borde: string; fondo: string } => {
  if (tipo === "pdf") return { borde: "border-rose-500", fondo: "bg-rose-600" };
  return { borde: "border-indigo-500", fondo: "bg-indigo-600" };
};

const obtenerIconoTipo = (tipo: string) => FileText;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function VigilanciaExamenesLista({
  darkMode,
  usuarioData,
}: VigilanciaExamenesListaProps) {
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [examenExpandido, setExamenExpandido] = useState<number | null>(null);
  const [loadingExamenes, setLoadingExamenes] = useState(true);

  // Estados
  const [examAttempts, setExamAttempts] = useState<{ [key: number]: ExamAttempt[] }>({});
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<ExamAttempt | null>(null);
  const [examenActual, setExamenActual] = useState<Examen | null>(null);
  const [alertasEstudiante, setAlertasEstudiante] = useState<Alerta[]>([]);
  const [mostrarModalAlertas, setMostrarModalAlertas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [filtrosPorExamen, setFiltrosPorExamen] = useState<{ [key: number]: FiltroEstado }>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // CARGAR DATOS
  // ============================================
  useEffect(() => { cargarExamenes(); }, [usuarioData]);

  const cargarExamenes = async () => {
    if (!usuarioData?.id) { setLoadingExamenes(false); return; }
    try {
      setLoadingExamenes(true);
      const exams = await examsService.obtenerMisExamenes(usuarioData.id);
      setExamenes(exams);
      if (exams.length > 0) {
        setExamenExpandido(exams[0].id);
        setExamenActual(exams[0]);
        setFiltrosPorExamen({ [exams[0].id]: "todos" });
        cargarIntentosExamen(exams[0].id);
      }
    } catch (error) { console.error("Error cargando exámenes:", error); } 
    finally { setLoadingExamenes(false); }
  };

  const cargarIntentosExamen = async (examenId: number, silencioso = false) => {
    try {
      const intentos = await examsAttemptsService.getActiveAttemptsByExam(examenId);
      setExamAttempts((prev) => ({ ...prev, [examenId]: intentos }));
      if (estudianteSeleccionado) {
        const est = intentos.find((i: ExamAttempt) => i.id === estudianteSeleccionado.id);
        if (est) setEstudianteSeleccionado(est);
      }
      if (!silencioso) console.log("🔄 Datos sincronizados");
    } catch (error) { console.error("Error cargando intentos:", error); }
  };

  // ============================================
  // WEBSOCKET
  // ============================================
  useEffect(() => {
    if (!examenActual) return;
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const newSocket = io(socketUrl, { transports: ["websocket", "polling"], reconnection: true });

    newSocket.on("connect", () => {
      newSocket.emit("joinExamMonitoring", examenActual.id);
    });

    newSocket.on("examAttemptUpdate", (data: ExamAttempt) => {
      setExamAttempts((prev) => {
        const intentos = prev[examenActual.id] || [];
        const index = intentos.findIndex((a) => a.id === data.id);
        let nuevos = index !== -1 
          ? intentos.map((it, i) => i === index ? { ...it, ...data } : it)
          : [...intentos, data];
        return { ...prev, [examenActual.id]: nuevos };
      });

      if (estudianteSeleccionado?.id === data.id) {
          setEstudianteSeleccionado((prev) => prev ? { ...prev, ...data } : null);
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => cargarIntentosExamen(examenActual.id, true), 5000); 
    });

    newSocket.on("newAlert", (data: { attemptId: number }) => {
      setExamAttempts((prev) => {
        const intentos = prev[examenActual.id] || [];
        const nuevos = intentos.map((att) => att.id === data.attemptId ? 
           { ...att, alertas: (att.alertas || 0) + 1, alertasNoLeidas: (att.alertasNoLeidas || 0) + 1 } : att);
        return { ...prev, [examenActual.id]: nuevos };
      });

      if (estudianteSeleccionado?.id === data.attemptId) {
         setEstudianteSeleccionado((prev) => prev ? { ...prev, alertas: (prev.alertas||0)+1, alertasNoLeidas: (prev.alertasNoLeidas||0)+1 } : null);
         cargarAlertasEstudiante(data.attemptId);
      }
    });

    setSocket(newSocket);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      newSocket.emit("leaveExamMonitoring", examenActual.id);
      newSocket.disconnect();
    };
  }, [examenActual?.id]);

  // ============================================
  // LOGICA UI
  // ============================================
  const toggleExamen = (examen: Examen) => {
    if (examenExpandido === examen.id) return;
    setExamenExpandido(examen.id);
    setExamenActual(examen);
    setEstudianteSeleccionado(null);
    if (!filtrosPorExamen[examen.id]) setFiltrosPorExamen(prev => ({ ...prev, [examen.id]: "todos" }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    cargarIntentosExamen(examen.id);
  };

  const cambiarFiltroExamen = (nuevoFiltro: FiltroEstado) => {
    if (examenActual) setFiltrosPorExamen(prev => ({ ...prev, [examenActual.id]: nuevoFiltro }));
  };

  const filtroActual = examenActual ? (filtrosPorExamen[examenActual.id] || "todos") : "todos";

  const cargarAlertasEstudiante = async (attemptId: number) => {
    try {
      const eventos = await examsAttemptsService.getAttemptEvents(attemptId);
      setAlertasEstudiante(eventos);
    } catch (e) { console.error(e); }
  };

  const seleccionarEstudiante = async (estudiante: ExamAttempt) => {
    setEstudianteSeleccionado(estudiante);
    await cargarAlertasEstudiante(estudiante.id);
  };

  const handleRestablecerAcceso = async (attemptId: number) => {
    if (!confirm("¿Restablecer acceso?")) return;
    try { await examsAttemptsService.unlockAttempt(attemptId); } catch (e) { console.error(e); }
  };

  const handleMarcarAlertasComoLeidas = async (attemptId: number) => {
    try {
      await examsAttemptsService.markEventsAsRead(attemptId);
      await cargarAlertasEstudiante(attemptId);
      setExamAttempts(prev => {
         if(!examenActual) return prev;
         return { ...prev, [examenActual.id]: prev[examenActual.id].map(i => i.id === attemptId ? {...i, alertasNoLeidas: 0} : i) };
      });
      if(estudianteSeleccionado?.id === attemptId) setEstudianteSeleccionado(prev => prev ? {...prev, alertasNoLeidas: 0} : null);
    } catch (e) { console.error(e); }
  };

  const handleVerAlertas = async (estudiante: ExamAttempt) => {
    await cargarAlertasEstudiante(estudiante.id);
    setEstudianteSeleccionado(estudiante);
    setMostrarModalAlertas(true);
    handleMarcarAlertasComoLeidas(estudiante.id);
  };

  // Acciones (Placeholders)
  const handleForzarEnvio = async () => { if(confirm("¿Forzar envío?")) console.log("Forzando..."); };
  const handleCalificarAutomaticamente = async () => console.log("Calificando...");
  const handleDescargarPDF = async () => console.log("Descargando PDF...");
  const handleEnviarNotas = async () => console.log("Enviando notas...");

  const toggleEstadoExamen = async (id: number, estadoActual: string) => {
    try {
      const nuevo = estadoActual === "open" ? "closed" : "open";
      await examsService.updateExamStatus(id, nuevo);
      if (examenActual?.id === id) setExamenActual({ ...examenActual, estado: nuevo });
      setExamenes(prev => prev.map(e => e.id === id ? {...e, estado: nuevo} : e));
    } catch (e) { console.error(e); }
  };

  const obtenerTipoExamen = (e: Examen) => e.archivoPDF ? "pdf" : "automatico";
  const traducirEstado = (st: string): EstadoDisplay => {
    const map: Record<string, EstadoDisplay> = {
      active: "Activo", activo: "Activo", blocked: "Bloqueado", bloqueado: "Bloqueado",
      paused: "Pausado", pausado: "Pausado", submitted: "Terminado", terminado: "Terminado",
      abandonado: "Abandonado", abandoned: "Abandonado"
    };
    return map[st.toLowerCase()] || "Abandonado";
  };

  const getEstadoBadgeColor = (st: EstadoDisplay, dark: boolean) => {
    switch (st) {
      case "Activo": return dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "Bloqueado": return dark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200";
      case "Terminado": return dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200";
      case "Pausado": return dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200";
      default: return dark ? "bg-slate-700 text-slate-400 border-slate-600" : "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  const estudiantesFiltrados = examenActual && examAttempts[examenActual.id]
    ? examAttempts[examenActual.id].filter((est) => {
        const match = est.nombre_estudiante.toLowerCase().includes(searchTerm.toLowerCase());
        const st = traducirEstado(est.estado);
        if (!match) return false;
        if (filtroActual === "todos") return true;
        if (filtroActual === "activos") return st === "Activo";
        if (filtroActual === "bloqueados") return st === "Bloqueado";
        if (filtroActual === "pausados") return st === "Pausado";
        if (filtroActual === "terminados") return st === "Terminado";
        if (filtroActual === "abandonados") return st === "Abandonado";
        return true;
      })
    : [];

  const contadores = examenActual && examAttempts[examenActual.id]
    ? {
        todos: examAttempts[examenActual.id].length,
        activos: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Activo").length,
        bloqueados: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Bloqueado").length,
        pausados: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Pausado").length,
        terminados: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Terminado").length,
        abandonados: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Abandonado").length,
        hanEmpezado: examAttempts[examenActual.id].filter(a => ["Activo", "Pausado", "Bloqueado"].includes(traducirEstado(a.estado))).length,
        hanEnviado: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Terminado").length,
        enCurso: examAttempts[examenActual.id].filter(a => traducirEstado(a.estado) === "Activo").length,
      }
    : { todos: 0, activos: 0, bloqueados: 0, pausados: 0, terminados: 0, abandonados: 0, hanEmpezado: 0, hanEnviado: 0, enCurso: 0 };

  if (loadingExamenes) return <div className="flex justify-center h-screen items-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"></div></div>;

  return (
    <>
      <style>{`.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="flex h-[calc(100vh-140px)] gap-6 px-12 overflow-hidden">
        
        {/* =======================================================
            PANEL IZQUIERDO: LISTA DE EXÁMENES + CONTROLES
           ======================================================= */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0 overflow-hidden">
          
          {/* CABECERA IZQUIERDA */}
          <div className={`p-4 rounded-2xl shadow-sm flex-shrink-0 border ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
            <div className="flex items-start justify-between mb-4">
               <div>
                 <h2 className={`text-lg font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-800"}`}>Mis Exámenes</h2>
                 <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Tus exámenes vigilados</p>
               </div>
               <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/20">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wide">En vivo</span>
               </div>
            </div>
            {/* Buscador Global */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Filtrar estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border transition-all ${darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-900"} focus:outline-none focus:border-teal-500`}
              />
            </div>
          </div>

          {/* LISTA DE EXÁMENES */}
          <div className={`flex-1 rounded-2xl shadow-sm border flex flex-col min-h-0 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
            <div className="flex-1 overflow-y-scroll scrollbar-hide p-2 space-y-2">
              {examenes.map((examen) => {
                const isExpanded = examenExpandido === examen.id;
                const tipoExamen = obtenerTipoExamen(examen);
                const colores = obtenerColoresExamen(tipoExamen);
                
                return (
                  <div key={examen.id} className={`rounded-xl transition-all ${isExpanded ? (darkMode ? "bg-slate-800/50" : "bg-teal-50/50") : ""}`}>
                    {/* Examen Item */}
                    <button
                      onClick={() => toggleExamen(examen)}
                      className={`w-full px-3 py-3 text-left flex items-center gap-3 rounded-xl border-l-4 transition-all ${colores.borde} ${isExpanded ? "" : "hover:bg-slate-50 dark:hover:bg-slate-800"} ${examen.estado === "closed" ? "opacity-60" : "opacity-100"}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colores.fondo}`}>
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                            <p className={`font-bold text-sm truncate ${isExpanded ? "text-teal-600 dark:text-teal-400" : darkMode ? "text-slate-200" : "text-slate-700"}`}>{examen.nombre}</p>
                            <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        <p className={`text-[10px] font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{examen.codigoExamen}</p>
                      </div>
                    </button>

                    {/* MENÚ DE ACCIONES (Expandido) - AHORA AQUÍ EN LUGAR DE LA LISTA */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-3 animation-fade-in">
                        
                        {/* 1. Exam Key Card */}
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500">Código</p>
                                <p className={`font-mono font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{examen.codigoExamen}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleEstadoExamen(examen.id, examen.estado); }}
                              className={`relative w-10 h-5 rounded-full transition-colors ${examen.estado === "open" ? "bg-emerald-500" : "bg-slate-400"}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${examen.estado === "open" ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>

                        {/* 2. Botones de Acción */}
                        <div className="grid grid-cols-1 gap-2">
                           {/* Forzar Envío */}
                           <button 
                             onClick={(e) => { e.stopPropagation(); if(examen.estado === "open") handleForzarEnvio(); }}
                             disabled={examen.estado === "closed"}
                             className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${
                                examen.estado === "closed" 
                                ? "opacity-50 cursor-not-allowed border-transparent bg-slate-100 dark:bg-slate-800 text-slate-400" 
                                : darkMode ? "bg-slate-800 border-slate-700 hover:border-orange-500 text-slate-200" : "bg-white border-slate-200 hover:border-orange-500 text-slate-700"
                             }`}
                           >
                              <div className={`p-1.5 rounded-md ${examen.estado === "open" ? "bg-orange-500/10 text-orange-500" : "bg-slate-500/10"}`}>
                                <Send className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold">Forzar Envío</span>
                           </button>

                           {/* Descargar PDF (Solo si cerrado) */}
                           {examen.estado === "closed" && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleDescargarPDF(); }}
                               className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${darkMode ? "bg-slate-800 border-slate-700 hover:border-rose-500 text-slate-200" : "bg-white border-slate-200 hover:border-rose-500 text-slate-700"}`}
                             >
                                <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                                  <Download className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold">Descargar Notas</span>
                             </button>
                           )}

                           {/* Enviar Notas (Solo si cerrado) */}
                           {examen.estado === "closed" && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleEnviarNotas(); }}
                               className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${darkMode ? "bg-slate-800 border-slate-700 hover:border-teal-500 text-slate-200" : "bg-white border-slate-200 hover:border-teal-500 text-slate-700"}`}
                             >
                                <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
                                  <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold">Enviar Correos</span>
                             </button>
                           )}
                           
                           {/* Calificar (Si no es PDF y cerrado) */}
                           {examen.estado === "closed" && tipoExamen !== "pdf" && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleCalificarAutomaticamente(); }}
                               className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${darkMode ? "bg-slate-800 border-slate-700 hover:border-indigo-500 text-slate-200" : "bg-white border-slate-200 hover:border-indigo-500 text-slate-700"}`}
                             >
                                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
                                  <Zap className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold">Calificar Auto</span>
                             </button>
                           )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =======================================================
            PANEL DERECHO: LISTA DE ESTUDIANTES (PRINCIPAL)
           ======================================================= */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-hidden">
          
          {/* 1. Stats Cards (Arriba) */}
          {examenActual && (
            <div className="grid grid-cols-4 gap-4 flex-shrink-0">
              {[
                { label: "Han empezado", val: contadores.hanEmpezado, icon: Activity, colorClass: "bg-blue-500 shadow-blue-200" },
                { label: "Han enviado", val: contadores.hanEnviado, icon: Send, colorClass: "bg-emerald-500 shadow-emerald-200" },
                { label: "En curso", val: contadores.enCurso, icon: Clock, colorClass: "bg-amber-500 shadow-amber-200" },
                { label: "Bloqueados", val: contadores.bloqueados, icon: Ban, colorClass: "bg-rose-500 shadow-rose-200" },
              ].map((stat, idx) => (
                <div key={idx} className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${darkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100"}`}>
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{stat.label}</p>
                        <p className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{stat.val}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${stat.colorClass} ${darkMode ? "shadow-none" : "shadow-lg"}`}>
                        <stat.icon className="w-5 h-5" />
                    </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Contenido Principal */}
          <div className={`flex-1 flex flex-col overflow-hidden rounded-2xl shadow-sm border ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
            
            {!examenActual ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <FileText className="w-12 h-12 mb-4" />
                  <p>Selecciona un examen del panel lateral</p>
              </div>
            ) : !estudianteSeleccionado ? (
              // ================= VISTA LISTA DE ESTUDIANTES =================
              <div className="flex flex-col h-full">
                
                {/* Header Examen (Nombre) */}
                <div className="p-6 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{examenActual.nombre}</h1>
                    <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{estudiantesFiltrados.length} estudiantes mostrados</p>
                </div>

                {/* Filtros Tabs (Movidos aquí) */}
                <div className={`flex border-b ${darkMode ? "border-slate-800" : "border-slate-200"} flex-shrink-0`}>
                   {[
                      { key: "todos" as FiltroEstado, label: "Todos", count: contadores.todos },
                      { key: "activos" as FiltroEstado, label: "Activos", count: contadores.activos },
                      { key: "bloqueados" as FiltroEstado, label: "Bloqueados", count: contadores.bloqueados },
                      { key: "pausados" as FiltroEstado, label: "Pausa", count: contadores.pausados },
                      { key: "terminados" as FiltroEstado, label: "Terminados", count: contadores.terminados },
                      { key: "abandonados" as FiltroEstado, label: "Abandonados", count: contadores.abandonados },
                   ].map((filtro) => (
                      <button
                        key={filtro.key}
                        onClick={() => cambiarFiltroExamen(filtro.key)}
                        className={`flex-1 py-4 text-center transition-all border-b-2 relative ${
                          filtroActual === filtro.key 
                          ? `border-teal-500 ${darkMode ? "text-teal-400" : "text-teal-600 bg-teal-50/50"}` 
                          : `border-transparent ${darkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`
                        }`}
                      >
                         <span className="text-xs font-bold uppercase tracking-wider block">{filtro.label}</span>
                         <span className="text-lg font-bold block mt-1">{filtro.count}</span>
                      </button>
                   ))}
                </div>

                {/* Lista Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                   {estudiantesFiltrados.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-50">
                         <Search className="w-10 h-10 mb-2" />
                         <p>No se encontraron estudiantes</p>
                      </div>
                   ) : (
                      <div className="space-y-2">
                        {estudiantesFiltrados.map((estudiante) => {
                           const estado = traducirEstado(estudiante.estado);
                           return (
                             <button
                               key={estudiante.id}
                               onClick={() => seleccionarEstudiante(estudiante)}
                               className={`w-full text-left p-4 rounded-xl border transition-all group ${
                                  darkMode 
                                  ? "bg-slate-800/40 border-slate-800 hover:bg-slate-800" 
                                  : "bg-white border-slate-100 hover:border-teal-200 hover:shadow-md"
                               }`}
                             >
                                <div className="flex items-center gap-4">
                                   {/* Avatar */}
                                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? "bg-slate-700 text-slate-300" : "bg-teal-50 text-teal-600"}`}>
                                      {estudiante.nombre_estudiante.charAt(0)}
                                   </div>

                                   {/* Info Principal */}
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                         <h4 className={`font-bold truncate ${darkMode ? "text-white" : "text-slate-800"}`}>{estudiante.nombre_estudiante}</h4>
                                         <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getEstadoBadgeColor(estado, darkMode)}`}>{estado}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                          <span>{estudiante.tiempoTranscurrido}</span>
                                          <span>•</span>
                                          <span>{estudiante.correo_estudiante || "Sin correo"}</span>
                                      </div>
                                   </div>

                                   {/* Métricas (Lado derecho) */}
                                   <div className="flex items-center gap-6">
                                      {/* Alertas */}
                                      <div className={`text-center ${estudiante.alertas > 0 ? "text-rose-500" : "text-slate-400"}`}>
                                         <div className="flex justify-center mb-1">
                                            {estudiante.alertasNoLeidas ? (
                                               <div className="relative">
                                                  <AlertTriangle className="w-5 h-5" />
                                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                               </div>
                                            ) : <AlertTriangle className="w-5 h-5 opacity-50" />}
                                         </div>
                                         <span className="text-[10px] font-bold">{estudiante.alertas} Alertas</span>
                                      </div>

                                      {/* Progreso */}
                                      <div className="w-24">
                                         <div className="flex justify-between text-[10px] mb-1 font-bold">
                                            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Progreso</span>
                                            <span className="text-teal-500">{estudiante.progreso}%</span>
                                         </div>
                                         <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${estudiante.progreso}%` }}></div>
                                         </div>
                                      </div>
                                      
                                      <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90 group-hover:text-teal-500 transition-colors" />
                                   </div>
                                </div>
                             </button>
                           );
                        })}
                      </div>
                   )}
                </div>
              </div>

            ) : (
              // ================= VISTA DETALLE ESTUDIANTE =================
              <div className="flex flex-col h-full">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <button onClick={() => setEstudianteSeleccionado(null)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                       ← Volver a la lista
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <span className={`font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>Detalle del Estudiante</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-8">
                     {/* Header Estudiante Seleccionado */}
                     <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm ${darkMode ? "bg-slate-800 text-teal-400" : "bg-teal-50 text-teal-600"}`}>
                                {estudianteSeleccionado.nombre_estudiante.charAt(0)}
                            </div>
                            <div>
                                <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{estudianteSeleccionado.nombre_estudiante}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${getEstadoBadgeColor(traducirEstado(estudianteSeleccionado.estado), darkMode)}`}>
                                        {traducirEstado(estudianteSeleccionado.estado)}
                                    </span>
                                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{estudianteSeleccionado.correo_estudiante}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleMarcarAlertasComoLeidas(estudianteSeleccionado.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-400"}`} title="Limpiar Alertas">
                                <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleRestablecerAcceso(estudianteSeleccionado.id)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20 transition-all">
                                Desbloquear Acceso
                            </button>
                        </div>
                      </div>

                      {/* Grid Métricas */}
                      <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className={`p-5 rounded-xl border ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-100"}`}>
                            <span className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-400"}`}>Progreso</span>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className={`text-3xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{estudianteSeleccionado.progreso}</span>
                                <span className="text-sm text-slate-400">%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden dark:bg-slate-700">
                                <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${estudianteSeleccionado.progreso}%` }}></div>
                            </div>
                        </div>
                        <div className={`p-5 rounded-xl border ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-100"}`}>
                            <span className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-400"}`}>Tiempo</span>
                            <div className="mt-2">
                                <span className={`text-3xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{estudianteSeleccionado.tiempoTranscurrido}</span>
                            </div>
                        </div>
                        <div className={`p-5 rounded-xl border relative overflow-hidden ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-rose-50/50 border-rose-100"}`}>
                            <span className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-rose-400"}`}>Alertas</span>
                            <div className="mt-2 flex items-center gap-3">
                                <span className={`text-3xl font-bold ${estudianteSeleccionado.alertas > 0 ? "text-rose-500" : darkMode ? "text-slate-200" : "text-slate-900"}`}>{estudianteSeleccionado.alertas}</span>
                                {estudianteSeleccionado.alertas > 0 && (
                                  <button onClick={() => handleVerAlertas(estudianteSeleccionado)} className="px-3 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">Ver alertas</button>
                                )}
                            </div>
                        </div>
                      </div>

                      {/* Feed Alertas */}
                      {estudianteSeleccionado.alertas > 0 && alertasEstudiante.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>Actividad Sospechosa Reciente</h3>
                            <button onClick={() => handleVerAlertas(estudianteSeleccionado)} className="text-xs font-semibold text-teal-500 hover:text-teal-600 transition-colors">Ver todas →</button>
                          </div>
                          <div className={`rounded-xl border overflow-hidden ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                            {alertasEstudiante.slice(0, 5).map((alerta) => (
                              <div key={alerta.id} className={`p-4 flex gap-4 border-b last:border-0 ${darkMode ? "bg-slate-800/30 border-slate-800" : "bg-white border-slate-50"}`}>
                                <div className="mt-1"><AlertTriangle className="w-4 h-4 text-rose-500" /></div>
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{alerta.tipo_evento}</p>
                                  <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{new Date(alerta.fecha_envio).toLocaleTimeString()} • {alerta.descripcion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                 </div>
              </div>
            )}
          </div>
        </div>

        {mostrarModalAlertas && estudianteSeleccionado && (
          <AlertasModal mostrar={true} alertas={alertasEstudiante} darkMode={darkMode} onCerrar={() => setMostrarModalAlertas(false)} nombreEstudiante={estudianteSeleccionado.nombre_estudiante} />
        )}
      </div>
    </>
  );
}