import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck, AlertCircle, Loader2, RotateCcw, CheckCircle2, Clock3, KeyRound, Mail } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';

const labelClass = 'mb-2 block text-sm font-black text-slate-700';
const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-12 py-4 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60';
const fieldIconClass = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const initialEmail = useMemo(() => {
        const emailFromState = location.state?.email;
        return typeof emailFromState === 'string' ? emailFromState : '';
    }, [location.state]);

    const [email, setEmail] = useState(initialEmail);
    const [token, setToken] = useState('');
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(location.state?.registrationMessage || location.state?.loginMessage || null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const redirectAfterLogin = location.state?.fromRegistration ? '/onboarding' : '/';
    const initialExpiresInSeconds = location.state?.expiresInSeconds || 120;
    const [timeLeft, setTimeLeft] = useState(initialExpiresInSeconds);

    useEffect(() => {
        if (timeLeft <= 0) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setTimeLeft((previous) => (previous > 0 ? previous - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [timeLeft]);

    const formattedTimeLeft = useMemo(() => {
        const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
        const seconds = String(timeLeft % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }, [timeLeft]);

    const timerProgress = useMemo(() => {
        const totalSeconds = Math.max(initialExpiresInSeconds, 1);
        return Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));
    }, [initialExpiresInSeconds, timeLeft]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            const result = await authService.verifyEmail(email, token);
            setSuccess(result.message);

            navigate('/login?verified=true', {
                replace: true,
                state: {
                    verificationMessage: result.message,
                    redirectAfterLogin
                }
            });
        } catch (err) {
            setError(
                err.response?.data?.error
                || err.response?.data?.message
                || 'Doğrulama sırasında bir hata oluştu. Kodu kontrol edip tekrar deneyin.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (timeLeft > 0) {
            setError(null);
            setSuccess(null);
            setInfo(`Son gönderilen kod hâlâ geçerli. Filtreye takılmaması için ${formattedTimeLeft} sonra yeni kod isteyebilirsin.`);
            return;
        }

        if (!email) {
            setError('Yeni kod gönderebilmek için önce e-posta adresini girin.');
            return;
        }

        setError(null);
        setSuccess(null);
        setInfo(null);
        setIsResending(true);

        try {
            const result = await authService.resendVerification(email);
            setInfo(result.message);
            setTimeLeft(result.expiresInSeconds || 120);
        } catch (err) {
            setError(
                err.response?.data?.error
                || err.response?.data?.message
                || 'Yeni kod gönderilirken bir hata oluştu.'
            );
        } finally {
            setIsResending(false);
        }
    };

    return (
        <AuthSplitLayout
            title="PAÜ e-postanı doğrula."
            subtitle="Hesabını aktifleştirmek için okul e-postana gönderilen 6 haneli kodu güvenli alana gir."
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <div className="mb-7 flex justify-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-cyan-100 to-amber-100 text-[#0f766e] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_18px_40px_rgba(15,118,110,.18)]">
                        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-300 shadow-lg" />
                        <MailCheck className="h-8 w-8" />
                    </div>
                </div>

                <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-cyan-700">
                    Son güvenlik adımı
                </p>
                <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-950">
                    E-postanı doğrula
                </h2>
                <p className="mx-auto mt-3 mb-6 max-w-sm text-center text-sm font-medium leading-6 text-slate-500">
                    Kodunu girdikten sonra hesabın aktif olacak ve PAÜ Market’e giriş yapabileceksin.
                </p>

                <div className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <Clock3 className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-black text-amber-900">Kodun geçerlilik süresi</p>
                                <p className="text-xs font-semibold text-amber-700">Süre biterse yeni kod isteyebilirsin.</p>
                            </div>
                        </div>
                        <span className="rounded-2xl bg-slate-950 px-4 py-2 font-mono text-lg font-black tracking-wider text-amber-100">
                            {formattedTimeLeft}
                        </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-500"
                            animate={{ width: `${timerProgress}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                    </div>
                </div>
                {timeLeft === 0 && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
                        <p className="text-sm font-bold text-red-700">
                            Kodun süresi doldu. Yeni kod isteyebilirsin.
                        </p>
                    </div>
                )}

                {info && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/90 p-4 shadow-sm"
                    >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                        <p className="text-sm font-bold leading-relaxed text-cyan-900">{info}</p>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm"
                    >
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                        <p className="text-sm font-bold leading-relaxed text-red-700">{error}</p>
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm"
                    >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-sm font-bold leading-relaxed text-emerald-800">{success}</p>
                    </motion.div>
                )}

                <form className="space-y-6" onSubmit={handleVerify}>
                    <div>
                        <label className={labelClass} htmlFor="email">
                            Üniversite E-Postası
                        </label>
                        <div className="group relative">
                            <Mail className={fieldIconClass} />
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting || isResending}
                                placeholder="ad.soyad@posta.pau.edu.tr"
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="token">
                            6 Haneli Kod
                        </label>
                        <div className="group relative">
                            <KeyRound className={fieldIconClass} />
                            <input
                                type="text"
                                id="token"
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                disabled={isSubmitting}
                                placeholder="000000"
                                inputMode="numeric"
                                maxLength={6}
                                className={`${inputClass} font-mono text-center tracking-[0.42em]`}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0e7490] to-[#164e63] px-4 py-4 font-black text-white shadow-[0_18px_36px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(14,116,144,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Doğrulanıyor...
                            </>
                        ) : (
                            'E-postayı doğrula'
                        )}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || timeLeft > 0}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-black text-slate-700 transition-all hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Yeni kod gönderiliyor...
                        </>
                    ) : timeLeft > 0 ? (
                        <>
                            <RotateCcw className="w-4 h-4" />
                            Yeni kod için bekle: {formattedTimeLeft}
                        </>
                    ) : (
                        <>
                            <RotateCcw className="w-4 h-4" />
                            Kodu tekrar gönder
                        </>
                    )}
                </button>

                <div className="mt-8 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 text-center text-sm font-semibold text-slate-500">
                    Doğrulamayı tamamladın mı?{' '}
                    <Link to="/login" className="font-black text-[#0f766e] transition-colors hover:text-[#115e59]">
                        Giriş ekranına dön
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default VerifyEmail;
