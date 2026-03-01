import React from 'react';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">

            {/* Animasyonlu Başlık Kutusu */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-white p-10 md:p-16 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-50 max-w-3xl w-full"
            >
                <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold tracking-wider mb-6">
                    SADECE ÖĞRENCİLERE ÖZEL
                </span>

                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                    <span className="text-blue-600">Paü Market'e</span> Hoş Geldiniz
                </h1>

                <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
                    Pamukkale Üniversitesi öğrencileri arası güvenli, hızlı ve yenilikçi ikinci el eşya alım-satım platformu.
                </p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex flex-wrap justify-center gap-4"
                >
                    <button className="px-8 py-3.5 bg-blue-600 text-white font-medium rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95">
                        İlanları İncele
                    </button>
                    <button className="px-8 py-3.5 bg-white text-gray-700 font-medium rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-all active:scale-95">
                        Hesap Oluştur
                    </button>
                </motion.div>
            </motion.div>

        </div>
    );
};

export default Home;
