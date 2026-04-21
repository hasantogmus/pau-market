import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { User, Mail, GraduationCap, Building2, ShieldCheck, CalendarDays, BarChart3, Heart, Eye, Star, Package, Settings, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import dashboardService from '../services/dashboardService';
import reviewService from '../services/reviewService';
import listingService from '../services/listingService';

const metricCards = (dashboard) => [
    { label: 'Aktif İlan', value: dashboard?.totalActiveListings ?? 0, icon: Package },
    { label: 'Toplam Görüntülenme', value: dashboard?.totalViews ?? 0, icon: Eye },
    { label: 'Toplam Favori', value: dashboard?.totalFavorites ?? 0, icon: Heart },
    { label: 'Ortalama Puan', value: (dashboard?.averageRating ?? 0).toFixed(1), icon: Star },
];

const currency = (value) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value || 'Belirtilmemiş'}</p>
        </div>
    </div>
);

const ReviewStars = ({ rating }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
            <Star
                key={value}
                className={`w-4 h-4 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
            />
        ))}
    </div>
);

const Profile = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated, user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [sellerListings, setSellerListings] = useState([]);
    const [error, setError] = useState(null);
    const [dashboardError, setDashboardError] = useState(null);
    const [reviewError, setReviewError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const requestedUserId = id ? Number(id) : null;
    const isOwnProfile = !requestedUserId || Number(user?.id) === requestedUserId;

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                setReviewError(null);
                if (isOwnProfile) {
                    const [profileResult, dashboardResult] = await Promise.allSettled([
                        userService.getCurrentUser(),
                        dashboardService.getMyDashboard(),
                    ]);

                    if (profileResult.status === 'fulfilled') {
                        setProfile(profileResult.value);
                    } else {
                        throw profileResult.reason;
                    }

                    if (dashboardResult.status === 'fulfilled') {
                        setDashboard(dashboardResult.value);
                    } else {
                        setDashboardError(dashboardResult.reason?.response?.data?.error || 'Performans özeti şu anda getirilemedi.');
                    }
                } else {
                    const [publicProfile, publicListings] = await Promise.all([
                        userService.getPublicProfile(requestedUserId),
                        listingService.getUserListings(requestedUserId),
                    ]);
                    setProfile(publicProfile);
                    setSellerListings(publicListings);
                    setDashboard(null);
                    setDashboardError(null);
                }

                const targetUserId = isOwnProfile ? (user?.id ?? requestedUserId) : requestedUserId;
                if (targetUserId) {
                    try {
                        const reviews = await reviewService.getUserReviews(targetUserId);
                        setReviewSummary(reviews);
                    } catch (reviewErr) {
                        setReviewError(reviewErr.response?.data?.error || 'Değerlendirmeler şu anda getirilemedi.');
                    }
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Profil bilgileri yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isAuthenticated, isOwnProfile, requestedUserId, user?.id]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Profilini görmek için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Hesap bilgilerin ve ilan performans özetin yalnızca oturum açıkken görüntülenebilir.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="min-h-[70vh] flex items-center justify-center text-gray-500">Profil yükleniyor...</div>;
    }

    if (error) {
        return <div className="min-h-[70vh] flex items-center justify-center px-4 text-center text-red-600">{error}</div>;
    }

    const effectiveProfile = {
        fullName: profile?.fullName || user?.name || 'PAU Market Kullanıcısı',
        email: isOwnProfile ? (profile?.email || user?.email || 'Belirtilmemiş') : null,
        department: profile?.department,
        grade: profile?.grade,
        preferredCategories: profile?.preferredCategories,
        preferredCondition: profile?.preferredCondition,
        isEmailVerified: profile?.isEmailVerified ?? false,
        createdAt: profile?.createdAt,
    };
    const averageRating = reviewSummary?.averageRating ?? 0;
    const totalReviews = reviewSummary?.totalReviews ?? 0;

    const joinedAt = effectiveProfile.createdAt
        ? new Date(effectiveProfile.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                        <User className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{effectiveProfile.fullName}</h1>
                            {effectiveProfile.isEmailVerified && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Doğrulanmış Hesap
                                </span>
                            )}
                        </div>
                        {effectiveProfile.email && <p className="text-gray-600 font-medium">{effectiveProfile.email}</p>}
                    </div>
                    <div className="flex flex-wrap gap-3 sm:justify-end">
                        {isOwnProfile ? (
                            <>
                                <Link to="/settings" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                                    <Settings className="w-4 h-4" />
                                    Profili Düzenle
                                </Link>
                                <Link to="/messages" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                    Mesajlara Git
                                </Link>
                                <Link to="/purchases" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors">
                                    <Package className="w-4 h-4" />
                                    Satın Aldıklarım
                                </Link>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Mesajlara Dön
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {isOwnProfile && (
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {metricCards(dashboard).map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">{label}</p>
                            <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
                        </div>
                    ))}
                </section>
            )}

            {isOwnProfile && dashboardError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-medium">
                    {dashboardError}
                </div>
            )}

            {reviewError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-medium">
                    {reviewError}
                </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Hesap Bilgileri</h2>
                    {isOwnProfile && <InfoRow icon={Mail} label="E-posta" value={effectiveProfile.email} />}
                    <InfoRow icon={Building2} label="Bölüm" value={effectiveProfile.department} />
                    <InfoRow icon={GraduationCap} label="Sınıf" value={effectiveProfile.grade ? `${effectiveProfile.grade}. sınıf` : null} />
                    <InfoRow icon={CalendarDays} label="Katılım Tarihi" value={joinedAt} />
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{isOwnProfile ? 'Tercih Özeti' : 'Profil Özeti'}</h2>
                    {isOwnProfile ? (
                        <>
                            <InfoRow icon={BarChart3} label="Kategori Tercihleri" value={effectiveProfile.preferredCategories} />
                            <InfoRow icon={ShieldCheck} label="Durum Tercihi" value={effectiveProfile.preferredCondition} />
                            <div className="pt-4">
                                <Link to="/settings" className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                                    Tercihleri Düzenle
                                </Link>
                            </div>
                        </>
                    ) : (
                        <InfoRow icon={ShieldCheck} label="Hesap Durumu" value={effectiveProfile.isEmailVerified ? 'Doğrulanmış PAÜ hesabı' : 'Henüz doğrulanmamış'} />
                    )}
                </div>
            </section>

            {!isOwnProfile && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Satıcının İlanları</h2>
                            <p className="text-sm text-gray-500">Aktif ve satılmış ilan geçmişi burada görünür.</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-400">{sellerListings.length} ilan</span>
                    </div>

                    {sellerListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sellerListings.map((listing) => (
                                <Link
                                    key={listing.id}
                                    to={`/listings/${listing.id}`}
                                    className="group rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all overflow-hidden"
                                >
                                    <div className="flex gap-4 p-4">
                                        <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                                            {listing.imageUrl ? (
                                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-400">Görsel yok</div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                                    listing.isSold
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {listing.isSold ? 'Satıldı' : 'Yayında'}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-gray-500 border border-gray-100">
                                                    {listing.category}
                                                </span>
                                            </div>
                                            <h3 className="font-extrabold text-gray-900 truncate">{listing.title}</h3>
                                            <p className="text-sm font-black text-blue-600 mt-1">{currency(listing.price)}</p>
                                            {listing.isSold && listing.soldToUserName && (
                                                <p className="text-xs font-semibold text-emerald-700 mt-2">Alıcı: {listing.soldToUserName}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-gray-700">Bu satıcının henüz ilanı yok</p>
                        </div>
                    )}
                </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Satıcı Puanı</h2>
                    <div className="flex items-end gap-3 mb-3">
                        <p className="text-4xl font-black text-gray-900">{averageRating.toFixed(1)}</p>
                        <p className="text-sm text-gray-400 pb-1">/ 5</p>
                    </div>
                    <ReviewStars rating={Math.round(averageRating)} />
                    <p className="text-sm text-gray-500 mt-3">
                        {totalReviews > 0
                            ? `${totalReviews} değerlendirme ile oluşan satıcı puanı`
                            : 'Henüz değerlendirme yok'}
                    </p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <h2 className="text-lg font-bold text-gray-900">Yorumlar</h2>
                        <span className="text-sm font-semibold text-gray-400">{totalReviews} kayıt</span>
                    </div>

                    {reviewSummary?.reviews?.length ? (
                        <div className="space-y-4">
                            {reviewSummary.reviews.map((review) => (
                                <article key={review.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{review.reviewerName}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(review.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <ReviewStars rating={review.rating} />
                                    </div>
                                    <p className="text-sm leading-6 text-gray-600">
                                        {review.comment?.trim() || 'Yıldız puanı bırakıldı, ek yorum paylaşılmadı.'}
                                    </p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                            <Star className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-gray-700">Henüz yorum yok</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {isOwnProfile
                                    ? 'İlk değerlendirmeler geldikçe burada listelenecek.'
                                    : 'Bu kullanıcı için henüz değerlendirme bırakılmamış.'}
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Profile;
