import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    PlusCircle,
    MessageCircle,
    User,
    Menu,
    X,
    LogIn,
    UserPlus,
    LogOut,
    ChevronDown,
    Settings,
    Package,
    Home,
    Heart,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import messageService from '../services/messageService';

/* ─── Dropdown slide-in animation ────────────────────────────── */
const dropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.18, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        y: -8,
        scale: 0.96,
        transition: { duration: 0.13, ease: 'easeIn' },
    },
};

/* ─── Mobile menu slide-down animation ───────────────────────── */
const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
        opacity: 1,
        height: 'auto',
        transition: { duration: 0.25, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        height: 0,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
};

/* ─── Helper: get initials from full name ─────────────────────── */
const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'U';
};

const isActivePath = (pathname, target) => {
    if (target === '/') return pathname === '/';
    return pathname === target || pathname.startsWith(`${target}/`);
};

/* ═══════════════════════════════════════════════════════════════
   NAVBAR COMPONENT
═══════════════════════════════════════════════════════════════ */
const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchQuery, setSearchQuery] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);

    const profileRef = useRef(null);
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
    const hasUnreadMessages = unreadMessageCount > 0;

    /* Close profile dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Close mobile menu on resize */
    useEffect(() => {
        const handler = () => {
            if (window.innerWidth >= 768) setMobileOpen(false);
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        let isMounted = true;

        const loadThreads = async () => {
            try {
                const threads = await messageService.getThreads();
                if (isMounted) {
                    setUnreadMessageCount(
                        threads.reduce((total, thread) => total + Number(thread.unreadCount || 0), 0)
                    );
                }
            } catch {
                if (isMounted) {
                    setUnreadMessageCount(0);
                }
            }
        };

        loadThreads();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, location.pathname]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
            setMobileOpen(false);
        }
    };

    const handleLogout = () => {
        setProfileOpen(false);
        setMobileOpen(false);
        logout();
    };

    const initials = getInitials(user?.name);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">

                    {/* ── LEFT: Logo ── */}
                    <Link
                        to="/"
                        className="flex-shrink-0 flex items-center group"
                        aria-label="PAU Market ana sayfa"
                    >
                        <span className="text-2xl font-extrabold tracking-tight select-none">
                            <span className="text-blue-600 group-hover:text-blue-700 transition-colors">PAU</span>
                            <span
                                className="text-gray-900 group-hover:text-gray-800 transition-colors"
                                style={{ fontFamily: "'Palatino Linotype', 'Palatino', 'Book Antiqua', Georgia, serif", fontStyle: 'italic', fontSize: '1.35rem' }}
                            > Market</span>
                        </span>
                    </Link>

                    <nav className="hidden xl:flex items-center gap-1 text-sm font-semibold">
                        <DesktopNavLink to="/" label="Ana Sayfa" active={isActivePath(location.pathname, '/')} />
                        <DesktopNavLink to="/listings" label="İlanlar" active={isActivePath(location.pathname, '/listings')} />
                        {isAuthenticated && (
                            <>
                                <DesktopNavLink to="/favorites" label="Favoriler" active={isActivePath(location.pathname, '/favorites')} />
                                <DesktopNavLink to="/profile" label="Profil" active={isActivePath(location.pathname, '/profile')} />
                            </>
                        )}
                    </nav>

                    {/* ── CENTER: Search bar (hidden on mobile) ── */}
                    <form
                        onSubmit={handleSearch}
                        className="hidden md:flex flex-1 max-w-xl"
                    >
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Kampüste ne arıyorsun?"
                                className="
                                    w-full h-10 pl-10 pr-4
                                    bg-gray-100 text-gray-800 text-sm
                                    rounded-full border border-transparent
                                    outline-none
                                    placeholder-gray-400
                                    transition-all duration-200
                                    focus:bg-white focus:border-blue-400
                                    focus:ring-2 focus:ring-blue-200 focus:ring-offset-0
                                "
                            />
                        </div>
                    </form>

                    {/* ── RIGHT: Actions (hidden on mobile) ── */}
                    <div className="hidden md:flex items-center gap-2">

                        {/* İlan Ver CTA */}
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/listings/new"
                                className="
                                    inline-flex items-center gap-2 px-4 py-2
                                    bg-blue-600 hover:bg-blue-700
                                    text-white text-sm font-semibold
                                    rounded-full shadow-md hover:shadow-blue-200
                                    transition-all duration-200
                                "
                            >
                                <PlusCircle className="w-4 h-4" />
                                İlan Ver
                            </Link>
                        </motion.div>

                        {isAuthenticated && (
                            <Link
                                to="/messages"
                                className="relative inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Mesajlar
                                {hasUnreadMessages && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 border-2 border-white text-[10px] leading-4 text-white text-center font-black">
                                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {isAuthenticated && isAdmin && (
                            <Link
                                to="/admin/moderation"
                                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Admin
                            </Link>
                        )}

                        {/* Profile / Auth */}
                        {isAuthenticated ? (
                            <div ref={profileRef} className="relative">
                                <button
                                    id="profile-menu-btn"
                                    onClick={() => setProfileOpen((p) => !p)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors group"
                                    aria-haspopup="true"
                                    aria-expanded={profileOpen}
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                        {initials}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 max-w-[90px] truncate">
                                        {user?.name?.split(' ')[0] || 'Profilim'}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div
                                            key="profile-dropdown"
                                            variants={dropdownVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="
                                                absolute right-0 mt-2 w-52
                                                bg-white rounded-2xl
                                                border border-gray-100
                                                shadow-xl shadow-gray-200/70
                                                overflow-hidden
                                                origin-top-right
                                            "
                                        >
                                            {/* Header */}
                                            <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
                                                <p className="text-xs text-gray-500 font-medium">Giriş yapıldı</p>
                                                <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                            </div>

                                            {/* Menu items */}
                                            <div className="py-1.5">
                                                <DropdownItem to="/messages" icon={<MessageCircle className="w-4 h-4" />} label="Mesajlar" onClick={() => setProfileOpen(false)} />
                                                <DropdownItem to="/profile" icon={<User className="w-4 h-4" />} label="Profilim" onClick={() => setProfileOpen(false)} />
                                                <DropdownItem to="/my-listings" icon={<Package className="w-4 h-4" />} label="İlanlarım" onClick={() => setProfileOpen(false)} />
                                                <DropdownItem to="/favorites" icon={<Heart className="w-4 h-4" />} label="Favorilerim" onClick={() => setProfileOpen(false)} />
                                                {isAdmin && (
                                                    <DropdownItem to="/admin/moderation" icon={<ShieldCheck className="w-4 h-4" />} label="Admin Onayları" onClick={() => setProfileOpen(false)} />
                                                )}
                                                <DropdownItem to="/settings" icon={<Settings className="w-4 h-4" />} label="Ayarlar" onClick={() => setProfileOpen(false)} />
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-gray-100 py-1.5">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Çıkış Yap
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 ml-1">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    Giriş Yap
                                </Link>
                                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        to="/register"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow-md transition-all"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Kayıt Ol
                                    </Link>
                                </motion.div>
                            </div>
                        )}
                    </div>

                    {/* ── MOBILE: Hamburger ── */}
                    <button
                        id="mobile-menu-toggle"
                        onClick={() => setMobileOpen((p) => !p)}
                        aria-label="Menüyü aç/kapat"
                        className="md:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {mobileOpen ? (
                                <motion.span
                                    key="close"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ display: 'inline-flex' }}
                                >
                                    <X className="w-6 h-6" />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="menu"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ display: 'inline-flex' }}
                                >
                                    <Menu className="w-6 h-6" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                </div>
            </div>

            {/* ── MOBILE MENU ─────────────────────────────────────────── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-menu"
                        variants={mobileMenuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="md:hidden overflow-hidden border-t border-gray-100"
                    >
                        <div className="px-4 py-4 space-y-3 bg-white/95 backdrop-blur-sm">

                            {/* Mobile Search */}
                            <form onSubmit={handleSearch}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Kampüste ne arıyorsun?"
                                        className="
                                            w-full h-10 pl-10 pr-4
                                            bg-gray-100 text-gray-800 text-sm
                                            rounded-full border border-transparent
                                            outline-none placeholder-gray-400
                                            focus:bg-white focus:border-blue-400
                                            focus:ring-2 focus:ring-blue-200
                                            transition-all duration-200
                                        "
                                    />
                                </div>
                            </form>

                            {/* Mobile Nav Links */}
                            <nav className="space-y-1">
                                <MobileNavLink to="/" icon={<Home className="w-5 h-5" />} label="Ana Sayfa" onClick={() => setMobileOpen(false)} />
                                <MobileNavLink to="/listings" icon={<Search className="w-5 h-5" />} label="İlanları Keşfet" onClick={() => setMobileOpen(false)} />

                                <MobileNavLink
                                    to="/listings/new"
                                    icon={<PlusCircle className="w-5 h-5" />}
                                    label="İlan Ver"
                                    highlight
                                    onClick={() => setMobileOpen(false)}
                                />
                            </nav>

                            <div className="border-t border-gray-100 pt-3">
                                {isAuthenticated ? (
                                    <div className="space-y-1">
                                        {/* User info pill */}
                                        <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-xl mb-2">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                        </div>
                                        <MobileNavLink to="/messages" icon={<MessageCircle className="w-5 h-5" />} label="Mesajlar" showDot={hasUnreadMessages} onClick={() => setMobileOpen(false)} />
                                        <MobileNavLink to="/profile" icon={<User className="w-5 h-5" />} label="Profilim" onClick={() => setMobileOpen(false)} />
                                        <MobileNavLink to="/my-listings" icon={<Package className="w-5 h-5" />} label="İlanlarım" onClick={() => setMobileOpen(false)} />
                                        <MobileNavLink to="/favorites" icon={<Heart className="w-5 h-5" />} label="Favorilerim" onClick={() => setMobileOpen(false)} />
                                        {isAdmin && (
                                            <MobileNavLink to="/admin/moderation" icon={<ShieldCheck className="w-5 h-5" />} label="Admin Onayları" onClick={() => setMobileOpen(false)} />
                                        )}
                                        <MobileNavLink to="/settings" icon={<Settings className="w-5 h-5" />} label="Ayarlar" onClick={() => setMobileOpen(false)} />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <LogOut className="w-5 h-5" />
                                            Çıkış Yap
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            to="/login"
                                            onClick={() => setMobileOpen(false)}
                                            className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
                                        >
                                            <LogIn className="w-4 h-4" />
                                            Giriş Yap
                                        </Link>
                                        <Link
                                            to="/register"
                                            onClick={() => setMobileOpen(false)}
                                            className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-md"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Kayıt Ol
                                        </Link>
                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

/* ─── Sub-components ──────────────────────────────────────────── */

const DesktopNavLink = ({ to, label, active }) => (
    <Link
        to={to}
        className={`px-3 py-2 rounded-full transition-colors ${
            active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-blue-700'
        }`}
    >
        {label}
    </Link>
);

const DropdownItem = ({ to, icon, label, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
    >
        <span className="text-gray-400">{icon}</span>
        {label}
    </Link>
);

const MobileNavLink = ({ to, icon, label, highlight, showDot, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
            highlight
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
        }`}
    >
        {icon}
        {label}
        {showDot && (
            <span className="ml-auto w-2.5 h-2.5 rounded-full bg-red-500" />
        )}
    </Link>
);

export default Navbar;
