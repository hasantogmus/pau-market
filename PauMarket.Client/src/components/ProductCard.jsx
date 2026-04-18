import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ImageOff, MapPin } from 'lucide-react';

/* ─── Condition badge config ─────────────────────────────────── */
const CONDITION_CONFIG = {
    'Sıfır':          { label: 'Sıfır',           bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'New':            { label: 'Sıfır',           bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'Az Kullanılmış': { label: 'Az Kullanılmış',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
    'LikeNew':        { label: 'Az Kullanılmış',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
    'Çok Kullanılmış':{ label: 'Çok Kullanılmış', bg: 'bg-orange-100',  text: 'text-orange-700'  },
    'Used':           { label: 'Çok Kullanılmış', bg: 'bg-orange-100',  text: 'text-orange-700'  },
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
            className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-shadow duration-300 flex flex-col ${compact ? 'w-52 flex-shrink-0' : 'w-full'}`}
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
                <div className="p-4 flex flex-col flex-grow">

                    {/* Title */}
                    <h3
                        className="font-semibold text-gray-900 text-sm leading-snug truncate group-hover:text-blue-600 transition-colors"
                        title={item.title}
                    >
                        {item.title}
                    </h3>

                    {/* Price */}
                    <p className="mt-1.5 text-lg font-extrabold text-blue-600 leading-none">
                        {formatPrice(item.price)}
                    </p>

                    {/* Condition badge */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                        </span>
                    </div>

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
