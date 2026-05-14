import api from './api';

const reviewService = {
    getUserReviews: async (userId) => {
        const response = await api.get(`/reviews/user/${userId}`);
        return response.data;
    },

    createReview: async ({ targetUserId, listingId, rating, comment }) => {
        const response = await api.post('/reviews', {
            targetUserId,
            listingId,
            rating,
            comment,
        });
        return response.data;
    },
};

export default reviewService;
