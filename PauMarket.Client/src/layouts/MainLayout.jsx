import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn, UserPlus, ShoppingBag, PlusCircle, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const { user, isAuthenticated, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">

            {/* ─── Navbar ────────────────────────────────────────────── */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo Alanı */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md group-hover:bg-blue-700 transition-colors">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-xl tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                                    Paü Market
                                </span>
                            </Link>
                        </div>

                        {/* Menü Butonları */}
                        <nav className="flex items-center space-x-2 md:space-x-4">
                            <Link
                                to="/listings"
                                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                            >
                                <Home className="w-5 h-5" />
                                <span className="hidden sm:inline">İlanlar</span>
                            </Link>

                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to="/listings/new"
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ml-2"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                        <span className="hidden sm:inline">İlan Ver</span>
                                    </Link>

                                    <div className="h-6 w-px bg-gray-200 mx-2"></div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-semibold text-gray-700">
                                                {user?.name || 'Kullanıcı'}
                                            </span>
                                        </div>

                                        <button
                                            onClick={logout}
                                            className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center group relative"
                                            title="Çıkış Yap"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        <span className="hidden sm:inline">Giriş Yap</span>
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        <span className="hidden sm:inline">Kayıt Ol</span>
                                    </Link>
                                </>
                            )}
                        </nav>

                    </div>
                </div>
            </header>

            {/* ─── Ana İçerik ──────────────────────────────────────────── */}
            <main className="flex-grow w-full max-w-7xl mx-auto py-8">
                {children}
            </main>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} Paü Market. Tüm hakları saklıdır.</p>
                    <p className="mt-1">Pamukkale Üniversitesi öğrencileri için sevgiyle geliştirildi.</p>
                </div>
            </footer>

        </div>
    );
};

export default MainLayout;
