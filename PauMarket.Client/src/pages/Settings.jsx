import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Settings as SettingsIcon } from 'lucide-react';
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
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [preferredCondition, setPreferredCondition] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                const profile = await userService.getCurrentUser();
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await userService.updatePreferences({
                preferredCategories: selectedCategories.length > 0 ? selectedCategories.join(',') : null,
                preferredCondition: preferredCondition || null,
            });

            setSuccess('Tercihlerin başarıyla kaydedildi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Ayarlar kaydedilemedi.');
        } finally {
            setIsSaving(false);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <SettingsIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Ayarlar</h1>
                        <p className="text-gray-500">Soğuk başlangıç önerileri için tercihlerini güncelle.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center text-gray-500 py-20">Ayarlar yükleniyor...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
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
                        {success && <p className="text-sm text-green-600">{success}</p>}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-2xl transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Settings;
