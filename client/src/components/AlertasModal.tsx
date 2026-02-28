import { X, AlertTriangle, Shield, Eye, Clock } from 'lucide-react';
import { useState } from 'react';

interface Alerta {
  id: number;
  tipo_evento: string;
  fecha_envio: string;
  leido: boolean;
}

interface AlertasModalProps {
  mostrar: boolean;
  darkMode: boolean;
  alertas: Alerta[];
  nombreEstudiante: string;
  onCerrar: () => void;
}

export default function AlertasModal({
  mostrar,
  darkMode,
  alertas,
  nombreEstudiante,
  onCerrar,
}: AlertasModalProps) {
  // Estado local para controlar qué alertas tienen el punto visible
  const [alertasVistas, setAlertasVistas] = useState<Set<number>>(new Set());

  if (!mostrar) return null;

  const mapearEvento = (tipo: string) => {
    const mapa: Record<string, { texto: string; icon: any; color: string }> = {
      pantalla_completa_cerrada: {
        texto: "Salió de pantalla completa",
        icon: Eye,
        color: "text-red-500",
      },
      combinacion_teclas_prohibida: {
        texto: "Usó combinación de teclas prohibida",
        icon: Shield,
        color: "text-orange-500",
      },
      foco_perdido: {
        texto: "Perdió el foco de la ventana",
        icon: AlertTriangle,
        color: "text-yellow-500",
      },
      intento_copiar_pegar_imprimir: {
        texto: "Intentó copiar/pegar/imprimir",
        icon: Shield,
        color: "text-red-500",
      },
      manipulacion_codigo: {
        texto: "Manipulación de código detectada",
        icon: Shield,
        color: "text-red-600",
      },
      pestana_cambiada: {
        texto: "Cambió de pestaña",
        icon: Eye,
        color: "text-orange-500",
      },
    };

    return mapa[tipo] || { texto: tipo, icon: AlertTriangle, color: "text-gray-500" };
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMouseEnter = (alertaId: number) => {
    setAlertasVistas(prev => new Set(prev).add(alertaId));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 anim-fadeIn"
      onClick={onCerrar}
    >
      <div
        className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} rounded-xl border shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col anim-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div>
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Alertas de Seguridad
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {nombreEstudiante}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'text-gray-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {alertas.length === 0 ? (
            <div className="text-center py-12">
              <Shield className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No hay alertas registradas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map((alerta) => {
                const { texto, icon: Icon, color } = mapearEvento(alerta.tipo_evento);
                const mostrarPunto = !alerta.leido && !alertasVistas.has(alerta.id);
                
                return (
                  <div
                    key={alerta.id}
                    onMouseEnter={() => handleMouseEnter(alerta.id)}
                    className={`relative p-4 rounded-lg border transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {/* Punto amarillo */}
                    {mostrarPunto && (
                      <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></span>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                      <div className="flex-1">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {texto}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatearFecha(alerta.fecha_envio)}
                          </p>
                        </div>
                      </div>
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