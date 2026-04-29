import api from './api';

const userService = {
    getCurrentUser: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    getPublicProfile: async (userId) => {
        const response = await api.get(`/users/${userId}/public`);
        return response.data;
    },

    updateProfile: async ({ firstName, lastName, department, grade, phoneNumber, bio }) => {
        const response = await api.patch('/users/me', {
            firstName,
            lastName,
            department,
            grade,
            phoneNumber,
            bio,
        });
        return response.data;
    },

    uploadProfilePhoto: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/users/me/photo', formData);
        return response.data;
    },

    changePassword: async ({ currentPassword, newPassword }) => {
        const response = await api.post('/users/me/change-password', {
            currentPassword,
            newPassword,
        });
        return response.data;
    },

    /**
     * Kullanıcının onboarding tercihlerini kaydeder.
     * @param {string|null} preferredCategories - Virgülle ayrılmış kategori listesi (örn: "Elektronik,Kitap")
     * @param {string|null} preferredCondition  - Ürün durumu tercihi
     */
    updatePreferences: async ({ preferredCategories, preferredCondition }) => {
        const response = await api.patch('/users/preferences', {
            preferredCategories,
            preferredCondition,
        });
        return response.data;
    },
};

export default userService;
