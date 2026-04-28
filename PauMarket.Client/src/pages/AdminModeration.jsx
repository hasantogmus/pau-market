import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    ImageOff,
    Loader2,
    ShieldCheck,
    Tag,
    XCircle,
} from 'lucide-react';
import adminService from '../services/adminService';

const STATUS_TABS = [
    { key: 'pending', label: 'Onay Bekleyenler', icon: Clock3 },
    { key: 'approved', label: 'Onaylananlar', icon: CheckCircle2 },
    { key: 'rejected', label: 'Reddedilenler', icon: XCircle },
];

const REJECTION_TEMPLATES = [
    'Görsel veya açıklama platform kurallarına uygun değil.',
    'İlan bilgileri eksik veya yanıltıcı görünüyor.',
    'Ürün PAÜ Market kullanım amacına uygun değil.',
];

const formatPrice = (price) =>
    new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(Number(price) || 0);

const formatDate = (date) =>
    date
        ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
        : 'Tarih yok';

const AdminModeration = () => {
    const [status, setStatus] = useState('pending');
    const [listings, setListings] = useState([]);
    const [reasons, setReasons] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState('');
    const [summaryCounts, setSummaryCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

    useEffect(() => {
        let isMounted = true;

        const loadListings = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await adminService.getModerationListings(status);
                if (isMounted) {
                    setListings(data);
                }
            } catch {
                if (isMounted) {
                    setError('Moderasyon kuyruğu yüklenemedi. Admin yetkini ve backend bağlantısını kontrol et.');
                    setListings([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadListings();

        return () => {
            isMounted = false;
        };
    }, [status]);

    useEffect(() => {
        let isMounted = true;

        const loadSummary = async () => {
            const entries = await Promise.allSettled(
                STATUS_TABS.map((tab) => adminService.getModerationListings(tab.key))
            );

            if (!isMounted) return;

            setSummaryCounts(
                entries.reduce((acc, result, index) => ({
                    ...acc,
                    [STATUS_TABS[index].key]: result.status === 'fulfilled' ? result.value.length : 0,
                }), {})
            );
        };

        loadSummary();

        return () => {
            isMounted = false;
        };
    }, [status]);

    const removeFromCurrentList = (listingId) => {
        setListings((current) => current.filter((listing) => listing.id !== listingId));
    };

    const handleApprove = async (listingId) => {
        setActionLoadingId(listingId);
        setError('');
        try {
            await adminService.approveListing(listingId);
            removeFromCurrentList(listingId);
            setSummaryCounts((current) => ({
                ...current,
                pending: Math.max(0, Number(current.pending || 0) - 1),
                approved: Number(current.approved || 0) + 1,
            }));
        } catch {
            setError('İlan onaylanamadı. Lütfen tekrar dene.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (listingId) => {
        setActionLoadingId(listingId);
        setError('');
        try {
            await adminService.rejectListing(listingId, reasons[listingId] || '');
            removeFromCurrentList(listingId);
            setSummaryCounts((current) => ({
                ...current,
                pending: Math.max(0, Number(current.pending || 0) - 1),
                rejected: Number(current.rejected || 0) + 1,
            }));
        } catch {
            setError('İlan reddedilemedi. Lütfen tekrar dene.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const applyRejectTemplate = (listingId, template) => {
        setReasons((current) => ({
            ...current,
            [listingId]: template,
        }));
    };

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-3">
                            <ShieldCheck className="w-4 h-4" />
                            Admin Moderasyon
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight">
                            İlan Onay Kuyruğu
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-2xl">
                            Yeni veya düzenlenen ilanlar önce burada görünür. Uygun ilanları onayla, uygunsuz içerikleri kullanıcıya açıklama bırakarak reddet.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {STATUS_TABS.map(({ key, label, icon: Icon }) => (
                            <div key={key} className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm min-w-28">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Icon className="w-4 h-4" />
                                    <p className="text-[11px] font-black uppercase tracking-wider">{label.split(' ')[0]}</p>
                                </div>
                                <p className="text-2xl font-black text-slate-950 mt-1">{summaryCounts[key] ?? 0}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {STATUS_TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setStatus(key)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all ${
                                status === key
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:text-blue-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center min-h-[360px]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : listings.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <ShieldCheck className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                        <h2 className="text-xl font-black text-slate-900">Bu sekmede ilan yok</h2>
                        <p className="text-slate-500 mt-2">
                            {status === 'pending'
                                ? 'Bekleyen ilan yok. Kuyruk temiz.'
                                : status === 'approved'
                                    ? 'Henüz onaylanan ilan listelenmiyor.'
                                    : 'Henüz reddedilen ilan listelenmiyor.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5">
                        {listings.map((listing) => (
                            <motion.article
                                key={listing.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm"
                            >
                                <div className="grid lg:grid-cols-[280px,1fr]">
                                    <div className="bg-slate-100 p-4">
                                        {listing.imageUrls?.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {listing.imageUrls.slice(0, 4).map((url, index) => (
                                                    <img
                                                        key={`${url}-${index}`}
                                                        src={url}
                                                        alt={`${listing.title} görsel ${index + 1}`}
                                                        className={`w-full object-cover rounded-2xl border border-white shadow-sm ${
                                                            index === 0 ? 'col-span-2 h-44' : 'h-24'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full min-h-[260px] rounded-2xl bg-white flex items-center justify-center text-slate-400">
                                                <ImageOff className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 md:p-6">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
                                                        <Tag className="w-3.5 h-3.5" />
                                                        {listing.categoryName}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                                        {listing.condition}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                                                        {listing.moderationStatusName}
                                                    </span>
                                                </div>
                                                <h2 className="text-2xl font-black text-slate-950">{listing.title}</h2>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {listing.sellerName || 'Satıcı bilgisi yok'} tarafından {formatDate(listing.createdAt)} tarihinde gönderildi
                                                </p>
                                            </div>
                                            <p className="text-3xl font-black text-blue-600">{formatPrice(listing.price)}</p>
                                        </div>

                                        <p className="mt-5 text-slate-700 leading-relaxed whitespace-pre-line">
                                            {listing.description || 'Açıklama girilmemiş.'}
                                        </p>

                                        {listing.moderationReason && (
                                            <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                                                <span className="font-black">Ret nedeni: </span>
                                                {listing.moderationReason}
                                            </div>
                                        )}

                                        {status === 'pending' && (
                                            <div className="mt-6 grid gap-3 lg:grid-cols-[1fr,auto] lg:items-end">
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-600">Reddetme nedeni, opsiyonel</span>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {REJECTION_TEMPLATES.map((template) => (
                                                            <button
                                                                key={template}
                                                                type="button"
                                                                onClick={() => applyRejectTemplate(listing.id, template)}
                                                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                                                            >
                                                                {template}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <textarea
                                                        value={reasons[listing.id] || ''}
                                                        onChange={(event) =>
                                                            setReasons((current) => ({
                                                                ...current,
                                                                [listing.id]: event.target.value,
                                                            }))
                                                        }
                                                        rows={2}
                                                        maxLength={500}
                                                        placeholder="Örn: Görsel veya açıklama platform kurallarına uygun değil."
                                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                    />
                                                    <span className="mt-1 block text-right text-xs font-semibold text-slate-400">
                                                        {(reasons[listing.id] || '').length}/500
                                                    </span>
                                                </label>

                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReject(listing.id)}
                                                        disabled={actionLoadingId === listing.id}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                        Reddet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprove(listing.id)}
                                                        disabled={actionLoadingId === listing.id}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-60"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        Onayla
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default AdminModeration;
