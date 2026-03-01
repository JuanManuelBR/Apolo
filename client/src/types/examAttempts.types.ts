export interface ActiveAttempt {
  id: number;
  nombre_estudiante: string;
  correo_estudiante?: string;
  identificacion_estudiante?: string;
  estado: 'activo' | 'blocked' | 'finished' | 'abandonado';
  fecha_inicio: string | Date;
  tiempoTranscurrido: string;
  progreso: number;
  alertas: number;
  codigo_acceso?: string;
  fecha_expiracion?: string | Date | null;
  eventos_recientes?: any[];
}