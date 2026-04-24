import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import NewListing from './pages/NewListing';
import Onboarding from './pages/Onboarding';
import ListingDetail from './pages/ListingDetail';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import MyListings from './pages/MyListings';
import Purchases from './pages/Purchases';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <MainLayout>
                  <Home />
                </MainLayout>
              }
            />
            <Route
              path="/listings"
              element={
                <MainLayout>
                  <Home />
                </MainLayout>
              }
            />
            <Route
              path="/login"
              element={
                <MainLayout>
                  <Login />
                </MainLayout>
              }
            />
            <Route
              path="/register"
              element={
                <MainLayout>
                  <Register />
                </MainLayout>
              }
            />
            <Route
              path="/verify-email"
              element={
                <MainLayout>
                  <VerifyEmail />
                </MainLayout>
              }
            />
            <Route
              path="/listings/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <NewListing />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Onboarding: kendi full-screen layout'u var, MainLayout'suz */}
            <Route path="/onboarding" element={<Onboarding />} />
            {/* İlan Detay Sayfası */}
            <Route
              path="/listings/:id"
              element={
                <MainLayout>
                  <ListingDetail />
                </MainLayout>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Messages />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <MainLayout>
                  <Profile />
                </MainLayout>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <MainLayout>
                  <Profile />
                </MainLayout>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MyListings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Purchases />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
