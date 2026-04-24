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
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
