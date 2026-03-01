import axios from 'axios';

// Backend (http://localhost:5251/api) için temel axios örneği
const api = axios.create({
  baseURL: 'http://localhost:5251/api',
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

export default api;
