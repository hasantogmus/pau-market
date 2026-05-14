import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BadgeCheck, MessageCircle, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';

const showcaseCards = [
    { title: 'Ders kitabı', meta: 'Kampüste teslim', price: '180 TL', position: 'left-2 top-12 rotate-[-4deg]' },
    { title: 'Bisiklet', meta: 'Güvenli mesaj', price: '2.450 TL', position: 'right-0 top-28 rotate-[5deg]' },
    { title: 'Çalışma masası', meta: 'PAÜ öğrencisi', price: '750 TL', position: 'left-10 bottom-16 rotate-[3deg]' },
];

const trustNotes = [
    { icon: ShieldCheck, text: 'Sadece doğrulanmış PAÜ öğrencileri' },
    { icon: MessageCircle, text: 'Kampüs içi hızlı ve güvenli iletişim' },
    { icon: BadgeCheck, text: 'İlan ve hesap akışı sade, net, güvenilir' },
];

const AuthSplitLayout = ({ children, title, subtitle }) => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f7f0e5] text-slate-950 md:flex">
            <aside className="relative hidden min-h-screen w-[48%] overflow-hidden bg-[#0b3454] px-10 py-10 text-white md:flex md:flex-col lg:px-14">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(45,212,191,0.28),transparent_30%),radial-gradient(circle_at_78%_34%,rgba(250,204,21,0.18),transparent_28%),linear-gradient(145deg,#082f49_0%,#0f4c66_52%,#052338_100%)]" />
                <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:44px_44px]" />
                <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

                <div className="relative z-10 flex items-center justify-between">
                    <Link to="/" className="group flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur">
                            <ShoppingBag className="h-6 w-6 text-amber-200 transition-transform group-hover:-rotate-6" />
                        </span>
                        <span>
                            <span className="block text-2xl font-black tracking-tight">PAUMarket</span>
                            <span className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-100/80">Öğrenci pazarı</span>
                        </span>
                    </Link>
                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-50 backdrop-blur">
                        Kampüse özel
                    </span>
                </div>

                <div className="relative z-10 flex flex-1 items-center justify-center py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="relative h-[470px] w-full max-w-[480px]"
                    >
                        <div className="absolute inset-x-8 top-14 h-80 rounded-[3rem] border border-white/15 bg-white/[0.08] shadow-[0_30px_90px_rgba(2,12,27,0.32)] backdrop-blur-xl" />
                        <motion.div
                            className="absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.25rem] border border-white/20 bg-white/15 shadow-2xl backdrop-blur"
                            animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <div className="absolute inset-4 rounded-[1.75rem] border border-white/15" />
                            <ShoppingBag className="h-20 w-20 text-amber-200 drop-shadow-xl" />
                        </motion.div>

                        {showcaseCards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.25 + index * 0.16, duration: 0.55, ease: 'easeOut' }}
                                className={`absolute ${card.position} w-48 rounded-3xl border border-white/20 bg-white/90 p-4 text-slate-900 shadow-[0_22px_60px_rgba(2,12,27,0.28)] backdrop-blur`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
                                        İlan
                                    </span>
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                </div>
                                <p className="text-base font-black">{card.title}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{card.meta}</p>
                                <p className="mt-4 text-2xl font-black text-[#0f766e]">{card.price}</p>
                            </motion.div>
                        ))}

                        <motion.div
                            className="absolute bottom-2 right-12 rounded-full border border-amber-100/40 bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl"
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            Güvenli başlangıç
                        </motion.div>
                    </motion.div>
                </div>

                <div className="relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.65 }}
                        className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight lg:text-5xl"
                    >
                        {title}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.34, duration: 0.65 }}
                        className="mt-5 max-w-lg text-base font-medium leading-7 text-cyan-50/80"
                    >
                        {subtitle}
                    </motion.p>
                    <div className="mt-7 grid gap-3">
                        {trustNotes.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-cyan-50 backdrop-blur">
                                <Icon className="h-4 w-4 text-amber-200" />
                                {text}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <main className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 sm:px-8 md:w-[52%] lg:px-16">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(251,191,36,0.16),transparent_26%),linear-gradient(160deg,#fffaf0_0%,#f8fafc_48%,#eef6f8_100%)]" />
                <div className="absolute -right-24 top-28 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
                <div className="absolute -left-20 bottom-12 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />

                <div className="relative z-10 w-full max-w-[500px]">
                    <div className="mb-8 flex items-center justify-between md:hidden">
                        <Link to="/" className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-200 shadow-xl">
                                <ShoppingBag className="h-5 w-5" />
                            </span>
                            <span>
                                <span className="block text-xl font-black tracking-tight text-slate-950">PAUMarket</span>
                                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Öğrenci pazarı</span>
                            </span>
                        </Link>
                    </div>

                    <div className="rounded-[2rem] border border-white/75 bg-white/90 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8">
                        {children}
                    </div>
                    <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        PAÜ e-postasıyla güvenli erişim
                    </p>
                </div>
            </main>
        </div>
    );
};

export default AuthSplitLayout;
