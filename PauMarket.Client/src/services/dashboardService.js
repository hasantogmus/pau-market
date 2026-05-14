import api from './api';

const dashboardService = {
    getMyDashboard: async () => {
        const response = await api.get('/dashboard/me');
        return response.data;
    },
};

export default dashboardService;
