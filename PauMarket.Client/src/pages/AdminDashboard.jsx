import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Database,
    Download,
    FileCheck2,
    Handshake,
    Loader2,
    Package,
    Search,
    ShieldCheck,
    Sparkles,
    Tag,
    Users,
} from 'lucide-react';
import adminService from '../services/adminService';

const formatCurrency = (value) =>
    new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value))
        : 'Tarih yok';

const statusLabel = {
    Pending: 'Beklemede',
    Approved: 'Onaylandı',
    Rejected: 'Reddedildi',
    Accepted: 'Kabul edildi',
    Withdrawn: 'Geri çekildi',
    Cancelled: 'İptal edildi',
};

const statusTone = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Withdrawn: 'bg-slate-50 text-slate-600 border-slate-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const numberText = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0);

const emptyArray = [];

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [pendingListings, setPendingListings] = useState([]);
    const [recentDeals, setRecentDeals] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            setError('');

            try {
                const [statsData, pendingData, dealsData, usersData] = await Promise.all([
                    adminService.getDashboardStats(),
                    adminService.getModerationListings('pending'),
                    adminService.getRecentDeals(),
                    adminService.getUsers(),
                ]);

                if (!isMounted) return;

                setStats(statsData);
                setPendingListings(pendingData);
                setRecentDeals(dealsData);
                setUsers(usersData);
            } catch {
                if (isMounted) {
                    setError('Yönetim paneli verileri yüklenemedi. Yetkini ve backend bağlantısını kontrol et.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadDashboard();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const timer = window.setTimeout(async () => {
            setUsersLoading(true);
            try {
                const data = await adminService.getUsers(search);
                if (isMounted) {
                    setUsers(data);
                }
            } catch {
                if (isMounted) {
                    setUsers([]);
                }
            } finally {
                if (isMounted) {
                    setUsersLoading(false);
                }
            }
        }, 250);

        return () => {
            isMounted = false;
            window.clearTimeout(timer);
        };
    }, [search]);

    const summaryCards = useMemo(() => [
        {
            label: 'Toplam Kullanıcı',
            value: stats?.users?.total,
            detail: `${numberText(stats?.users?.verified)} doğrulanmış`,
            icon: Users,
            tone: 'from-blue-600 to-cyan-500',
        },
        {
            label: 'Yayındaki İlan',
            value: stats?.listings?.active,
            detail: `${numberText(stats?.listings?.pending)} onay bekliyor`,
            icon: Package,
            tone: 'from-slate-950 to-slate-700',
        },
        {
            label: 'Tamamlanan Satış',
            value: stats?.listings?.sold,
            detail: formatCurrency(stats?.listings?.soldValue),
            icon: Handshake,
            tone: 'from-emerald-600 to-teal-500',
        },
        {
            label: 'Etkileşim',
            value: stats?.engagement?.interactions,
            detail: `${numberText(stats?.engagement?.favorites)} favori, ${numberText(stats?.engagement?.views)} görüntüleme`,
            icon: BarChart3,
            tone: 'from-indigo-600 to-violet-500',
        },
    ], [stats]);

    const handleDownload = async (kind) => {
        setDownloadLoading(kind);
        try {
            await adminService.downloadRecommenderCsv(kind);
        } finally {
            setDownloadLoading('');
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-3xl bg-white px-6 py-5 shadow-sm border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-sm font-bold text-slate-600">Yönetim paneli hazırlanıyor...</span>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.45),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.24),_transparent_35%)]" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold text-blue-100">
                                <ShieldCheck className="w-4 h-4" />
                                PAÜ Market Yönetim Merkezi
                            </div>
                            <h1 className="mt-5 max-w-3xl text-3xl md:text-5xl font-black tracking-tight text-white">
                                Platform sağlığı, kullanıcı güvenliği ve ilan moderasyonu tek ekranda.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm md:text-base text-slate-300">
                                Yönetim paneli; kullanıcı doğrulama durumunu, ilan kuyruğunu, satış/anlaşma akışını ve öneri sistemi veri çıktılarını izlemek için hazırlandı.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
                            <HeroMetric label="Doğrulama" value={`%${stats?.users?.verificationRate ?? 0}`} />
                            <HeroMetric label="Yönetici" value={numberText(stats?.users?.admins)} />
                            <HeroMetric label="Mesaj" value={numberText(stats?.engagement?.messages)} />
                            <HeroMetric label="Yorum" value={numberText(stats?.engagement?.reviews)} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {error && (
                    <div className="flex items-center gap-3 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <StatCard key={card.label} {...card} />
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                    <Panel
                        title="Onay Bekleyen İlanlar"
                        description="Yeni eklenen veya düzenlenen ilanlar yayına çıkmadan önce burada görünür."
                        action={
                            <Link to="/admin/moderation" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
                                Kuyruğa Git
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        }
                    >
                        {pendingListings.length === 0 ? (
                            <EmptyState icon={CheckCircle2} title="Kuyruk temiz" text="Şu anda onay bekleyen ilan yok." />
                        ) : (
                            <div className="grid gap-3">
                                {pendingListings.slice(0, 4).map((listing) => (
                                    <Link
                                        key={listing.id}
                                        to="/admin/moderation"
                                        className="group grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 sm:grid-cols-[88px,1fr,auto]"
                                    >
                                        <div className="h-20 rounded-2xl bg-slate-100 overflow-hidden">
                                            {listing.imageUrls?.[0] ? (
                                                <img src={listing.imageUrls[0]} alt={listing.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-slate-300">
                                                    <Package className="w-7 h-7" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-base font-black text-slate-950 group-hover:text-blue-700">{listing.title}</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">{listing.sellerName || 'Satıcı bilgisi yok'}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{listing.categoryName}</span>
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Beklemede</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start justify-between gap-2 sm:items-end">
                                            <p className="text-lg font-black text-blue-600">{formatCurrency(listing.price)}</p>
                                            <p className="text-xs font-bold text-slate-400">{formatDate(listing.createdAt)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Kategori Performansı"
                        description="Yayına alınmış ilanların kategori dağılımı ve satış yoğunluğu."
                    >
                        <div className="space-y-3">
                            {(stats?.topCategories ?? emptyArray).length === 0 ? (
                                <EmptyState icon={Tag} title="Kategori verisi yok" text="Onaylanan ilanlar oluşunca burası dolacak." compact />
                            ) : (
                                stats.topCategories.map((category) => {
                                    const total = Math.max(Number(stats?.listings?.approved) || 1, 1);
                                    const percent = Math.min(100, Math.round((Number(category.count) / total) * 100));

                                    return (
                                        <div key={category.category} className="rounded-3xl border border-slate-200 bg-white p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-black text-slate-900">{category.category}</p>
                                                    <p className="text-xs font-semibold text-slate-500">{numberText(category.soldCount)} satıldı</p>
                                                </div>
                                                <p className="text-sm font-black text-blue-600">{numberText(category.count)} ilan</p>
                                            </div>
                                            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Panel>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
                    <Panel
                        title="Kullanıcı Yönetimi"
                        description="Kullanıcı doğrulama, rol ve ilan aktivitesini hızlıca izle."
                        action={
                            <div className="relative w-full sm:w-72">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Kullanıcı ara"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>
                        }
                    >
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                            <div className="max-h-[460px] overflow-auto">
                                <table className="w-full min-w-[680px] text-left text-sm">
                                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Kullanıcı</th>
                                            <th className="px-4 py-3">Durum</th>
                                            <th className="px-4 py-3">İlan</th>
                                            <th className="px-4 py-3">Kayıt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {usersLoading ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-10 text-center text-slate-500">
                                                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600" />
                                                    Kullanıcılar aranıyor...
                                                </td>
                                            </tr>
                                        ) : users.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-10 text-center font-semibold text-slate-500">
                                                    Kullanıcı bulunamadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="hover:bg-blue-50/40">
                                                    <td className="px-4 py-3">
                                                        <div className="font-black text-slate-900">{user.fullName || 'İsimsiz kullanıcı'}</div>
                                                        <div className="text-xs font-semibold text-slate-500">{user.email}</div>
                                                        <div className="text-xs text-slate-400">{user.department || 'Bölüm bilgisi yok'}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${user.isEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                {user.isEmailVerified ? 'Doğrulanmış' : 'Bekliyor'}
                                                            </span>
                                                            {String(user.role).toLowerCase() === 'admin' && (
                                                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">Yönetici</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-black text-slate-900">{numberText(user.listingCount)}</div>
                                                        <div className="text-xs text-slate-500">{numberText(user.soldListingCount)} satış</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(user.createdAt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Son Anlaşma Hareketleri"
                        description="Alıcı-satıcı anlaşmaları, geri çekmeler ve iptaller burada takip edilir."
                    >
                        {(recentDeals ?? emptyArray).length === 0 ? (
                            <EmptyState icon={Handshake} title="Henüz anlaşma yok" text="Kullanıcılar anlaşma isteği gönderdikçe bu alan dolacak." />
                        ) : (
                            <div className="space-y-3">
                                {recentDeals.slice(0, 8).map((deal) => (
                                    <div key={deal.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-black text-slate-950">{deal.listingTitle}</p>
                                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                                    {deal.buyerName} ile {deal.sellerName}
                                                </p>
                                            </div>
                                            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${statusTone[deal.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                {statusLabel[deal.status] || deal.status}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                                            <span>{formatCurrency(deal.listingPrice)}</span>
                                            <span>{formatDate(deal.respondedAt || deal.requestedAt)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <Panel
                    title="Yönetim Araçları"
                    description="Tez sunumu, öneri sistemi eğitimi ve denetim için gerekli operasyonel çıktılar."
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        <ToolCard
                            icon={FileCheck2}
                            title="Moderasyon Kuyruğu"
                            text={`${numberText(stats?.moderation?.pendingCount)} ilan inceleme bekliyor.`}
                            action={<Link to="/admin/moderation" className="tool-action">İncele</Link>}
                        />
                        <ToolCard
                            icon={Database}
                            title="Etkileşim Verisi"
                            text="Öneri sistemi eğitiminde kullanılan kullanıcı-ürün etkileşim CSV çıktısı."
                            action={
                                <button type="button" onClick={() => handleDownload('interactions')} className="tool-action" disabled={downloadLoading === 'interactions'}>
                                    {downloadLoading === 'interactions' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    İndir
                                </button>
                            }
                        />
                        <ToolCard
                            icon={Sparkles}
                            title="İlan İçerik Verisi"
                            text="Kategori, durum ve açıklama alanlarını içeren öneri sistemi ürün CSV çıktısı."
                            action={
                                <button type="button" onClick={() => handleDownload('listings')} className="tool-action" disabled={downloadLoading === 'listings'}>
                                    {downloadLoading === 'listings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    İndir
                                </button>
                            }
                        />
                    </div>
                </Panel>
            </section>
        </main>
    );
};

const HeroMetric = ({ label, value }) => (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
);

const StatCard = ({ label, value, detail, icon: Icon, tone }) => (
    <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
        <div className={`h-2 bg-gradient-to-r ${tone}`} />
        <div className="p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-black text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{numberText(value)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">{detail}</p>
        </div>
    </motion.article>
);

const Panel = ({ title, description, action, children }) => (
    <section className="rounded-[2rem] border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-950">{title}</h2>
                <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">{description}</p>
            </div>
            {action}
        </div>
        {children}
    </section>
);

const EmptyState = ({ icon: Icon, title, text, compact }) => (
    <div className={`rounded-3xl border border-dashed border-slate-300 bg-white text-center ${compact ? 'p-6' : 'p-10'}`}>
        <Icon className="mx-auto mb-3 h-10 w-10 text-blue-500" />
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{text}</p>
    </div>
);

const ToolCard = ({ icon: Icon, title, text, action }) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-2 min-h-12 text-sm font-medium text-slate-500">{text}</p>
        <div className="mt-4">{action}</div>
    </div>
);

export default AdminDashboard;
