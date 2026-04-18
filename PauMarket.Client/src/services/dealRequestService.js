import api from './api';

const dealRequestService = {
    createDealRequest: async ({ listingId, note }) => {
        const response = await api.post('/dealrequests', {
            listingId,
            note: note?.trim() || null,
        });
        return response.data;
    },

    getMyRequestForListing: async (listingId) => {
        const response = await api.get(`/dealrequests/listing/${listingId}/mine`);
        return response.data;
    },

    acceptDealRequest: async (requestId) => {
        const response = await api.post(`/dealrequests/${requestId}/accept`);
        return response.data;
    },

    rejectDealRequest: async (requestId) => {
        const response = await api.post(`/dealrequests/${requestId}/reject`);
        return response.data;
    },
};

export default dealRequestService;
