import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

const getInitialAuthState = () => {
    const token = localStorage.getItem('token');

    if (!token) {
        return { user: null, isAuthenticated: false };
    }

    try {
        const decodedToken = jwtDecode(token);

        if (decodedToken.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            return { user: null, isAuthenticated: false };
        }

        let fullName = decodedToken.name || decodedToken.unique_name || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (!fullName && decodedToken.given_name) {
            fullName = decodedToken.family_name
                ? `${decodedToken.given_name} ${decodedToken.family_name}`
                : decodedToken.given_name;
        }

        return {
            user: {
                id: Number(decodedToken.nameid || decodedToken.sub || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']),
                email: decodedToken.email || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
                name: fullName || 'Kullanıcı',
                role: decodedToken.role || decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
            },
            isAuthenticated: true
        };
    } catch (error) {
        console.error("Token decode hatası:", error);
        localStorage.removeItem('token');
        return { user: null, isAuthenticated: false };
    }
};

export const AuthProvider = ({ children }) => {
    const initialAuthState = getInitialAuthState();

    const [user, setUser] = useState(initialAuthState.user);
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthState.isAuthenticated);
    const [isLoading] = useState(false);
    const navigate = useNavigate();

    // Yardımcı fonksiyon: .NET claim'lerini çözümlemek için
    const parseUserFromToken = (decodedToken) => {
        // İsim ve Soyisimi birleştirerek tam isim oluşturalım (örn: Hasan Yılmaz)
        let fullName = decodedToken.name || decodedToken.unique_name || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (!fullName && decodedToken.given_name) {
            fullName = decodedToken.family_name
                ? `${decodedToken.given_name} ${decodedToken.family_name}`
                : decodedToken.given_name;
        }

        return {
            id: Number(decodedToken.nameid || decodedToken.sub || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']),
            email: decodedToken.email || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            name: fullName || 'Kullanıcı',
            role: decodedToken.role || decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        };
    };

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/');
    }, [navigate]);

    const login = (token, redirectPath = '/') => {
        localStorage.setItem('token', token);
        const decodedToken = jwtDecode(token);
        setUser(parseUserFromToken(decodedToken));
        setIsAuthenticated(true);
        if (redirectPath) {
            navigate(redirectPath);
        }
    };

    const updateUser = (updates) => {
        setUser((prev) => prev ? { ...prev, ...updates } : prev);
    };

    useEffect(() => {
        const handleAuthExpired = () => {
            logout();
        };

        window.addEventListener('auth-expired', handleAuthExpired);
        return () => window.removeEventListener('auth-expired', handleAuthExpired);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
