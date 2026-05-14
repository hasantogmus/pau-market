import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import favoriteService from '../services/favoriteService';

const Favorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const data = await favoriteService.getFavorites();
                setFavorites(data);
            } catch (err) {
                console.error("Favoriler yüklenirken hata oluştu:", err);
                setError('Favorilerin yüklenirken bir sorun oluştu.');
            } finally {
                setIsLoading(false);
            }
        };

        loadFavorites();
    }, []);

    const handleToggleFavorite = async (listingId) => {
        // Favorilerden çıkarırken UI'ı hemen güncelle
        setFavorites((prev) => prev.filter(item => item.id !== listingId));

        try {
            await favoriteService.removeFavorite(listingId);
        } catch (err) {
            console.error("Favorilerden çıkarma başarısız:", err);
            // Hata durumunda yeniden yükleyerek senkronize et
            const data = await favoriteService.getFavorites();
            setFavorites(data);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60vh] flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Favorilerin yükleniyor...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60vh] flex items-center justify-center">
                <div className="text-center bg-red-50 p-8 rounded-3xl text-red-600 border border-red-100 max-w-lg w-full">
                    <p className="font-semibold text-lg">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
                    >
                        Tekrar dene
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                        <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
                        Favorilerim
                    </h1>
                    <p className="mt-2 text-gray-500">Takip ettiğin ve ilgilendiğin tüm ilanlar burada.</p>
                </div>
                
                <div className="text-sm font-semibold text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                    Toplam {favorites.length} İlan
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                        <Heart className="w-10 h-10 text-rose-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Henüz favori ilanınız yok</h2>
                    <p className="text-gray-500 mb-8">
                        İlgini çeken ilanları favorilerine ekleyerek daha sonra kolayca bulabilirsin.
                    </p>
                    <Link
                        to="/listings"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        <Search className="w-5 h-5" />
                        İlanları Keşfet
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {favorites.map((listing, index) => (
                            <motion.div
                                key={listing.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ duration: 0.3 }}
                            >
                                <ProductCard 
                                    item={listing} 
                                    index={index}
                                    isFavorite={true}
                                    onToggleFavorite={() => handleToggleFavorite(listing.id)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default Favorites;
