import axios from 'axios';

// ✅ USAR RUTAS RELATIVAS PARA QUE PASEN POR EL PROXY
export const usersApi = axios.create({
  baseURL: '/api/users',
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

export const examsAttemptsApi = axios.create({
  baseURL: '/api/exam',
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

// Interceptores globales
[usersApi, examsAttemptsApi].forEach(api => {
  api.interceptors.request.use(
    (config) => {
      console.log('📤 Request:', config.method?.toUpperCase(), config.url);
      console.log('   🍪 Cookies:', document.cookie);
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log('📥 Response:', response.status, response.config.url);
      console.log('   🍪 Cookies después:', document.cookie);
      return response;
    },
    (error) => {
      console.error('❌ Response Error:', error.response?.status, error.config?.url);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚪 Sesión expirada, redirigiendo a login...');
        localStorage.removeItem('usuario');
        
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(error);
    }
  );
});