import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ImageOff, MessageCircle, Tag, Layers, ArrowLeft,
    User, Calendar, ShieldCheck, AlertTriangle
} from 'lucide-react';
import listingService from '../services/listingService';

// ─── Animasyon Varyantları ─────────────────────────────────────────
const fadeUpVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: 'easeOut', delay }
    })
};

// ─── Yardımcı: Fiyat Formatı ──────────────────────────────────────
const formatPrice = (price) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);

// ─── Yardımcı: Tarih Formatı ──────────────────────────────────────
const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── Skeleton Loader ──────────────────────────────────────────────
const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const ListingDetailSkeleton = () => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <SkeletonBlock className="aspect-square w-full rounded-3xl" />
        <div className="space-y-5">
            <SkeletonBlock className="h-8 w-3/4" />
            <SkeletonBlock className="h-12 w-1/2" />
            <div className="flex gap-3">
                <SkeletonBlock className="h-8 w-24 rounded-full" />
                <SkeletonBlock className="h-8 w-28 rounded-full" />
            </div>
            <SkeletonBlock className="h-24 w-full rounded-2xl" />
            <SkeletonBlock className="h-5 w-full" />
            <SkeletonBlock className="h-5 w-5/6" />
            <SkeletonBlock className="h-5 w-4/6" />
            <SkeletonBlock className="h-14 w-full rounded-2xl mt-4" />
        </div>
    </div>
);

// ─── Condition Badge Rengi ─────────────────────────────────────────
const conditionConfig = {
    'Yeni':                    { color: 'bg-green-100 text-green-800 border-green-200',  icon: '✨' },
    'Yeni Gibi':               { color: 'bg-green-100 text-green-800 border-green-200',  icon: '✨' },
    'Az Kullanılmış':          { color: 'bg-blue-100 text-blue-800 border-blue-200',     icon: '👍' },
    'İkinci El - Çok İyi':     { color: 'bg-blue-100 text-blue-800 border-blue-200',     icon: '👍' },
    'İkinci El - İyi':         { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🔧' },
    'Yoğun Kullanılmış':       { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⚡' },
};
const getConditionStyle = (cond) =>
    conditionConfig[cond] ?? { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📦' };

// ─────────────────────────────────────────────────────────────────
// Ana Bileşen
// ─────────────────────────────────────────────────────────────────
const ListingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [listing, setListing]   = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]         = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await listingService.getListingById(id);
                setListing(data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setError('Bu ilan bulunamadı veya kaldırılmış olabilir.');
                } else {
                    setError('İlan yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [id]);

    // ── Yükleniyor ──
    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 py-8">
            <ListingDetailSkeleton />
        </div>
    );

    // ── Hata ──
    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bir Sorun Oluştu</h2>
                <p className="text-gray-500 mb-8">{error}</p>
                <Link to="/" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );

    const conditionStyle = getConditionStyle(listing.condition);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Geri Butonu */}
                <motion.div
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="mb-6"
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Geri Dön
                    </button>
                </motion.div>

                {/* ── Ana Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

                    {/* ── SOL: Görsel ── */}
                    <motion.div
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0.08}
                        className="sticky top-8"
                    >
                        <div className="w-full aspect-square bg-gray-100 rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative">
                            {listing.imageUrl ? (
                                <img
                                    src={listing.imageUrl}
                                    alt={listing.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                                    <ImageOff className="w-20 h-20 mb-3 opacity-40" />
                                    <span className="text-sm font-semibold tracking-widest uppercase opacity-50">Görsel Yok</span>
                                </div>
                            )}
                            {/* Tarih rozeti */}
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600">{formatDate(listing.createdAt)}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── SAĞ: Detaylar ── */}
                    <div className="flex flex-col gap-6">

                        {/* Başlık & Fiyat */}
                        <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" custom={0.14}>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight mb-3">
                                {listing.title}
                            </h1>
                            <p className="text-4xl font-black text-blue-600 tracking-tight">
                                {formatPrice(listing.price)}
                            </p>
                        </motion.div>

                        {/* Badge'ler: Kategori + Durum */}
                        <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" custom={0.2} className="flex flex-wrap gap-2">
                            {/* Kategori */}
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-bold">
                                <Tag className="w-3.5 h-3.5" />
                                {listing.category}
                            </span>
                            {/* Durum */}
                            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-bold ${conditionStyle.color}`}>
                                <span>{conditionStyle.icon}</span>
                                {listing.condition}
                            </span>
                        </motion.div>

                        {/* Satıcı Kartı */}
                        <motion.div
                            variants={fadeUpVariants}
                            initial="hidden"
                            animate="visible"
                            custom={0.26}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center shadow-sm shrink-0">
                                <User className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Satıcı</p>
                                <p className="text-sm font-bold text-gray-900">Öğrenci Satıcı #{listing.userId}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-xs text-green-600 font-semibold">PAÜ Öğrencisi</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Açıklama */}
                        {listing.description && (
                            <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" custom={0.32}>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Ürün Açıklaması
                                </h2>
                                <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                                    {listing.description}
                                </p>
                            </motion.div>
                        )}

                        {/* Aksiyon: Satıcıya Mesaj At */}
                        <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" custom={0.38} className="mt-auto">
                            <button
                                onClick={() => navigate(`/messages?listingId=${listing.id}&sellerId=${listing.userId}`)}
                                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white text-lg font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                            >
                                <MessageCircle className="w-6 h-6" />
                                Satıcıya Mesaj At
                            </button>
                            <p className="text-center text-xs text-gray-400 font-medium mt-3">
                                Güvenli mesajlaşma sistemi üzerinden iletişime geç.
                            </p>
                        </motion.div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListingDetail;
