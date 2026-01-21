import { examsAttemptsApi } from "./api";

export const examsAttemptsService = {
  async startAttempt(data: {
    codigo_examen: string;
    nombre_estudiante?: string;
    correo_estudiante?: string;
    identificacion_estudiante?: string;
    contrasena?: string;
  }) {
    const response = await examsAttemptsApi.post("/attempt/start", data);
    return response.data;
  },

  async getActiveAttemptsByExam(examId: number) {
    const response = await examsAttemptsApi.get(`/${examId}/active-attempts`);
    return response.data;
  },

  async getAttemptEvents(attemptId: number) {
    const response = await examsAttemptsApi.get(`/attempt/${attemptId}/events`);
    return response.data;
  },

  async unlockAttempt(attemptId: number) {
    const response = await examsAttemptsApi.post(`/attempt/${attemptId}/unlock`);
    return response.data;
  },
};