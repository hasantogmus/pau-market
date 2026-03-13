import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, SkipForward, Lock } from 'lucide-react';
import userService from '../services/userService';

// -------------------------------------------------------------------
// Seçenek Verileri
// -------------------------------------------------------------------
const CATEGORY_OPTIONS = [
    { label: 'Elektronik',        emoji: '💻' },
    { label: 'Ders Kitabı',       emoji: '📚' },
    { label: 'Ev Eşyası',         emoji: '🏠' },
    { label: 'Giyim',             emoji: '👕' },
    { label: 'Hobi / Oyun',       emoji: '🎮' },
    { label: 'Not / Özet',        emoji: '📝' },
    { label: 'Spor',              emoji: '⚽' },
    { label: 'Müzik Aletleri',    emoji: '🎸' },
    { label: 'Bisiklet / Ulaşım', emoji: '🚴' },
    { label: 'Diğer',             emoji: '📦' },
];

const MAX_CATEGORIES = 3;

const CONDITION_OPTIONS = [
    {
        label: 'Sadece Yeni / Yeni Gibi',
        description: 'En iyi koşuldaki ürünler',
        emoji: '✨',
        value: 'Yeni',
    },
    {
        label: 'Az Kullanılmış',
        description: 'Hafif kullanım izleri kabul',
        emoji: '👍',
        value: 'Az Kullanılmış',
    },
    {
        label: 'Fark Etmez / Bütçe Dostu',
        description: 'Uygun fiyat önceliğim',
        emoji: '💰',
        value: 'Fark Etmez',
    },
];

// -------------------------------------------------------------------
// Kategori Butonu (2-kolon grid içinde kullanılacak)
// -------------------------------------------------------------------
const CategoryButton = ({ label, emoji, selected, disabled, onClick }) => {
    const base = 'flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 font-semibold text-sm text-left transition-all';
    const selectedStyle = 'bg-blue-600 border-blue-600 text-white shadow-md';
    const disabledStyle = 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-50';
    const defaultStyle = 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer';

    return (
        <motion.button
            type="button"
            onClick={disabled ? undefined : onClick}
            className={`${base} ${selected ? selectedStyle : disabled ? disabledStyle : defaultStyle}`}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            layout
        >
            <span className="text-xl shrink-0">{emoji}</span>
            <span className="flex-1 leading-tight">{label}</span>
            {selected && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="shrink-0"
                >
                    <CheckCircle2 className="w-4 h-4" />
                </motion.span>
            )}
        </motion.button>
    );
};

// -------------------------------------------------------------------
// Condition Card Bileşeni (Tekli Seçim)
// -------------------------------------------------------------------
const ConditionCard = ({ option, selected, onClick }) => (
    <motion.button
        type="button"
        onClick={onClick}
        className={`
            w-full text-left p-4 rounded-2xl border-2 flex items-center gap-4 transition-all
            ${selected
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
            }
        `}
        whileTap={{ scale: 0.98 }}
    >
        <span className="text-3xl shrink-0">{option.emoji}</span>
        <div>
            <p className={`font-bold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>{option.label}</p>
            <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
        </div>
        {selected && (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto shrink-0 text-blue-600"
            >
                <CheckCircle2 className="w-6 h-6" />
            </motion.div>
        )}
    </motion.button>
);

// -------------------------------------------------------------------
// Ana Onboarding Sayfası
// -------------------------------------------------------------------
const Onboarding = () => {
    const navigate = useNavigate();
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: kategoriler, 2: durum

    const toggleCategory = (label) => {
        setSelectedCategories(prev => {
            if (prev.includes(label)) {
                // Seçimi kaldır
                return prev.filter(c => c !== label);
            }
            // Maksimum sayıya ulaşıldıysa ekleme
            if (prev.length >= MAX_CATEGORIES) return prev;
            return [...prev, label];
        });
    };

    const handleSkip = () => navigate('/');

    const handleSaveAndExplore = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await userService.updatePreferences({
                preferredCategories: selectedCategories.join(',') || null,
                preferredCondition: selectedCondition || null,
            });
            navigate('/');
        } catch (err) {
            const msg = err.response?.data?.error || 'Tercihler kaydedilirken bir hata oluştu.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const canProceedToStep2 = selectedCategories.length > 0;
    const canSave = selectedCondition !== null;

    // ------- Step Variants -------
    const slideVariants = {
        enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit:  (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    };
    const [direction, setDirection] = useState(1);

    const goToStep2 = () => {
        setDirection(1);
        setStep(2);
    };
    const goToStep1 = () => {
        setDirection(-1);
        setStep(1);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex flex-col items-center justify-center px-4 py-12">

            {/* Sağ üst - Atla */}
            <div className="fixed top-5 right-5 z-50">
                <button
                    onClick={handleSkip}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <SkipForward className="w-4 h-4" />
                    Şimdilik Atla
                </button>
            </div>

            {/* İlerleme Göstergesi */}
            <div className="flex items-center gap-2 mb-8 select-none">
                {[1, 2].map(s => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-10 bg-blue-600' : s < step ? 'w-5 bg-blue-300' : 'w-5 bg-gray-200'}`} />
                ))}
            </div>

            {/* Kart */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-xl overflow-hidden">

                {/* Başlık */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4"
                    >
                        <Sparkles className="w-7 h-7 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-extrabold tracking-tight">PauMarket'e Hoş Geldin!</h1>
                    <p className="mt-2 text-blue-100 text-sm font-medium leading-relaxed">
                        Sana en uygun ilanları gösterebilmemiz için seni biraz tanıyalım.
                    </p>
                </div>

                {/* Adım İçeriği */}
                <div className="p-8">
                    <AnimatePresence mode="wait" custom={direction}>
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.28, ease: 'easeInOut' }}
                            >
                                {/* Step 1: Kategoriler */}
                                <h2 className="text-lg font-bold text-gray-900 mb-1">En çok hangi kategorilerle ilgileniyorsun? 🛍️</h2>

                                {/* Seçim sayısı göstergesi */}
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-gray-500 font-medium">
                                        En fazla <strong className="text-blue-600">{MAX_CATEGORIES}</strong> kategori seçebilirsin.
                                    </p>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                                        selectedCategories.length === MAX_CATEGORIES
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {selectedCategories.length} / {MAX_CATEGORIES}
                                    </span>
                                </div>

                                {/* 2-Kolon Grid Kutusu */}
                                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {CATEGORY_OPTIONS.map(opt => {
                                            const isSelected = selectedCategories.includes(opt.label);
                                            const isDisabled = !isSelected && selectedCategories.length >= MAX_CATEGORIES;
                                            return (
                                                <CategoryButton
                                                    key={opt.label}
                                                    label={opt.label}
                                                    emoji={opt.emoji}
                                                    selected={isSelected}
                                                    disabled={isDisabled}
                                                    onClick={() => toggleCategory(opt.label)}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Limit dolduğunda ipucu mesajı */}
                                    <AnimatePresence>
                                        {selectedCategories.length === MAX_CATEGORIES && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="mt-3 text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center"
                                            >
                                                🎯 Harika! En fazla {MAX_CATEGORIES} kategori seçildi. Değiştirmek için bir taneni kaldır.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={goToStep2}
                                        disabled={!canProceedToStep2}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                                    >
                                        Devam Et <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.28, ease: 'easeInOut' }}
                            >
                                {/* Step 2: Ürün Durumu */}
                                <h2 className="text-lg font-bold text-gray-900 mb-1">İkinci elde tercihin nedir? 🔍</h2>
                                <p className="text-sm text-gray-500 mb-6 font-medium">Tek bir seçenek seçebilirsin.</p>

                                <div className="space-y-3">
                                    {CONDITION_OPTIONS.map(opt => (
                                        <ConditionCard
                                            key={opt.value}
                                            option={opt}
                                            selected={selectedCondition === opt.value}
                                            onClick={() => setSelectedCondition(opt.value)}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl font-medium">{error}</p>
                                )}

                                <div className="mt-8 flex justify-between items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={goToStep1}
                                        className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                                    >
                                        ← Geri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAndExplore}
                                        disabled={!canSave || isLoading}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                Kaydet ve Keşfetmeye Başla ✨
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Alt not */}
            <p className="mt-6 text-xs text-gray-400 font-medium text-center">
                Bu tercihler sonradan profil sayfandan değiştirilebilir.
            </p>
        </div>
    );
};

export default Onboarding;
