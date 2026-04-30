import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Loader2, Mail, LockKeyhole, IdCard, UserRound } from 'lucide-react';
import AuthSplitLayout from '../layouts/AuthSplitLayout';
import authService from '../services/authService';

const labelClass = 'mb-2 block text-sm font-black text-slate-700';
const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-12 py-4 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60';
const fieldIconClass = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600';

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

        // İstemci tarafı doğrulama
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
            const result = await authService.register(firstName, lastName, studentNumber, email, password);

            navigate('/verify-email', {
                state: {
                    email,
                    registrationMessage: result.message,
                    fromRegistration: true,
                    expiresInSeconds: result.expiresInSeconds
                }
            });
        } catch (err) {
            let errorMessage = 'Kayıt işlemi sırasında bir hata oluştu. Bilgilerinizi kontrol edip tekrar deneyin.';

            if (err.response && err.response.data) {
                if (err.response.data.error) {
                    errorMessage = err.response.data.error;
                }
                else if (err.response.data.errors && typeof err.response.data.errors === 'object') {
                    const validationErrors = Object.values(err.response.data.errors).flat();
                    if (validationErrors.length > 0) {
                        errorMessage = validationErrors[0];
                    }
                } else if (err.response.data.message) {
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
            title="PAÜ öğrencilerine özel güvenli pazar."
            subtitle="Üniversite e-postasıyla hesabını oluştur, kampüs içindeki ilanlara güvenli ve hızlı şekilde katıl."
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <div className="mb-7 flex justify-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-cyan-100 to-amber-100 text-[#0f766e] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_18px_40px_rgba(15,118,110,.18)]">
                        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-300 shadow-lg" />
                        <UserPlus className="w-8 h-8" />
                    </div>
                </div>

                <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-cyan-700">
                    PAÜ üyeliği
                </p>
                <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-950">
                    Hesabını oluştur
                </h2>
                <p className="mx-auto mt-3 mb-6 max-w-sm text-center text-sm font-medium leading-6 text-slate-500">
                    Kayıt sadece PAÜ öğrenci e-postasıyla tamamlanır; doğrulama kodunu bir sonraki adımda gireceksin.
                </p>
                <div className="mb-7 grid grid-cols-3 gap-2">
                    {['PAÜ e-postası', '8 haneli numara', 'Güvenli başlangıç'].map((item) => (
                        <div key={item} className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-center text-[11px] font-black leading-tight text-cyan-800">
                            {item}
                        </div>
                    ))}
                </div>

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

                <form className="space-y-6" onSubmit={handleRegister}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="firstName">
                                Ad
                            </label>
                            <div className="group relative">
                                <UserRound className={fieldIconClass} />
                                <input
                                    type="text"
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Adın"
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="lastName">
                                Soyad
                            </label>
                            <div className="group relative">
                                <UserRound className={fieldIconClass} />
                                <input
                                    type="text"
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Soyadın"
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="studentNumber">
                            Öğrenci Numarası
                        </label>
                        <div className="group relative">
                            <IdCard className={fieldIconClass} />
                            <input
                                type="text"
                                id="studentNumber"
                                value={studentNumber}
                                onChange={(e) => setStudentNumber(e.target.value)}
                                disabled={isLoading}
                                maxLength={8}
                                placeholder="8 haneli öğrenci numaran"
                                className={`${inputClass} font-mono tracking-wider`}
                                required
                            />
                        </div>
                    </div>

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
                        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                            Sadece @posta.pau.edu.tr uzantısı kabul edilir.
                        </p>
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
                                placeholder="En az 6 karakter"
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0e7490] to-[#164e63] px-4 py-4 font-black text-white shadow-[0_18px_36px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(14,116,144,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Hesap oluşturuluyor...
                            </>
                        ) : (
                            'Hesap oluştur'
                        )}
                    </button>
                </form>

                <div className="mt-8 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 text-center text-sm font-semibold text-slate-500">
                    Zaten hesabın var mı?{' '}
                    <Link to="/login" className="font-black text-[#0f766e] transition-colors hover:text-[#115e59]">
                        Giriş yap
                    </Link>
                </div>
            </motion.div>
        </AuthSplitLayout>
    );
};

export default Register;
