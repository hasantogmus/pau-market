import api from './api';

const userService = {
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
