import api from './api';

const listingService = {
    getAllListings: async () => {
        const response = await api.get('/listings');
        const data = response.data;

        // Backend'in veri yapısına göre array'i güvenle çıkaralım
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.items)) return data.items;

        // Hiçbiri değilse boş dizi dön ki split/slice hataları almayalım
        return [];
    },

    createListing: async (listingData) => {
        const response = await api.post('/listings', listingData);
        return response.data;
    }
};

export default listingService;
