import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
            id: decodedToken.nameid || decodedToken.sub || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
            email: decodedToken.email || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            name: fullName || 'Kullanıcı',
            role: decodedToken.role || decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        };
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                // Token süresi dolmuş mu kontrolü
                if (decodedToken.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(parseUserFromToken(decodedToken));
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error("Token decode hatası:", error);
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decodedToken = jwtDecode(token);
        setUser(parseUserFromToken(decodedToken));
        setIsAuthenticated(true);
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
