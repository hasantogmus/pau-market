import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, PlusCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import listingService from '../services/listingService';
import ProductCard from '../components/ProductCard';

const MyListings = () => {
    const { isAuthenticated } = useAuth();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await listingService.getMyListings();
                setListings(data);
            } catch (err) {
                setError(err.response?.data?.error || 'İlanların yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">İlanlarını görmek için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Kendi ilanların yalnızca hesabınla giriş yaptığında görüntülenebilir.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">İlanlarım</h1>
                    <p className="text-gray-500 mt-1">Kendi hesabına bağlı ilanları burada görebilirsin.</p>
                </div>
                <Link to="/listings/new" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    Yeni İlan Ver
                </Link>
            </div>

            {isLoading ? (
                <div className="text-center text-gray-500 py-20">İlanların yükleniyor...</div>
            ) : error ? (
                <div className="text-center text-red-600 py-20">{error}</div>
            ) : listings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                        <Package className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz ilanın yok</h2>
                    <p className="text-gray-500 mb-6">İlk ilanını ekleyerek PauMarket vitrininde görünmeye başlayabilirsin.</p>
                    <Link to="/listings/new" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        <PlusCircle className="w-4 h-4" />
                        İlk İlanımı Oluştur
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((item, index) => (
                        <ProductCard key={item.id} item={item} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyListings;
