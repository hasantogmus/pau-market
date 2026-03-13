import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        // İstemci Tarafı Doğrulama (Client-side Validation)
        if (!studentNumber || studentNumber.length !== 8) {
            setError('Geçersiz Öğrenci Numarası: Öğrenci numaranız tam olarak 8 haneli olmalıdır.');
            return;
        }

        if (!email.endsWith('@posta.pau.edu.tr')) {
            setError('Geçersiz E-Posta: Sadece @posta.pau.edu.tr uzantılı Pamukkale Üniversitesi öğrenci e-posta adresleri ile kayıt olunabilir.');
            return;
        }

        if (password.length < 6) {
            setError('Şifre çok kısa: Şifrenizin en az 6 karakterden oluşması gerekmektedir.');
            return;
        }

        setIsLoading(true);

        try {
            await authService.register(firstName, lastName, studentNumber, email, password);
            // Kayıt başarılı: Kullanıcıyı önce login'e değil, onboarding'e yönlendir.
            // Onboarding ekranında tercihlerini seçip token almadan kaydet butonu çalışmaz,
            // bu yüzden önce login yaptırıp sonra /onboarding'e yönlendiriyoruz.
            navigate('/login?registered=true');
        } catch (err) {
            // Backend'den gelen detaylı hata mesajlarını yakalama (ValidationErrors veya Message veya error key'i)
            let errorMessage = 'Kayıt işlemi sırasında bir hata oluştu. Bilgilerinizi kontrol edip tekrar deneyin.';

            if (err.response && err.response.data) {
                if (err.response.data.error) {
                    // Backend spesifik string "error" alanı dönüyorsa
                    errorMessage = err.response.data.error;
                }
                else if (err.response.data.errors && typeof err.response.data.errors === 'object') {
                    // FluentValidation hatalarını Object.values ile düzleştirip ilkini alalım
                    const validationErrors = Object.values(err.response.data.errors).flat();
                    if (validationErrors.length > 0) {
                        errorMessage = validationErrors[0]; // Sadece ilk hatayı gösterelim ki kutu taşmasın
                    }
                } else if (err.response.data.message) {
                    // Eğer Backend standart bir Message objesi döndürüyorsa
                    errorMessage = err.response.data.message;
                } else if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                }
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthSplitLayout
            title="Öğrenciler Arası Güvenli Ticaret"
            subtitle="Sadece üniversite e-postasıyla kayıt olunabilen, dolandırıcılıktan uzak, bize özel yepyeni bir pazar yeri deneyimine katılın."
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 shadow-inner">
                        <UserPlus className="w-8 h-8" />
                    </div>
                </div>

                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-2">
                    Kayıt Ol
                </h2>
                <p className="text-center text-sm text-gray-500 mb-6 font-medium">
                    Paü Market'e ücretsiz katılın ve ilan verin.
                </p>

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

                <form className="space-y-6" onSubmit={handleRegister}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="firstName">
                                Ad
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={isLoading}
                                placeholder="Örn: Hasan"
                                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="lastName">
                                Soyad
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={isLoading}
                                placeholder="Örn: Yılmaz"
                                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="studentNumber">
                            Öğrenci Numarası
                        </label>
                        <input
                            type="text"
                            id="studentNumber"
                            value={studentNumber}
                            onChange={(e) => setStudentNumber(e.target.value)}
                            disabled={isLoading}
                            placeholder="Örn: 20230001"
                            maxLength={8}
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed font-mono tracking-wider"
                            required
                        />
                    </div>

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
                        <p className="mt-2 text-xs text-blue-600/80 font-medium">
                            <span className="font-bold">Not:</span> Sadece @posta.pau.edu.tr uzantısı kabul edilir.
                        </p>
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 px-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Hesap Oluşturuluyor...
                            </>
                        ) : (
                            'Hesap Oluştur'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Zaten hesabın var mı?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
                        Giriş yap
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default Register;
