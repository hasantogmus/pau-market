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
};

export default adminService;
