import api from './api';

const normalizeListing = (item) => ({
    ...item,
    categoryName: item.categoryName ?? item.category ?? null,
});

const normalizeListingCollection = (data) => {
    if (Array.isArray(data)) return data.map(normalizeListing);
    if (data && Array.isArray(data.data)) return data.data.map(normalizeListing);
    if (data && Array.isArray(data.items)) return data.items.map(normalizeListing);

    return [];
};

const listingService = {
    getAllListings: async () => {
        const response = await api.get('/listings');
        return normalizeListingCollection(response.data);
    },

    /**
     * Yeni ilan oluşturur. Backend multipart/form-data (IFormFile) bekliyor.
     * @param {{ title, description, price, category, condition, imageFiles: File[] }} fields
     */
    createListing: async ({ title, description, price, category, condition, imageFiles }) => {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description || '');
        formData.append('price', String(price));
        formData.append('category', category);
        formData.append('condition', condition);

        // Ana görsel (backend hâlâ tek IFormFile bekliyorsa ilkini 'image' olarak gönder)
        if (imageFiles && imageFiles.length > 0) {
            formData.append('image', imageFiles[0]);
            // Ek görseller 'images' key'iyle gönderilir (backend ileride destekleyecek)
            for (let i = 1; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }
        }

        const response = await api.post('/listings', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getListingById: async (id) => {
        const response = await api.get(`/listings/${id}`);
        return normalizeListing(response.data);
    },

    getMyListings: async () => {
        const response = await api.get('/listings/mine');
        return normalizeListingCollection(response.data);
    },

    getUserListings: async (userId) => {
        const response = await api.get(`/listings/user/${userId}`);
        return normalizeListingCollection(response.data);
    },

    getPurchasedListings: async () => {
        const response = await api.get('/listings/purchases');
        return normalizeListingCollection(response.data);
    },

    updateListing: async (id, payload) => {
        const response = await api.put(`/listings/${id}`, payload);
        return normalizeListing(response.data);
    },

    updateSaleStatus: async (id, payload) => {
        const response = await api.patch(`/listings/${id}/sale-status`, payload);
        return normalizeListing(response.data);
    },

    deleteListing: async (id) => {
        await api.delete(`/listings/${id}`);
    },

    getRecommendations: async () => {
        const response = await api.get('/recommendations/hybrid?count=4', { timeout: 8000 });
        return normalizeListingCollection(response.data);
    }
};

export default listingService;
