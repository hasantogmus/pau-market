import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck, AlertCircle, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';

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
            title="Okul E-Postanı Doğrula"
            subtitle="Hesabını aktifleştirmek için PAÜ okul e-posta adresine gönderilen 6 haneli kodu gir. SMTP tanımlı değilse kod backend loglarında görünecektir."
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 shadow-inner">
                        <MailCheck className="w-8 h-8" />
                    </div>
                </div>

                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-2">
                    E-Posta Doğrulama
                </h2>
                <p className="text-center text-sm text-gray-500 mb-6 font-medium">
                    Kodunu girdikten sonra hesabın aktif olacak ve giriş yapabileceksin.
                </p>

                {info && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 shadow-sm"
                    >
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800 font-medium">{info}</p>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm"
                    >
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 font-medium leading-relaxed">{error}</p>
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 shadow-sm"
                    >
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-800 font-medium">{success}</p>
                    </motion.div>
                )}

                <form className="space-y-6" onSubmit={handleVerify}>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                            Üniversite E-Postası
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting || isResending}
                            placeholder="ornek@posta.pau.edu.tr"
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="token">
                            6 Haneli Doğrulama Kodu
                        </label>
                        <input
                            type="text"
                            id="token"
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={isSubmitting}
                            placeholder="123456"
                            inputMode="numeric"
                            maxLength={6}
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed font-mono tracking-[0.4em] text-center"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 px-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Doğrulanıyor...
                            </>
                        ) : (
                            'E-Postayı Doğrula'
                        )}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full mt-4 py-3.5 px-4 border border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-gray-700 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Yeni Kod Gönderiliyor...
                        </>
                    ) : (
                        <>
                            <RotateCcw className="w-4 h-4" />
                            Kodu Tekrar Gönder
                        </>
                    )}
                </button>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Doğrulamayı tamamladın mı?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
                        Giriş ekranına dön
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default VerifyEmail;
