import api from './api';

const normalizeListing = (item) => ({
    ...item,
    categoryName: item.categoryName ?? item.category ?? null,
    imageUrls: Array.isArray(item.imageUrls)
        ? item.imageUrls
        : item.imageUrl
            ? [item.imageUrl]
            : [],
});

const normalizeListingCollection = (data) => {
    if (Array.isArray(data)) return data.map(normalizeListing);
    if (data && Array.isArray(data.items)) return data.items.map(normalizeListing);
    if (data && Array.isArray(data.data)) return data.data.map(normalizeListing);
    return [];
};

const adminService = {
    getDashboardStats: async () => {
        const response = await api.get('/admin/dashboard-stats');
        return response.data;
    },

    getUsers: async (search = '') => {
        const response = await api.get('/admin/users', {
            params: search ? { search } : {},
        });
        return Array.isArray(response.data) ? response.data : [];
    },

    getRecentDeals: async () => {
        const response = await api.get('/admin/deals/recent');
        return Array.isArray(response.data) ? response.data : [];
    },

    getModerationListings: async (status = 'pending') => {
        const response = await api.get('/admin/moderation/listings', {
            params: { status },
        });
        return normalizeListingCollection(response.data);
    },

    approveListing: async (listingId) => {
        const response = await api.post(`/admin/moderation/listings/${listingId}/approve`);
        return normalizeListing(response.data);
    },

    rejectListing: async (listingId, reason) => {
        const response = await api.post(`/admin/moderation/listings/${listingId}/reject`, {
            reason,
        });
        return normalizeListing(response.data);
    },

    downloadRecommenderCsv: async (kind) => {
        const response = await api.get(`/recommender-export/${kind}`, {
            responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = kind === 'listings' ? 'paumarket_listings.csv' : 'paumarket_interactions.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },
};

export default adminService;
