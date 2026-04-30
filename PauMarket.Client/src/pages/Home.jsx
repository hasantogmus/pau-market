import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Search, ChevronRight, ChevronLeft, ImageOff,
    ListFilter, X, SlidersHorizontal,
    Laptop, BookOpen, Shirt, Home as HomeIcon,
    Gamepad2, Coffee, Bike, Sparkles,
    ShieldCheck, MessageCircle, MapPin, BrainCircuit, PlusCircle,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import listingService from '../services/listingService';
import favoriteService from '../services/favoriteService';
import ProductCard from '../components/ProductCard';
import { getBackendSearchTerms, getSearchScore } from '../utils/search';

/* ═══════════════════ MOCK DATA ═══════════════════════════════ */
const MOCK_LISTINGS = [
    { id: 'm1', title: 'Apple MacBook Air M2 - 13"', price: 28500, condition: 'Az Kullanılmış', categoryName: 'Elektronik', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', location: 'Honaz' },
    { id: 'm2', title: 'Calculus - James Stewart (8. Baskı)', price: 180, condition: 'Çok Kullanılmış', categoryName: 'Ders Kitabı', imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', location: 'Kampüs' },
    { id: 'm3', title: 'Nike Air Force 1 – 42 Numara', price: 750, condition: 'Sıfır', categoryName: 'Giyim', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', location: 'Çamlaraltı' },
    { id: 'm4', title: 'Nespresso Kahve Makinesi', price: 1200, condition: 'Az Kullanılmış', categoryName: 'Ev Eşyası', imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80', location: 'Kampüs' },
    { id: 'm5', title: 'Sony WH-1000XM5 Kulaklık', price: 4200, condition: 'Sıfır', categoryName: 'Elektronik', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', location: 'Pamukkale' },
    { id: 'm6', title: 'Veri Yapıları ve Algoritmalar Notları', price: 50, condition: 'Çok Kullanılmış', categoryName: 'Not / Özet', imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80', location: 'Kampüs' },
    { id: 'm7', title: 'Logitech MX Master 3 Mouse', price: 1850, condition: 'Az Kullanılmış', categoryName: 'Elektronik', imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80', location: 'Honaz' },
    { id: 'm8', title: 'Trek Marlin 5 Dağ Bisikleti', price: 6500, condition: 'Az Kullanılmış', categoryName: 'Hobi', imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80', location: 'Pamukkale' },
    { id: 'm9', title: 'iPad Pro 11" + Apple Pencil', price: 19000, condition: 'Sıfır', categoryName: 'Elektronik', imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80', location: 'Kampüs' },
    { id: 'm10', title: 'Thermos Stanley 1L', price: 450, condition: 'Sıfır', categoryName: 'Ev Eşyası', imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80', location: 'Çamlaraltı' },
    { id: 'm11', title: 'Fizik Olimpiyat Soruları Kitabı', price: 90, condition: 'Az Kullanılmış', categoryName: 'Ders Kitabı', imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80', location: 'Kampüs' },
    { id: 'm12', title: 'PlayStation 5 + 2 Kol', price: 22000, condition: 'Az Kullanılmış', categoryName: 'Hobi', imageUrl: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400&q=80', location: 'Pamukkale' },
];

/* ═══════════════════ CATEGORIES ═══════════════════════════════ */
const CATEGORIES = [
    { label: 'Tümü',        icon: <ListFilter className="w-4 h-4" /> },
    { label: 'Elektronik',  icon: <Laptop      className="w-4 h-4" /> },
    { label: 'Ders Kitabı', icon: <BookOpen    className="w-4 h-4" /> },
    { label: 'Giyim',       icon: <Shirt       className="w-4 h-4" /> },
    { label: 'Ev Eşyası',   icon: <HomeIcon    className="w-4 h-4" /> },
    { label: 'Not / Özet',  icon: <Coffee      className="w-4 h-4" /> },
    { label: 'Hobi',        icon: <Gamepad2    className="w-4 h-4" /> },
    { label: 'Spor',        icon: <Bike        className="w-4 h-4" /> },
];

const CONDITIONS = ['Sıfır', 'Az Kullanılmış', 'Çok Kullanılmış'];
const SEARCH_PAGE_SIZE = 200;
const MAX_SEARCH_CATALOG_PAGES = 10;

const mergeListingsById = (...listingGroups) =>
    Array.from(
        new Map(
            listingGroups
                .flat()
                .filter(Boolean)
                .map((listing) => [listing.id, listing])
        ).values()
    );

const loadListingPages = async (params = {}, maxPages = MAX_SEARCH_CATALOG_PAGES) => {
    const firstPage = await listingService.getListingsPage({
        ...params,
        pageNumber: 1,
        pageSize: SEARCH_PAGE_SIZE,
    });

    const totalPages = Math.min(Number(firstPage.totalPages || 1), maxPages);
    if (totalPages <= 1) {
        return firstPage.items || [];
    }

    const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            listingService.getListingsPage({
                ...params,
                pageNumber: index + 2,
                pageSize: SEARCH_PAGE_SIZE,
            }).then((page) => page.items || [])
        )
    );

    return mergeListingsById(firstPage.items || [], ...restPages);
};

const loadListingCandidates = async (searchTerm) => {
    if (!searchTerm) {
        return listingService.getAllListings({ pageSize: 50 });
    }

    const catalogPromise = loadListingPages({}, MAX_SEARCH_CATALOG_PAGES);
    const backendSearchPromises = getBackendSearchTerms(searchTerm).map((term) =>
        loadListingPages({ searchTerm: term }, 3).catch(() => [])
    );

    const [catalogListings, ...backendMatches] = await Promise.all([
        catalogPromise,
        ...backendSearchPromises,
    ]);

    return mergeListingsById(catalogListings, ...backendMatches);
};

/* ═══════════════════ SKELETON ══════════════════════════════════ */
const SkeletonCard = () => (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.65)] ring-1 ring-slate-950/[0.03]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent)' }}
            />
            <div className="absolute bottom-3 left-3 h-6 w-24 rounded-full bg-white/70" />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
            <div className="relative h-4 w-4/5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className="absolute inset-0" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.15 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent)' }} />
            </div>
            <div className="relative h-6 w-2/5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className="absolute inset-0" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.3 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent)' }} />
            </div>
            <div className="flex gap-2 pt-1">
                <div className="h-6 w-20 rounded-full bg-slate-100" />
                <div className="h-6 w-14 rounded-full bg-blue-50" />
            </div>
        </div>
    </div>
);

/* ═══════════════════ FILTER SIDEBAR (shared) ═══════════════════ */
const FilterPanel = ({ selected, onSelect, conditions, onCondChange, priceMin, setPriceMin, priceMax, setPriceMax, onApply }) => (
    <div className="space-y-8">
        {/* Categories */}
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kategori</p>
            <ul className="space-y-0.5">
                {CATEGORIES.map((cat) => (
                    <li key={cat.label}>
                        <button
                            onClick={() => onSelect(cat.label)}
                            className={`group w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-all ${selected === cat.label
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/60'
                                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                        >
                            <span className={selected === cat.label ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}>{cat.icon}</span>
                            {cat.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>

        {/* Condition */}
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Durum</p>
            <div className="space-y-2">
                {CONDITIONS.map((cond) => (
                    <label key={cond} className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={conditions.includes(cond)}
                            onChange={() => onCondChange(cond)}
                            className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                        />
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-950">{cond}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* Price range */}
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fiyat Aralığı (₺)</p>
            <div className="flex gap-2 items-center">
                <input
                    type="number"
                    placeholder="En az"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
                <span className="text-gray-400 text-sm font-bold">–</span>
                <input
                    type="number"
                    placeholder="En çok"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
            </div>
            <button
                onClick={onApply}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-blue-300/60"
            >
                Uygula
            </button>
        </div>
    </div>
);

/* ═══════════════════ HERO ══════════════════════════════════════ */
const formatPrice = (p) =>
    p != null
        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p)
        : '—';

const TRUST_ITEMS = [
    { label: 'Sadece PAÜ öğrencileri', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: 'Güvenli mesajlaşma', icon: <MessageCircle className="w-4 h-4" /> },
    { label: 'Kampüs içi alışveriş', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Akıllı öneriler', icon: <BrainCircuit className="w-4 h-4" /> },
];

const Hero = ({ listings, isLoading, searchTerm, compact = false }) => {
    const navigate = useNavigate();
    const [heroSearch, setHeroSearch] = useState(searchTerm);
    const c1 = listings[0] ?? MOCK_LISTINGS[0];
    const c2 = listings[1] ?? MOCK_LISTINGS[1];
    const c3 = listings[2] ?? MOCK_LISTINGS[2];

    useEffect(() => {
        setHeroSearch(searchTerm);
    }, [searchTerm]);

    const handleHeroSearch = (event) => {
        event.preventDefault();
        const query = heroSearch.trim();
        navigate(query ? `/listings?q=${encodeURIComponent(query)}` : '/listings');
    };

    const handleHeroClear = () => {
        setHeroSearch('');
        if (searchTerm) {
            navigate('/listings', { replace: true });
        }
    };

    if (compact) {
        return (
            <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-[0_24px_70px_-48px_rgba(37,99,235,0.75)] ring-1 ring-blue-100/70 sm:p-8">
                <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute -bottom-24 left-12 h-44 w-44 rounded-full bg-indigo-200/35 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
                            <Sparkles className="h-3.5 w-3.5" />
                            Kampüs vitrini
                        </span>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            İlanları keşfet
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                            PAÜ öğrencilerinin eklediği onaylı ilanları kategori, durum ve fiyat aralığına göre filtrele.
                        </p>
                    </div>
                    <form onSubmit={handleHeroSearch} className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={heroSearch}
                            onChange={(event) => setHeroSearch(event.target.value)}
                            placeholder="Ders kitabı, kulaklık, bisiklet..."
                            className="w-full rounded-2xl border border-blue-100 bg-white px-12 py-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                        {heroSearch && (
                            <button
                                type="button"
                                onClick={handleHeroClear}
                                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Aramayı temizle"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </form>
                </div>
            </section>
        );
    }

    return (
        <section className="relative w-full overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl pointer-events-none" />
            <div className="absolute left-10 top-24 hidden h-28 w-28 rounded-full border border-blue-200/70 md:block" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col md:flex-row items-center gap-12">
                {/* Text */}
                <motion.div
                    className="w-full md:w-1/2 relative z-10 text-center md:text-left"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm border border-indigo-200">
                        <ShieldCheck className="w-4 h-4" />
                        PAÜ doğrulamalı kampüs pazarı
                    </span>
                    <h1 className="text-5xl lg:text-[4rem] font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
                        PAÜ Öğrencileri İçin <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            Güvenli İkinci El Pazarı
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed font-medium">
                        Okul e-postanla doğrulan, ilanları keşfet, favorile, mesajlaş ve kampüs içinde güvenle alışveriş yap.
                    </p>
                    <div className="mb-8 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                        {TRUST_ITEMS.map((item) => (
                            <span
                                key={item.label}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur"
                            >
                                <span className="text-blue-600">{item.icon}</span>
                                {item.label}
                            </span>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
                        <Link to="/listings" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            İlanları Keşfet <ChevronRight className="w-5 h-5" />
                        </Link>
                        <Link to="/listings/new" className="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl border border-blue-100 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            <PlusCircle className="w-5 h-5" />
                            İlan Ekle
                        </Link>
                        <form onSubmit={handleHeroSearch} className="relative w-full sm:w-auto">
                            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={heroSearch}
                                onChange={(event) => setHeroSearch(event.target.value)}
                                placeholder="İlan ara..."
                                className="w-full sm:w-64 pl-12 pr-12 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-700 shadow-sm"
                            />
                            {heroSearch && (
                                <button
                                    type="button"
                                    onClick={handleHeroClear}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                    aria-label="Aramayı temizle"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </form>
                    </div>
                </motion.div>

                {/* Floating cards */}
                <div className="w-full md:w-1/2 relative h-80 md:h-[450px] flex items-center justify-center">
                    {isLoading ? (
                        <div className="text-blue-400/50 animate-pulse font-bold text-xl tracking-widest">Yükleniyor…</div>
                    ) : listings.length === 0 ? (
                        <div className="relative z-20 w-full max-w-md rounded-[2rem] border border-blue-100 bg-white/85 p-6 text-left shadow-2xl shadow-blue-100/60 backdrop-blur">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-950">Güvenli vitrin hazırlanıyor</h3>
                            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                                İlanlar onaylandıkça burada görünecek. Öğrenciler arası alışverişte önce mesajlaş, sonra kampüste yüz yüze kontrol ederek teslim al.
                            </p>
                            <div className="mt-5 grid gap-2 text-sm font-bold text-slate-700">
                                <span className="rounded-2xl bg-blue-50 px-4 py-3">Okul e-postasıyla doğrulama</span>
                                <span className="rounded-2xl bg-indigo-50 px-4 py-3">Yönetici onaylı ilanlar</span>
                                <span className="rounded-2xl bg-slate-50 px-4 py-3">Satıcı puanı ve değerlendirme akışı</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Back card */}
                            <motion.div
                                className="absolute z-10 bg-white p-4 rounded-2xl shadow-xl w-48 sm:w-64 -rotate-12 -translate-x-12 sm:-translate-x-24 border border-gray-100"
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                            >
                                <div className="w-full h-32 bg-indigo-50 rounded-lg mb-3 overflow-hidden flex items-center justify-center border border-indigo-100/50">
                                    {c1.imageUrl ? <img src={c1.imageUrl} alt={c1.title} className="w-full h-full object-cover" /> : <ImageOff className="w-8 h-8 text-indigo-200" />}
                                </div>
                                <div className="text-xs font-semibold text-gray-700 truncate mb-1">{c1.title}</div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-900">{formatPrice(c1.price)}</span>
                                    <Heart className="w-4 h-4 text-gray-300" />
                                </div>
                            </motion.div>

                            {/* Main card */}
                            <motion.div
                                className="absolute z-30 bg-white p-5 rounded-2xl shadow-2xl shadow-indigo-200/50 w-56 sm:w-72 border border-gray-100"
                                animate={{ y: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
                            >
                                <div className="absolute top-4 right-4 bg-white/80 p-1.5 rounded-full shadow-sm backdrop-blur-sm z-20">
                                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                </div>
                                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                                    {c2.imageUrl ? <img src={c2.imageUrl} alt={c2.title} className="w-full h-full object-cover" /> : <span className="font-bold text-indigo-400 text-center px-4">{c2.title}</span>}
                                </div>
                                <h3 className="font-bold text-gray-900 truncate">{c2.title}</h3>
                                <p className="text-xs text-gray-500 mt-1 mb-4 truncate">{c2.description ?? 'Harika bir ürün.'}</p>
                                <div className="flex justify-between items-end">
                                    <span className="font-extrabold text-xl text-blue-600">{formatPrice(c2.price)}</span>
                                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md truncate max-w-[80px]">{c2.categoryName ?? 'Diğer'}</span>
                                </div>
                            </motion.div>

                            {/* Small right card */}
                            <motion.div
                                className="absolute z-20 bg-white p-3 rounded-2xl shadow-lg w-40 sm:w-56 rotate-[8deg] translate-x-16 sm:translate-x-32 translate-y-12 border border-gray-100"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1 }}
                            >
                                <div className="w-full h-24 bg-rose-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                                    {c3.imageUrl ? <img src={c3.imageUrl} alt={c3.title} className="w-full h-full object-cover" /> : <span className="text-rose-300 font-bold text-xs text-center px-2">{c3.title}</span>}
                                </div>
                                <div className="truncate text-xs text-gray-700 font-medium mb-1">{c3.title}</div>
                                <span className="font-bold text-gray-900 block">{formatPrice(c3.price)}</span>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

/* ═══════════════════ HOME PAGE ══════════════════════════════════ */
const Home = () => {
    /* ── State ── */
    const [listings, setListings] = useState([]);
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [recIndex, setRecIndex] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = (searchParams.get('q') || '').trim();
    const isListingsRoute = location.pathname === '/listings';
    const isLoggedIn = Boolean(localStorage.getItem('token'));

    // Filters
    const [activeCategory, setActiveCategory] = useState('Tümü');
    const [activeConditions, setActiveConditions] = useState([]);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [appliedMin, setAppliedMin] = useState('');
    const [appliedMax, setAppliedMax] = useState('');

    // Mobile filter drawer
    const [drawerOpen, setDrawerOpen] = useState(false);

    /* ── Fetch ── */
    useEffect(() => {
        let isMounted = true;

        const loadListings = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const candidateListings = await loadListingCandidates(searchTerm);

                if (!isMounted) return;

                setListings(candidateListings);
            } catch (err) {
                if (!isMounted) return;

                console.error("İlanlar alınamadı:", err);
                setError('İlanlar yüklenirken sunucu ile iletişim kurulamadı.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        const loadRecommendations = async () => {
            try {
                const recData = await listingService.getRecommendations();
                if (isMounted) {
                    setAiRecommendations(Array.isArray(recData) ? recData : []);
                }
            } catch (err) {
                console.error("Öneriler alınamadı:", err);
            }
        };

        const loadFavorites = async () => {
            try {
                const favorites = await favoriteService.getFavorites();
                if (isMounted) {
                    setFavoriteIds(favorites.map((item) => item.id));
                }
            } catch (err) {
                console.error("Favoriler alınamadı:", err);
            }
        };

        loadListings();

        if (isLoggedIn) {
            loadRecommendations();
            loadFavorites();
        }

        return () => {
            isMounted = false;
        };
    }, [searchTerm, isLoggedIn]);

    const handleToggleFavorite = async (listingId) => {
        if (!localStorage.getItem('token')) {
            navigate('/login');
            return;
        }

        const wasFavorite = favoriteIds.includes(listingId);

        setFavoriteIds((prev) =>
            wasFavorite ? prev.filter((id) => id !== listingId) : [...prev, listingId]
        );

        try {
            if (wasFavorite) {
                await favoriteService.removeFavorite(listingId);
            } else {
                await favoriteService.addFavorite(listingId);
            }

            try {
                const recData = await listingService.getRecommendations();
                setAiRecommendations(Array.isArray(recData) ? recData : []);
                setRecIndex(0);
            } catch (recommendationErr) {
                console.error("Öneriler yenilenemedi:", recommendationErr);
            }
        } catch (err) {
            console.error("Favori işlemi başarısız:", err);

            setFavoriteIds((prev) =>
                wasFavorite ? [...prev, listingId] : prev.filter((id) => id !== listingId)
            );
        }
    };

    /* ── Derived data ── */
    const allListings = listings;

    const filtered = allListings
        .map((item) => ({
            item,
            searchScore: getSearchScore(item, searchTerm),
        }))
        .filter(({ item, searchScore }) => {
        const searchMatch = !searchTerm || searchScore > 0;
        const catMatch = activeCategory === 'Tümü' || item.categoryName === activeCategory;
        const condMatch = activeConditions.length === 0 || activeConditions.includes(item.condition);
        const minMatch = appliedMin === '' || (item.price ?? 0) >= Number(appliedMin);
        const maxMatch = appliedMax === '' || (item.price ?? 0) <= Number(appliedMax);
        return searchMatch && catMatch && condMatch && minMatch && maxMatch;
    })
        .sort((a, b) => (searchTerm ? b.searchScore - a.searchScore : 0))
        .map(({ item }) => item);

    const toggleCondition = (cond) =>
        setActiveConditions((prev) =>
            prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
        );

    const handleApplyPrice = () => {
        setAppliedMin(priceMin);
        setAppliedMax(priceMax);
    };

    const handleClearSearch = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('q');
        setSearchParams(nextParams, { replace: true });
    };

    const activeFilterCount = [
        activeCategory !== 'Tümü',
        ...activeConditions,
        appliedMin,
        appliedMax,
    ].filter(Boolean).length;

    const filterProps = {
        selected: activeCategory,
        onSelect: setActiveCategory,
        conditions: activeConditions,
        onCondChange: toggleCondition,
        priceMin, setPriceMin,
        priceMax, setPriceMax,
        onApply: handleApplyPrice,
    };

    /* ─────────────────────────────────────────────────────────── */
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">

            {/* ── Hero ── */}
            <div className={isListingsRoute ? 'max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8' : ''}>
                <Hero
                    listings={allListings}
                    isLoading={isLoading}
                    searchTerm={searchTerm}
                    compact={isListingsRoute}
                />
            </div>

            {/* ── Quick category pills ── */}
            <section className="relative overflow-hidden border-b border-slate-200/70 bg-white py-7">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                <div className="absolute -right-12 top-6 h-28 w-28 rounded-full bg-blue-100/60 blur-3xl" />
                <div className="relative mx-auto flex max-w-7xl flex-wrap justify-center gap-2.5 px-4 sm:px-6 lg:px-8">
                    {CATEGORIES.map((cat) => (
                        <motion.button
                            key={cat.label}
                            whileHover={{ y: -3, scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveCategory(cat.label)}
                            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black shadow-sm transition-all ${activeCategory === cat.label
                                ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200/80'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-white hover:text-blue-700'
                                }`}
                        >
                            {cat.icon}{cat.label}
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* ── Personalized recommendations ── */}
            <section className="relative overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 py-10 text-white">
                <div className="absolute left-8 top-0 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                                <Sparkles className="w-5 h-5 text-blue-100" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-white">Sana Özel Öneriler</h2>
                                <p className="text-xs font-semibold text-blue-100/75">Favorilerine göre kampüs vitrini</p>
                            </div>
                            <span className="ml-1 hidden rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100 ring-1 ring-white/15 sm:inline-flex">Akıllı Öneri</span>
                        </div>
                        {aiRecommendations.length > 5 && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setRecIndex(Math.max(0, recIndex - 5))}
                                    disabled={recIndex === 0}
                                    className={`rounded-full border p-2 transition-colors ${recIndex > 0 ? 'border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/20' : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'}`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setRecIndex(Math.min(aiRecommendations.length, recIndex + 5))}
                                    disabled={recIndex + 5 >= aiRecommendations.length}
                                    className={`rounded-full border p-2 transition-colors ${recIndex + 5 < aiRecommendations.length ? 'border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/20' : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'}`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {aiRecommendations.length > 0 ? (
                            aiRecommendations.slice(recIndex, recIndex + 5).map((item, i) => (
                                <div key={item.id}>
                                    <ProductCard
                                        item={item}
                                        index={i}
                                        compact
                                        isFavorite={favoriteIds.includes(item.id)}
                                        onToggleFavorite={handleToggleFavorite}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-1 rounded-[1.75rem] border border-dashed border-white/20 bg-white/10 px-5 py-8 text-center shadow-2xl shadow-blue-950/20 backdrop-blur sm:col-span-2 md:col-span-3 lg:col-span-5">
                                <p className="text-sm font-black text-white">
                                    {isLoggedIn ? 'Öneriler henüz hazır değil' : 'Kişisel öneriler için giriş yap'}
                                </p>
                                <p className="mt-1 text-sm text-blue-100/75">
                                    {isLoggedIn
                                        ? 'Birkaç ilan görüntüleyip favoriledikten sonra bu alan kişiselleşecek.'
                                        : 'Okul e-postanla giriş yaptıktan sonra favorilerin ve görüntülemelerin önerileri şekillendirir.'}
                                </p>
                                {!isLoggedIn && (
                                    <Link
                                        to="/login"
                                        className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-blue-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                                    >
                                        Giriş Yap
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Main content: Sidebar + Grid ── */}
            <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

                {/* Mobile filter toggle */}
                <div className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/85 p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)] backdrop-blur md:hidden">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900">{searchTerm ? 'Arama Sonuçları' : 'En Yeni İlanlar'}</h2>
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                                aria-label="Aramayı temizle"
                            >
                                <span className="truncate">“{searchTerm}”</span>
                                <X className="h-3.5 w-3.5 shrink-0" />
                            </button>
                        )}
                    </div>
                    <button
                        id="mobile-filter-btn"
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-white"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtrele
                        {activeFilterCount > 0 && (
                            <span className="ml-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex gap-8">

                    {/* ── Desktop Sidebar ── */}
                    <aside className="hidden md:block w-64 flex-shrink-0">
                        <div className="sticky top-20 rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/[0.03] backdrop-blur">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                        <ListFilter className="w-5 h-5" />
                                    </span>
                                    <h2 className="text-base font-black text-slate-950">Filtrele</h2>
                                </div>
                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </div>
                            <FilterPanel {...filterProps} />
                        </div>
                    </aside>

                    {/* ── Right column ── */}
                    <div className="flex-grow min-w-0">

                        {/* Header row */}
                        <div className="mb-6 hidden items-center justify-between rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/[0.03] backdrop-blur md:flex">
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-2xl font-black text-slate-950">
                                        {searchTerm ? 'Arama Sonuçları' : 'En Yeni İlanlar'}
                                    </h2>
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="inline-flex max-w-md items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                                            aria-label="Aramayı temizle"
                                        >
                                            <span className="truncate">“{searchTerm}”</span>
                                            <X className="h-4 w-4 shrink-0" />
                                        </button>
                                    )}
                                </div>
                                {!isLoading && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {filtered.length} ilan bulundu
                                        {searchTerm && ' · Türkçe karakter ve küçük yazım hataları dikkate alındı'}
                                    </p>
                                )}
                            </div>
                            <Link to="/listings" className="group flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800">
                                Tümünü Gör <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {/* Grid */}
                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : error ? (
                            <div className="rounded-[1.75rem] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600 shadow-sm">
                                {error}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-blue-200 bg-white/85 px-6 py-20 text-center shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)] backdrop-blur">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-500 ring-1 ring-blue-100">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="mb-1 text-lg font-black text-slate-900">Sonuç bulunamadı</h3>
                                <p className="text-sm font-medium text-slate-500">Farklı filtreler deneyebilirsin.</p>
                                <button
                                    onClick={() => {
                                        handleClearSearch();
                                        setActiveCategory('Tümü');
                                        setActiveConditions([]);
                                        setAppliedMin('');
                                        setAppliedMax('');
                                        setPriceMin('');
                                        setPriceMax('');
                                    }}
                                    className="mt-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200/70 transition-all hover:-translate-y-0.5 hover:shadow-blue-300/70"
                                >
                                    Arama ve Filtreleri Temizle
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6"
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                            >
                                {filtered.map((item, i) => (
                                    <ProductCard
                                        key={item.id}
                                        item={item}
                                        index={i}
                                        isFavorite={favoriteIds.includes(item.id)}
                                        onToggleFavorite={handleToggleFavorite}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════ MOBILE FILTER DRAWER ══════ */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Drawer */}
                        <motion.div
                            key="drawer"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl"
                        >
                            {/* Drawer header */}
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                        <ListFilter className="w-5 h-5" />
                                    </span>
                                    <h3 className="font-black text-slate-950">Filtrele</h3>
                                </div>
                                <button onClick={() => setDrawerOpen(false)} className="rounded-full p-1.5 transition-colors hover:bg-slate-100">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-grow overflow-y-auto px-5 py-6">
                                <FilterPanel {...filterProps} />
                            </div>

                            {/* Footer CTA */}
                            <div className="border-t border-slate-100 px-5 py-4">
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-black text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5"
                                >
                                    Uygula ({filtered.length} ilan)
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Home;
