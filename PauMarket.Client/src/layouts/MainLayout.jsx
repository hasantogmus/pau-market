import React from 'react';
import Navbar from '../components/Navbar';

const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">

            {/* ─── Navbar ────────────────────────────────────────────── */}
            <Navbar />

            {/* ─── Ana İçerik ──────────────────────────────────────────── */}
            <main className="flex-grow w-full">
                {children}
            </main>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} PAÜ Market. Tüm hakları saklıdır.</p>
                    <p className="mt-1">Pamukkale Üniversitesi öğrencileri için sevgiyle geliştirildi.</p>
                </div>
            </footer>

        </div>
    );
};

export default MainLayout;
