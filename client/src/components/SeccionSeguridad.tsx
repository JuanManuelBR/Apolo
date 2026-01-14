import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Check } from 'lucide-react';

interface SeccionSeguridadProps {
  darkMode: boolean;
  onContraseñaChange: (contraseña: string) => void;
  onConsecuenciaChange: (consecuencia: string) => void;
  contraseñaInicial: string;
  consecuenciaInicial: string;
  onContraseñaHabilitadaChange?: (habilitada: boolean) => void;
  contraseñaHabilitadaInicial?: boolean;
  onContraseñaValidaChange?: (valida: boolean) => void;
}

export default function SeccionSeguridad({
  darkMode,
  onContraseñaChange,
  onConsecuenciaChange,
  contraseñaInicial,
  consecuenciaInicial,
  onContraseñaHabilitadaChange,
  contraseñaHabilitadaInicial = false,
  onContraseñaValidaChange
}: SeccionSeguridadProps) {
  const [contraseña, setContraseña] = useState(contraseñaInicial);
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [consecuencia, setConsecuencia] = useState(consecuenciaInicial);
  const [contraseñaHabilitada, setContraseñaHabilitada] = useState(contraseñaHabilitadaInicial);
  const [contraseñaValida, setContraseñaValida] = useState(false);

  useEffect(() => {
    validarContraseña(contraseña);
  }, [contraseña, contraseñaHabilitada]);

  const validarContraseña = (pass: string) => {
    // Si la contraseña no está habilitada, siempre es válida
    if (!contraseñaHabilitada) {
      setContraseñaValida(true);
      if (onContraseñaValidaChange) {
        onContraseñaValidaChange(true);
      }
      return;
    }
    
    // Si está habilitada pero vacía, no es válida
    if (pass === '') {
      setContraseñaValida(false);
      if (onContraseñaValidaChange) {
        onContraseñaValidaChange(false);
      }
      return;
    }
    
    // ✅ NUEVAS REGLAS: Mínimo 5, máximo 10, cualquier carácter
    const longitudValida = pass.length >= 5 && pass.length <= 10;
    setContraseñaValida(longitudValida);
    if (onContraseñaValidaChange) {
      onContraseñaValidaChange(longitudValida);
    }
  };

  const handleContraseñaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaContraseña = e.target.value;
    // Limitar a 10 caracteres máximo
    if (nuevaContraseña.length <= 10) {
      setContraseña(nuevaContraseña);
      onContraseñaChange(nuevaContraseña);
    }
  };

  const handleConsecuenciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaConsecuencia = e.target.value;
    setConsecuencia(nuevaConsecuencia);
    onConsecuenciaChange(nuevaConsecuencia);
  };

  const handleContraseñaHabilitadaToggle = () => {
    const nuevoEstado = !contraseñaHabilitada;
    setContraseñaHabilitada(nuevoEstado);
    
    if (onContraseñaHabilitadaChange) {
      onContraseñaHabilitadaChange(nuevoEstado);
    }
    
    if (!nuevoEstado) {
      setContraseña('');
      onContraseñaChange('');
    }
  };

  const bgCheckbox = darkMode ? 'bg-teal-500 border-teal-500' : 'bg-slate-700 border-slate-700';

  return (
    <div className="px-6 pb-6 space-y-6">
      {/* Contraseña del examen */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Contraseña del examen
          </label>
          <button 
            onClick={handleContraseñaHabilitadaToggle}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              contraseñaHabilitada ? bgCheckbox : 'border-gray-300'
            }`}
          >
            {contraseñaHabilitada && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Habilitar
          </span>
        </div>

        {contraseñaHabilitada && (
          <>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ingrese una contraseña de 5 a 10 caracteres (puede incluir letras, números y símbolos)
            </p>
            
            <div className="relative">
              <input
                type={mostrarContraseña ? 'text' : 'password'}
                value={contraseña}
                onChange={handleContraseñaChange}
                placeholder="Ingrese la contraseña del examen"
                maxLength={10}
                className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 placeholder-gray-400'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setMostrarContraseña(!mostrarContraseña)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-slate-700 text-gray-400' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={mostrarContraseña ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContraseña ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {contraseña.length > 0 && (
              <div className="flex items-center gap-2">
                {contraseñaValida ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">
                      Contraseña válida ({contraseña.length}/10 caracteres)
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-red-500">
                    {contraseña.length < 5 
                      ? `La contraseña debe tener al menos 5 caracteres (${contraseña.length}/5)`
                      : 'La contraseña no puede tener más de 10 caracteres'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Consecuencia de abandono */}
      <div className="space-y-3">
        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Consecuencia de abandono <span className="text-red-500">*</span>
        </label>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ¿Qué sucede si el estudiante abandona la ventana del examen?
        </p>
        <select
          value={consecuencia}
          onChange={handleConsecuenciaChange}
          className={`w-full px-4 py-3 rounded-lg border ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-gray-300'
          }`}
        >
          <option value="">Seleccionar una consecuencia...</option>
          <option value="notificar-profesor">Notificar al profesor pero no bloquear al alumno</option>
          <option value="desbloqueo-manual">Pedir una explicación y desbloqueo manual (por el profesor)</option>
          <option value="desactivar-proteccion">Desactivar por completo la protección contra trampas</option>
        </select>
      </div>

      {/* Información adicional */}
      <div className={`p-4 rounded-lg border ${
        darkMode 
          ? 'bg-slate-800/50 border-slate-700' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-900'}`}>
          <strong>Nota:</strong> Las opciones de seguridad ayudan a mantener la integridad del examen.
          {contraseñaHabilitada && ' Los estudiantes necesitarán la contraseña para acceder al examen.'}
        </p>
      </div>
    </div>
  );
}