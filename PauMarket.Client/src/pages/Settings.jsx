import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, Save, Settings as SettingsIcon, UserRound } from 'lucide-react';
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

const Settings = () => {
    const { isAuthenticated } = useAuth();
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        grade: '',
    });
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [preferredCondition, setPreferredCondition] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);
    const [preferencesSuccess, setPreferencesSuccess] = useState(null);

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

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setIsSavingProfile(true);
        setError(null);
        setProfileSuccess(null);

        try {
            const updatedProfile = await userService.updateProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                department: profileForm.department.trim() || null,
                grade: profileForm.grade ? Number(profileForm.grade) : null,
            });

            setProfileForm((prev) => ({
                ...prev,
                firstName: updatedProfile.firstName || '',
                lastName: updatedProfile.lastName || '',
                department: updatedProfile.department || '',
                grade: updatedProfile.grade ? String(updatedProfile.grade) : '',
            }));
            setProfileSuccess('Hesap bilgilerin güncellendi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Profil bilgileri kaydedilemedi.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePreferencesSubmit = async (event) => {
        event.preventDefault();
        setIsSavingPreferences(true);
        setError(null);
        setPreferencesSuccess(null);

        try {
            await userService.updatePreferences({
                preferredCategories: selectedCategories.length > 0 ? selectedCategories.join(',') : null,
                preferredCondition: preferredCondition || null,
            });

            setPreferencesSuccess('Öneri tercihlerin başarıyla kaydedildi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Ayarlar kaydedilemedi.');
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

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <SettingsIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Ayarlar</h1>
                        <p className="text-gray-500">Hesap bilgilerini ve öneri tercihlerini tek yerden yönet.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center text-gray-500 py-20">Ayarlar yükleniyor...</div>
                ) : (
                    <div className="space-y-8">
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <UserRound className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-lg font-bold text-gray-900">Hesap Bilgileri</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="firstName">Ad</label>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            value={profileForm.firstName}
                                            onChange={handleProfileChange}
                                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="lastName">Soyad</label>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            value={profileForm.lastName}
                                            onChange={handleProfileChange}
                                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">Üniversite E-postası</label>
                                        <input
                                            id="email"
                                            name="email"
                                            value={profileForm.email}
                                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500"
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="department">Bölüm</label>
                                        <div className="relative">
                                            <Building2 className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                            <input
                                                id="department"
                                                name="department"
                                                value={profileForm.department}
                                                onChange={handleProfileChange}
                                                placeholder="Örn: Bilgisayar Mühendisliği"
                                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:max-w-[12rem]">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="grade">Sınıf</label>
                                        <div className="relative">
                                            <GraduationCap className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                            <select
                                                id="grade"
                                                name="grade"
                                                value={profileForm.grade}
                                                onChange={handleProfileChange}
                                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                            >
                                                <option value="">Seçilmedi</option>
                                                {[1, 2, 3, 4].map((value) => (
                                                    <option key={value} value={value}>{value}. sınıf</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold rounded-2xl transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingProfile ? 'Kaydediliyor...' : 'Hesap Bilgilerini Kaydet'}
                                </button>
                            </div>
                        </form>

                        <div className="h-px bg-gray-100" />

                        <form onSubmit={handlePreferencesSubmit} className="space-y-8">
                            <section>
                                <h2 className="text-lg font-bold text-gray-900 mb-3">Kategori Tercihleri</h2>
                                <div className="flex flex-wrap gap-3">
                                    {CATEGORY_OPTIONS.map((category) => {
                                        const selected = selectedCategories.includes(category);
                                        return (
                                            <button
                                                key={category}
                                                type="button"
                                                onClick={() => toggleCategory(category)}
                                                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-colors ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'}`}
                                            >
                                                {category}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-gray-900 mb-3">Durum Tercihi</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {CONDITION_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setPreferredCondition(option)}
                                            className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-colors ${preferredCondition === option ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {error && <p className="text-sm text-red-600">{error}</p>}
                            {preferencesSuccess && <p className="text-sm text-green-600">{preferencesSuccess}</p>}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSavingPreferences}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-2xl transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingPreferences ? 'Kaydediliyor...' : 'Öneri Tercihlerini Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
