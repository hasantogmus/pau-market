import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        // Redirect to the login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && String(user?.role).toLowerCase() !== requiredRole.toLowerCase()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
