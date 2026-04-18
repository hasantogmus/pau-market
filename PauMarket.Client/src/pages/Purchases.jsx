import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PackageCheck, ShieldCheck, ShoppingBag, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import listingService from '../services/listingService';

const formatPrice = (price) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price || 0);

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Tarih yok';

const Purchases = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await listingService.getPurchasedListings();
                setPurchases(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Satın alma geçmişi yüklenemedi.');
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
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Satın alma geçmişi için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Tamamlanan alışverişlerini ve değerlendirme bağlantılarını görmek için hesabınla giriş yapman gerekiyor.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Satın Aldıklarım</h1>
                    <p className="text-gray-500 mt-1">Satılmış ürünlere yalnızca sen ve satıcı erişebilir. Buradan ilana dönüp satıcıyı değerlendirebilirsin.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                >
                    Profile Dön
                </button>
            </div>

            {isLoading ? (
                <div className="text-center text-gray-500 py-20">Satın alma geçmişi yükleniyor...</div>
            ) : error ? (
                <div className="text-center text-red-600 py-20">{error}</div>
            ) : purchases.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                        <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz tamamlanan alışverişin yok</h2>
                    <p className="text-gray-500">Bir satıcıyla anlaşma tamamlanıp ilan satıldı yapıldığında, o ürün burada görünür.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {purchases.map((item) => (
                        <article key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]">
                                <div className="aspect-[4/3] md:aspect-auto bg-gray-100">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">Görsel Yok</div>
                                    )}
                                </div>

                                <div className="p-6 flex flex-col">
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Satın Alındı
                                                </span>
                                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-extrabold text-gray-900">{item.title}</h2>
                                            <p className="text-sm text-gray-500 mt-1">Satıcı: {item.sellerName || 'PAÜ Market Kullanıcısı'}</p>
                                            <p className="text-sm text-gray-500">Tamamlanma: {formatDate(item.soldAt)}</p>
                                        </div>
                                        <p className="text-2xl font-black text-blue-600 shrink-0">{formatPrice(item.price)}</p>
                                    </div>

                                    <div className="space-y-3 mb-5">
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Güvenli erişim</p>
                                            <p className="text-sm text-gray-700">Bu ilan artık yalnızca senin ve satıcının erişimine açık.</p>
                                        </div>
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
                                            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-blue-900">Değerlendirme hazır</p>
                                                <p className="text-sm text-blue-800">İlan detayına girip satıcı için puan ve yorum bırakabilirsin.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/listings/${item.id}`)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                                        >
                                            <PackageCheck className="w-4 h-4" />
                                            İlanı Gör
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/listings/${item.id}`)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold transition-colors"
                                        >
                                            <Star className="w-4 h-4" />
                                            Satıcıyı Değerlendir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Purchases;
