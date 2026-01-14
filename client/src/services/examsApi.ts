// src/services/examsApi.ts
import axios from 'axios';

export const examsApi = axios.create({
  baseURL: "/api/exams",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000, // 30 segundos para PDFs grandes
});

// Interceptor para agregar el token de autenticación
examsApi.interceptors.request.use(
  (config) => {
    // Obtener el token del localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Si es FormData (para subir archivos), cambiar el Content-Type
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    console.log('📤 [EXAMS API] Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ [EXAMS API] Request Error:', error);
    return Promise.reject(error);
  }
);

examsApi.interceptors.response.use(
  (response) => {
    console.log('✅ [EXAMS API] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ [EXAMS API] Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);