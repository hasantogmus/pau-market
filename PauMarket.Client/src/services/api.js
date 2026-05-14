import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5251/api';

// Backend için temel axios örneği
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Her istekte (Request) çalışacak araya girici (Interceptor)
// Amacı: Eğer LocalStorage'da JWT token varsa, yetki gerektiren isteklerde Header'a eklemek.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    const isAuthEndpoint = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/verify')
      || requestUrl.includes('/auth/resend');

    if (error.response && error.response.status === 401 && hadAuthHeader && !isAuthEndpoint) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
