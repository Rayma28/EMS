import axios from 'axios';
import { store } from '../redux/store.tsx';
import { logout } from '../redux/authSlice.tsx';
import { SESSION_EXPIRED_MESSAGE } from '../utils/constants.js';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 - Session Expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      store.dispatch(logout());
      localStorage.removeItem('token');
      localStorage.removeItem('role');

      window.location.href = '/login?sessionExpired=true';
    }
    return Promise.reject(error);
  }
);

export default api;