import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BadgeCheck,
    Building2,
    Camera,
    GraduationCap,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    Phone,
    Save,
    Settings as SettingsIcon,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';

const CATEGORY_OPTIONS = [
    'Elektronik',
    'Ders Kitabı',
    'Ev Eşyası',
    'Giyim',
    'Hobi',
    'Not / Özet',
    'Spor',
    'Müzik Aletleri',
    'Diğer',
];

const CONDITION_OPTIONS = ['Yeni', 'Az Kullanılmış', 'Fark Etmez'];

const getInitials = (firstName = '', lastName = '') => {
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.trim();
    return initials ? initials.toUpperCase() : 'PM';
};

const Settings = () => {
    const { isAuthenticated, updateUser } = useAuth();
    const photoInputRef = useRef(null);
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        grade: '',
        phoneNumber: '',
        bio: '',
        profilePhotoUrl: '',
        isEmailVerified: false,
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [preferredCondition, setPreferredCondition] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);
    const [preferencesSuccess, setPreferencesSuccess] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(null);
    const [photoSuccess, setPhotoSuccess] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                const profile = await userService.getCurrentUser();
                setProfileForm({
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    email: profile.email || '',
                    department: profile.department || '',
                    grade: profile.grade ? String(profile.grade) : '',
                    phoneNumber: profile.phoneNumber || '',
                    bio: profile.bio || '',
                    profilePhotoUrl: profile.profilePhotoUrl || '',
                    isEmailVerified: Boolean(profile.isEmailVerified),
                });
                setSelectedCategories(
                    profile.preferredCategories
                        ? profile.preferredCategories.split(',').map((item) => item.trim()).filter(Boolean)
                        : []
                );
                setPreferredCondition(profile.preferredCondition || '');
            } catch (err) {
                setError(err.response?.data?.error || 'Ayarlar yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isAuthenticated]);

    const clearMessages = () => {
        setError(null);
        setProfileSuccess(null);
        setPreferencesSuccess(null);
        setPasswordSuccess(null);
        setPhotoSuccess(null);
    };

    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((item) => item !== category)
                : [...prev, category]
        );
    };

    const handleProfileChange = (event) => {
        const { name, value } = event.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const syncAuthUser = (profile) => {
        const newName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        updateUser({
            ...(newName ? { name: newName } : {}),
            ...(profile.profilePhotoUrl ? { profilePhotoUrl: profile.profilePhotoUrl } : {}),
        });
    };

    const handlePhotoSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        clearMessages();
        setIsUploadingPhoto(true);

        try {
            const updatedProfile = await userService.uploadProfilePhoto(file);
            setProfileForm((prev) => ({
                ...prev,
                profilePhotoUrl: updatedProfile.profilePhotoUrl || '',
            }));
            syncAuthUser(updatedProfile);
            setPhotoSuccess('Profil fotoğrafın güncellendi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Profil fotoğrafı yüklenemedi.');
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) {
                photoInputRef.current.value = '';
            }
        }
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        clearMessages();
        setIsSavingProfile(true);

        try {
            const updatedProfile = await userService.updateProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                department: profileForm.department.trim() || null,
                grade: profileForm.grade ? Number(profileForm.grade) : null,
                phoneNumber: profileForm.phoneNumber.trim() || null,
                bio: profileForm.bio.trim() || null,
            });

            setProfileForm((prev) => ({
                ...prev,
                firstName: updatedProfile.firstName || '',
                lastName: updatedProfile.lastName || '',
                department: updatedProfile.department || '',
                grade: updatedProfile.grade ? String(updatedProfile.grade) : '',
                phoneNumber: updatedProfile.phoneNumber || '',
                bio: updatedProfile.bio || '',
                profilePhotoUrl: updatedProfile.profilePhotoUrl || prev.profilePhotoUrl,
            }));
            syncAuthUser(updatedProfile);
            setProfileSuccess('Profil ve güven bilgilerin güncellendi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Profil bilgileri kaydedilemedi.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        clearMessages();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Yeni şifre ile tekrar alanı eşleşmiyor.');
            return;
        }

        setIsSavingPassword(true);
        try {
            await userService.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordSuccess('Şifren başarıyla güncellendi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Şifre güncellenemedi.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handlePreferencesSubmit = async (event) => {
        event.preventDefault();
        clearMessages();
        setIsSavingPreferences(true);

        try {
            await userService.updatePreferences({
                preferredCategories: selectedCategories.length > 0 ? selectedCategories.join(',') : null,
                preferredCondition: preferredCondition || null,
            });

            setPreferencesSuccess('Öneri tercihlerin başarıyla kaydedildi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Tercihler kaydedilemedi.');
        } finally {
            setIsSavingPreferences(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Ayarlar için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Tercihlerini düzenlemek için hesabınla giriş yapman gerekiyor.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    const initials = getInitials(profileForm.firstName, profileForm.lastName);

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="relative overflow-hidden border-b border-slate-200 bg-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.13),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_34%)]" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
                                <SettingsIcon className="w-4 h-4" />
                                Hesap ve Güvenlik
                            </div>
                            <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-slate-950">
                                Güven veren profilini buradan yönet.
                            </h1>
                            <p className="mt-3 max-w-2xl text-slate-500">
                                PAÜ Market’te güven; doğrulanmış okul e-postası, gerçek profil bilgileri ve temiz iletişim akışıyla başlar.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-10 w-10 rounded-2xl bg-emerald-50 p-2 text-emerald-600" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Hesap Durumu</p>
                                    <p className="font-black text-slate-950">
                                        {profileForm.isEmailVerified ? 'Doğrulanmış PAÜ öğrencisi' : 'E-posta doğrulaması bekliyor'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
                        <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-600" />
                        Ayarlar yükleniyor...
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[340px,minmax(0,1fr)]">
                        <aside className="space-y-6">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="relative mx-auto h-32 w-32">
                                    {profileForm.profilePhotoUrl ? (
                                        <img
                                            src={profileForm.profilePhotoUrl}
                                            alt="Profil fotoğrafı"
                                            className="h-full w-full rounded-[2rem] object-cover shadow-lg"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-600 to-slate-950 text-3xl font-black text-white shadow-lg">
                                            {initials}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isUploadingPhoto}
                                        className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
                                        aria-label="Profil fotoğrafı yükle"
                                    >
                                        {isUploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                                    </button>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                </div>
                                <div className="mt-5 text-center">
                                    <h2 className="text-xl font-black text-slate-950">
                                        {profileForm.firstName} {profileForm.lastName}
                                    </h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{profileForm.email}</p>
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                        <BadgeCheck className="h-4 w-4" />
                                        {profileForm.isEmailVerified ? 'PAÜ e-postası doğrulandı' : 'Doğrulama bekliyor'}
                                    </div>
                                </div>
                                {photoSuccess && <p className="mt-4 text-center text-sm font-bold text-emerald-600">{photoSuccess}</p>}
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
                                    <Lock className="h-5 w-5 text-blue-600" />
                                    E-posta Güvenliği
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    Üniversite e-postası hesap güvenliğinin ana kanıtı olduğu için bu ekrandan doğrudan değiştirilemez. E-posta değişimi ayrı doğrulama akışı gerektirir.
                                </p>
                                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                                    {profileForm.email}
                                </div>
                            </div>
                        </aside>

                        <div className="space-y-6">
                            {error && (
                                <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                        <UserRound className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-950">Profil Bilgileri</h2>
                                        <p className="text-sm text-slate-500">Satıcı/alıcı güvenini artıran görünen bilgilerini güncelle.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <TextField label="Ad" name="firstName" value={profileForm.firstName} onChange={handleProfileChange} required />
                                    <TextField label="Soyad" name="lastName" value={profileForm.lastName} onChange={handleProfileChange} required />
                                    <TextField label="Telefon" name="phoneNumber" value={profileForm.phoneNumber} onChange={handleProfileChange} icon={Phone} inputMode="tel" />
                                    <div>
                                        <label className="mb-2 block text-sm font-black text-slate-700" htmlFor="grade">Sınıf</label>
                                        <div className="relative">
                                            <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <select
                                                id="grade"
                                                name="grade"
                                                value={profileForm.grade}
                                                onChange={handleProfileChange}
                                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                            >
                                                <option value="">Seçilmedi</option>
                                                {[1, 2, 3, 4].map((value) => (
                                                    <option key={value} value={value}>{value}. sınıf</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <TextField label="Bölüm" name="department" value={profileForm.department} onChange={handleProfileChange} icon={Building2} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-black text-slate-700" htmlFor="bio">Hakkımda</label>
                                        <textarea
                                            id="bio"
                                            name="bio"
                                            value={profileForm.bio}
                                            onChange={handleProfileChange}
                                            rows={4}
                                            maxLength={500}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        />
                                        <p className="mt-1 text-right text-xs font-semibold text-slate-400">{profileForm.bio.length}/500</p>
                                    </div>
                                </div>

                                {profileSuccess && <p className="mt-4 text-sm font-bold text-emerald-600">{profileSuccess}</p>}

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
                                    >
                                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {isSavingProfile ? 'Kaydediliyor...' : 'Profil Bilgilerini Kaydet'}
                                    </button>
                                </div>
                            </form>

                            <form onSubmit={handlePreferencesSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-950">Öneri Tercihleri</h2>
                                        <p className="text-sm text-slate-500">Cold-start aşamasında “Sana Özel Öneriler” bu alanlardan destek alır.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">İlgilendiğin kategoriler</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {CATEGORY_OPTIONS.map((category) => {
                                                const selected = selectedCategories.includes(category);
                                                return (
                                                    <button
                                                        key={category}
                                                        type="button"
                                                        onClick={() => toggleCategory(category)}
                                                        className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition-all ${
                                                            selected
                                                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700'
                                                        }`}
                                                    >
                                                        {category}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">Ürün durumu tercihi</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {CONDITION_OPTIONS.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => setPreferredCondition(option)}
                                                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
                                                        preferredCondition === option
                                                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700'
                                                    }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {preferencesSuccess && <p className="mt-4 text-sm font-bold text-emerald-600">{preferencesSuccess}</p>}

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingPreferences}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        {isSavingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {isSavingPreferences ? 'Kaydediliyor...' : 'Öneri Tercihlerini Kaydet'}
                                    </button>
                                </div>
                            </form>

                            <form onSubmit={handlePasswordSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-950">Şifre Değiştir</h2>
                                        <p className="text-sm text-slate-500">Hesabını korumak için mevcut şifreni doğrulamamız gerekiyor.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <PasswordField label="Mevcut Şifre" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} />
                                    <PasswordField label="Yeni Şifre" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} />
                                    <PasswordField label="Yeni Şifre Tekrar" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} />
                                </div>

                                {passwordSuccess && <p className="mt-4 text-sm font-bold text-emerald-600">{passwordSuccess}</p>}

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white disabled:opacity-60"
                                    >
                                        {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                        {isSavingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
};

const TextField = ({ label, name, value, onChange, icon: Icon, ...props }) => (
    <div>
        <label className="mb-2 block text-sm font-black text-slate-700" htmlFor={name}>{label}</label>
        <div className="relative">
            {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            <input
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${Icon ? 'pl-11' : ''}`}
                {...props}
            />
        </div>
    </div>
);

const PasswordField = ({ label, name, value, onChange }) => (
    <div>
        <label className="mb-2 block text-sm font-black text-slate-700" htmlFor={name}>{label}</label>
        <input
            id={name}
            name={name}
            type="password"
            value={value}
            onChange={onChange}
            minLength={8}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            required
        />
    </div>
);

export default Settings;
