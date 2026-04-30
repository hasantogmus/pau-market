import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Heart, ImageOff, MapPin, ShieldCheck } from 'lucide-react';

/* ─── Condition badge config ─────────────────────────────────── */
const CONDITION_CONFIG = {
    'Sıfır':          { label: 'Sıfır',           bg: 'bg-emerald-50 ring-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'New':            { label: 'Sıfır',           bg: 'bg-emerald-50 ring-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Az Kullanılmış': { label: 'Az Kullanılmış',  bg: 'bg-amber-50 ring-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    'LikeNew':        { label: 'Az Kullanılmış',  bg: 'bg-amber-50 ring-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    'Çok Kullanılmış':{ label: 'Çok Kullanılmış', bg: 'bg-slate-100 ring-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
    'Used':           { label: 'Çok Kullanılmış', bg: 'bg-slate-100 ring-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const getConditionBadge = (condition) =>
    CONDITION_CONFIG[condition] ?? { label: condition ?? 'Diğer', bg: 'bg-gray-100 ring-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' };

/* ─── Price formatter ────────────────────────────────────────── */
const formatPrice = (price) => {
    if (price == null) return '—';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(price);
};

const formatShortDate = (value) => {
    if (!value) return null;

    return new Date(value).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
    });
};

/* ═══════════════════════════════════════════════════════════════
   PRODUCT CARD
   Props:
     item   — listing object { id, title, price, condition, categoryName, imageUrl, location }
     index  — used for stagger delay (optional)
     compact — narrow card for horizontal scroll strips
═══════════════════════════════════════════════════════════════ */
const CARD_VARIANTS = {
    hidden: { opacity: 0, y: 32 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: Math.min(i, 8) * 0.045,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
        },
    }),
};

const ProductCard = ({ item, index = 0, compact = false, isFavorite = false, onToggleFavorite }) => {
    const [likedFallback, setLikedFallback] = useState(false);
    const liked = onToggleFavorite ? isFavorite : likedFallback;
    const badge = getConditionBadge(item.condition);
    const coverImage = item.imageUrl || item.imageUrls?.[0] || null;
    const createdAt = formatShortDate(item.createdAt);
    const location = item.location || item.campusLocation || 'PAÜ Kampüsü';

    return (
        <motion.div
            custom={index}
            variants={CARD_VARIANTS}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="group relative isolate flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.65)] ring-1 ring-slate-950/[0.03] transition-all duration-300 hover:border-blue-100 hover:shadow-[0_28px_70px_-42px_rgba(37,99,235,0.65)]"
        >
            <Link to={`/listings/${item.id}`} className="flex h-full flex-col flex-grow" tabIndex={0}>

                {/* ── Image area ── */}
                <div className={`relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 ${compact ? 'h-40 sm:h-44' : 'aspect-[4/3]'}`}>
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <div className="mb-2 rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-white">
                                <ImageOff className="w-9 h-9" />
                            </div>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Görsel yok</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-white/0 opacity-70 transition-opacity duration-300 group-hover:opacity-90" />
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/30 to-transparent" />

                    {/* Category chip (bottom-left) */}
                    {item.categoryName && (
                        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                            <span className="inline-flex max-w-[9rem] items-center truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm ring-1 ring-white/70 backdrop-blur">
                                {item.categoryName}
                            </span>
                        </div>
                    )}

                    {item.isSold && (
                        <div className="absolute top-3 left-3 pointer-events-none">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/15">
                                Satıldı
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Details ── */}
                <div className="relative flex flex-grow flex-col p-4 sm:p-5">

                    {/* Title */}
                    <h3
                        className="line-clamp-2 min-h-[2.65rem] text-[15px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-blue-700"
                        title={item.title}
                    >
                        {item.title}
                    </h3>

                    {/* Price */}
                    <p className="mt-2 text-xl font-black tracking-tight text-slate-950 leading-none">
                        {formatPrice(item.price)}
                    </p>

                    {/* Condition and trust badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${badge.bg} ${badge.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                            <ShieldCheck className="w-3 h-3" />
                            PAÜ
                        </span>
                    </div>

                    {item.recommendationReason && (
                        <p className="mt-2.5 text-[11px] leading-relaxed font-medium text-slate-500 line-clamp-2">
                            {item.recommendationReason}
                        </p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-slate-400">
                        <div className="min-w-0 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate text-[11px] font-semibold">{location}</span>
                        </div>
                        {createdAt && (
                            <div className="flex shrink-0 items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                <span className="text-[11px] font-semibold">{createdAt}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* ── Heart button (outside Link to avoid nested interactive) ── */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (onToggleFavorite) {
                        onToggleFavorite(item.id);
                        return;
                    }

                    setLikedFallback((prev) => !prev);
                }}
                aria-label={liked ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 shadow-lg shadow-slate-950/10 ring-1 ring-white/70 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
            >
                <Heart
                    className={`w-4 h-4 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-slate-400 hover:text-red-400'}`}
                />
            </button>
        </motion.div>
    );
};

export default ProductCard;
