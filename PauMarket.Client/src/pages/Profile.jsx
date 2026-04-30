import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { User, Mail, GraduationCap, Building2, ShieldCheck, CalendarDays, BarChart3, Heart, Eye, Star, Package, Settings, MessageCircle, Phone, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import dashboardService from '../services/dashboardService';
import reviewService from '../services/reviewService';
import listingService from '../services/listingService';

const metricCards = (dashboard) => [
    { label: 'Aktif İlan', value: dashboard?.totalActiveListings ?? 0, icon: Package, tone: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Toplam Görüntülenme', value: dashboard?.totalViews ?? 0, icon: Eye, tone: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    { label: 'Toplam Favori', value: dashboard?.totalFavorites ?? 0, icon: Heart, tone: 'bg-rose-50 text-rose-600 border-rose-100' },
    { label: 'Ortalama Puan', value: (dashboard?.averageRating ?? 0).toFixed(1), icon: Star, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
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
        fullName: profile?.fullName || user?.name || 'PAÜ Market kullanıcısı',
        email: isOwnProfile ? (profile?.email || user?.email || 'Belirtilmemiş') : null,
        department: profile?.department,
        grade: profile?.grade,
        bio: profile?.bio,
        phoneNumber: profile?.phoneNumber,
        profilePhotoUrl: profile?.profilePhotoUrl,
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

    const trustBadges = [
        {
            icon: ShieldCheck,
            label: effectiveProfile.isEmailVerified ? 'PAÜ e-postası doğrulanmış' : 'E-posta doğrulaması bekliyor',
            tone: effectiveProfile.isEmailVerified
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700',
        },
        {
            icon: MessageCircle,
            label: 'Mesajlaşma kayıt altında',
            tone: 'border-blue-200 bg-blue-50 text-blue-700',
        },
        {
            icon: MapPin,
            label: 'Kampüs içi teslim önerilir',
            tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,0.8),_transparent_30rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)]">
            <div className="pointer-events-none absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="pointer-events-none absolute left-[-10rem] bottom-20 h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.34),transparent_18rem),radial-gradient(circle_at_92%_0%,rgba(14,165,233,0.22),transparent_16rem)]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        {effectiveProfile.profilePhotoUrl ? (
                            <img
                                src={effectiveProfile.profilePhotoUrl}
                                alt={`${effectiveProfile.fullName} profil fotoğrafı`}
                                className="h-24 w-24 shrink-0 rounded-[1.75rem] border border-white/20 object-cover shadow-xl sm:h-28 sm:w-28"
                            />
                        ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur sm:h-28 sm:w-28">
                                <User className="h-12 w-12" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-blue-100 backdrop-blur">
                                <Sparkles className="h-3.5 w-3.5" />
                                {isOwnProfile ? 'Profil merkezim' : 'Satıcı profili'}
                            </div>
                            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{effectiveProfile.fullName}</h1>
                            {effectiveProfile.email && <p className="mt-2 text-sm font-semibold text-blue-100 sm:text-base">{effectiveProfile.email}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {trustBadges.map(({ icon: Icon, label, tone }) => (
                                    <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${tone}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[21rem] lg:grid-cols-1">
                        {isOwnProfile ? (
                            <>
                                <Link to="/settings" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-950 transition-colors hover:bg-blue-50">
                                    <Settings className="w-4 h-4" />
                                    Profili Düzenle
                                </Link>
                                <Link to="/messages" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-black text-white transition-colors hover:bg-white/15">
                                    <MessageCircle className="w-4 h-4" />
                                    Mesajlara Git
                                </Link>
                                <Link to="/purchases" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-black text-white transition-colors hover:bg-white/15">
                                    <Package className="w-4 h-4" />
                                    Satın Aldıklarım
                                </Link>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-950 transition-colors hover:bg-blue-50"
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
                    {metricCards(dashboard).map(({ label, value, icon: Icon, tone }) => (
                        <div key={label} className="group rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${tone}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-sm text-slate-500 font-semibold">{label}</p>
                            <p className="text-3xl font-black text-slate-950 mt-1">{value}</p>
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
                <div className="bg-white/90 rounded-3xl border border-white shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Hesap Bilgileri</h2>
                    {isOwnProfile && <InfoRow icon={Mail} label="E-posta" value={effectiveProfile.email} />}
                    {isOwnProfile && <InfoRow icon={Phone} label="Telefon" value={effectiveProfile.phoneNumber} />}
                    <InfoRow icon={Building2} label="Bölüm" value={effectiveProfile.department} />
                    <InfoRow icon={GraduationCap} label="Sınıf" value={effectiveProfile.grade ? `${effectiveProfile.grade}. sınıf` : null} />
                    <InfoRow icon={CalendarDays} label="Katılım Tarihi" value={joinedAt} />
                </div>

                <div className="bg-white/90 rounded-3xl border border-white shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{isOwnProfile ? 'Tercih Özeti' : 'Profil Özeti'}</h2>
                    <InfoRow icon={User} label="Hakkımda" value={effectiveProfile.bio} />
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
                <section className="bg-white/90 rounded-3xl border border-white shadow-sm p-6">
                    <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Satıcının İlanları</h2>
                            <p className="text-sm text-gray-500">Aktif ve satılmış ilan geçmişi, satıcı hakkında hızlı fikir verir.</p>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">{sellerListings.length} ilan</span>
                    </div>

                    {sellerListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sellerListings.map((listing) => (
                                (() => {
                                    const coverImage = listing.imageUrl || listing.imageUrls?.[0];

                                    return (
                                        <Link
                                            key={listing.id}
                                            to={`/listings/${listing.id}`}
                                            className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-slate-50 transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:bg-white hover:shadow-lg"
                                        >
                                            <div className="flex flex-col gap-4 p-4 sm:flex-row">
                                                <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-24 sm:w-24">
                                                    {coverImage ? (
                                                        <img src={coverImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                                    );
                                })()
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
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
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
                    <p className="mt-4 rounded-2xl border border-white bg-white/70 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                        Değerlendirmeler alışveriş tamamlandıktan sonra bırakılır; bu yüzden satıcı deneyimi için güçlü bir güven sinyali sağlar.
                    </p>
                </div>

                <div className="bg-white/90 rounded-3xl border border-white shadow-sm p-6">
                    <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Yorumlar</h2>
                        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-500">{totalReviews} kayıt</span>
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
        </div>
    );
};

export default Profile;
