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

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                // Token süresi dolmuş mu kontrolü
                if (decodedToken.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // Backend'den gelen JWT payload yapısına göre bu alanları güncelleyebilirsiniz
                    setUser({
                        id: decodedToken.nameid || decodedToken.sub,
                        email: decodedToken.email,
                        name: decodedToken.unique_name || decodedToken.name,
                        role: decodedToken.role
                    });
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
        setUser({
            id: decodedToken.nameid || decodedToken.sub,
            email: decodedToken.email,
            name: decodedToken.unique_name || decodedToken.name,
            role: decodedToken.role
        });
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
