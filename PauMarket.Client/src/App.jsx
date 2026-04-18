import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NewListing from './pages/NewListing';
import Onboarding from './pages/Onboarding';
import ListingDetail from './pages/ListingDetail';
import PlaceholderPage from './pages/PlaceholderPage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
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
            path="/listings/new"
            element={
              <MainLayout>
                <NewListing />
              </MainLayout>
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
              <MainLayout>
                <PlaceholderPage
                  title="Mesajlaşma Ekranı Hazırlanıyor"
                  description="Mesajlaşma altyapısı backend tarafında hazır, bu ekranın son kullanıcı arayüzü ise henüz tamamlanmadı."
                  primaryLabel="İlana Geri Dön"
                />
              </MainLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <MainLayout>
                <PlaceholderPage
                  title="Profil Sayfası Hazırlanıyor"
                  description="Profil bilgilerini ve hesap detaylarını yöneteceğin ekran henüz tamamlanmadı."
                />
              </MainLayout>
            }
          />
          <Route
            path="/my-listings"
            element={
              <MainLayout>
                <PlaceholderPage
                  title="İlanlarım Ekranı Hazırlanıyor"
                  description="Kendi ilanlarını toplu halde yöneteceğin arayüz henüz tamamlanmadı."
                />
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout>
                <PlaceholderPage
                  title="Ayarlar Sayfası Hazırlanıyor"
                  description="Hesap ve uygulama ayarlarını düzenleyeceğin alan henüz tamamlanmadı."
                />
              </MainLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
