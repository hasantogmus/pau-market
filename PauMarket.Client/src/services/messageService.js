import api from './api';

const messageService = {
    getThreads: async () => {
        const response = await api.get('/messages/threads');
        return Array.isArray(response.data) ? response.data : [];
    },

    getConversation: async (otherUserId, listingId) => {
        const response = await api.get('/messages/conversation', {
            params: { otherUserId, listingId },
        });
        return Array.isArray(response.data) ? response.data : [];
    },

    sendMessage: async ({ receiverId, listingId, content }) => {
        const response = await api.post('/messages', {
            receiverId,
            listingId,
            content,
        });
        return response.data;
    },
};

export default messageService;
