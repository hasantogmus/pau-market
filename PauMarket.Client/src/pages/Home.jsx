import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_CATEGORIES = ['Elektronik', 'Ders Kitabı', 'Ev Eşyası', 'Not/Özet', 'Giyim', 'Hobi'];

const MOCK_RECOMMENDATIONS = [
    { id: 1, title: 'Razer BlackWidow V3 TKL', price: '1.250 TL', category: 'Elektronik', brand: 'Razer' },
    { id: 2, title: 'Calculus 1 Thomas 14. Baskı', price: '350 TL', category: 'Ders Kitabı', brand: 'Pearson' },
    { id: 3, title: 'IKEA Çalışma Masası (Beyaz)', price: '800 TL', category: 'Ev Eşyası', brand: 'IKEA' },
    { id: 4, title: 'Fizik 101 Vize/Final Özetleri', price: '50 TL', category: 'Not/Özet', brand: 'Öğrenci Notu' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Home = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">

            {/* ─── Hero Section (Dinamik Gradient & Floating Kartlar) ─── */}
            <section className="relative w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-indigo-100 overflow-hidden">
                {/* Arka Plan Dekorasyon */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col md:flex-row items-center">

                    {/* Sol Metin Alanı */}
                    <div className="w-full md:w-1/2 md:pr-12 relative z-10 text-center md:text-left mb-12 md:mb-0">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm border border-indigo-200">
                                Öğrenciler İçin Güvenli Ticaret
                            </span>
                            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] mb-6">
                                Kampüsün Yeni <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    Pazar Yeri
                                </span>
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed font-medium">
                                İkinci el eşyalarını sat, ihtiyacın olanı ucuza bul. Sadece Pamukkale Üniversitesi öğrencilerine özel, güvenilir ve dürüst alışveriş deneyimi.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Link to="/listings" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                                    Hemen Keşfet <ChevronRight className="w-5 h-5" />
                                </Link>
                                <div className="relative">
                                    <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="İlan ara..."
                                        className="w-full sm:w-64 pl-12 pr-4 py-4 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-700 shadow-sm"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sağ Görsel Alanı (Floating Cards) */}
                    <div className="w-full md:w-1/2 relative h-80 md:h-[450px] flex items-center justify-center">
                        {/* Arkadaki Kart */}
                        <motion.div
                            className="absolute z-10 bg-white p-4 rounded-2xl shadow-xl w-48 sm:w-64 rotate-[-12deg] transform -translate-x-12 sm:-translate-x-24 border border-gray-100"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <div className="w-full h-32 bg-indigo-50 rounded-lg mb-3 flex items-center justify-center border border-indigo-100/50">
                                {/* Placeholder Görsel */}
                                <div className="w-16 h-16 bg-indigo-200/50 rounded ml-2 mt-2"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-900">450 ₺</span>
                                <Heart className="w-5 h-5 text-gray-300" />
                            </div>
                        </motion.div>

                        {/* Öndeki Ana Kart */}
                        <motion.div
                            className="absolute z-30 bg-white p-5 rounded-2xl shadow-2xl shadow-indigo-200/50 w-56 sm:w-72 border border-gray-100"
                            animate={{ y: [0, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                        >
                            <div className="absolute top-4 right-4 bg-white/80 p-1.5 rounded-full shadow-sm backdrop-blur-sm z-20">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                            </div>
                            <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center">
                                <span className="font-bold text-indigo-300 text-xl tracking-wider">Mekanik Klavye</span>
                            </div>
                            <h3 className="font-bold text-gray-900 truncate">Razer Huntsman Mini</h3>
                            <p className="text-xs text-gray-500 mb-4 truncate mt-1">Sıfırdan farksız, kırmızı switch.</p>
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-xs text-gray-400 line-through block">2.100 ₺</span>
                                    <span className="font-extrabold text-xl text-blue-600 block leading-none">1.450 ₺</span>
                                </div>
                                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                    Elektronik
                                </span>
                            </div>
                        </motion.div>

                        {/* Sağdaki Küçük Kart */}
                        <motion.div
                            className="absolute z-20 bg-white p-3 rounded-2xl shadow-lg w-40 sm:w-56 rotate-[8deg] transform translate-x-16 sm:translate-x-32 translate-y-12 border border-gray-100"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                        >
                            <div className="w-full h-24 bg-rose-50 rounded-lg mb-2 flex items-center justify-center">
                                <span className="text-rose-300 font-bold text-sm">Kahve Makinesi</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                            <span className="font-bold text-gray-900 mt-2 block">280 ₺</span>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ─── Hızlı Kategoriler ─── */}
            <section className="bg-white py-10 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center flex-wrap gap-3 sm:gap-4">
                        {MOCK_CATEGORIES.map((cat, idx) => (
                            <motion.button
                                key={idx}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-5 py-2.5 bg-gray-50 hover:bg-white text-gray-700 hover:text-blue-600 font-semibold rounded-xl border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow-md transition-all text-sm sm:text-base"
                            >
                                {cat}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Sana Özel Öneriler (Grid, Staggered Animasyon) ─── */}
            <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Sana Özel Öneriler
                        </h2>
                        <p className="text-gray-500 mt-2 font-medium">Satın alma geçmişine ve favorilerine göre seçildi.</p>
                    </div>
                    <Link to="/listings" className="hidden sm:flex items-center text-blue-600 hover:text-blue-800 font-semibold group transition-colors">
                        Tümünü Gör
                        <ChevronRight className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8"
                >
                    {MOCK_RECOMMENDATIONS.map((item) => (
                        <motion.div
                            key={item.id}
                            variants={itemVariants}
                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-100 transition-all duration-300 group cursor-pointer"
                        >
                            {/* Görsel Alanı */}
                            <div className="w-full aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50">
                                    {/* Gerçek veriler gelene kadar yer tutucu */}
                                    <span className="font-bold text-lg text-gray-300">{item.brand}</span>
                                </div>
                                {/* Favori Butonu (Hover'da beliren veya her zaman duran) */}
                                <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-colors z-10">
                                    <Heart className="w-5 h-5" />
                                </button>
                                {/* Kategori Etiketi */}
                                <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{item.category}</span>
                                </div>
                            </div>

                            {/* Detaylar */}
                            <div className="p-5">
                                <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="font-extrabold text-lg text-blue-600">{item.price}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Mobilde Tümünü Gör Butonu */}
                <div className="mt-8 flex justify-center sm:hidden">
                    <Link to="/listings" className="px-6 py-3 bg-gray-50 text-blue-600 hover:bg-blue-50 font-bold rounded-xl border border-gray-200 transition-colors w-full text-center">
                        Tüm İlanları Görüntüle
                    </Link>
                </div>

            </section>

        </div>
    );
};

export default Home;
