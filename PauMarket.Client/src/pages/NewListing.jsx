import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Send, ArrowLeft, Tag, AlignLeft, Info, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import listingService from '../services/listingService';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Elektronik', 'Ders Kitabı', 'Ev Eşyası', 'Not/Özet', 'Giyim', 'Hobi', 'Diğer'];

const NewListing = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        categoryName: '',
        imageUrl: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Oturum kontrolü
    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Fiyatı float olarak parse et
            const payload = {
                ...formData,
                price: parseFloat(formData.price) || 0
            };

            await listingService.createListing(payload);

            // Başarı Durumu
            setShowSuccessToast(true);
            setTimeout(() => {
                navigate('/');
            }, 2500);

        } catch (err) {
            console.error(err);
            let errorMessage = "İlan yayınlanırken bir hata oluştu. Lütfen tüm alanları kontrol edin.";
            if (err.response?.data?.error) errorMessage = err.response.data.error;
            else if (err.response?.data?.message) errorMessage = err.response.data.message;
            else if (typeof err.response?.data === 'string') errorMessage = err.response.data;

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">

            {/* ─── Başarı Toast ─── */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-green-200 shadow-2xl rounded-2xl p-4 flex items-center gap-4"
                    >
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Harika!</h4>
                            <p className="text-sm text-gray-600 font-medium">İlanın başarıyla yayınlandı. Ana sayfaya yönlendiriliyorsun...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Link to="/" className="inline-flex items-center text-gray-500 hover:text-blue-600 font-medium transition-colors mb-6 group">
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                Geri Dön
            </Link>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 md:p-10">

                    <div className="mb-10 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl mx-auto mb-4"
                        >
                            <Camera className="w-8 h-8" />
                        </motion.div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Yeni İlan Ver</h1>
                        <p className="text-gray-500 mt-2 font-medium">İlanının detaylarını doldur ve anında kampüstekilerle paylaş.</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
                            <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Başlık */}
                        <div>
                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2" htmlFor="title">
                                <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                İlan Başlığı
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                disabled={isLoading}
                                placeholder="Örn: Sıfır Ayarında iPhone 13"
                                className="w-full px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 text-lg font-medium"
                                required
                            />
                        </div>

                        {/* Kategori ve Fiyat (Grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="categoryName">
                                    Kategori
                                </label>
                                <select
                                    id="categoryName"
                                    name="categoryName"
                                    value={formData.categoryName}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    className="w-full px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 appearance-none font-medium"
                                    required
                                >
                                    <option value="" disabled>Kategori Seçin</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="price">
                                    Fiyat (₺)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₺</span>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-10 pr-5 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Açıklama */}
                        <div>
                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2" htmlFor="description">
                                <AlignLeft className="w-4 h-4 mr-2 text-gray-400" />
                                Açıklama
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                disabled={isLoading}
                                placeholder="Ürününüzün durumunu, özelliklerini ve neden sattığınızı detaylıca anlatın..."
                                rows="5"
                                className="w-full px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 resize-none font-medium"
                                required
                            />
                        </div>

                        {/* Görsel URL (Şimdilik) */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2" htmlFor="imageUrl">
                                <ImageIcon className="w-4 h-4 mr-2 text-blue-500" />
                                Görsel Bağlantısı (URL)
                            </label>
                            <input
                                type="url"
                                id="imageUrl"
                                name="imageUrl"
                                value={formData.imageUrl}
                                onChange={handleChange}
                                disabled={isLoading}
                                placeholder="https://ornek-resim-sitesi.com/resim.jpg"
                                className="w-full px-5 py-4 rounded-xl border border-white bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 font-medium"
                            />
                            <p className="mt-2 text-xs text-gray-500 font-medium">İleride bu alana doğrudan fotoğraf yükleme özelliği eklenecektir. Şimdilik ürüne ait bir web görselinin adresini yapıştırabilirsiniz (isteğe bağlı).</p>
                        </div>

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex justify-center items-center gap-3 text-lg"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Yayınlanıyor...
                                    </>
                                ) : (
                                    <>
                                        İlanı Yayınla <Send className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewListing;
