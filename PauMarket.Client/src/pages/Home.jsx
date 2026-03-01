import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search, ChevronRight, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import listingService from '../services/listingService';

const MOCK_CATEGORIES = ['Elektronik', 'Ders Kitabı', 'Ev Eşyası', 'Not/Özet', 'Giyim', 'Hobi'];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// --- Şık Skeleton Komponenti ---
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-4">
        {/* Görsel Alanı Placeholder */}
        <div className="w-full aspect-[4/3] bg-gray-200 rounded-xl mb-4 relative overflow-hidden">
            <motion.div
                className="absolute inset-0 -translate-x-full"
                animate={{ translateX: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
            />
        </div>
        {/* Metin Alanları Placeholder */}
        <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-3 relative overflow-hidden">
            <motion.div
                className="absolute inset-0 -translate-x-full"
                animate={{ translateX: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.2 }}
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
            />
        </div>
        <div className="flex justify-between items-center mt-4">
            <div className="h-6 bg-gray-200 rounded-md w-1/3 relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 -translate-x-full"
                    animate={{ translateX: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.4 }}
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
                />
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
    </div>
);

const Home = () => {
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchListings = async () => {
            try {
                // Backend'den gerçek verileri çekiyoruz
                const data = await listingService.getAllListings();
                // Güvenlik önlemi: gelen data dizi değilse boş dizi kaydet
                setListings(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("İlanlar yüklenirken hata oluştu:", err);
                setError("İlanlar yüklenirken sunucu ile iletişim kurulamadı.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchListings();
    }, []);

    // Tüm listeyi güvenli hale getirelim (Yine de her ihtimale karşı)
    const safeListings = Array.isArray(listings) ? listings : [];

    // Hero kısmındaki 3 floating kart için ilk 3 ilanı (veya mock düşüşünü) ayarla
    const heroCard1 = safeListings[0] || { title: 'Örnek İlan 1', price: 450, categoryName: 'Elektronik' };
    const heroCard2 = safeListings[1] || { title: 'Mekanik Klavye', price: 1450, categoryName: 'Elektronik', description: 'Sıfırdan farksız.' };
    const heroCard3 = safeListings[2] || { title: 'Kahve Makinesi', price: 280, categoryName: 'Ev Eşyası' };

    // Format price helper
    const formatPrice = (price) => {
        if (!price) return "0 ₺";
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">

            {/* ─── Hero Section (Dinamik Gradient & Floating Kartlar) ─── */}
            <section className="relative w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-indigo-100 overflow-hidden">
                {/* Arka Plan Dekorasyon */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col md:flex-row items-center">

                    {/* Sol Metin Alanı */}
                    <div className="w-full md:w-1/2 md:pr-12 relative z-10 text-center md:text-left mb-12 md:mb-0">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm border border-indigo-200">
                                Öğrenciler İçin Güvenli Ticaret
                            </span>
                            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] mb-6">
                                Kampüsün Yeni <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    Pazar Yeri
                                </span>
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed font-medium">
                                İkinci el eşyalarını sat, ihtiyacın olanı ucuza bul. Sadece Pamukkale Üniversitesi öğrencilerine özel, güvenilir ve dürüst alışveriş deneyimi.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Link to="/listings" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                                    Hemen Keşfet <ChevronRight className="w-5 h-5" />
                                </Link>
                                <div className="relative">
                                    <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="İlan ara..."
                                        className="w-full sm:w-64 pl-12 pr-4 py-4 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-700 shadow-sm"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sağ Görsel Alanı (Floating Cards) */}
                    <div className="w-full md:w-1/2 relative h-80 md:h-[450px] flex items-center justify-center">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-blue-400/50 animate-pulse">
                                <span className="font-bold text-xl tracking-widest">Yükleniyor...</span>
                            </div>
                        ) : (
                            <>
                                {/* Arkadaki Kart */}
                                <motion.div
                                    className="absolute z-10 bg-white p-4 rounded-2xl shadow-xl w-48 sm:w-64 rotate-[-12deg] transform -translate-x-12 sm:-translate-x-24 border border-gray-100"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                >
                                    <div className="w-full h-32 bg-indigo-50 rounded-lg mb-3 flex items-center justify-center border border-indigo-100/50 overflow-hidden">
                                        {heroCard1.imageUrl ? (
                                            <img src={heroCard1.imageUrl} alt={heroCard1.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageOff className="w-10 h-10 text-indigo-200" />
                                        )}
                                    </div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 truncate text-xs font-semibold text-gray-700">{heroCard1.title}</div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="font-bold text-lg text-gray-900">{formatPrice(heroCard1.price)}</span>
                                        <Heart className="w-5 h-5 text-gray-300" />
                                    </div>
                                </motion.div>

                                {/* Öndeki Ana Kart */}
                                <motion.div
                                    className="absolute z-30 bg-white p-5 rounded-2xl shadow-2xl shadow-indigo-200/50 w-56 sm:w-72 border border-gray-100"
                                    animate={{ y: [0, -15, 0] }}
                                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                                >
                                    <div className="absolute top-4 right-4 bg-white/80 p-1.5 rounded-full shadow-sm backdrop-blur-sm z-20">
                                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                    </div>
                                    <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center">
                                        {heroCard2.imageUrl ? (
                                            <img src={heroCard2.imageUrl} alt={heroCard2.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-indigo-400 text-lg tracking-wider text-center px-4">{heroCard2.title}</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 truncate">{heroCard2.title}</h3>
                                    <p className="text-xs text-gray-500 mb-4 truncate mt-1">{heroCard2.description || 'Harika bir ürün.'}</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="font-extrabold text-xl text-blue-600 block leading-none">{formatPrice(heroCard2.price)}</span>
                                        </div>
                                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md max-w-[80px] truncate">
                                            {heroCard2.categoryName || 'Diğer'}
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Sağdaki Küçük Kart */}
                                <motion.div
                                    className="absolute z-20 bg-white p-3 rounded-2xl shadow-lg w-40 sm:w-56 rotate-[8deg] transform translate-x-16 sm:translate-x-32 translate-y-12 border border-gray-100"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                                >
                                    <div className="w-full h-24 bg-rose-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                        {heroCard3.imageUrl ? (
                                            <img src={heroCard3.imageUrl} alt={heroCard3.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-rose-300 font-bold text-xs text-center px-2">{heroCard3.title}</span>
                                        )}
                                    </div>
                                    <div className="truncate text-xs text-gray-700 font-medium mb-1">{heroCard3.title}</div>
                                    <span className="font-bold text-gray-900 mt-1 block">{formatPrice(heroCard3.price)}</span>
                                </motion.div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── Hızlı Kategoriler ─── */}
            <section className="bg-white py-10 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center flex-wrap gap-3 sm:gap-4">
                        {MOCK_CATEGORIES.map((cat, idx) => (
                            <motion.button
                                key={idx}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-5 py-2.5 bg-gray-50 hover:bg-white text-gray-700 hover:text-blue-600 font-semibold rounded-xl border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow-md transition-all text-sm sm:text-base"
                            >
                                {cat}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Sana Özel Öneriler (Grid, Staggered Animasyon) ─── */}
            <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Sana Özel Öneriler
                        </h2>
                        <p className="text-gray-500 mt-2 font-medium">Bize ne kadar çok şey gösterirsen önerilerin o kadar iyileşir.</p>
                    </div>
                    <Link to="/listings" className="hidden sm:flex items-center text-blue-600 hover:text-blue-800 font-semibold group transition-colors">
                        Tümünü Gör
                        <ChevronRight className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {isLoading ? (
                    // ─── Loading State (Skeletons) ───
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
                        {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
                    </div>
                ) : error ? (
                    // ─── Error State ───
                    <div className="w-full p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100 font-medium">
                        {error}
                    </div>
                ) : safeListings.length === 0 ? (
                    // ─── Empty State ───
                    <div className="w-full flex justify-center items-center py-16 px-4 bg-white rounded-2xl border border-gray-100 border-dashed">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Henüz hiç ilan yok</h3>
                            <p className="text-gray-500 mb-6">İlk ilanı veren sen olmak ister misin?</p>
                            <Link to="/listings/new" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors">
                                Hemen İlan Ver
                            </Link>
                        </div>
                    </div>
                ) : (
                    // ─── Data State (Real Listings) ───
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8"
                    >
                        {safeListings.slice(0, 8).map((item) => (
                            <Link to={`/listings/${item.id}`} key={item.id} className="block group">
                                <motion.div
                                    variants={itemVariants}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-100 transition-all duration-300 h-full flex flex-col"
                                >
                                    {/* Görsel Alanı */}
                                    <div className="w-full aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <ImageOff className="w-10 h-10 mb-2 opacity-50" />
                                                <span className="text-xs font-semibold tracking-wider opacity-70">GÖRSEL YOK</span>
                                            </div>
                                        )}
                                        {/* Favori Butonu (Hover'da beliren veya her zaman duran) */}
                                        <button
                                            onClick={(e) => { e.preventDefault(); /* favori ekleme mantığı */ }}
                                            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-colors z-10"
                                            title="Favorilere Ekle"
                                        >
                                            <Heart className="w-5 h-5" />
                                        </button>
                                        {/* Kategori Etiketi */}
                                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md shadow-sm pointer-events-none">
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{item.categoryName || 'Diğer'}</span>
                                        </div>
                                    </div>

                                    {/* Detaylar */}
                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors" title={item.title}>
                                            {item.title}
                                        </h3>
                                        <div className="mt-auto pt-3 flex justify-between items-center">
                                            <span className="font-extrabold text-lg text-blue-600">{formatPrice(item.price)}</span>
                                            {/* Eğer lokasyon veya tarih varsa eklenebilir */}
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </motion.div>
                )}

                {/* Mobilde Tümünü Gör Butonu */}
                {!isLoading && !error && safeListings.length > 0 && (
                    <div className="mt-8 flex justify-center sm:hidden">
                        <Link to="/listings" className="px-6 py-3 bg-gray-50 text-blue-600 hover:bg-blue-50 font-bold rounded-xl border border-gray-200 transition-colors w-full text-center">
                            Tüm İlanları Görüntüle
                        </Link>
                    </div>
                )}

            </section>

        </div>
    );
};

export default Home;
