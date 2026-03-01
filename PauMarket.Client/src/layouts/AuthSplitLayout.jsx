import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const AuthSplitLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">

            {/* ─── SOL TARAF: Görsel ve Animasyon (Koyu Mavi Gradient) ─── */}
            <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 p-12 flex-col justify-between overflow-hidden relative">

                {/* Dekoratif Arka Plan Işıkları */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-3xl mix-blend-overlay"></div>
                </div>

                {/* Logo / Marka */}
                <div className="relative z-10">
                    <Link to="/" className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20">
                            <ShoppingBag className="w-7 h-7 text-blue-300" />
                        </div>
                        Paü Market
                    </Link>
                </div>

                {/* Merkez: Devasa SVG Çizgi Animasyonu */}
                <div className="flex-grow flex items-center justify-center relative z-10 w-full max-w-lg mx-auto">
                    <motion.svg
                        viewBox="0 0 400 400"
                        className="w-full h-auto drop-shadow-2xl"
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Alışveriş Çantası Gövdesi */}
                        <motion.path
                            d="M100 150 L300 150 L280 320 Q280 340 260 340 L140 340 Q120 340 120 320 Z"
                            fill="none"
                            stroke="rgba(147, 197, 253, 0.8)" // blue-300
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            variants={{
                                hidden: { pathLength: 0, opacity: 0 },
                                visible: {
                                    pathLength: 1,
                                    opacity: 1,
                                    transition: { duration: 2.5, ease: "easeInOut", delay: 0.2 }
                                }
                            }}
                        />

                        {/* Çanta Sapı */}
                        <motion.path
                            d="M150 150 C150 80, 250 80, 250 150"
                            fill="none"
                            stroke="rgba(191, 219, 254, 0.9)" // blue-200
                            strokeWidth="6"
                            strokeLinecap="round"
                            variants={{
                                hidden: { pathLength: 0, opacity: 0 },
                                visible: {
                                    pathLength: 1,
                                    opacity: 1,
                                    transition: { duration: 1.5, ease: "easeOut", delay: 1.5 }
                                }
                            }}
                        />

                        {/* İç Dekoratif Çizgi (Üniversiteyi/Dinamizmi Temsilen) */}
                        <motion.path
                            d="M160 220 L240 220 M180 260 L220 260"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.6)" // white/60
                            strokeWidth="4"
                            strokeLinecap="round"
                            variants={{
                                hidden: { pathLength: 0, opacity: 0 },
                                visible: {
                                    pathLength: 1,
                                    opacity: 1,
                                    transition: { duration: 1.2, ease: "easeInOut", delay: 2.5 }
                                }
                            }}
                        />

                        {/* Etrafındaki Parıltılı Yıldızlar/Noktalar */}
                        <motion.circle cx="80" cy="120" r="4" fill="#93C5FD"
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 3, duration: 0.8, type: "spring" }} />
                        <motion.circle cx="320" cy="100" r="6" fill="#BFDBFE"
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 3.2, duration: 0.8, type: "spring" }} />
                        <motion.circle cx="340" cy="280" r="5" fill="#60A5FA"
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.7, scale: 1 }} transition={{ delay: 3.4, duration: 0.8, type: "spring" }} />
                        <motion.circle cx="90" cy="260" r="3" fill="#E0E7FF"
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 3.1, duration: 0.8, type: "spring" }} />

                    </motion.svg>
                </div>

                {/* Vizyon Sloganı */}
                <div className="relative z-10 max-w-md">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5, duration: 0.8 }}
                        className="text-4xl font-light text-white leading-tight mb-4"
                    >
                        {title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 0.8 }}
                        className="text-blue-200 text-lg leading-relaxed"
                    >
                        {subtitle}
                    </motion.p>
                </div>

            </div>

            {/* ─── SAĞ TARAF: Form Alanı ─── */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>

        </div>
    );
};

export default AuthSplitLayout;
// AuthSplitLayout.jsx requires Link from react-router-dom and ShoppingBag from lucide-react. We need to add imports.
