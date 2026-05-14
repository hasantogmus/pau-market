import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';

const labelClass = 'mb-2 block text-sm font-black text-slate-700';
const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-12 py-4 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60';
const fieldIconClass = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600';

const ForgotPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initialEmail = typeof location.state?.email === 'string' ? location.state.email : '';

    const [email, setEmail] = useState(initialEmail);
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState('request');
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalTime, setTotalTime] = useState(600);
    const [info, setInfo] = useState(null);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0) return undefined;

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
        const totalSeconds = Math.max(totalTime, 1);
        return Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));
    }, [timeLeft, totalTime]);

    const handleRequestReset = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setInfo(null);
        setIsRequesting(true);

        try {
            const result = await authService.requestPasswordReset(email);
            const expiresInSeconds = result.expiresInSeconds || 600;
            setStep('reset');
            setTotalTime(expiresInSeconds);
            setTimeLeft(expiresInSeconds);
            setInfo(result.message);
        } catch (err) {
            setError(
                err.response?.data?.error
                || err.response?.data?.message
                || 'Şifre sıfırlama kodu gönderilirken bir hata oluştu.'
            );
        } finally {
            setIsRequesting(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 8) {
            setError('Yeni şifre en az 8 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Yeni şifreler aynı olmalıdır.');
            return;
        }

        setIsResetting(true);

        try {
            const result = await authService.resetPassword(email, token, newPassword);
            setSuccess(result.message);
            setToken('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeLeft(0);

            navigate('/login', {
                replace: true,
                state: {
                    passwordResetMessage: result.message
                }
            });
        } catch (err) {
            setError(
                err.response?.data?.error
                || err.response?.data?.message
                || 'Şifre güncellenirken bir hata oluştu. Kodu kontrol edip tekrar deneyin.'
            );
        } finally {
            setIsResetting(false);
        }
    };

    const canRequestAgain = step === 'reset' && timeLeft === 0;

    return (
        <AuthSplitLayout
            title="Hesabını güvenle geri al."
            subtitle="Okul e-postana gelen süreli kodla yeni şifreni oluştur; hesap bilgilerin kimseyle paylaşılmaz."
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <div className="mb-7 flex justify-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-cyan-100 to-slate-100 text-[#0f766e] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_18px_40px_rgba(15,118,110,.18)]">
                        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-300 shadow-lg" />
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                </div>

                <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-cyan-700">
                    Güvenli şifre sıfırlama
                </p>
                <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-950">
                    Şifreni yenile
                </h2>
                <p className="mx-auto mt-3 mb-7 max-w-sm text-center text-sm font-medium leading-6 text-slate-500">
                    Kod sadece doğrulanmış okul e-postana gönderilir ve süre dolunca otomatik geçersiz olur.
                </p>

                {info && (
                    <Notice type="info" icon={<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />}>
                        {info}
                    </Notice>
                )}

                {success && (
                    <Notice type="success" icon={<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}>
                        {success}
                    </Notice>
                )}

                {error && (
                    <Notice type="error" icon={<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}>
                        {error}
                    </Notice>
                )}

                <form className="space-y-6" onSubmit={handleRequestReset}>
                    <div>
                        <label className={labelClass} htmlFor="reset-email">
                            Üniversite E-Postası
                        </label>
                        <div className="group relative">
                            <Mail className={fieldIconClass} />
                            <input
                                type="email"
                                id="reset-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isRequesting || isResetting || (step === 'reset' && timeLeft > 0)}
                                placeholder="Okul e-posta adresin"
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    {(step === 'request' || canRequestAgain) && (
                        <button
                            type="submit"
                            disabled={isRequesting}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0e7490] to-[#164e63] px-4 py-4 font-black text-white shadow-[0_18px_36px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(14,116,144,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                            {isRequesting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Kod gönderiliyor...
                                </>
                            ) : (
                                canRequestAgain ? 'Yeni kod gönder' : 'Şifre sıfırlama kodu gönder'
                            )}
                        </button>
                    )}
                </form>

                {step === 'reset' && (
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-7"
                    >
                        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                        <Clock3 className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Kodun geçerlilik süresi</p>
                                        <p className="text-xs font-semibold text-slate-500">Süre dolarsa yeni kod isteyebilirsin.</p>
                                    </div>
                                </div>
                                <span className="rounded-2xl bg-slate-950 px-4 py-2 font-mono text-lg font-black tracking-wider text-blue-100">
                                    {formattedTimeLeft}
                                </span>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                    animate={{ width: `${timerProgress}%` }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            <div>
                                <label className={labelClass} htmlFor="reset-token">
                                    6 Haneli Kod
                                </label>
                                <div className="group relative">
                                    <KeyRound className={fieldIconClass} />
                                    <input
                                        type="text"
                                        id="reset-token"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        disabled={isResetting || timeLeft === 0}
                                        placeholder="6 haneli kod"
                                        inputMode="numeric"
                                        className={inputClass}
                                        required
                                    />
                                </div>
                            </div>

                            <PasswordInput
                                id="new-password"
                                label="Yeni Şifre"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isResetting || timeLeft === 0}
                            />

                            <PasswordInput
                                id="confirm-password"
                                label="Yeni Şifre Tekrar"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isResetting || timeLeft === 0}
                            />

                            <button
                                type="submit"
                                disabled={isResetting || timeLeft === 0}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.24)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_22px_46px_rgba(15,23,42,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                {isResetting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Şifre güncelleniyor...
                                    </>
                                ) : (
                                    'Yeni şifreyi kaydet'
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}

                <div className="mt-8 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 text-center text-sm font-semibold text-slate-500">
                    Şifreni hatırladın mı?{' '}
                    <Link to="/login" className="font-black text-[#0f766e] transition-colors hover:text-[#115e59]">
                        Giriş yap
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

const Notice = ({ type, icon, children }) => {
    const style = {
        info: 'border-cyan-200 bg-cyan-50/90 text-cyan-900',
        success: 'border-emerald-200 bg-emerald-50/90 text-emerald-800',
        error: 'border-red-200 bg-red-50/90 text-red-700'
    }[type];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${style}`}
        >
            {icon}
            <p className="text-sm font-bold leading-relaxed">{children}</p>
        </motion.div>
    );
};

const PasswordInput = ({ id, label, value, onChange, disabled }) => (
    <div>
        <label className={labelClass} htmlFor={id}>
            {label}
        </label>
        <div className="group relative">
            <LockKeyhole className={fieldIconClass} />
            <input
                type="password"
                id={id}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder="En az 8 karakter"
                className={inputClass}
                required
                minLength={8}
            />
        </div>
    </div>
);

export default ForgotPassword;
