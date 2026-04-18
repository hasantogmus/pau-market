import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Search, ChevronRight, ImageOff,
    ListFilter, X, SlidersHorizontal,
    Laptop, BookOpen, Shirt, Home as HomeIcon,
    Gamepad2, Coffee, Bike, Sparkles,
    ChevronDown,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import listingService from '../services/listingService';
import favoriteService from '../services/favoriteService';
import ProductCard from '../components/ProductCard';

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

const AI_PICKS = MOCK_LISTINGS.slice(0, 4);

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

/* ═══════════════════ SKELETON ══════════════════════════════════ */
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="w-full aspect-[4/3] bg-gray-200 relative overflow-hidden">
            <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
            />
        </div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 relative overflow-hidden">
                <motion.div className="absolute inset-0" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.15 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
            </div>
            <div className="h-5 bg-gray-200 rounded w-1/3 relative overflow-hidden">
                <motion.div className="absolute inset-0" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.3 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
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
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${selected === cat.label
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                        >
                            <span className={selected === cat.label ? 'text-white' : 'text-gray-400'}>{cat.icon}</span>
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
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{cond}</span>
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
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                />
                <span className="text-gray-400 text-sm font-bold">–</span>
                <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                />
            </div>
            <button
                onClick={onApply}
                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
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

const Hero = ({ listings, isLoading }) => {
    const c1 = listings[0] ?? MOCK_LISTINGS[0];
    const c2 = listings[1] ?? MOCK_LISTINGS[1];
    const c3 = listings[2] ?? MOCK_LISTINGS[2];

    return (
        <section className="relative w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-indigo-100 overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col md:flex-row items-center gap-12">
                {/* Text */}
                <motion.div
                    className="w-full md:w-1/2 relative z-10 text-center md:text-left"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
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
                        İkinci el eşyalarını sat, ihtiyacın olanı ucuza bul. Sadece Pamukkale Üniversitesi öğrencilerine özel, güvenilir alışveriş deneyimi.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link to="/listings" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            Hemen Keşfet <ChevronRight className="w-5 h-5" />
                        </Link>
                        <div className="relative">
                            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder="İlan ara..." className="w-full sm:w-64 pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-700 shadow-sm" />
                        </div>
                    </div>
                </motion.div>

                {/* Floating cards */}
                <div className="w-full md:w-1/2 relative h-80 md:h-[450px] flex items-center justify-center">
                    {isLoading ? (
                        <div className="text-blue-400/50 animate-pulse font-bold text-xl tracking-widest">Yükleniyor…</div>
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
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

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
            try {
                const data = await listingService.getAllListings();
                if (!isMounted) return;

                setListings(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!isMounted) return;

                console.error("Öneriler veya ilanlar alınamadı:", err);
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
                console.error("Öneriler alınamadı, varsayılan kartlar gösterilecek:", err);
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

        if (localStorage.getItem('token')) {
            loadRecommendations();
            loadFavorites();
        }

        return () => {
            isMounted = false;
        };
    }, []);

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
        } catch (err) {
            console.error("Favori işlemi başarısız:", err);

            setFavoriteIds((prev) =>
                wasFavorite ? [...prev, listingId] : prev.filter((id) => id !== listingId)
            );
        }
    };

    /* ── Derived data ── */
    const allListings = listings.length > 0 ? listings : MOCK_LISTINGS;

    const filtered = allListings.filter((item) => {
        const catMatch = activeCategory === 'Tümü' || item.categoryName === activeCategory;
        const condMatch = activeConditions.length === 0 || activeConditions.includes(item.condition);
        const minMatch = appliedMin === '' || (item.price ?? 0) >= Number(appliedMin);
        const maxMatch = appliedMax === '' || (item.price ?? 0) <= Number(appliedMax);
        return catMatch && condMatch && minMatch && maxMatch;
    });

    const toggleCondition = (cond) =>
        setActiveConditions((prev) =>
            prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
        );

    const handleApplyPrice = () => {
        setAppliedMin(priceMin);
        setAppliedMax(priceMax);
    };

    const filterProps = {
        selected: activeCategory,
        onSelect: (cat) => { setActiveCategory(cat); setDrawerOpen(false); },
        conditions: activeConditions,
        onCondChange: toggleCondition,
        priceMin, setPriceMin,
        priceMax, setPriceMax,
        onApply: handleApplyPrice,
    };

    /* ─────────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <Hero listings={allListings} isLoading={isLoading} />

            {/* ── Quick category pills ── */}
            <section className="bg-white py-8 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center flex-wrap gap-2.5">
                    {CATEGORIES.map((cat) => (
                        <motion.button
                            key={cat.label}
                            whileHover={{ y: -3, scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveCategory(cat.label)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border shadow-sm transition-all ${activeCategory === cat.label
                                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-white hover:border-blue-200 hover:text-blue-600'
                                }`}
                        >
                            {cat.icon}{cat.label}
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* ── AI Picks Band ── */}
            <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 mb-5">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold text-gray-900">Sana Özel Öneriler</h2>
                        <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-full">AI Picks</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                        {(aiRecommendations.length > 0 ? aiRecommendations : AI_PICKS).map((item, i) => (
                            <div key={item.id} className="snap-start">
                                <ProductCard
                                    item={item}
                                    index={i}
                                    compact
                                    isFavorite={favoriteIds.includes(item.id)}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Main content: Sidebar + Grid ── */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

                {/* Mobile filter toggle */}
                <div className="md:hidden flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">En Yeni İlanlar</h2>
                    <button
                        id="mobile-filter-btn"
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm text-sm font-semibold hover:border-blue-300 transition-colors"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtrele
                        {(activeConditions.length > 0 || appliedMin || appliedMax || activeCategory !== 'Tümü') && (
                            <span className="ml-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {[activeCategory !== 'Tümü', ...activeConditions, appliedMin, appliedMax].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex gap-8">

                    {/* ── Desktop Sidebar ── */}
                    <aside className="hidden md:block w-64 flex-shrink-0">
                        <div className="sticky top-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ListFilter className="w-5 h-5 text-blue-600" />
                                <h2 className="text-base font-bold text-gray-900">Filtrele</h2>
                            </div>
                            <FilterPanel {...filterProps} />
                        </div>
                    </aside>

                    {/* ── Right column ── */}
                    <div className="flex-grow min-w-0">

                        {/* Header row */}
                        <div className="hidden md:flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">En Yeni İlanlar</h2>
                                {!isLoading && (
                                    <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ilan bulundu</p>
                                )}
                            </div>
                            <Link to="/listings" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-sm group transition-colors">
                                Tümünü Gör <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {/* Grid */}
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100 font-medium">
                                {error}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Search className="w-12 h-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Sonuç bulunamadı</h3>
                                <p className="text-gray-500 text-sm">Farklı filtreler deneyebilirsin.</p>
                                <button
                                    onClick={() => { setActiveCategory('Tümü'); setActiveConditions([]); setAppliedMin(''); setAppliedMax(''); setPriceMin(''); setPriceMax(''); }}
                                    className="mt-5 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Filtreleri Temizle
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
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
                            className="fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col"
                        >
                            {/* Drawer header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <ListFilter className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-gray-900">Filtrele</h3>
                                </div>
                                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-grow overflow-y-auto px-5 py-6">
                                <FilterPanel {...filterProps} />
                            </div>

                            {/* Footer CTA */}
                            <div className="px-5 py-4 border-t border-gray-100">
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
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
