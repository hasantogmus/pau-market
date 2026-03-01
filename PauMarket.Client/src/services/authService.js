import api from './api';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (firstName, lastName, studentNumber, email, password) => {
        const response = await api.post('/auth/register', { firstName, lastName, studentNumber, email, password });
        return response.data;
    }
};

export default authService;
