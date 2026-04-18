import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { User, Mail, GraduationCap, Building2, ShieldCheck, CalendarDays, BarChart3, Heart, Eye, Star, Package, Settings, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import dashboardService from '../services/dashboardService';

const metricCards = (dashboard) => [
    { label: 'Aktif İlan', value: dashboard?.totalActiveListings ?? 0, icon: Package },
    { label: 'Toplam Görüntülenme', value: dashboard?.totalViews ?? 0, icon: Eye },
    { label: 'Toplam Favori', value: dashboard?.totalFavorites ?? 0, icon: Heart },
    { label: 'Ortalama Puan', value: (dashboard?.averageRating ?? 0).toFixed(1), icon: Star },
];

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

const Profile = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated, user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState(null);
    const [dashboardError, setDashboardError] = useState(null);
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
                    const publicProfile = await userService.getPublicProfile(requestedUserId);
                    setProfile(publicProfile);
                    setDashboard(null);
                    setDashboardError(null);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Profil bilgileri yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isAuthenticated, isOwnProfile, requestedUserId]);

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
                        <p className="text-gray-600 font-medium">{effectiveProfile.email}</p>
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
        </div>
    );
};

export default Profile;
