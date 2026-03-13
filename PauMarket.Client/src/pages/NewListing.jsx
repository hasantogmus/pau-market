import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
    Laptop, BookOpen, Shirt, Sofa, Bike, Music,
    UploadCloud, X, Send, ArrowLeft, Tag, AlignLeft,
    Info, CheckCircle2, Camera, DollarSign, Package, Tablet, Watch
} from 'lucide-react';
import listingService from '../services/listingService';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────
// Sabit Veriler
// ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['Elektronik', 'Ders Kitabı', 'Ev Eşyası', 'Giyim', 'Hobi', 'Not / Özet', 'Spor', 'Müzik Aletleri', 'Diğer'];
const CONDITIONS  = ['Sıfır', 'Az Kullanılmış', 'Çok Kullanılmış'];
const MAX_IMAGES  = 10;

// ─────────────────────────────────────────────────────────────────
// Yan Dekorasyon Paneli için İkon Grupları
// ─────────────────────────────────────────────────────────────────
const LEFT_ICONS = [
    { Icon: Laptop,   color: 'text-blue-400',   size: 96,  y: 40,   dur: 5.5 },
    { Icon: BookOpen, color: 'text-indigo-300',  size: 72,  y: 55,   dur: 7 },
    { Icon: Shirt,    color: 'text-blue-300',    size: 88,  y: 88,   dur: 6 },
    { Icon: Watch,    color: 'text-indigo-400',  size: 64,  y: 68,   dur: 8 },
    { Icon: Package,  color: 'text-blue-200',    size: 80,  y: 80,   dur: 6.5 },
    { Icon: Music,    color: 'text-indigo-300',  size: 60,  y: 50,   dur: 7.5 },
];

const RIGHT_ICONS = [
    { Icon: Sofa,    color: 'text-indigo-400', size: 96, y: 36, dur: 6 },
    { Icon: Bike,    color: 'text-blue-300',   size: 80, y: 60, dur: 7 },
    { Icon: Tablet,  color: 'text-blue-400',   size: 72, y: 70, dur: 5.5 },
    { Icon: Camera,  color: 'text-indigo-300', size: 88, y: 48, dur: 8 },
    { Icon: Package, color: 'text-blue-200',   size: 64, y: 84, dur: 6.5 },
    { Icon: Music,   color: 'text-indigo-200', size: 60, y: 55, dur: 7.5 },
];

// Tek bir "yüzen" ikon
const FloatingIcon = ({ Icon, color, size, y, dur, delay }) => (
    <motion.div
        animate={{ y: [0, -y * 0.28, 0] }}
        transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
        <Icon
            width={size}
            height={size}
            strokeWidth={1.2}
            className={`${color} opacity-50`}
        />
    </motion.div>
);

// Sol dekorasyon kolonu
const LeftDecoration = () => (
    <div className="hidden xl:flex flex-col items-center justify-around h-full py-16 px-8 pointer-events-none select-none">
        {LEFT_ICONS.map(({ Icon, color, size, y, dur }, i) => (
            <FloatingIcon key={i} Icon={Icon} color={color} size={size} y={y} dur={dur} delay={i * 0.7} />
        ))}
    </div>
);

// Sağ dekorasyon kolonu
const RightDecoration = () => (
    <div className="hidden xl:flex flex-col items-center justify-around h-full py-16 px-8 pointer-events-none select-none">
        {RIGHT_ICONS.map(({ Icon, color, size, y, dur }, i) => (
            <FloatingIcon key={i} Icon={Icon} color={color} size={size} y={y} dur={dur} delay={i * 0.5 + 0.3} />
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Dropzone Bileşeni (multi-image, max 10)
// ─────────────────────────────────────────────────────────────────
const ImageDropzone = ({ images, onFilesAdded, onRemove, onLimitExceeded }) => {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = useCallback((rawFiles) => {
        const valid = Array.from(rawFiles).filter(f => f.type.startsWith('image/'));
        const remaining = MAX_IMAGES - images.length;
        if (valid.length > remaining) {
            onLimitExceeded();
            onFilesAdded(valid.slice(0, remaining));
        } else {
            onFilesAdded(valid);
        }
    }, [images.length, onFilesAdded, onLimitExceeded]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleInputChange = (e) => { processFiles(e.target.files); e.target.value = ''; };

    const canAddMore = images.length < MAX_IMAGES;

    return (
        <div className="space-y-4">
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleInputChange} className="hidden" />

            {canAddMore && (
                <motion.div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                    className={`
                        w-full rounded-2xl border-2 border-dashed transition-all duration-200
                        flex flex-col items-center justify-center py-10 px-6 gap-3 cursor-pointer
                        ${isDragging
                            ? 'border-blue-500 bg-blue-50/90 scale-[1.01]'
                            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
                        }
                    `}
                >
                    <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <UploadCloud className={`w-10 h-10 transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center pointer-events-none">
                        <p className="text-gray-700 font-semibold text-sm">
                            {isDragging ? 'Bırak!' : 'Görselleri buraya sürükleyin veya'}
                        </p>
                        {!isDragging && (
                            <p className="text-xs text-gray-400 mt-1">
                                PNG, JPG, WEBP — en fazla {MAX_IMAGES} fotoğraf &bull; {images.length}/{MAX_IMAGES} yüklendi
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                        Görsel Seç
                    </button>
                </motion.div>
            )}

            {images.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    <AnimatePresence>
                        {images.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm group"
                            >
                                <img src={item.preview} alt={`Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => onRemove(idx)}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                {idx === 0 && (
                                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                        Ana
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {images.length < MAX_IMAGES && (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500 transition-all"
                        >
                            <UploadCloud className="w-6 h-6" />
                            <span className="text-[11px] font-semibold">Daha Fazla</span>
                        </button>
                    )}
                </motion.div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Yardımcı
// ─────────────────────────────────────────────────────────────────
const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2 gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-400" />}
            {label}
        </label>
        {children}
    </div>
);

const inputCls = `
    w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white
    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
    transition-all text-gray-800 placeholder-gray-400 text-sm font-medium shadow-sm
    disabled:opacity-60
`;

// ─────────────────────────────────────────────────────────────────
// Ana Sayfa
// ─────────────────────────────────────────────────────────────────
const NewListing = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '', condition: '' });
    const [images, setImages]     = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg]   = useState({ type: 'success', text: '' });

    if (!isAuthenticated) { navigate('/login'); return null; }

    const triggerToast = (type, text) => {
        setToastMsg({ type, text });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFilesAdded = (newFiles) => {
        const newItems = newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
        setImages(prev => [...prev, ...newItems].slice(0, MAX_IMAGES));
    };

    const handleLimitExceeded = () => {
        triggerToast('warn', `En fazla ${MAX_IMAGES} fotoğraf yükleyebilirsin. Fazla dosyalar otomatik atıldı.`);
    };

    const handleRemoveImage = (idx) => {
        setImages(prev => {
            URL.revokeObjectURL(prev[idx].preview);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await listingService.createListing({
                title:       formData.title,
                description: formData.description,
                price:       parseFloat(formData.price) || 0,
                category:    formData.category,
                condition:   formData.condition,
                imageFiles:  images.map(i => i.file),
            });
            triggerToast('success', 'Harika! İlanın yayınlandı 🚀');
            setTimeout(() => navigate('/'), 2500);
        } catch (err) {
            let msg = 'İlan yayınlanırken bir hata oluştu.';
            if (err.response?.data?.error)   msg = err.response.data.error;
            else if (err.response?.data?.message) msg = err.response.data.message;
            else if (typeof err.response?.data === 'string') msg = err.response.data;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">

            {/* Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[300px] border ${
                            toastMsg.type === 'success' ? 'border-green-200' : 'border-orange-200'
                        }`}
                    >
                        <div className={`p-2 rounded-full shrink-0 ${toastMsg.type === 'success' ? 'bg-green-100' : 'bg-orange-100'}`}>
                            <CheckCircle2 className={`w-6 h-6 ${toastMsg.type === 'success' ? 'text-green-600' : 'text-orange-500'}`} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{toastMsg.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3-Kolon Ana Yapı */}
            <div className="flex min-h-screen">

                {/* SOL Dekorasyon */}
                <div className="flex-1 flex items-stretch">
                    <LeftDecoration />
                </div>

                {/* ORTA: Form */}
                <div className="w-full max-w-2xl flex-shrink-0 px-4 sm:px-6 py-10">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-blue-600 transition-colors group mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Geri Dön
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/80 overflow-hidden"
                    >
                        {/* Başlık Bandı */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-white">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <h1 className="text-xl font-extrabold tracking-tight">Yeni İlan Ver</h1>
                            </div>
                            <p className="text-blue-100 text-sm font-medium">
                                İlanını doldur, saniyeler içinde PAÜ öğrencileriyle paylaş.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">

                            {/* Hata */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm"
                                    >
                                        <Info className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-red-700 font-medium">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* İlan Başlığı */}
                            <Field label="İlan Başlığı" icon={Tag}>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    placeholder="İlan başlığını giriniz"
                                    className={inputCls}
                                    required
                                />
                            </Field>

                            {/* Kategori + Durum */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Kategori" icon={Tag}>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        className={inputCls + ' appearance-none'}
                                        required
                                    >
                                        <option value="" disabled>Kategori seçin</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </Field>

                                <Field label="Ürün Durumu" icon={Package}>
                                    <select
                                        name="condition"
                                        value={formData.condition}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        className={inputCls + ' appearance-none'}
                                        required
                                    >
                                        <option value="" disabled>Durum seçin</option>
                                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* Fiyat */}
                            <Field label="Fiyat (₺)" icon={DollarSign}>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm select-none">₺</span>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        className={inputCls + ' pl-9'}
                                        required
                                    />
                                </div>
                            </Field>

                            {/* Açıklama */}
                            <Field label="Açıklama" icon={AlignLeft}>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    placeholder="Ürününüzün durumunu, özelliklerini ve neden sattığınızı anlatın..."
                                    rows={4}
                                    className={inputCls + ' resize-none'}
                                />
                            </Field>

                            {/* Görsel Yükleme */}
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3 gap-2">
                                    <UploadCloud className="w-4 h-4 text-gray-400" />
                                    Ürün Görselleri<span className="text-red-400 ml-0.5">*</span>
                                    <span className="ml-auto text-xs font-medium text-gray-400">{images.length}/{MAX_IMAGES}</span>
                                </label>
                                <ImageDropzone
                                    images={images}
                                    onFilesAdded={handleFilesAdded}
                                    onRemove={handleRemoveImage}
                                    onLimitExceeded={handleLimitExceeded}
                                />
                            </div>

                            {/* Gönder */}
                            <button
                                type="submit"
                                disabled={isLoading || images.length === 0}
                                className="w-full flex items-center justify-center gap-3 py-5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-extrabold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Yayınlanıyor...
                                    </>
                                ) : (
                                    <>İlanı Yayınla <Send className="w-5 h-5" /></>
                                )}
                            </button>

                            {images.length === 0 && (
                                <p className="text-center text-xs text-gray-400 font-medium -mt-3">
                                    Devam etmek için en az 1 görsel yüklemeniz gerekmektedir.
                                </p>
                            )}
                        </form>
                    </motion.div>
                </div>

                {/* SAĞ Dekorasyon */}
                <div className="flex-1 flex items-stretch">
                    <RightDecoration />
                </div>
            </div>
        </div>
    );
};

export default NewListing;
