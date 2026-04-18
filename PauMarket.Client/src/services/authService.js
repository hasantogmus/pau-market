import api from './api';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (firstName, lastName, studentNumber, email, password) => {
        const response = await api.post('/auth/register', { firstName, lastName, studentNumber, email, password });
        return response.data;
    },

    verifyEmail: async (email, token) => {
        const response = await api.post('/auth/verify-email', { email, token });
        return response.data;
    },

    resendVerification: async (email) => {
        const response = await api.post('/auth/resend-verification', { email });
        return response.data;
    }
};

export default authService;
