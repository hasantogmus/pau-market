import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Package, Pencil, PlusCircle, Power, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import listingService from '../services/listingService';
import messageService from '../services/messageService';

const CATEGORIES = ['Elektronik', 'Ders Kitabı', 'Ev Eşyası', 'Giyim', 'Hobi', 'Not / Özet', 'Spor', 'Müzik Aletleri', 'Diğer'];
const CONDITIONS = ['Sıfır', 'Az Kullanılmış', 'Çok Kullanılmış'];

const currency = (value) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

const formatDate = (value) =>
    new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

const createEditForm = (listing) => ({
    title: listing.title || '',
    description: listing.description || '',
    price: listing.price ?? '',
    category: listing.category || '',
    condition: listing.condition || '',
    isActive: listing.isActive ?? true,
});

const SummaryCard = ({ icon: Icon, label, value, tone }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
            <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
    </div>
);

const MyListings = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [editingListing, setEditingListing] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [savingListingId, setSavingListingId] = useState(null);
    const [deletingListingId, setDeletingListingId] = useState(null);
    const [saleModalListing, setSaleModalListing] = useState(null);
    const [saleCandidates, setSaleCandidates] = useState([]);
    const [selectedBuyerId, setSelectedBuyerId] = useState(null);
    const [isLoadingSaleCandidates, setIsLoadingSaleCandidates] = useState(false);

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

    const summary = useMemo(() => {
        const activeCount = listings.filter((item) => item.isActive).length;
        const soldCount = listings.filter((item) => item.isSold).length;
        const inactiveCount = listings.filter((item) => !item.isActive && !item.isSold).length;
        const totalValue = listings.reduce((sum, item) => sum + Number(item.price || 0), 0);

        return { activeCount, inactiveCount, soldCount, totalValue };
    }, [listings]);

    const openEditModal = (listing) => {
        setFeedback(null);
        setEditingListing(listing);
        setEditForm(createEditForm(listing));
    };

    const closeEditModal = () => {
        setEditingListing(null);
        setEditForm(null);
    };

    const updateListingInState = (updatedListing) => {
        setListings((prev) => prev.map((item) => (item.id === updatedListing.id ? updatedListing : item)));
    };

    const handleEditChange = (event) => {
        const { name, value, type, checked } = event.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSaveEdit = async (event) => {
        event.preventDefault();
        if (!editingListing || !editForm) return;

        setSavingListingId(editingListing.id);
        setFeedback(null);

        try {
            const updatedListing = await listingService.updateListing(editingListing.id, {
                title: editForm.title,
                description: editForm.description,
                price: Number(editForm.price),
                category: editForm.category,
                condition: editForm.condition,
                isActive: editForm.isActive,
                isSold: editingListing.isSold ?? false,
                soldToUserId: editingListing.soldToUserId ?? null,
            });

            updateListingInState(updatedListing);
            setFeedback({ type: 'success', text: 'İlan başarıyla güncellendi.' });
            closeEditModal();
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.error || 'İlan güncellenemedi.' });
        } finally {
            setSavingListingId(null);
        }
    };

    const handleDelete = async (listing) => {
        const confirmed = window.confirm(`"${listing.title}" ilanını silmek istediğine emin misin? Bu işlem geri alınamaz.`);
        if (!confirmed) return;

        setDeletingListingId(listing.id);
        setFeedback(null);

        try {
            await listingService.deleteListing(listing.id);
            setListings((prev) => prev.filter((item) => item.id !== listing.id));
            setFeedback({ type: 'success', text: 'İlan başarıyla silindi.' });
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.error || 'İlan silinemedi.' });
        } finally {
            setDeletingListingId(null);
        }
    };

    const applySaleStatusChange = async (listing, soldToUserId = null) => {
        setSavingListingId(listing.id);
        setFeedback(null);

        try {
            const updatedListing = await listingService.updateSaleStatus(listing.id, {
                isSold: !listing.isSold,
                soldToUserId,
            });

            updateListingInState(updatedListing);
            setFeedback({
                type: 'success',
                text: updatedListing.isSold ? 'İlan satıldı olarak işaretlendi.' : 'İlan yeniden satışa açıldı.',
            });
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.error || 'Satış durumu güncellenemedi.' });
        } finally {
            setSavingListingId(null);
        }
    };

    const closeSaleModal = () => {
        setSaleModalListing(null);
        setSaleCandidates([]);
        setSelectedBuyerId(null);
    };

    const handleToggleSold = async (listing) => {
        if (listing.isSold) {
            await applySaleStatusChange(listing, null);
            return;
        }

        setSaleModalListing(listing);
        setSelectedBuyerId(null);
        setSaleCandidates([]);
        setIsLoadingSaleCandidates(true);

        try {
            const threads = await messageService.getThreads();
            const candidates = threads
                .filter((thread) => Number(thread.listingId) === Number(listing.id) && thread.dealRequestStatusName === 'Accepted')
                .map((thread) => ({
                    userId: thread.otherUserId,
                    name: thread.otherUserName,
                    lastMessageAt: thread.lastMessageAt,
                    lastMessage: thread.lastMessage,
                }))
                .filter((candidate, index, array) => array.findIndex((item) => item.userId === candidate.userId) === index);

            setSaleCandidates(candidates);
            if (candidates.length === 1) {
                setSelectedBuyerId(candidates[0].userId);
            }
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.error || 'Alıcı listesi yüklenemedi.' });
            setSaleModalListing(null);
        } finally {
            setIsLoadingSaleCandidates(false);
        }
    };

    const confirmSoldStatus = async () => {
        if (!saleModalListing) return;

        await applySaleStatusChange(saleModalListing, selectedBuyerId);
        closeSaleModal();
    };

    const openListingDetail = (listingId) => {
        navigate(`/listings/${listingId}`);
    };

    const handleCardKeyDown = (event, listingId) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openListingDetail(listingId);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">İlanlarını yönetmek için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Kendi ilanların ve yönetim araçları yalnızca hesabınla giriş yaptığında görüntülenebilir.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">İlan Yönetimi</h1>
                        <p className="text-gray-500 mt-1">İlanlarını düzenle, satış durumunu yönet ve performansını tek ekrandan takip et.</p>
                    </div>
                    <Link to="/listings/new" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        <PlusCircle className="w-4 h-4" />
                        Yeni İlan Ver
                    </Link>
                </div>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    <SummaryCard icon={Package} label="Toplam İlan" value={listings.length} tone="bg-blue-50 text-blue-600" />
                    <SummaryCard icon={BadgeCheck} label="Yayındaki İlan" value={summary.activeCount} tone="bg-green-50 text-green-600" />
                    <SummaryCard icon={CheckCircle2} label="Satılan İlan" value={summary.soldCount} tone="bg-emerald-50 text-emerald-600" />
                    <SummaryCard icon={Power} label="Pasif İlan" value={summary.inactiveCount} tone="bg-amber-50 text-amber-600" />
                    <SummaryCard icon={Tag} label="Toplam Portföy Değeri" value={currency(summary.totalValue)} tone="bg-indigo-50 text-indigo-600" />
                </section>

                {feedback && (
                    <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {feedback.text}
                    </div>
                )}

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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {listings.map((listing) => {
                            const isBusy = savingListingId === listing.id || deletingListingId === listing.id;

                            return (
                                <article
                                    key={listing.id}
                                    role="link"
                                    tabIndex={0}
                                    onClick={() => openListingDetail(listing.id)}
                                    onKeyDown={(event) => handleCardKeyDown(event, listing.id)}
                                    className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
                                        <div className="aspect-[4/3] md:aspect-auto bg-gray-100">
                                            {listing.imageUrl ? (
                                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">Görsel Yok</div>
                                            )}
                                        </div>

                                        <div className="p-6 flex flex-col">
                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                                                            listing.isSold
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : listing.isActive
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {listing.isSold ? 'Satıldı' : listing.isActive ? 'Yayında' : 'Pasif'}
                                                        </span>
                                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            {listing.category}
                                                        </span>
                                                    </div>
                                                    <h2 className="text-xl font-extrabold text-gray-900 truncate">{listing.title}</h2>
                                                    <p className="text-sm text-gray-500 mt-1">{formatDate(listing.createdAt)} tarihinde oluşturuldu</p>
                                                </div>
                                                <p className="text-2xl font-black text-blue-600 shrink-0">{currency(listing.price)}</p>
                                            </div>

                                            <p className="text-sm text-gray-600 leading-6 mb-4 min-h-[3rem]">
                                                {listing.description?.trim() || 'Bu ilan için henüz açıklama eklenmemiş.'}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-2 mb-6 text-xs font-semibold text-gray-500">
                                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{listing.condition}</span>
                                                {(listing.soldToUserName || listing.acceptedBuyerName) && (
                                                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        {listing.isSold ? `Alıcı: ${listing.soldToUserName}` : `Anlaşılan öğrenci: ${listing.acceptedBuyerName}`}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openEditModal(listing);
                                                    }}
                                                    disabled={isBusy}
                                                    className="inline-flex min-w-[110px] items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-semibold disabled:opacity-60"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    Düzenle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleToggleSold(listing);
                                                    }}
                                                    disabled={isBusy}
                                                    className="inline-flex min-w-[110px] items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-semibold disabled:opacity-60"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {savingListingId === listing.id ? 'Kaydediliyor...' : listing.isSold ? 'Satışı Aç' : 'Satıldı'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleDelete(listing);
                                                    }}
                                                    disabled={isBusy}
                                                    className="inline-flex min-w-[96px] items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-60"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {deletingListingId === listing.id ? 'Siliniyor...' : 'Sil'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {editingListing && editForm && (
                <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">İlanı Düzenle</h3>
                                <p className="text-sm text-gray-500 mt-1">Kapak görseli sabit kalır; metin, fiyat ve yayın durumu güncellenir.</p>
                            </div>
                            <button type="button" onClick={closeEditModal} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                                Kapat
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="listing-title">Başlık</label>
                                    <input id="listing-title" name="title" value={editForm.title} onChange={handleEditChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="listing-price">Fiyat</label>
                                    <input id="listing-price" name="price" type="number" min="0" step="0.01" value={editForm.price} onChange={handleEditChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="listing-condition">Durum</label>
                                    <select id="listing-condition" name="condition" value={editForm.condition} onChange={handleEditChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" required>
                                        <option value="">Durum seç</option>
                                        {CONDITIONS.map((item) => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="listing-category">Kategori</label>
                                    <select id="listing-category" name="category" value={editForm.category} onChange={handleEditChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" required>
                                        <option value="">Kategori seç</option>
                                        {CATEGORIES.map((item) => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="listing-description">Açıklama</label>
                                    <textarea id="listing-description" name="description" rows={5} value={editForm.description} onChange={handleEditChange} className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none" />
                                </div>
                            </div>

                            <label className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 cursor-pointer">
                                <input type="checkbox" name="isActive" checked={editForm.isActive} onChange={handleEditChange} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-semibold text-gray-700">İlan yayında kalsın</span>
                            </label>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                <button type="button" onClick={closeEditModal} className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                                    Vazgeç
                                </button>
                                <button type="submit" disabled={savingListingId === editingListing.id} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60">
                                    {savingListingId === editingListing.id ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {saleModalListing && (
                <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">Alışverişi Tamamla</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    İlanı satıldı yapmak için önce mesajlar ekranında bir anlaşma isteğini kabul etmelisin.
                                </p>
                            </div>
                            <button type="button" onClick={closeSaleModal} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                                Kapat
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                                <p className="text-sm font-semibold text-blue-900">{saleModalListing.title}</p>
                                <p className="text-xs text-blue-700 mt-1">Satış tamamlandığında yalnızca seçilen alıcı değerlendirme bırakabilir ve ilan sadece iki tarafa açık kalır.</p>
                            </div>

                            {isLoadingSaleCandidates ? (
                                <div className="text-center text-gray-500 py-10">Anlaşma kayıtları yükleniyor...</div>
                            ) : saleCandidates.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Kabul edilmiş anlaşma isteği olan kullanıcılar</p>
                                    {saleCandidates.map((candidate) => (
                                        <button
                                            key={candidate.userId}
                                            type="button"
                                            onClick={() => setSelectedBuyerId(candidate.userId)}
                                            className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                                                selectedBuyerId === candidate.userId
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{candidate.name}</p>
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{candidate.lastMessage}</p>
                                                </div>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {new Date(candidate.lastMessageAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
                                    <p className="text-sm font-semibold text-gray-700">Henüz kabul edilmiş anlaşma isteği yok</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Önce mesajlar ekranında bir öğrencinin anlaşma isteğini kabul etmelisin. Sonra bu öğrenci burada alıcı olarak seçilebilir.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                <button type="button" onClick={closeSaleModal} className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSoldStatus}
                                    disabled={isLoadingSaleCandidates || savingListingId === saleModalListing.id || saleCandidates.length === 0 || !selectedBuyerId}
                                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-60"
                                >
                                    {savingListingId === saleModalListing.id ? 'Kaydediliyor...' : 'Satışı Tamamla'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MyListings;
