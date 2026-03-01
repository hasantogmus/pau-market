import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn, UserPlus, ShoppingBag } from 'lucide-react';

const MainLayout = ({ children }) => {
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
                        <nav className="flex space-x-2 md:space-x-4">
                            <Link
                                to="/listings"
                                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                            >
                                <Home className="w-5 h-5" />
                                <span className="hidden sm:inline">İlanlar</span>
                            </Link>

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
                        </nav>

                    </div>
                </div>
            </header>

            {/* ─── Ana İçerik ──────────────────────────────────────────── */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
