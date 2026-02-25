import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  HelpCircle,
  Send,
  Edit3,
  FileText,
  Code2,
  PenLine,
  Maximize2,
  X,
} from "lucide-react";
import { examsAttemptsService } from "../services/examsAttempts";
import Lienzo from "./Lienzo";

// ============================================
// INTERFACES
// ============================================
interface RevisarCalificacionProps {
  intentoId: number;
  darkMode: boolean;
  onVolver: () => void;
  onGradeUpdated: (intentoId: number, notaFinal: number) => void;
  hideHeader?: boolean;
}

interface RespuestaPDF {
  id: number;
  pregunta_id: number;
  tipo_respuesta: string;
  respuesta: any;
  metadata_codigo: any;
  puntajeObtenido: number | null;
  fecha_respuesta: string;
  retroalimentacion: string | null;
}

interface AttemptDetails {
  intento: {
    id: number;
    examen_id: number;
    estado: string;
    nombre_estudiante: string;
    correo_estudiante: string | null;
    identificacion_estudiante: string | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    puntaje: number | null;
    puntajeMaximo: number;
    porcentaje: number | null;
    notaFinal: number | null;
    progreso: number;
    esExamenPDF?: boolean;
    calificacionPendiente?: boolean;
    retroalimentacion?: string | null;
  };
  examen: {
    id: number;
    nombre: string;
    descripcion: string;
    codigoExamen: string;
    estado: string;
    nombreProfesor: string;
    archivoPDF?: string | null;
  };
  estadisticas: {
    totalPreguntas?: number;
    preguntasRespondidas?: number;
    preguntasCorrectas?: number;
    preguntasIncorrectas?: number;
    preguntasSinResponder?: number;
    tiempoTotal: number | null;
    totalRespuestas?: number;
  };
  preguntas?: Pregunta[];
  respuestasPDF?: RespuestaPDF[];
  eventos: any[];
}

interface Pregunta {
  id: number;
  enunciado: string;
  type: "test" | "open" | "fill_blanks" | "match";
  puntajeMaximo: number;
  calificacionParcial: boolean;
  nombreImagen?: string;
  respuestaEstudiante: {
    id: number;
    respuestaParsed: any;
    puntajeObtenido: number;
    fecha_respuesta: string;
    retroalimentacion: string | null;
    opcionesSeleccionadas?: { id: number; texto: string; esCorrecta?: boolean }[];
    textoEscrito?: string;
    espaciosLlenados?: { posicion: number; respuestaEstudiante: string; respuestaCorrecta: string; esCorrecta: boolean }[];
    paresSeleccionados?: { itemA: { id: number; text: string }; itemB: { id: number; text: string }; esCorrecto: boolean }[];
  } | null;
  opciones?: { id: number; texto: string; esCorrecta?: boolean }[];
  cantidadRespuestasCorrectas?: number;
  textoRespuesta?: string;
  keywords?: { id: number; texto: string }[];
  textoCorrecto?: string;
  respuestasCorrectas?: { id: number; posicion: number; textoCorrecto: string }[];
  paresCorrectos?: { id: number; itemA: { id: number; text: string }; itemB: { id: number; text: string } }[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const EXAMS_API_URL = import.meta.env.VITE_EXAMS_URL || "http://localhost:3001";

// Colores idénticos a ExamenPreguntas
const QUESTION_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-purple-500 to-fuchsia-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-yellow-500 to-amber-600",
];

const PAIR_COLORS = [
  { border: "border-blue-500", darkBorder: "border-blue-400", bg: "bg-blue-50", darkBg: "bg-blue-900/20", text: "text-blue-700", darkText: "text-blue-300", stroke: "text-blue-500", darkStroke: "text-blue-400", fill: "fill-blue-600", darkFill: "fill-blue-400" },
  { border: "border-emerald-500", darkBorder: "border-emerald-400", bg: "bg-emerald-50", darkBg: "bg-emerald-900/20", text: "text-emerald-700", darkText: "text-emerald-300", stroke: "text-emerald-500", darkStroke: "text-emerald-400", fill: "fill-emerald-600", darkFill: "fill-emerald-400" },
  { border: "border-purple-500", darkBorder: "border-purple-400", bg: "bg-purple-50", darkBg: "bg-purple-900/20", text: "text-purple-700", darkText: "text-purple-300", stroke: "text-purple-500", darkStroke: "text-purple-400", fill: "fill-purple-600", darkFill: "fill-purple-400" },
  { border: "border-orange-500", darkBorder: "border-orange-400", bg: "bg-orange-50", darkBg: "bg-orange-900/20", text: "text-orange-700", darkText: "text-orange-300", stroke: "text-orange-500", darkStroke: "text-orange-400", fill: "fill-orange-600", darkFill: "fill-orange-400" },
  { border: "border-pink-500", darkBorder: "border-pink-400", bg: "bg-pink-50", darkBg: "bg-pink-900/20", text: "text-pink-700", darkText: "text-pink-300", stroke: "text-pink-500", darkStroke: "text-pink-400", fill: "fill-pink-600", darkFill: "fill-pink-400" },
  { border: "border-cyan-500", darkBorder: "border-cyan-400", bg: "bg-cyan-50", darkBg: "bg-cyan-900/20", text: "text-cyan-700", darkText: "text-cyan-300", stroke: "text-cyan-500", darkStroke: "text-cyan-400", fill: "fill-cyan-600", darkFill: "fill-cyan-400" },
];

const getStableColor = (id: number, colors: any[]) => colors[(id * 37) % colors.length];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function RevisarCalificacion({
  intentoId,
  darkMode,
  onVolver,
  onGradeUpdated,
  hideHeader = false,
}: RevisarCalificacionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AttemptDetails | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<number, SaveStatus>>({});
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  // PDF-specific state
  const [pdfNota, setPdfNota] = useState<string>("");
  const [pdfRetroalimentacion, setPdfRetroalimentacion] = useState<string>("");
  const [pdfSaveStatus, setPdfSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    loadDetails();
  }, [intentoId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examsAttemptsService.getAttemptDetails(intentoId);
      setDetails(data);

      if (data.intento?.esExamenPDF) {
        // PDF exam: initialize PDF-specific state
        setPdfNota(data.intento.puntaje != null ? String(data.intento.puntaje) : "");
        setPdfRetroalimentacion(data.intento.retroalimentacion || "");
      } else {
        // Regular exam: initialize per-question grading state
        const initialScores: Record<number, number> = {};
        const initialInputs: Record<number, string> = {};
        const initialFeedback: Record<number, string> = {};
        (data.preguntas || []).forEach((p: Pregunta) => {
          if (p.respuestaEstudiante) {
            initialScores[p.id] = p.respuestaEstudiante.puntajeObtenido;
            initialInputs[p.id] = String(p.respuestaEstudiante.puntajeObtenido);
            initialFeedback[p.id] = p.respuestaEstudiante.retroalimentacion || "";
          } else {
            initialScores[p.id] = 0;
            initialInputs[p.id] = "0";
            initialFeedback[p.id] = "";
          }
        });
        setScores(initialScores);
        setScoreInputs(initialInputs);
        setFeedback(initialFeedback);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando los detalles del intento.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (pregunta: Pregunta) => {
    if (!pregunta.respuestaEstudiante) {
      // Si no hay respuesta, simulamos error visual ya que no hay ID para actualizar
      setSaveStatus(prev => ({ ...prev, [pregunta.id]: "error" }));
      return;
    }
    const respuestaId = pregunta.respuestaEstudiante.id;
    setSaveStatus(prev => ({ ...prev, [pregunta.id]: "saving" }));
    try {
      await examsAttemptsService.updateManualGrade(respuestaId, {
        puntaje: scores[pregunta.id],
        retroalimentacion: feedback[pregunta.id],
      });
      setSaveStatus(prev => ({ ...prev, [pregunta.id]: "saved" }));
      const updated = await examsAttemptsService.getAttemptDetails(intentoId);
      setDetails(updated);
      updated.preguntas.forEach((p: Pregunta) => {
        if (p.respuestaEstudiante) {
          setScores(prev => ({ ...prev, [p.id]: p.respuestaEstudiante!.puntajeObtenido }));
          setScoreInputs(prev => ({ ...prev, [p.id]: String(p.respuestaEstudiante!.puntajeObtenido) }));
          setFeedback(prev => ({ ...prev, [p.id]: p.respuestaEstudiante!.retroalimentacion || "" }));
        }
      });
      if (updated.intento.notaFinal !== null) {
        onGradeUpdated(intentoId, updated.intento.notaFinal);
      }
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [pregunta.id]: "idle" })), 2000);
    } catch {
      setSaveStatus(prev => ({ ...prev, [pregunta.id]: "error" }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [pregunta.id]: "idle" })), 3000);
    }
  };

  const handlePDFSave = async () => {
    const nota = parseFloat(pdfNota);
    if (isNaN(nota) || nota < 0 || nota > 5) return;
    setPdfSaveStatus("saving");
    try {
      await examsAttemptsService.updatePDFAttemptGrade(intentoId, {
        puntaje: nota,
        retroalimentacion: pdfRetroalimentacion || undefined,
      });
      const updated = await examsAttemptsService.getAttemptDetails(intentoId);
      setDetails(updated);
      setPdfNota(updated.intento.puntaje != null ? String(updated.intento.puntaje) : "");
      setPdfRetroalimentacion(updated.intento.retroalimentacion || "");
      setPdfSaveStatus("saved");
      if (updated.intento.notaFinal !== null) {
        onGradeUpdated(intentoId, updated.intento.notaFinal);
      }
      setTimeout(() => setPdfSaveStatus("idle"), 2000);
    } catch {
      setPdfSaveStatus("error");
      setTimeout(() => setPdfSaveStatus("idle"), 3000);
    }
  };

  const hasChanges = (pregunta: Pregunta) => {
    const currentScore = scores[pregunta.id];
    const savedScore = pregunta.respuestaEstudiante?.puntajeObtenido ?? 0;
    const savedFeedback = pregunta.respuestaEstudiante?.retroalimentacion || "";
    return currentScore !== savedScore
      || feedback[pregunta.id] !== savedFeedback;
  };

  const getNotaColor = (nota: number | null | undefined, max?: number) => {
    if (nota === null || nota === undefined) return darkMode ? "text-slate-400" : "text-slate-500";
    if (max) {
      const pct = (nota / max) * 100;
      if (pct >= 80) return darkMode ? "text-emerald-400" : "text-emerald-600";
      if (pct >= 60) return darkMode ? "text-amber-400" : "text-amber-600";
      return darkMode ? "text-rose-400" : "text-rose-600";
    }
    if (nota >= 4.0) return darkMode ? "text-emerald-400" : "text-emerald-600";
    if (nota >= 3.0) return darkMode ? "text-amber-400" : "text-amber-600";
    return darkMode ? "text-rose-400" : "text-rose-600";
  };

  const toggleEditMode = (preguntaId: number) => {
    setEditingQuestionId(prev => (prev === preguntaId ? null : preguntaId));
  };

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-xl font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Cargando revisión...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{error || "No se pudieron cargar los datos."}</p>
        <button onClick={onVolver} className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white">Volver</button>
      </div>
    );
  }

  const { intento, examen, estadisticas, preguntas, respuestasPDF } = details;
  const isPDF = !!intento.esExamenPDF;

  const scrollbarStyles = `
    .revisar-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
    .revisar-scroll::-webkit-scrollbar-track { background: ${darkMode ? "#1e293b" : "#f1f5f9"}; border-radius: 10px; }
    .revisar-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? "#475569" : "#cbd5e1"}; border-radius: 10px; border: 2px solid ${darkMode ? "#1e293b" : "#f1f5f9"}; }
    .revisar-scroll::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#64748b" : "#94a3b8"}; }
    .revisar-scroll { scrollbar-width: thin; scrollbar-color: ${darkMode ? "#475569 #1e293b" : "#cbd5e1 #f1f5f9"}; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `;

  // ============================================
  // RENDER - Layout idéntico a ExamPanel / VerExamen
  // ============================================
  return (
    <div className={`h-full flex flex-col transition-colors duration-300 ${darkMode ? "bg-slate-900 text-gray-100" : "bg-white text-gray-900"}`}>
      <style>{scrollbarStyles}</style>
      <div className="flex-1 overflow-auto revisar-scroll">
        <div className="w-full px-6 md:px-12 py-8">

          {/* === HEADER === */}
          <header className={`mb-10 border-b pb-8 ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
            {!hideHeader && (
              <button
                onClick={onVolver}
                className={`mb-4 flex items-center gap-2 text-sm font-medium transition-colors ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            )}

            <div className="flex items-start gap-3 mb-3">
              <h1 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r tracking-tight ${darkMode ? "from-blue-400 to-teal-400" : "from-blue-500 to-teal-500"}`}>
                {examen.nombre}
              </h1>
              {isPDF && (
                <span className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${darkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
                  PDF
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm md:text-base">
              <div className={`flex items-center gap-2 font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {intento.nombre_estudiante}
              </div>
              <div className={`flex items-center gap-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {estadisticas.tiempoTotal
                  ? `${Math.floor(estadisticas.tiempoTotal / 60)}m ${estadisticas.tiempoTotal % 60}s`
                  : "Sin tiempo registrado"}
              </div>
            </div>

            {/* Resumen de calificación - distinto para PDF y regular */}
            {isPDF ? (
              <div className={`mt-6 p-5 rounded-xl border shadow-sm flex items-center justify-between ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-white border-gray-200"}`}>
                <div className="flex gap-8 items-center">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-teal-500" : "text-teal-600"}`}>Nota Final</span>
                    <p className={`text-2xl font-black ${getNotaColor(intento.notaFinal)}`}>
                      {intento.notaFinal != null ? intento.notaFinal : "--"}
                      <span className={`text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>/5.0</span>
                    </p>
                  </div>
                  {intento.calificacionPendiente ? (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${darkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                      Calificación pendiente
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                      Calificado
                    </span>
                  )}
                </div>
                <div className={`text-right text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  <p>{estadisticas.totalRespuestas ?? 0} respuesta(s) enviada(s)</p>
                </div>
              </div>
            ) : (
              <div className={`mt-6 p-5 rounded-xl border shadow-sm flex items-center justify-between ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-white border-gray-200"}`}>
                <div className="flex gap-8">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-teal-500" : "text-teal-600"}`}>Puntaje</span>
                    <p className={`text-2xl font-black ${getNotaColor(intento.puntaje, intento.puntajeMaximo)}`}>
                      {intento.puntaje}<span className={`text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>/{intento.puntajeMaximo}</span>
                    </p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-teal-500" : "text-teal-600"}`}>Nota Final</span>
                    <p className={`text-2xl font-black ${getNotaColor(intento.notaFinal)}`}>
                      {intento.notaFinal !== null ? intento.notaFinal : "--"}
                    </p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-teal-500" : "text-teal-600"}`}>Correctas</span>
                    <p className={`text-2xl font-black text-emerald-500`}>{estadisticas.preguntasCorrectas}<span className={`text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>/{estadisticas.totalPreguntas}</span></p>
                  </div>
                </div>
                <div className={`text-right text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  <p>{estadisticas.preguntasRespondidas} respondidas</p>
                  <p>{estadisticas.preguntasSinResponder} sin responder</p>
                </div>
              </div>
            )}
          </header>

          {/* ===== PDF MODE ===== */}
          {isPDF && (
            <div className="space-y-8">
              {/* Panel de calificación */}
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-white border-gray-200"}`}>
                <div className={`px-6 py-4 border-b flex items-center gap-2 ${darkMode ? "border-slate-700 bg-slate-800/80" : "border-gray-200 bg-slate-50"}`}>
                  <div className={`p-1.5 rounded-md ${darkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                    Asignar Calificación
                  </span>
                </div>
                <div className="p-6 flex flex-col md:flex-row gap-6">
                  {/* Nota */}
                  <div className="flex flex-col items-center gap-3 min-w-[180px]">
                    <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Nota Final (0.0 – 5.0)
                    </label>
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-gray-200"}`}>
                      <button
                        onClick={() => {
                          const v = Math.max(0, parseFloat((parseFloat(pdfNota || "0") - 0.1).toFixed(1)));
                          setPdfNota(String(v));
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${darkMode ? "border-slate-600 hover:bg-slate-700 text-slate-300" : "border-gray-300 hover:bg-gray-100 text-slate-600"}`}
                      >-</button>
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          value={pdfNota}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") { setPdfNota(""); return; }
                            const v = parseFloat(raw);
                            if (!isNaN(v)) setPdfNota(String(Math.min(5, Math.max(0, parseFloat(v.toFixed(1))))));
                          }}
                          className={`w-20 text-center text-3xl font-black bg-transparent focus:outline-none ${darkMode ? "text-white" : "text-slate-800"}`}
                        />
                        <span className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>/ 5.0</span>
                      </div>
                      <button
                        onClick={() => {
                          const v = Math.min(5, parseFloat((parseFloat(pdfNota || "0") + 0.1).toFixed(1)));
                          setPdfNota(String(v));
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${darkMode ? "border-slate-600 hover:bg-slate-700 text-slate-300" : "border-gray-300 hover:bg-gray-100 text-slate-600"}`}
                      >+</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[["0.0","Reprobado","rose"],["2.5","Parcial","amber"],["5.0","Aprobado","emerald"]].map(([val, label, color]) => (
                        <button key={val} onClick={() => setPdfNota(val)}
                          className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase border transition-colors ${
                            color === "rose" ? (darkMode ? "border-rose-900/30 bg-rose-900/10 text-rose-400 hover:bg-rose-900/20" : "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100")
                            : color === "amber" ? (darkMode ? "border-amber-900/30 bg-amber-900/10 text-amber-400 hover:bg-amber-900/20" : "border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100")
                            : (darkMode ? "border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/20" : "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100")
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Retroalimentación */}
                  <div className="flex-1 flex flex-col gap-2">
                    <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                      Retroalimentación general
                    </label>
                    <textarea
                      value={pdfRetroalimentacion}
                      onChange={(e) => setPdfRetroalimentacion(e.target.value)}
                      placeholder="Escribe aquí la retroalimentación para el estudiante. Puedes detallar cada punto del examen, errores encontrados, sugerencias, etc."
                      rows={14}
                      maxLength={10000}
                      className={`w-full p-4 rounded-xl border resize-y transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50"
                          : "bg-white border-gray-200 text-slate-700 placeholder:text-slate-400 focus:border-teal-400"
                      }`}
                    />
                    <span className={`text-xs text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {pdfRetroalimentacion.length} / 10 000
                    </span>
                    <button
                      onClick={handlePDFSave}
                      disabled={pdfSaveStatus === "saving" || pdfNota === ""}
                      className={`self-end px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${
                        pdfSaveStatus === "saved"
                          ? "bg-emerald-600 text-white shadow-emerald-500/20"
                          : pdfSaveStatus === "error"
                            ? "bg-rose-600 text-white shadow-rose-500/20"
                            : pdfSaveStatus === "saving" || pdfNota === ""
                              ? (darkMode ? "bg-slate-700 text-slate-500 cursor-not-allowed shadow-none" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none")
                              : "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-teal-500/25 hover:-translate-y-0.5"
                      }`}
                    >
                      {pdfSaveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                      {pdfSaveStatus === "saved" && <CheckCircle className="w-4 h-4" />}
                      {pdfSaveStatus === "error" && <XCircle className="w-4 h-4" />}
                      {pdfSaveStatus === "idle" && <Send className="w-4 h-4" />}
                      {pdfSaveStatus === "saving" ? "Guardando..." : pdfSaveStatus === "saved" ? "Guardado" : pdfSaveStatus === "error" ? "Error al guardar" : "Guardar Calificación"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Respuestas del estudiante */}
              <div>
                <h2 className={`text-lg font-bold mb-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Respuestas del estudiante
                </h2>
                {(respuestasPDF || []).length === 0 ? (
                  <div className={`p-10 rounded-2xl border-2 border-dashed text-center ${darkMode ? "border-slate-700 text-slate-500" : "border-gray-300 text-gray-400"}`}>
                    <HelpCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">El estudiante no envió respuestas</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(respuestasPDF || []).map((resp, idx) => (
                      <RenderPDFRespuesta key={resp.id} respuesta={resp} index={idx} darkMode={darkMode} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== REGULAR MODE - PREGUNTAS ===== */}
          {!isPDF && (
          <div className="space-y-12">
            {(preguntas || []).map((pregunta, index) => {
              const barColor = getStableColor(pregunta.id, QUESTION_COLORS);
              const resp = pregunta.respuestaEstudiante;
              const currentScore = scores[pregunta.id] ?? (resp ? resp.puntajeObtenido : 0);
              const pctScore = (currentScore / pregunta.puntajeMaximo) * 100;
              const status = saveStatus[pregunta.id] || "idle";
              const isEditing = editingQuestionId === pregunta.id;

              return (
                <div
                  key={pregunta.id}
                  className={`group relative rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                    darkMode
                      ? "bg-slate-800/60 border-slate-800 hover:border-blue-700/80"
                      : "bg-white border-gray-200 hover:shadow-lg hover:border-blue-300"
                  }`}
                >
                  {/* Barra lateral de color - idéntica a ExamPanel */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${barColor}`}></div>
                  
                  <div className="flex flex-col xl:flex-row items-stretch">
                    {/* CONTENIDO PRINCIPAL */}
                    <div className="flex-1 p-6 md:p-8 pl-8 md:pl-10 min-w-0">
                      <div className="flex items-start gap-4 mb-6">
                        {/* Columna Izquierda: Número y Puntaje */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 transition-all duration-300 ${
                            !resp && currentScore === 0
                              ? (darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500")
                              : pctScore >= 80
                                ? (darkMode ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200")
                                : pctScore >= 60
                                  ? (darkMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-amber-100 text-amber-600 ring-1 ring-amber-200")
                                  : (darkMode ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50" : "bg-rose-100 text-rose-600 ring-1 ring-rose-200")
                          }`}>
                          {index + 1}
                        </span>
                        </div>

                        <div className="flex-1">
                          <h3 className={`text-xl font-medium font-serif leading-snug ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            {pregunta.enunciado}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${darkMode ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                              {pregunta.type === "test" ? "Selección Múltiple" : pregunta.type === "open" ? "Pregunta Abierta" : pregunta.type === "match" ? "Emparejamiento" : "Completar"}
                            </span>
                          </div>
                        </div>

                        {/* Botón de Puntaje a la Derecha */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => toggleEditMode(pregunta.id)}
                            className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                              isEditing
                                ? (darkMode ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700")
                                : (darkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50")
                            }`}
                            title="Clic para calificar"
                          >
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Nota</span>
                            <span className={`text-2xl font-black ${
                              currentScore > 0 
                                ? (darkMode ? "text-emerald-400" : "text-emerald-600") 
                                : (darkMode ? "text-slate-500" : "text-slate-400")
                            }`}>
                              {currentScore}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Imagen */}
                      {pregunta.nombreImagen && (
                        <div className={`mb-6 rounded-xl overflow-hidden border flex justify-center p-4 ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-white border-gray-200"}`}>
                          <img
                            src={pregunta.nombreImagen.startsWith('data:') || pregunta.nombreImagen.startsWith('http')
                              ? pregunta.nombreImagen
                              : `${EXAMS_API_URL}/api/images/${pregunta.nombreImagen}`}
                            alt="Referencia visual"
                            className="max-h-80 object-contain rounded-lg shadow-sm"
                          />
                        </div>
                      )}

                      {/* Respuesta del estudiante */}
                      <div className="mt-4">
                        {!resp ? (
                          <div className={`p-6 rounded-xl border-2 border-dashed text-center ${
                            darkMode ? "border-slate-600 bg-slate-800/30 text-slate-500" : "border-gray-300 bg-gray-50 text-gray-400"
                          }`}>
                            <HelpCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <span className="text-sm font-medium">El estudiante no respondió esta pregunta</span>
                          </div>
                        ) : (
                          <>
                            {pregunta.type === "test" && <RenderTest pregunta={pregunta} darkMode={darkMode} />}
                            {pregunta.type === "open" && <RenderOpen pregunta={pregunta} darkMode={darkMode} />}
                            {pregunta.type === "fill_blanks" && <RenderFillBlanks pregunta={pregunta} darkMode={darkMode} />}
                            {pregunta.type === "match" && <RenderMatch pregunta={pregunta} darkMode={darkMode} />}
                          </>
                        )}
                      </div>
                    </div>

                    {/* PANEL LATERAL DE CALIFICACIÓN */}
                    {isEditing && (
                      <div className={`w-full xl:w-80 border-t xl:border-t-0 xl:border-l flex flex-col transition-all flex-shrink-0 ${
                        darkMode ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-gray-200"
                      }`}>
                        {/* Header del panel */}
                        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-white"}`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${darkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                              <Edit3 className="w-4 h-4" />
                            </div>
                            <span className={`text-sm font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                              Evaluar Respuesta
                            </span>
                          </div>
                          <button 
                            onClick={() => toggleEditMode(pregunta.id)}
                            className={`p-1 rounded-md transition-colors ${darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-slate-500"}`}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
                          
                          {/* Sección de Puntaje */}
                          <div>
                            <label className={`text-xs font-bold uppercase tracking-wider mb-3 block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                              Asignar Puntaje
                            </label>
                            
                            <div className={`p-4 rounded-xl border flex flex-col items-center gap-3 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                              <div className="flex items-center gap-4 w-full justify-center">
                                 <button
                                    onClick={() => {
                                      const current = parseFloat(scoreInputs[pregunta.id] || "0");
                                      const val = Math.max(0, parseFloat((current - 0.1).toFixed(1)));
                                      setScoreInputs(prev => ({ ...prev, [pregunta.id]: val.toString() }));
                                      setScores(prev => ({ ...prev, [pregunta.id]: val }));
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${darkMode ? "border-slate-600 hover:bg-slate-700 text-slate-300" : "border-gray-300 hover:bg-gray-100 text-slate-600"}`}
                                 >
                                    -
                                 </button>
                                 
                                 <div className="flex flex-col items-center">
                                   <input
                                      type="number"
                                      min={0}
                                      max={pregunta.puntajeMaximo}
                                      step={0.1}
                                      value={scoreInputs[pregunta.id] ?? "0"}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === "") {
                                          setScoreInputs(prev => ({ ...prev, [pregunta.id]: raw }));
                                          return;
                                        }
                                        const val = parseFloat(raw);
                                        if (!isNaN(val)) {
                                          if (val > pregunta.puntajeMaximo) {
                                            setScoreInputs(prev => ({ ...prev, [pregunta.id]: String(pregunta.puntajeMaximo) }));
                                            setScores(prev => ({ ...prev, [pregunta.id]: pregunta.puntajeMaximo }));
                                          } else if (val >= 0) {
                                            setScoreInputs(prev => ({ ...prev, [pregunta.id]: raw }));
                                            setScores(prev => ({ ...prev, [pregunta.id]: val }));
                                          }
                                        }
                                      }}
                                      className={`w-20 text-center text-3xl font-black bg-transparent focus:outline-none ${darkMode ? "text-white" : "text-slate-800"}`}
                                   />
                                   <span className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                     / {pregunta.puntajeMaximo} pts
                                   </span>
                                 </div>

                                 <button
                                    onClick={() => {
                                      const current = parseFloat(scoreInputs[pregunta.id] || "0");
                                      const val = Math.min(pregunta.puntajeMaximo, parseFloat((current + 0.1).toFixed(1)));
                                      setScoreInputs(prev => ({ ...prev, [pregunta.id]: val.toString() }));
                                      setScores(prev => ({ ...prev, [pregunta.id]: val }));
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${darkMode ? "border-slate-600 hover:bg-slate-700 text-slate-300" : "border-gray-300 hover:bg-gray-100 text-slate-600"}`}
                                 >
                                    +
                                 </button>
                              </div>

                              {/* Botones rápidos */}
                              <div className="grid grid-cols-3 gap-2 w-full mt-1">
                                <button
                                  onClick={() => {
                                     setScoreInputs(prev => ({ ...prev, [pregunta.id]: "0" }));
                                     setScores(prev => ({ ...prev, [pregunta.id]: 0 }));
                                  }}
                                  className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase border transition-colors ${darkMode ? "border-rose-900/30 bg-rose-900/10 text-rose-400 hover:bg-rose-900/20" : "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
                                >
                                  Incorrecto
                                </button>
                                <button
                                  onClick={() => {
                                     const half = pregunta.puntajeMaximo / 2;
                                     setScoreInputs(prev => ({ ...prev, [pregunta.id]: half.toString() }));
                                     setScores(prev => ({ ...prev, [pregunta.id]: half }));
                                  }}
                                  className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase border transition-colors ${darkMode ? "border-amber-900/30 bg-amber-900/10 text-amber-400 hover:bg-amber-900/20" : "border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                                >
                                  Parcial
                                </button>
                                <button
                                  onClick={() => {
                                     setScoreInputs(prev => ({ ...prev, [pregunta.id]: pregunta.puntajeMaximo.toString() }));
                                     setScores(prev => ({ ...prev, [pregunta.id]: pregunta.puntajeMaximo }));
                                  }}
                                  className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase border transition-colors ${darkMode ? "border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/20" : "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                                >
                                  Correcto
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Sección de Retroalimentación */}
                          <div className="flex-1 flex flex-col min-h-0">
                            <label className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                              <MessageSquare className="w-3.5 h-3.5" />
                              Retroalimentación
                            </label>
                            <textarea
                              value={feedback[pregunta.id] || ""}
                              onChange={(e) => setFeedback(prev => ({ ...prev, [pregunta.id]: e.target.value }))}
                              placeholder="Escribe tus observaciones aquí..."
                              maxLength={2000}
                              className={`flex-1 w-full p-4 rounded-xl border resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                darkMode
                                  ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50"
                                  : "bg-white border-gray-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-400"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Botón guardar */}
                        <div className={`p-4 border-t ${darkMode ? "border-slate-700 bg-slate-800/30" : "border-gray-200 bg-gray-50"}`}>
                          <button
                            onClick={() => handleSave(pregunta)}
                            disabled={status === "saving" || !hasChanges(pregunta)}
                            className={`w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                              status === "saved"
                                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                : status === "error"
                                  ? "bg-rose-600 text-white shadow-rose-500/20"
                                  : !hasChanges(pregunta)
                                    ? (darkMode ? "bg-slate-700 text-slate-500 cursor-not-allowed shadow-none" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none")
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                            }`}
                          >
                            {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                            {status === "saved" && <CheckCircle className="w-4 h-4" />}
                            {status === "error" && <XCircle className="w-4 h-4" />}
                            {status === "idle" && <Send className="w-4 h-4" />}
                            
                            {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado" : status === "error" ? (!resp ? "Sin Respuesta" : "Error") : "Guardar Cambios"}
                          </button>
                          {!resp && (
                            <p className="text-[10px] text-center mt-2 text-rose-500 opacity-80">
                              * No se puede guardar nota sin respuesta del estudiante
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTES PDF
// ============================================

const TIPO_LABELS: Record<string, string> = {
  normal: "Respuesta de texto",
  texto_plano: "Texto",
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  diagrama: "Diagrama / Lienzo",
};

function RenderPDFRespuesta({ respuesta, index, darkMode }: { respuesta: RespuestaPDF; index: number; darkMode: boolean }) {
  const tipo = respuesta.tipo_respuesta;
  const content = respuesta.respuesta;
  const meta = respuesta.metadata_codigo;
  const label = TIPO_LABELS[tipo] || tipo;
  const [showDiagramModal, setShowDiagramModal] = useState(false);

  const borderColor = darkMode ? "border-slate-700" : "border-gray-200";
  const cardBg = darkMode ? "bg-slate-800/60" : "bg-white";
  const headerBg = darkMode ? "bg-slate-800/80" : "bg-slate-50";

  const tipoIcon = () => {
    if (tipo === "diagrama") return <PenLine className="w-4 h-4" />;
    if (["python", "javascript", "java"].includes(tipo)) return <Code2 className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg} ${borderColor}`}>
      <div className={`px-5 py-3 border-b flex items-center gap-3 ${headerBg} ${borderColor}`}>
        <span className={`p-1.5 rounded-md ${darkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-500 border border-gray-200"}`}>
          {tipoIcon()}
        </span>
        <span className={`font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
          Respuesta {index + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {tipo === "diagrama" && content?.sheets && (
            <button
              onClick={() => setShowDiagramModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${darkMode ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Ampliar
            </button>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${darkMode ? "bg-slate-700 text-slate-400 border-slate-600" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
            {label}
          </span>
        </div>
      </div>
      <div className="p-5">
        {(tipo === "normal" || tipo === "texto_plano") && (
          <div className={`w-full min-h-[80px] p-4 rounded-xl border-2 whitespace-pre-wrap text-base ${darkMode ? "bg-slate-900/40 border-slate-700 text-slate-200" : "bg-gray-50 border-gray-200 text-slate-700"}`}>
            {String(content || "") || <span className="italic opacity-40">Sin contenido</span>}
          </div>
        )}

        {["python", "javascript", "java"].includes(tipo) && (
          <div className="space-y-3">
            {/* Code cells */}
            {Array.isArray(content) ? (
              content.map((cell: any, ci: number) => (
                <div key={ci} className="space-y-1">
                  {cell.type === "code" || !cell.type ? (
                    <pre className={`p-4 rounded-xl border-2 font-mono text-sm overflow-x-auto ${darkMode ? "bg-slate-900 border-slate-700 text-emerald-300" : "bg-slate-900 border-slate-700 text-emerald-400"}`}>
                      <code>{String(cell.content ?? cell.code ?? cell ?? "")}</code>
                    </pre>
                  ) : (
                    <div className={`p-3 rounded-lg border text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-gray-200 text-slate-700"}`}>
                      {String(cell.content ?? cell ?? "")}
                    </div>
                  )}
                  {cell.output && (
                    <pre className={`p-3 rounded-lg border text-xs font-mono overflow-x-auto ${darkMode ? "bg-black/40 border-slate-800 text-slate-400" : "bg-gray-100 border-gray-200 text-gray-600"}`}>
                      {String(cell.output)}
                    </pre>
                  )}
                </div>
              ))
            ) : (
              <pre className={`p-4 rounded-xl border-2 font-mono text-sm overflow-x-auto ${darkMode ? "bg-slate-900 border-slate-700 text-emerald-300" : "bg-slate-900 border-slate-700 text-emerald-400"}`}>
                <code>{typeof content === "string" ? content : JSON.stringify(content, null, 2)}</code>
              </pre>
            )}
            {/* Metadata summary */}
            {meta && (
              <div className={`flex gap-4 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                {meta.totalCells != null && <span>{meta.totalCells} celda(s)</span>}
                {meta.codeCells != null && <span>{meta.codeCells} de código</span>}
                {meta.textCells != null && <span>{meta.textCells} de texto</span>}
              </div>
            )}
          </div>
        )}

        {tipo === "diagrama" && (
          <div className="space-y-3">
            {content && content.sheets ? (
              <>
                {/* Preview clicable */}
                <div
                  className="rounded-xl overflow-hidden cursor-pointer"
                  style={{ height: 400 }}
                  onClick={() => setShowDiagramModal(true)}
                  title="Hacer clic para ampliar"
                >
                  <div className="pointer-events-none w-full h-full">
                    <Lienzo readOnly darkMode={darkMode} initialData={content} />
                  </div>
                </div>

                {/* Modal pantalla completa */}
                {showDiagramModal && createPortal(
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                      onClick={() => setShowDiagramModal(false)}
                    />
                    <div
                      className={`relative w-full h-full max-w-[95vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border ${darkMode ? "border-slate-700" : "border-slate-200"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowDiagramModal(false)}
                        className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow transition-colors"
                        title="Cerrar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <Lienzo readOnly darkMode={darkMode} initialData={content} />
                    </div>
                  </div>,
                  document.body
                )}
              </>
            ) : (
              <div className={`p-5 rounded-xl border-2 border-dashed text-center text-sm ${darkMode ? "border-slate-600 text-slate-500" : "border-gray-300 text-gray-400"}`}>
                <PenLine className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>Sin datos del diagrama.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTES - Respuestas read-only
// Estilo de opciones idéntico a ExamPanel (border-2, rounded-xl, p-4)
// ============================================

function RenderTest({ pregunta, darkMode }: { pregunta: Pregunta; darkMode: boolean }) {
  const seleccionadas = pregunta.respuestaEstudiante?.opcionesSeleccionadas || [];
  const selIds = new Set(seleccionadas.map(o => o.id));
  const selMap = new Map(seleccionadas.map(o => [o.id, o]));
  const puntajeTotal = pregunta.respuestaEstudiante?.puntajeObtenido === pregunta.puntajeMaximo;

  return (
    <div className="grid grid-cols-1 gap-3">
      {(pregunta.opciones || []).map((opcion) => {
        const fueSeleccionada = selIds.has(opcion.id);
        let esCorrecta = opcion.esCorrecta;
        if (fueSeleccionada && puntajeTotal) {
           esCorrecta = true;
        } else if (esCorrecta === undefined && fueSeleccionada) {
           esCorrecta = selMap.get(opcion.id)?.esCorrecta || false;
        }

        let containerClass: string;
        let checkboxClass: string;
        let textClass: string;

        if (fueSeleccionada && esCorrecta) {
          containerClass = darkMode ? "border-emerald-500 bg-emerald-900/30" : "border-emerald-500 bg-emerald-50";
          checkboxClass = "bg-emerald-500 border-emerald-500";
          textClass = darkMode ? "text-emerald-300" : "text-emerald-700";
        } else if (fueSeleccionada && !esCorrecta) {
          containerClass = darkMode ? "border-rose-500 bg-rose-900/30" : "border-rose-500 bg-rose-50";
          checkboxClass = "bg-rose-500 border-rose-500";
          textClass = darkMode ? "text-rose-300" : "text-rose-700";
        } else if (!fueSeleccionada && esCorrecta) {
          containerClass = darkMode ? "border-emerald-500/30 bg-emerald-900/10 border-dashed" : "border-emerald-300 bg-emerald-50/50 border-dashed";
          checkboxClass = darkMode ? "border-emerald-500/50 bg-transparent" : "border-emerald-300 bg-transparent";
          textClass = darkMode ? "text-emerald-400/60" : "text-emerald-600/60";
        } else {
          containerClass = darkMode ? "border-slate-700" : "border-gray-200";
          checkboxClass = darkMode ? "border-slate-500 bg-slate-800/80" : "border-gray-300 bg-white";
          textClass = darkMode ? "text-slate-400" : "text-slate-500";
        }

        return (
          <div key={opcion.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${containerClass}`}>
            <div className="relative flex items-center justify-center">
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${checkboxClass}`}>
                {fueSeleccionada && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!fueSeleccionada && esCorrecta && (
                  <svg className={`w-4 h-4 ${darkMode ? "text-emerald-500/50" : "text-emerald-400/50"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`flex-1 font-medium ${textClass}`}>{opcion.texto}</span>
            {fueSeleccionada && (
              <span className={`text-[10px] font-bold uppercase ${esCorrecta ? "text-emerald-500" : "text-rose-500"}`}>
                {esCorrecta ? "Correcta" : "Incorrecta"}
              </span>
            )}
            {!fueSeleccionada && esCorrecta && (
              <span className={`text-[10px] font-bold uppercase ${darkMode ? "text-emerald-500/50" : "text-emerald-500/60"}`}>
                Era correcta
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RenderOpen({ pregunta, darkMode }: { pregunta: Pregunta; darkMode: boolean }) {
  const texto = pregunta.respuestaEstudiante?.textoEscrito || "";

  return (
    <div className="space-y-4">
      {/* Texto read-only con el mismo estilo que el textarea de ExamPanel */}
      <div className={`w-full min-h-[140px] p-4 rounded-xl border-2 ${darkMode ? "bg-slate-800/70 border-slate-700 text-slate-200" : "bg-gray-50 border-gray-200 text-slate-700"}`}>
        <p className="whitespace-pre-wrap text-base">
          {texto || <span className="italic opacity-50">Respuesta vacía</span>}
        </p>
      </div>

      {pregunta.keywords && pregunta.keywords.length > 0 && (
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Palabras clave esperadas
          </p>
          <div className="flex flex-wrap gap-2">
            {pregunta.keywords.map((kw) => {
              const found = texto.toLowerCase().includes(kw.texto.toLowerCase());
              return (
                <span key={kw.id} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                  found
                    ? (darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200")
                    : (darkMode ? "bg-slate-700 text-slate-400 border-slate-600" : "bg-gray-100 text-gray-500 border-gray-200")
                }`}>
                  {found && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {kw.texto}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RenderFillBlanks({ pregunta, darkMode }: { pregunta: Pregunta; darkMode: boolean }) {
  const espacios = pregunta.respuestaEstudiante?.espaciosLlenados || [];
  const texto = pregunta.textoCorrecto || "";
  const partes = texto.split("___");
  const puntajeTotal = Math.abs((pregunta.respuestaEstudiante?.puntajeObtenido || 0) - pregunta.puntajeMaximo) < 0.01;

  return (
    <div className={`p-6 rounded-xl border leading-loose text-lg ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
      <p className={`leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
        {partes.map((parte, i) => {
          const esCorrecta = i < espacios.length ? (espacios[i].esCorrecta || puntajeTotal) : false;
          return (
          <span key={i}>
            <span>{parte}</span>
            {i < espacios.length && (
              <span className="relative inline-block mx-1">
                <span className={`inline-block w-32 px-2 py-1 text-center border-b-2 rounded-t font-medium ${
                  esCorrecta
                    ? (darkMode ? "bg-emerald-900/30 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-500 text-emerald-700")
                    : (darkMode ? "bg-rose-900/30 border-rose-500 text-rose-400" : "bg-rose-50 border-rose-500 text-rose-700")
                }`}>
                  {espacios[i].respuestaEstudiante || "—"}
                </span>
                {!esCorrecta && (
                  <span className={`absolute top-full left-0 w-full text-[10px] text-center mt-0.5 z-10 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {espacios[i].respuestaCorrecta}
                  </span>
                )}
              </span>
            )}
          </span>
        )})}
      </p>
    </div>
  );
}

function RenderMatch({ pregunta, darkMode }: { pregunta: Pregunta; darkMode: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemPositions, setItemPositions] = useState<Record<string, { top: number; left: number }>>({});
  const respuestas = pregunta.respuestaEstudiante?.paresSeleccionados || [];
  const paresCorrectos = pregunta.paresCorrectos || [];
  const puntajeTotal = Math.abs((pregunta.respuestaEstudiante?.puntajeObtenido || 0) - pregunta.puntajeMaximo) < 0.01;

  // Preparar columnas (Memoizado para estabilidad)
  const { itemsA, itemsB } = useMemo(() => {
    const a = paresCorrectos.map(p => p.itemA);
    // Mezclar B determinísticamente para que no queden siempre alineados horizontalmente y se vean las líneas cruzadas
    const b = [...paresCorrectos.map(p => p.itemB)].sort((x, y) => (x.id * 17 % 100) - (y.id * 17 % 100));
    return { itemsA: a, itemsB: b };
  }, [paresCorrectos]);

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    const positions: Record<string, { top: number; left: number }> = {};
    const containerRect = containerRef.current.getBoundingClientRect();

    itemsA.forEach(item => {
      const el = document.getElementById(`rev-match-a-${pregunta.id}-${item.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        positions[`a-${item.id}`] = {
          left: (rect.right - 2) - containerRect.left,
          top: (rect.top + rect.height / 2) - containerRect.top
        };
      }
    });

    itemsB.forEach(item => {
      const el = document.getElementById(`rev-match-b-${pregunta.id}-${item.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        positions[`b-${item.id}`] = {
          left: (rect.left + 2) - containerRect.left,
          top: (rect.top + rect.height / 2) - containerRect.top
        };
      }
    });
    setItemPositions(positions);
  }, [pregunta.id, itemsA, itemsB]);

  useEffect(() => {
    const timer = setTimeout(updatePositions, 300);

    // Observar cambios de tamaño en el contenedor (ej. al abrir el menú lateral)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => updatePositions());
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('resize', updatePositions);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [updatePositions]);

  const getPath = (posA: { left: number; top: number }, posB: { left: number; top: number }) => {
    if (!posA || !posB) return "";
    const x1 = posA.left;
    const y1 = posA.top;
    const x2 = posB.left;
    const y2 = posB.top;
    const tension = 0.5;
    const delta = Math.abs(x2 - x1) * tension;
    return `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div ref={containerRef} className={`relative p-6 rounded-xl border select-none ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
      {/* SVG Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        {respuestas.map((resp, idx) => {
          const posA = itemPositions[`a-${resp.itemA.id}`];
          const posB = itemPositions[`b-${resp.itemB.id}`];
          if (!posA || !posB) return null;
          
          const style = getStableColor(resp.itemA.id, PAIR_COLORS);
          
          return (
            <g key={idx}>
              {/* Sombra de la línea para profundidad */}
              <path 
                d={getPath(posA, posB)} 
                fill="none" 
                stroke="rgba(0,0,0,0.1)" 
                strokeWidth="6" 
                className={darkMode ? "stroke-black/20" : ""} 
              />
              <path 
                d={getPath(posA, posB)} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                className={darkMode ? style.darkStroke : style.stroke} 
              />
              <circle cx={posA.left} cy={posA.top} r="4" className={darkMode ? style.darkFill : style.fill} />
              <circle cx={posB.left} cy={posB.top} r="4" className={darkMode ? style.darkFill : style.fill} />
            </g>
          );
        })}
      </svg>

      <div className="flex justify-between gap-12 relative z-20">
        {/* Columna A */}
        <div className="flex-1 space-y-4">
          {itemsA.map(item => {
            const pair = respuestas.find(r => r.itemA.id === item.id);
            const isConnected = !!pair;
            const style = isConnected ? getStableColor(item.id, PAIR_COLORS) : null;
            const isCorrect = pair ? (pair.esCorrecto || puntajeTotal) : false;

            return (
            <div 
              key={item.id} 
              id={`rev-match-a-${pregunta.id}-${item.id}`} 
              className={`p-4 rounded-xl border text-right flex items-center justify-end relative transition-all ${
                isConnected 
                  ? (darkMode ? `${style?.darkBorder} ${style?.darkBg}` : `${style?.border} ${style?.bg}`)
                  : (darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-gray-50 border-gray-200 text-slate-700")
              }`}
            >
              <span className={`font-medium ${isConnected ? (isCorrect ? (darkMode ? "text-emerald-400" : "text-emerald-700") : (darkMode ? "text-rose-400" : "text-rose-700")) : ""}`}>{item.text}</span>
              <div className={`w-3 h-3 rounded-full border-2 absolute -right-1.5 top-1/2 -translate-y-1/2 ${isConnected ? (darkMode ? `bg-slate-700 ${style?.darkBorder}` : `bg-white ${style?.border}`) : (darkMode ? "bg-slate-600 border-slate-500" : "bg-gray-300 border-gray-400")}`}></div>
            </div>
          )})}
        </div>
        
        {/* Columna B */}
        <div className="flex-1 space-y-4">
          {itemsB.map(item => {
            const pair = respuestas.find(r => r.itemB.id === item.id);
            const isConnected = !!pair;
            const style = isConnected ? getStableColor(pair.itemA.id, PAIR_COLORS) : null;
            const isCorrect = pair ? (pair.esCorrecto || puntajeTotal) : false;

            return (
            <div 
              key={item.id} 
              id={`rev-match-b-${pregunta.id}-${item.id}`} 
              className={`p-4 rounded-xl border flex items-center relative transition-all ${
                isConnected 
                  ? (darkMode ? `${style?.darkBorder} ${style?.darkBg}` : `${style?.border} ${style?.bg}`)
                  : (darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-gray-50 border-gray-200 text-slate-700")
              }`}
            >
              <div className={`w-3 h-3 rounded-full border-2 absolute -left-1.5 top-1/2 -translate-y-1/2 ${isConnected ? (darkMode ? `bg-slate-700 ${style?.darkBorder}` : `bg-white ${style?.border}`) : (darkMode ? "bg-slate-600 border-slate-500" : "bg-gray-300 border-gray-400")}`}></div>
              <span className={`font-medium ${isConnected ? (isCorrect ? (darkMode ? "text-emerald-400" : "text-emerald-700") : (darkMode ? "text-rose-400" : "text-rose-700")) : ""}`}>{item.text}</span>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
