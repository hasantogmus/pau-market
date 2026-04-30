import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ImageOff, MessageCircle, Tag, Layers, ArrowLeft,
    User, Calendar, ShieldCheck, AlertTriangle, Star, PencilLine,
    Sparkles, MapPin, CheckCircle2
} from 'lucide-react';
import listingService from '../services/listingService';
import userService from '../services/userService';
import reviewService from '../services/reviewService';
import dealRequestService from '../services/dealRequestService';
import { useAuth } from '../hooks/useAuth';

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
    'Sıfır':                   { color: 'bg-green-100 text-green-800 border-green-200',    icon: '✨' },
    'Yeni':                    { color: 'bg-green-100 text-green-800 border-green-200',    icon: '✨' },
    'Yeni Gibi':               { color: 'bg-green-100 text-green-800 border-green-200',    icon: '✨' },
    'Az Kullanılmış':          { color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: '👍' },
    'İkinci El - Çok İyi':     { color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: '👍' },
    'İkinci El - İyi':         { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🔧' },
    'Çok Kullanılmış':         { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⚡' },
    'Yoğun Kullanılmış':       { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⚡' },
};
const getConditionStyle = (cond) =>
    conditionConfig[cond] ?? { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📦' };

const trustItems = [
    {
        icon: ShieldCheck,
        title: 'Mesajda netleştir',
        text: 'Fiyat, teslim ve buluşma detaylarını PAÜ Market mesajlarında yazılı tut.',
    },
    {
        icon: MapPin,
        title: 'Kampüste kontrol et',
        text: 'Ürünü görmeden ödeme yapmamanı ve kalabalık alanlarda buluşmanı öneririz.',
    },
    {
        icon: CheckCircle2,
        title: 'Satıcı geçmişi',
        text: 'Puan ve yorumları inceleyerek alışverişe daha bilinçli başlayabilirsin.',
    },
];

const dealRequestStatusCopy = {
    Pending: 'Anlaşma isteğin satıcı onayı bekliyor.',
    Accepted: 'Anlaşma kabul edildi. Teslim detaylarını mesajda netleştir.',
    Rejected: 'Önceki anlaşma isteği reddedildi. Uygunsa yeniden istek gönderebilirsin.',
    Withdrawn: 'Önceki isteği geri çektin. İstersen yeniden anlaşma isteği gönderebilirsin.',
    Cancelled: 'Anlaşma iptal edildi. İlan yeniden anlaşma isteğine açık olabilir.',
};

const ReviewStars = ({ rating, interactive = false, onSelect }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
            <button
                key={value}
                type="button"
                disabled={!interactive}
                onClick={() => onSelect?.(value)}
                className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}
            >
                <Star
                    className={`w-4 h-4 ${
                        value <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                    }`}
                />
            </button>
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Ana Bileşen
// ─────────────────────────────────────────────────────────────────
const ListingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    const [listing, setListing]   = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]         = useState(null);
    const [sellerProfile, setSellerProfile] = useState(null);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [reviewError, setReviewError] = useState(null);
    const [reviewSuccess, setReviewSuccess] = useState(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [dealRequest, setDealRequest] = useState(null);
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [dealRequestNote, setDealRequestNote] = useState('');
    const [dealRequestError, setDealRequestError] = useState(null);
    const [dealRequestSuccess, setDealRequestSuccess] = useState(null);
    const [isSubmittingDealRequest, setIsSubmittingDealRequest] = useState(false);
    const [isUpdatingDealRequest, setIsUpdatingDealRequest] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await listingService.getListingById(id);
                setListing(data);
                setSelectedImageIndex(0);

                if (data?.userId && !data?.sellerName) {
                    try {
                        const publicProfile = await userService.getPublicProfile(data.userId);
                        setSellerProfile(publicProfile);
                    } catch {
                        setSellerProfile(null);
                    }
                } else {
                    setSellerProfile(null);
                }

                const ratings = await reviewService.getUserReviews(data.userId);
                setReviewSummary(ratings);

                if (isAuthenticated && Number(user?.id) !== Number(data.userId)) {
                    try {
                        const request = await dealRequestService.getMyRequestForListing(id);
                        setDealRequest(request);
                    } catch {
                        setDealRequest(null);
                    }
                } else {
                    setDealRequest(null);
                }
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
    }, [id, isAuthenticated, user?.id]);

    // Dinamik sekme başlığı (SEO ve UX için)
    useEffect(() => {
        if (listing?.title) {
            document.title = `${listing.title} - PAÜ Market`;
        }
        return () => {
            document.title = 'PAÜ Market';
        };
    }, [listing?.title]);

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
    const imageUrls = listing.imageUrls?.length > 0
        ? listing.imageUrls
        : listing.imageUrl
            ? [listing.imageUrl]
            : [];
    const selectedImage = imageUrls[selectedImageIndex] ?? imageUrls[0] ?? null;
    const sellerDisplayName = listing.sellerName || sellerProfile?.fullName || 'PAÜ Market Kullanıcısı';
    const reviewCount = reviewSummary?.totalReviews ?? 0;
    const averageRating = reviewSummary?.averageRating ?? 0;
    const isOwnListing = Number(user?.id) === Number(listing.userId);
    const canReviewSeller = isAuthenticated && listing.isSold && Number(listing.soldToUserId) === Number(user?.id) && !isOwnListing;
    const dealRequestStatus = dealRequest?.status || null;
    const canCreateDealRequest = isAuthenticated && !isOwnListing && !listing.isSold && dealRequestStatus !== 'Pending' && dealRequestStatus !== 'Accepted';
    const canWithdrawDealRequest = isAuthenticated && !isOwnListing && !listing.isSold && dealRequestStatus === 'Pending';
    const canCancelDealRequest = isAuthenticated && !isOwnListing && !listing.isSold && dealRequestStatus === 'Accepted';
    const existingReview = reviewSummary?.reviews?.find(
        (review) => Number(review.reviewerId) === Number(user?.id) && Number(review.listingId) === Number(listing.id)
    );

    const refreshReviewSummary = async () => {
        const ratings = await reviewService.getUserReviews(listing.userId);
        setReviewSummary(ratings);
    };

    const handleReviewSubmit = async (event) => {
        event.preventDefault();
        setReviewError(null);
        setReviewSuccess(null);
        setIsSubmittingReview(true);

        try {
            await reviewService.createReview({
                targetUserId: listing.userId,
                listingId: listing.id,
                rating: reviewForm.rating,
                comment: reviewForm.comment.trim() || null,
            });

            await refreshReviewSummary();
            setReviewSuccess('Değerlendirmen başarıyla kaydedildi.');
            setIsReviewModalOpen(false);
            setReviewForm({ rating: 5, comment: '' });
        } catch (err) {
            setReviewError(err.response?.data?.error || 'Değerlendirme kaydedilemedi.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleCreateDealRequest = async (event) => {
        event.preventDefault();
        setDealRequestError(null);
        setDealRequestSuccess(null);
        setIsSubmittingDealRequest(true);

        try {
            const createdRequest = await dealRequestService.createDealRequest({
                listingId: listing.id,
                note: dealRequestNote,
            });

            setDealRequest(createdRequest);
            setDealRequestSuccess('Anlaşma isteğin satıcıya iletildi. Dilersen mesajlaşmaya devam edip detayları netleştirebilirsin.');
            setIsDealModalOpen(false);
            setDealRequestNote('');
        } catch (err) {
            setDealRequestError(err.response?.data?.error || 'Anlaşma isteği gönderilemedi.');
        } finally {
            setIsSubmittingDealRequest(false);
        }
    };

    const handleUpdateDealRequest = async (action) => {
        if (!dealRequest?.id) return;

        const confirmationMessage = action === 'withdraw'
            ? 'Bekleyen anlaşma isteğini geri çekmek istediğine emin misin?'
            : 'Kabul edilmiş anlaşmayı iptal etmek istediğine emin misin?';

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        setDealRequestError(null);
        setDealRequestSuccess(null);
        setIsUpdatingDealRequest(true);

        try {
            const updatedRequest = action === 'withdraw'
                ? await dealRequestService.withdrawDealRequest(dealRequest.id)
                : await dealRequestService.cancelDealRequest(dealRequest.id);

            setDealRequest(updatedRequest);

            if (action === 'cancel') {
                setListing((prev) => ({
                    ...prev,
                    acceptedBuyerId: null,
                    acceptedBuyerName: null,
                }));
            }

            setDealRequestSuccess(
                action === 'withdraw'
                    ? 'Bekleyen anlaşma isteğin geri çekildi.'
                    : 'Kabul edilmiş anlaşma iptal edildi. İlan yeniden yeni anlaşma isteklerine açık.'
            );
        } catch (err) {
            setDealRequestError(err.response?.data?.error || 'Anlaşma durumu güncellenemedi.');
        } finally {
            setIsUpdatingDealRequest(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,0.85),_transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_52%,#f8fafc_100%)]">
            <div className="pointer-events-none absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="pointer-events-none absolute left-[-10rem] bottom-24 h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

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
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] gap-7 lg:gap-12 items-start">

                    {/* ── SOL: Görsel ── */}
                    <motion.div
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0.08}
                        className="lg:sticky lg:top-8"
                    >
                        <div className="relative w-full aspect-[4/3] sm:aspect-square bg-gray-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-950/10 border border-white">
                            {selectedImage ? (
                                <img
                                    src={selectedImage}
                                    alt={listing.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                                    <ImageOff className="w-20 h-20 mb-3 opacity-40" />
                                    <span className="text-sm font-semibold tracking-widest uppercase opacity-50">Görsel yok</span>
                                </div>
                            )}
                            {/* Tarih rozeti */}
                            <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-black text-slate-700">PAÜ Market ilanı</span>
                            </div>
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600">{formatDate(listing.createdAt)}</span>
                            </div>
                        </div>
                        {imageUrls.length > 1 && (
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
                                {imageUrls.map((url, index) => (
                                    <button
                                        key={`${url}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`h-20 w-20 shrink-0 sm:h-auto sm:w-auto sm:aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                                            selectedImageIndex === index
                                                ? 'border-blue-500 shadow-md shadow-blue-100'
                                                : 'border-white hover:border-blue-200'
                                        }`}
                                        aria-label={`${index + 1}. fotoğrafı göster`}
                                    >
                                        <img
                                            src={url}
                                            alt={`${listing.title} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* ── SAĞ: Detaylar ── */}
                    <div className="flex flex-col gap-6">

                        {/* Başlık & Fiyat */}
                        <motion.div
                            variants={fadeUpVariants}
                            initial="hidden"
                            animate="visible"
                            custom={0.14}
                            className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur sm:p-6"
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Kampüs alışverişi
                                </span>
                                {listing.isSold && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Satıldı
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                                {listing.title}
                            </h1>

                            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">İlan fiyatı</p>
                                    <p className="mt-1 text-4xl font-black tracking-tight text-blue-700 sm:text-5xl">
                                        {formatPrice(listing.price)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                                    <span className="block text-xs font-black uppercase tracking-wider text-slate-400">Yayın tarihi</span>
                                    {formatDate(listing.createdAt)}
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-bold">
                                    <Tag className="w-3.5 h-3.5" />
                                    {listing.category}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-bold ${conditionStyle.color}`}>
                                    <span>{conditionStyle.icon}</span>
                                    {listing.condition}
                                </span>
                            </div>
                        </motion.div>

                        {listing.isSold && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.24}
                                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                            >
                                <p className="text-sm font-semibold text-emerald-800">
                                    Bu ilan satıldı olarak işaretlendi.
                                </p>
                                <p className="text-xs text-emerald-700 mt-1">
                                    Satıcı bu ürünü artık satışta göstermiyor.
                                    {listing.soldToUserName ? ` Alıcı: ${listing.soldToUserName}.` : ''}
                                </p>
                            </motion.div>
                        )}

                        {!listing.isSold && listing.acceptedBuyerName && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.25}
                                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3"
                            >
                                <p className="text-sm font-semibold text-blue-800">
                                    Bu ilan için anlaşılan öğrenci: {listing.acceptedBuyerName}
                                </p>
                            </motion.div>
                        )}

                        {/* Satıcı Kartı */}
                        <motion.div
                            variants={fadeUpVariants}
                            initial="hidden"
                            animate="visible"
                            custom={0.26}
                            className="rounded-[2rem] border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-950/5 sm:p-5"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200 shrink-0 text-white">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Satıcı profili</p>
                                        <p className="text-base font-black text-slate-950 truncate">{sellerDisplayName}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <ReviewStars rating={Math.round(averageRating)} />
                                            <span className="text-xs font-bold text-slate-600">
                                                {averageRating.toFixed(1)} / 5
                                            </span>
                                            <span className="text-xs text-slate-400">({reviewCount} değerlendirme)</span>
                                        </div>
                                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            PAÜ topluluğu içinde alışveriş
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/profile/${listing.userId}`)}
                                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto"
                                >
                                    <User className="w-4 h-4" />
                                    Profili ve yorumları gör
                                </button>
                            </div>
                        </motion.div>

                        {reviewSuccess && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.29}
                                className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                            >
                                {reviewSuccess}
                            </motion.div>
                        )}

                        {dealRequestSuccess && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.295}
                                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
                            >
                                {dealRequestSuccess}
                            </motion.div>
                        )}

                        {dealRequestError && !isDealModalOpen && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.3}
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                            >
                                {dealRequestError}
                            </motion.div>
                        )}

                        {reviewError && !isReviewModalOpen && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.31}
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                            >
                                {reviewError}
                            </motion.div>
                        )}

                        {/* Açıklama */}
                        {listing.description && (
                            <motion.div
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                custom={0.32}
                                className="rounded-[2rem] border border-slate-100 bg-white/90 p-5 shadow-sm"
                            >
                                <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Ürün Açıklaması
                                </h2>
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                                    {listing.description}
                                </p>
                            </motion.div>
                        )}

                        <motion.div
                            variants={fadeUpVariants}
                            initial="hidden"
                            animate="visible"
                            custom={0.35}
                            className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-5"
                        >
                            <div className="mb-4">
                                <h2 className="text-base font-black text-blue-950">Güvenli kampüs alışverişi</h2>
                                <p className="mt-1 text-sm leading-6 text-blue-800">
                                    Alışverişe başlamadan önce bu kısa kontrol listesini kullan.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {trustItems.map(({ icon: Icon, title, text }) => (
                                    <div key={title} className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
                                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <p className="text-sm font-black text-slate-900">{title}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Aksiyon: Satıcıya Mesaj At */}
                        <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" custom={0.38} className="mt-auto">
                            {dealRequestStatus && (
                                <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                                    {dealRequestStatusCopy[dealRequestStatus] || 'Anlaşma durumu güncellendi.'}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isOwnListing ? (
                                    <Link
                                        to="/my-listings"
                                        className="w-full flex items-center justify-center gap-3 py-4 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                                    >
                                        <PencilLine className="w-6 h-6" />
                                        İlanlarımda Yönet
                                    </Link>
                                ) : (
                                    <button
                                        disabled={listing.isSold}
                                        onClick={() => navigate(`/messages?listingId=${listing.id}&sellerId=${listing.userId}`)}
                                        className="w-full flex items-center justify-center gap-3 py-4 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                    >
                                        <MessageCircle className="w-6 h-6" />
                                        {listing.isSold ? 'Bu İlan Satıldı' : 'Satıcıya Mesaj At'}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={listing.isSold || (!canCreateDealRequest && !canWithdrawDealRequest && !canCancelDealRequest) || isUpdatingDealRequest}
                                    onClick={() => {
                                        setDealRequestError(null);

                                        if (canWithdrawDealRequest) {
                                            handleUpdateDealRequest('withdraw');
                                            return;
                                        }

                                        if (canCancelDealRequest) {
                                            handleUpdateDealRequest('cancel');
                                            return;
                                        }

                                        if (canCreateDealRequest) {
                                            setIsDealModalOpen(true);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center gap-3 py-4 px-4 sm:px-6 text-base sm:text-lg font-extrabold rounded-2xl shadow-sm transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed ${
                                        canWithdrawDealRequest
                                            ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                            : canCancelDealRequest
                                                ? 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
                                                : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                                    }`}
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                    {isUpdatingDealRequest
                                        ? 'Güncelleniyor...'
                                        : isOwnListing
                                            ? 'Kendi İlanın'
                                            : canWithdrawDealRequest
                                            ? 'İsteği Geri Çek'
                                            : canCancelDealRequest
                                                ? 'Anlaşmayı İptal Et'
                                                : dealRequestStatus === 'Rejected' || dealRequestStatus === 'Withdrawn' || dealRequestStatus === 'Cancelled'
                                                    ? 'Tekrar Anlaşma İste'
                                                    : dealRequestStatus === 'Accepted'
                                                        ? 'Anlaşma Kabul Edildi'
                                                        : dealRequestStatus === 'Pending'
                                                            ? 'Anlaşma Bekliyor'
                                                            : 'Anlaşma İsteği Gönder'}
                                </button>
                            </div>
                            <div className="mt-3">
                                <button
                                    type="button"
                                    disabled={!canReviewSeller || !!existingReview}
                                    onClick={() => {
                                        setReviewError(null);
                                        setIsReviewModalOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-3 py-4 px-4 sm:px-6 bg-white border border-amber-200 text-amber-700 text-base sm:text-lg font-extrabold rounded-2xl shadow-sm hover:bg-amber-50 transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                                >
                                    <PencilLine className="w-5 h-5" />
                                    {existingReview ? 'Değerlendirildi' : 'Satıcıyı Değerlendir'}
                                </button>
                            </div>
                            <p className="text-center text-xs text-gray-400 font-medium mt-3">
                                {!isAuthenticated
                                    ? 'Anlaşma isteği göndermek ve değerlendirme bırakmak için giriş yap.'
                                    : isOwnListing
                                        ? 'Kendi ilanına anlaşma isteği gönderemez veya değerlendirme bırakamazsın.'
                                        : existingReview
                                            ? 'Bu alışveriş için satıcıyı zaten değerlendirdin.'
                                            : !listing.isSold
                                                ? dealRequestStatus === 'Accepted'
                                                    ? 'Anlaşma kabul edildi. Yüz yüze alışveriş tamamlanıp ilan satıldı olduğunda değerlendirme açılır.'
                                                    : 'Önce anlaşma isteği gönderip satıcıyla uzlaşman gerekir. Değerlendirme yalnızca tamamlanan alışverişlerden sonra açılır.'
                                                : Number(listing.soldToUserId) !== Number(user?.id)
                                                    ? 'Bu satıcıyı sadece ürünü satın alan kullanıcı değerlendirebilir.'
                                                    : 'Alışveriş tamamlandıysa satıcı deneyimini puanlayabilirsin.'}
                            </p>
                        </motion.div>

                    </div>
                </div>
            </div>

            {isReviewModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">Satıcıyı Değerlendir</h3>
                                <p className="text-sm text-gray-500 mt-1">{sellerDisplayName} için yıldız puanı ve kısa yorum bırak.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsReviewModalOpen(false)}
                                className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>

                        <form onSubmit={handleReviewSubmit} className="space-y-5 overflow-y-auto p-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Puanın</label>
                                <ReviewStars
                                    rating={reviewForm.rating}
                                    interactive
                                    onSelect={(value) => setReviewForm((prev) => ({ ...prev, rating: value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="review-comment">
                                    Yorumun
                                </label>
                                <textarea
                                    id="review-comment"
                                    rows={4}
                                    value={reviewForm.comment}
                                    onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                                    placeholder="Alışveriş deneyimini birkaç cümleyle anlatabilirsin."
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
                                />
                            </div>

                            {reviewError && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {reviewError}
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsReviewModalOpen(false)}
                                    className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReview}
                                    className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-60"
                                >
                                    {isSubmittingReview ? 'Kaydediliyor...' : 'Değerlendirmeyi Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDealModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">Anlaşma İsteği Gönder</h3>
                                <p className="text-sm text-gray-500 mt-1">Satıcı bu isteği mesajlar ekranından kabul ettiğinde, ilanı sana satıldı olarak işaretleyebilir.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDealModalOpen(false)}
                                className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>

                        <form onSubmit={handleCreateDealRequest} className="space-y-5 overflow-y-auto p-6">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                                <p className="text-sm font-semibold text-blue-900">{listing.title}</p>
                                <p className="text-xs text-blue-700 mt-1">İstersen fiyat veya buluşma notunu satıcıya iletebilirsin.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="deal-note">
                                    Not (opsiyonel)
                                </label>
                                <textarea
                                    id="deal-note"
                                    rows={4}
                                    value={dealRequestNote}
                                    onChange={(event) => setDealRequestNote(event.target.value)}
                                    placeholder="Örn. Yarın kampüste görebilir miyim? Fiyatta küçük bir esneklik var mı?"
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
                                />
                            </div>

                            {dealRequestError && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {dealRequestError}
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDealModalOpen(false)}
                                    className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingDealRequest}
                                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
                                >
                                    {isSubmittingDealRequest ? 'Gönderiliyor...' : 'İsteği Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListingDetail;
