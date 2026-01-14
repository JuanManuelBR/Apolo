// src/services/examsService.ts
import { examsApi } from './examsApi';
import type { Pregunta } from '../components/CrearPreguntas';

// ==================== TIPOS ====================

export interface DatosExamen {
  nombreExamen: string;
  descripcionExamen: string;
  tipoPregunta: 'pdf' | 'automatico';
  archivoPDF?: File | null;
  preguntasAutomaticas?: Pregunta[];
  camposActivos: Array<{ id: string; nombre: string }>;
  fechaInicio: string | null;
  fechaCierre: string | null;
  limiteTiempo: { valor: number; unidad: 'minutos' } | null;
  opcionTiempoAgotado: string;
  seguridad: {
    contraseña: string;
    consecuenciaAbandono: string;
  };
  herramientasActivas: string[];
}

export interface ExamenCreado {
  id: number;
  nombre: string;
  descripcion: string;
  codigoExamen: string;
  archivoPDF?: string | null;
  fecha_creacion: string;
  estado: 'open' | 'closed';
  id_profesor: number;
  horaApertura: string;
  horaCierre: string;
  questions: any[];
  necesitaNombreCompleto?: boolean;
  necesitaCorreoElectrónico?: boolean;
  necesitaCodigoEstudiantil?: boolean;
}

// ==================== MAPEO DE DATOS ====================

function mapearConsecuencia(consecuencia: string): 'notificar' | 'bloquear' | 'ninguna' {
  const mapa: Record<string, 'notificar' | 'bloquear' | 'ninguna'> = {
    'notificar': 'notificar',
    'notificar-profesor': 'notificar',
    'bloquear': 'bloquear',
    'bloquear-examen': 'bloquear',
    'ninguna': 'ninguna',
    'sin-consecuencia': 'ninguna',
    '': 'ninguna'
  };
  
  return mapa[consecuencia.toLowerCase()] || 'ninguna';
}

function mapearTiempoAgotado(opcion: string): 'enviar' | 'descartar' {
  if (opcion.includes('automatico') || opcion.includes('enviar')) {
    return 'enviar';
  }
  return 'descartar';
}

function mapearPreguntaABackend(pregunta: Pregunta, index: number) {
  const base = {
    enunciado: pregunta.titulo.replace(/<[^>]*>/g, '').trim() || `Pregunta ${index + 1}`,
    puntaje: pregunta.puntos,
    calificacionParcial: pregunta.calificacionParcial || false,
    nombreImagen: null
  };

  switch (pregunta.tipo) {
    case 'seleccion-multiple':
      return {
        ...base,
        type: 'test',
        shuffleOptions: true,
        options: pregunta.opciones?.map(op => ({
          texto: op.texto,
          esCorrecta: op.esCorrecta
        })) || []
      };

    case 'abierta':
      const resultado: any = {
        ...base,
        type: 'open'
      };

      if (pregunta.metodoEvaluacion === 'texto-exacto' && pregunta.textoExacto) {
        resultado.textoRespuesta = pregunta.textoExacto;
        resultado.palabrasClave = [];
      } else if (pregunta.metodoEvaluacion === 'palabras-clave' && pregunta.palabrasClave) {
        resultado.textoRespuesta = null;
        resultado.palabrasClave = pregunta.palabrasClave;
      } else {
        resultado.textoRespuesta = null;
        resultado.palabrasClave = [];
      }

      return resultado;

    case 'rellenar-espacios':
      return {
        ...base,
        type: 'fill_blanks',
        textoCorrecto: pregunta.textoConEspacios || '',
        respuestas: pregunta.espacios?.map((espacio, idx) => ({
          posicion: idx,
          textoCorrecto: espacio.respuestaCorrecta
        })) || []
      };

    case 'conectar':
      return {
        ...base,
        type: 'matching',
        pares: pregunta.paresConexion?.map(par => ({
          itemA: par.izquierda,
          itemB: par.derecha
        })) || []
      };

    default:
      throw new Error(`Tipo de pregunta no soportado: ${pregunta.tipo}`);
  }
}

// ==================== SERVICIO PRINCIPAL ====================

export const examsService = {
  /**
   * Crear un nuevo examen
   */
  crearExamen: async (datosExamen: DatosExamen, usuarioId: number): Promise<{
    success: boolean;
    codigoExamen: string;
    examen?: ExamenCreado;
    error?: string;
  }> => {
    try {
      console.log('📋 [EXAMS] Preparando examen para enviar...');

      const examData: any = {
        nombre: datosExamen.nombreExamen,
        descripcion: datosExamen.descripcionExamen || '',
        contrasena: datosExamen.seguridad.contraseña || '', // ✅ String vacío en lugar de null
        fecha_creacion: new Date().toISOString(),
        estado: 'open',
        id_profesor: usuarioId,
        
        necesitaNombreCompleto: datosExamen.camposActivos.some(c => c.id === 'nombre' || c.id === 'apellido'),
        necesitaCorreoElectrónico: datosExamen.camposActivos.some(c => c.id === 'correo'),
        necesitaCodigoEstudiantil: datosExamen.camposActivos.some(c => c.id === 'codigoEstudiante'),
        
        incluirHerramientaDibujo: datosExamen.herramientasActivas.includes('dibujo'),
        incluirCalculadoraCientifica: datosExamen.herramientasActivas.includes('calculadora'),
        incluirHojaExcel: datosExamen.herramientasActivas.includes('excel'),
        incluirJavascript: datosExamen.herramientasActivas.includes('javascript'),
        incluirPython: datosExamen.herramientasActivas.includes('python'),
        
        horaApertura: datosExamen.fechaInicio ? new Date(datosExamen.fechaInicio).toISOString() : new Date().toISOString(),
        horaCierre: datosExamen.fechaCierre ? new Date(datosExamen.fechaCierre).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        limiteTiempo: datosExamen.limiteTiempo?.valor || 60,
        limiteTiempoCumplido: mapearTiempoAgotado(datosExamen.opcionTiempoAgotado),
        
        necesitaContrasena: !!datosExamen.seguridad.contraseña,
        consecuencia: mapearConsecuencia(datosExamen.seguridad.consecuenciaAbandono),
        
        questions: datosExamen.tipoPregunta === 'automatico' 
          ? (datosExamen.preguntasAutomaticas || []).map(mapearPreguntaABackend)
          : []
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(examData));

      if (datosExamen.tipoPregunta === 'pdf' && datosExamen.archivoPDF) {
        formData.append('examPDF', datosExamen.archivoPDF);
        console.log('📄 [EXAMS] PDF adjunto:', datosExamen.archivoPDF.name);
      }

      console.log('🚀 [EXAMS] Enviando al backend...');
      const response = await examsApi.post('/', formData);

      console.log('✅ [EXAMS] Examen creado exitosamente');

      return {
        success: true,
        codigoExamen: response.data.examen.codigoExamen,
        examen: response.data.examen
      };

    } catch (error: any) {
      console.error('❌ [EXAMS] Error al crear examen:', error);
      
      const mensajeError = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Error al crear el examen';

      return {
        success: false,
        codigoExamen: '',
        error: mensajeError
      };
    }
  },

  /**
   * Obtener exámenes del profesor
   */
  obtenerMisExamenes: async (profesorId: number): Promise<ExamenCreado[]> => {
    try {
      console.log('📚 [EXAMS] Obteniendo exámenes del profesor:', profesorId);
      
      const response = await examsApi.get(`/by-user/${profesorId}`);
      
      console.log('✅ [EXAMS] Exámenes obtenidos:', response.data.length);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [EXAMS] Error al obtener exámenes:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener exámenes');
    }
  },

  /**
   * Obtener examen por código (PÚBLICO - para estudiantes)
   * MEJORADO: Con búsqueda case-insensitive y mejor manejo de errores
   */
  obtenerExamenPorCodigo: async (codigo: string): Promise<ExamenCreado | null> => {
    try {
      console.log('🔍 [EXAMS] Buscando examen con código:', codigo);
      console.log('📏 [EXAMS] Longitud del código:', codigo.length);
      
      // Limpiar el código de espacios
      const codigoLimpio = codigo.trim();
      
      // Intentar obtener TODOS los exámenes para hacer búsqueda local
      // Esto es un workaround si el backend no soporta búsqueda case-insensitive
      try {
        // Primero intentar la ruta específica del backend
        const response = await examsApi.get(`/by-code/${codigoLimpio}`);
        
        if (response.data) {
          console.log('✅ [EXAMS] Examen encontrado via API:', response.data.nombre);
          return response.data;
        }
      } catch (apiError: any) {
        console.log('⚠️ [EXAMS] Búsqueda directa falló, intentando búsqueda local...');
        
        // Si falla, intentar obtener todos los exámenes y buscar localmente
        try {
          const todosResponse = await examsApi.get('/');
          const todosExamenes = todosResponse.data;
          
          console.log('📋 [EXAMS] Total de exámenes en BD:', todosExamenes.length);
          
          // Buscar el examen comparando códigos (case-insensitive)
          const examenEncontrado = todosExamenes.find((examen: ExamenCreado) => 
            examen.codigoExamen.toLowerCase() === codigoLimpio.toLowerCase()
          );
          
          if (examenEncontrado) {
            console.log('✅ [EXAMS] Examen encontrado via búsqueda local:', examenEncontrado.nombre);
            console.log('📊 [EXAMS] Código en BD:', examenEncontrado.codigoExamen);
            console.log('📊 [EXAMS] Código buscado:', codigoLimpio);
            return examenEncontrado;
          }
        } catch (localError) {
          console.error('❌ [EXAMS] Error en búsqueda local:', localError);
        }
      }
      
      console.log('❌ [EXAMS] Examen no encontrado con código:', codigoLimpio);
      return null;
      
    } catch (error: any) {
      console.error('❌ [EXAMS] Error crítico al buscar examen:', error);
      console.error('📊 [EXAMS] Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return null;
    }
  },

  /**
   * Eliminar examen por ID
   */
  eliminarExamen: async (id: number, profesorId: number): Promise<boolean> => {
    try {
      console.log('🗑️ [EXAMS] Eliminando examen ID:', id);
      
      // Primero verificar que el examen pertenezca al profesor
      const examenes = await examsService.obtenerMisExamenes(profesorId);
      const examen = examenes.find(e => e.id === id);
      
      if (!examen) {
        console.error('❌ [EXAMS] Examen no encontrado o no autorizado');
        return false;
      }
      
      await examsApi.delete(`/${id}`);
      console.log('✅ [EXAMS] Examen eliminado');
      return true;
      
    } catch (error: any) {
      console.error('❌ [EXAMS] Error al eliminar examen:', error);
      return false;
    }
  }
};

// ==================== HELPER: Obtener usuario actual ====================

export function obtenerUsuarioActual() {
  try {
    const userStr = localStorage.getItem('usuario');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return {
      id: user.id || user.backendId,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email
    };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}