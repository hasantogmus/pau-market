import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Kayıt sonrası mı geliniyoruz?
    const justRegistered = new URLSearchParams(location.search).get('registered') === 'true';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const data = await authService.login(email, password);
            if (data.token) {
                // AuthContext login fonksiyonu: token'i kaydet, user state'i set et
                login(data.token);
                // Kayıt sonrasıysa onboarding'e, değilse ana sayfaya
                if (justRegistered) {
                    navigate('/onboarding');
                }
                // Aksi hâlde AuthContext.login kendi içinde '/'je navigate ediyor
            } else {
                setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Giriş yapılırken bir hata oluştu. E-posta adresinizi ve şifrenizi kontrol edin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthSplitLayout
            title="Tekrar Hoş Geldiniz!"
            subtitle="Üniversitemizin en büyük öğrenci pazarına yeniden katılın ve binlerce yeni ilanı keşfedin."
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 shadow-inner">
                        <LogIn className="w-8 h-8" />
                    </div>
                </div>

                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6">
                    Giriş Yap
                </h2>

                {/* Kayıt sonrası hoş geldin notu */}
                {justRegistered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 shadow-sm"
                    >
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-800 font-medium">
                            Hesabın oluşturuldu! 🎉 Lütfen e-postana gönderilen doğrulama kodunu kullanarak hesabını aktif et, ardından giriş yap.
                        </p>
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

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                            Üniversite E-Postası
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            placeholder="ornek@posta.pau.edu.tr"
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
                            Şifre
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="••••••••"
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-end">
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                            Şifremi Unuttum?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 px-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Giriş Yapılıyor...
                            </>
                        ) : (
                            'Giriş Yap'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Hesabın yok mu?{' '}
                    <Link to="/register" className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
                        Hemen kayıt ol
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default Login;
