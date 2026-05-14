import api from './api';

const favoriteService = {
    getFavorites: async () => {
        const response = await api.get('/favorites');
        return Array.isArray(response.data) ? response.data : [];
    },

    addFavorite: async (listingId) => {
        const response = await api.post('/favorites', { listingId });
        return response.data;
    },

    removeFavorite: async (listingId) => {
        const response = await api.delete(`/favorites/${listingId}`);
        return response.data;
    }
};

export default favoriteService;
