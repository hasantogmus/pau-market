import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ImageOff, MapPin } from 'lucide-react';

/* ─── Condition badge config ─────────────────────────────────── */
const CONDITION_CONFIG = {
    'Sıfır':          { label: 'Sıfır',           bg: 'bg-slate-100', text: 'text-slate-700' },
    'New':            { label: 'Sıfır',           bg: 'bg-slate-100', text: 'text-slate-700' },
    'Az Kullanılmış': { label: 'Az Kullanılmış',  bg: 'bg-slate-100', text: 'text-slate-600' },
    'LikeNew':        { label: 'Az Kullanılmış',  bg: 'bg-slate-100', text: 'text-slate-600' },
    'Çok Kullanılmış':{ label: 'Çok Kullanılmış', bg: 'bg-slate-100', text: 'text-slate-500' },
    'Used':           { label: 'Çok Kullanılmış', bg: 'bg-slate-100', text: 'text-slate-500' },
};

const getConditionBadge = (condition) =>
    CONDITION_CONFIG[condition] ?? { label: condition ?? 'Diğer', bg: 'bg-gray-100', text: 'text-gray-600' };

/* ─── Price formatter ────────────────────────────────────────── */
const formatPrice = (price) => {
    if (price == null) return '—';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(price);
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
            delay: i * 0.08,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
        },
    }),
};

const ProductCard = ({ item, index = 0, compact = false, isFavorite = false, onToggleFavorite }) => {
    const [likedFallback, setLikedFallback] = useState(false);
    const liked = onToggleFavorite ? isFavorite : likedFallback;
    const badge = getConditionBadge(item.condition);

    return (
        <motion.div
            custom={index}
            variants={CARD_VARIANTS}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`group relative bg-white rounded-2xl overflow-hidden border border-slate-100/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-slate-200/80 transition-all duration-400 flex flex-col ${compact ? 'w-52 flex-shrink-0' : 'w-full'}`}
        >
            <Link to={`/listings/${item.id}`} className="flex flex-col flex-grow" tabIndex={0}>

                {/* ── Image area ── */}
                <div className={`relative overflow-hidden bg-gray-50 ${compact ? 'h-40' : 'aspect-[4/3]'}`}>
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <ImageOff className="w-10 h-10 mb-1" />
                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Görsel Yok</span>
                        </div>
                    )}

                    {/* Category chip (bottom-left) */}
                    {item.categoryName && (
                        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                            <span className="inline-block px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-600 uppercase tracking-wider rounded-md shadow-sm">
                                {item.categoryName}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Details ── */}
                <div className="p-4 sm:p-5 flex flex-col flex-grow">

                    {/* Title */}
                    <h3
                        className="font-medium text-slate-800 text-[15px] leading-snug truncate group-hover:text-blue-600 transition-colors"
                        title={item.title}
                    >
                        {item.title}
                    </h3>

                    {/* Price */}
                    <p className="mt-2 text-lg font-bold text-slate-900 tracking-tight leading-none">
                        {formatPrice(item.price)}
                    </p>

                    {/* Condition badge */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-medium tracking-wide uppercase ${badge.bg} ${badge.text}`}>
                            {badge.label}
                        </span>
                    </div>

                    {item.recommendationReason && (
                        <p className="mt-2.5 text-[11px] leading-relaxed font-medium text-slate-500 line-clamp-2">
                            {item.recommendationReason}
                        </p>
                    )}

                    {/* Location (if exists) */}
                    {item.location && (
                        <div className="mt-auto pt-3 flex items-center gap-1 text-gray-400">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="text-[11px] truncate">{item.location}</span>
                        </div>
                    )}
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
                className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm z-10 transition-colors hover:bg-white"
            >
                <Heart
                    className={`w-4 h-4 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'}`}
                />
            </button>
        </motion.div>
    );
};

export default ProductCard;
