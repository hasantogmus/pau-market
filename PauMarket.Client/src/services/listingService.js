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
    if (data && Array.isArray(data.data)) return data.data.map(normalizeListing);
    if (data && Array.isArray(data.items)) return data.items.map(normalizeListing);

    return [];
};

const listingService = {
    getAllListings: async (params = {}) => {
        const response = await api.get('/listings', {
            params: {
                pageSize: 50,
                ...params,
            },
        });
        return normalizeListingCollection(response.data);
    },

    /**
     * Yeni ilan oluşturur. Backend multipart/form-data ile en fazla 10 görsel bekliyor.
     * @param {{ title, description, price, category, condition, imageFiles: File[] }} fields
     */
    createListing: async ({ title, description, price, category, condition, imageFiles }) => {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description || '');
        formData.append('price', String(price));
        formData.append('category', category);
        formData.append('condition', condition);

        if (imageFiles && imageFiles.length > 0) {
            imageFiles.forEach((file) => formData.append('images', file));
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

    updateListingWithImages: async (id, payload) => {
        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('description', payload.description || '');
        formData.append('price', String(payload.price));
        formData.append('category', payload.category);
        formData.append('condition', payload.condition);

        const newImages = [];
        payload.images.forEach((image) => {
            if (image.type === 'existing') {
                formData.append('imageOrder', `existing:${image.url}`);
                return;
            }

            formData.append('imageOrder', `new:${newImages.length}`);
            newImages.push(image.file);
        });

        newImages.forEach((file) => formData.append('images', file));

        const response = await api.put(`/listings/${id}/with-images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
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
        const response = await api.get('/recommendations/hybrid?count=15', { timeout: 8000 });
        return normalizeListingCollection(response.data);
    }
};

export default listingService;
