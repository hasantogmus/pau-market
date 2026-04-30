import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, Loader2, CheckCircle2, Mail, LockKeyhole } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';
import { useAuth } from '../hooks/useAuth';

const labelClass = 'mb-2 block text-sm font-black text-slate-700';
const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-12 py-4 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60';
const fieldIconClass = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    const searchParams = new URLSearchParams(location.search);
    const justVerified = searchParams.get('verified') === 'true';
    const verificationMessage = location.state?.verificationMessage
        || 'E-posta adresin doğrulandı. Artık giriş yapabilirsin.';
    const passwordResetMessage = location.state?.passwordResetMessage;
    const redirectFromProtectedRoute = location.state?.from;
    const redirectAfterLogin = location.state?.redirectAfterLogin
        || (redirectFromProtectedRoute
            ? `${redirectFromProtectedRoute.pathname || '/'}${redirectFromProtectedRoute.search || ''}`
            : '/');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const data = await authService.login(email, password);
            if (data.token) {
                login(data.token, redirectAfterLogin);
            } else {
                setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            }
        } catch (err) {
            const responseData = err.response?.data;
            const responseCode = responseData?.code;
            const responseError = responseData?.error || responseData?.message;

            if (responseCode === 'EMAIL_NOT_VERIFIED') {
                navigate('/verify-email', {
                    state: {
                        email,
                        loginMessage: responseError
                    }
                });
                return;
            }

            setError(responseError || 'Giriş yapılırken bir hata oluştu. E-posta adresinizi ve şifrenizi kontrol edin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthSplitLayout
            title="Kampüs pazarına tekrar hoş geldin."
            subtitle="PAÜ hesabınla güvenle giriş yap, yeni ilanları yakala ve kampüs içinde hızlıca anlaş."
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <div className="mb-7 flex justify-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-cyan-100 to-amber-100 text-[#0f766e] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_18px_40px_rgba(15,118,110,.18)]">
                        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-300 shadow-lg" />
                        <LogIn className="w-8 h-8" />
                    </div>
                </div>

                <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-cyan-700">
                    Güvenli oturum
                </p>
                <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-950">
                    Hesabına giriş yap
                </h2>
                <p className="mx-auto mt-3 mb-7 max-w-sm text-center text-sm font-medium leading-6 text-slate-500">
                    Üniversite e-postan ve şifrenle PAÜ Market akışına kaldığın yerden devam et.
                </p>

                {justVerified && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm"
                    >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-sm font-bold leading-relaxed text-emerald-800">
                            {verificationMessage}
                        </p>
                    </motion.div>
                )}

                {passwordResetMessage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm"
                    >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-sm font-bold leading-relaxed text-emerald-800">
                            {passwordResetMessage}
                        </p>
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

                <form className="space-y-6" onSubmit={handleLogin}>
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
                                disabled={isLoading}
                                placeholder="ad.soyad@posta.pau.edu.tr"
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="password">
                            Şifre
                        </label>
                        <div className="group relative">
                            <LockKeyhole className={fieldIconClass} />
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="Şifreni gir"
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end">
                        <Link
                            to="/forgot-password"
                            state={{ email }}
                            className="text-sm font-black text-[#0f766e] transition-colors hover:text-[#115e59]"
                        >
                            Şifremi unuttum
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0e7490] to-[#164e63] px-4 py-4 font-black text-white shadow-[0_18px_36px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(14,116,144,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Giriş yapılıyor...
                            </>
                        ) : (
                            'Giriş yap'
                        )}
                    </button>
                </form>

                <div className="mt-8 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 text-center text-sm font-semibold text-slate-500">
                    Hesabın yok mu?{' '}
                    <Link to="/register" className="font-black text-[#0f766e] transition-colors hover:text-[#115e59]">
                        Hemen kayıt ol
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default Login;
