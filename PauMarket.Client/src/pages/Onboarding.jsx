import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    ShoppingBag,
    SkipForward,
    Sparkles,
} from 'lucide-react';
import userService from '../services/userService';

const CATEGORY_OPTIONS = [
    { label: 'Elektronik', emoji: '💻' },
    { label: 'Ders Kitabı', emoji: '📚' },
    { label: 'Ev Eşyası', emoji: '🏠' },
    { label: 'Giyim', emoji: '👕' },
    { label: 'Hobi / Oyun', emoji: '🎮' },
    { label: 'Not / Özet', emoji: '📝' },
    { label: 'Spor', emoji: '⚽' },
    { label: 'Müzik Aletleri', emoji: '🎸' },
    { label: 'Bisiklet / Ulaşım', emoji: '🚴' },
    { label: 'Diğer', emoji: '📦' },
];

const MAX_CATEGORIES = 3;

const CONDITION_OPTIONS = [
    {
        label: 'Sadece Yeni / Yeni Gibi',
        description: 'En iyi koşuldaki ürünleri öne çıkar',
        emoji: '✨',
        value: 'Yeni',
    },
    {
        label: 'Az Kullanılmış',
        description: 'Hafif kullanım izleri benim için uygun',
        emoji: '👍',
        value: 'Az Kullanılmış',
    },
    {
        label: 'Fark Etmez / Bütçe Dostu',
        description: 'Uygun fiyat ve erişilebilirlik önceliğim',
        emoji: '💰',
        value: 'Fark Etmez',
    },
];

const CategoryButton = ({ label, emoji, selected, disabled, onClick }) => {
    const base = 'group relative flex min-h-[74px] w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition-all';
    const selectedStyle = 'border-[#0f766e] bg-[#0f766e] text-white shadow-[0_16px_30px_rgba(15,118,110,0.22)]';
    const disabledStyle = 'cursor-not-allowed border-slate-100 bg-slate-100/70 text-slate-300 opacity-60';
    const defaultStyle = 'cursor-pointer border-white/80 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/80 hover:shadow-md';

    return (
        <motion.button
            type="button"
            onClick={disabled ? undefined : onClick}
            className={`${base} ${selected ? selectedStyle : disabled ? disabledStyle : defaultStyle}`}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            aria-pressed={selected}
            layout
        >
            <span className={`shrink-0 text-2xl transition-transform ${selected ? 'scale-110' : 'group-hover:scale-110'}`}>{emoji}</span>
            <span className="flex-1 leading-tight">{label}</span>
            {selected && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="shrink-0"
                >
                    <CheckCircle2 className="h-5 w-5" />
                </motion.span>
            )}
        </motion.button>
    );
};

const ConditionCard = ({ option, selected, onClick }) => (
    <motion.button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`
            group flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-all
            ${selected
                ? 'border-[#0f766e] bg-cyan-50 shadow-[0_18px_38px_rgba(15,118,110,0.16)]'
                : 'border-slate-200 bg-white/90 shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/70 hover:shadow-md'
            }
        `}
        whileTap={{ scale: 0.98 }}
    >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl transition-transform group-hover:scale-105">
            {option.emoji}
        </span>
        <div className="min-w-0 flex-1">
            <p className={`font-black ${selected ? 'text-[#0f766e]' : 'text-slate-900'}`}>{option.label}</p>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{option.description}</p>
        </div>
        {selected && (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="shrink-0 text-[#0f766e]"
            >
                <CheckCircle2 className="h-6 w-6" />
            </motion.div>
        )}
    </motion.button>
);

const Onboarding = () => {
    const navigate = useNavigate();
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);

    const toggleCategory = (label) => {
        setSelectedCategories((prev) => {
            if (prev.includes(label)) {
                return prev.filter((category) => category !== label);
            }

            if (prev.length >= MAX_CATEGORIES) {
                return prev;
            }

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
    const selectedSummary = selectedCategories.length > 0
        ? selectedCategories.join(', ')
        : 'Henüz kategori seçilmedi';

    const slideVariants = {
        enter: (dir) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
    };

    const goToStep2 = () => {
        setDirection(1);
        setStep(2);
    };

    const goToStep1 = () => {
        setDirection(-1);
        setStep(1);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f7f0e5] px-4 py-8 text-slate-950 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(20,184,166,0.18),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.2),transparent_30%),linear-gradient(145deg,#fff7ed_0%,#f8fafc_48%,#eef7f5_100%)]" />
            <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
            <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

            <div className="fixed right-5 top-5 z-50">
                <button
                    type="button"
                    onClick={handleSkip}
                    className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-black text-slate-500 shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:text-slate-900"
                >
                    <SkipForward className="h-4 w-4" />
                    Şimdilik atla
                </button>
            </div>

            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-center gap-6">
                <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-lg backdrop-blur">
                    {[1, 2].map((stepNumber) => (
                        <div
                            key={stepNumber}
                            className={`h-2 rounded-full transition-all duration-500 ${
                                stepNumber === step
                                    ? 'w-12 bg-[#0f766e]'
                                    : stepNumber < step
                                        ? 'w-7 bg-cyan-300'
                                        : 'w-7 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>

                <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:grid-cols-[0.92fr_1.08fr]">
                    <aside className="relative hidden min-h-[670px] overflow-hidden bg-[#0b3454] p-9 text-white lg:flex lg:flex-col">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(45,212,191,0.28),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(250,204,21,0.18),transparent_28%),linear-gradient(150deg,#082f49_0%,#0f4c66_58%,#052338_100%)]" />
                        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:40px_40px]" />

                        <div className="relative z-10 flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-amber-200 shadow-2xl backdrop-blur">
                                <ShoppingBag className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="text-2xl font-black tracking-tight">PAUMarket</p>
                                <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-100/80">Kişisel akış</p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-14">
                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, ease: 'easeOut' }}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-amber-100 backdrop-blur"
                            >
                                <Sparkles className="h-4 w-4" />
                                Hoş geldin
                            </motion.div>
                            <h1 className="mt-6 max-w-sm text-5xl font-black leading-[1.02] tracking-tight">
                                Sana uygun ilanları öne çıkaralım.
                            </h1>
                            <p className="mt-5 max-w-md text-base font-medium leading-7 text-cyan-50/80">
                                Birkaç tercih seçimiyle kampüs pazarında daha isabetli öneriler, daha hızlı keşif ve daha temiz bir akış elde edersin.
                            </p>
                        </div>

                        <div className="relative z-10 mt-auto space-y-3">
                            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/80">Seçilen kategoriler</p>
                                <p className="mt-3 text-lg font-black leading-7 text-white">{selectedSummary}</p>
                            </div>
                            <div className="flex items-center gap-3 rounded-3xl border border-white/15 bg-white/10 p-5 text-sm font-semibold text-cyan-50 backdrop-blur">
                                <ShieldCheck className="h-5 w-5 shrink-0 text-amber-200" />
                                Tercihlerini sonradan profilinden değiştirebilirsin.
                            </div>
                        </div>
                    </aside>

                    <div className="p-5 sm:p-8 lg:p-10">
                        <div className="mb-7 rounded-[1.75rem] bg-gradient-to-br from-[#0b3454] to-[#0f766e] p-5 text-white shadow-xl lg:hidden">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-amber-100">
                                    <Sparkles className="h-5 w-5" />
                                </span>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight">PAUMarket’e hoş geldin!</h1>
                                    <p className="mt-1 text-sm font-medium text-cyan-50/80">Sana daha iyi ilanlar göstermek için iki kısa tercih alıyoruz.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8 flex items-center justify-between gap-4">
                            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-800">
                                Adım {step} / 2
                            </span>
                            <span className="text-sm font-black text-slate-400">
                                {step === 1 ? 'Kategori seçimi' : 'Durum tercihi'}
                            </span>
                        </div>

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
                                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                        En çok hangi kategorilerle ilgileniyorsun?
                                    </h2>
                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm font-semibold leading-6 text-slate-500">
                                            En fazla <strong className="text-[#0f766e]">{MAX_CATEGORIES}</strong> kategori seçebilirsin.
                                        </p>
                                        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                                            selectedCategories.length === MAX_CATEGORIES
                                                ? 'bg-cyan-100 text-cyan-800'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {selectedCategories.length} / {MAX_CATEGORIES}
                                        </span>
                                    </div>

                                    <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            {CATEGORY_OPTIONS.map((option) => {
                                                const isSelected = selectedCategories.includes(option.label);
                                                const isDisabled = !isSelected && selectedCategories.length >= MAX_CATEGORIES;

                                                return (
                                                    <CategoryButton
                                                        key={option.label}
                                                        label={option.label}
                                                        emoji={option.emoji}
                                                        selected={isSelected}
                                                        disabled={isDisabled}
                                                        onClick={() => toggleCategory(option.label)}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <AnimatePresence>
                                            {selectedCategories.length === MAX_CATEGORIES && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-center text-xs font-black text-cyan-700"
                                                >
                                                    En fazla {MAX_CATEGORIES} kategori seçildi. Değiştirmek için bir seçimi kaldır.
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm font-semibold text-slate-400">
                                            İlk seçim öneri akışını şekillendirir.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={goToStep2}
                                            disabled={!canProceedToStep2}
                                            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-8 py-3.5 font-black text-white shadow-[0_18px_36px_rgba(15,118,110,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#115e59] hover:shadow-[0_22px_44px_rgba(15,118,110,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                                        >
                                            Devam et
                                            <ArrowRight className="h-4 w-4" />
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
                                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                        İkinci elde ürün durumu tercihin nedir?
                                    </h2>
                                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                                        Sana uygun ilanları sıralayabilmemiz için tek bir seçenek seç.
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        {CONDITION_OPTIONS.map((option) => (
                                            <ConditionCard
                                                key={option.value}
                                                option={option}
                                                selected={selectedCondition === option.value}
                                                onClick={() => setSelectedCondition(option.value)}
                                            />
                                        ))}
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                                        >
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <button
                                            type="button"
                                            onClick={goToStep1}
                                            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Geri
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveAndExplore}
                                            disabled={!canSave || isLoading}
                                            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0e7490] to-[#164e63] px-8 py-3.5 font-black text-white shadow-[0_18px_36px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(14,116,144,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Kaydediliyor...
                                                </>
                                            ) : (
                                                <>
                                                    Kaydet ve keşfetmeye başla
                                                    <ArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Bu tercihler sonradan profil sayfandan değiştirilebilir.
                </p>
            </main>
        </div>
    );
};

export default Onboarding;
