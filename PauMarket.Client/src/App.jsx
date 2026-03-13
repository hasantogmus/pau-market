import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NewListing from './pages/NewListing';
import Onboarding from './pages/Onboarding';
import ListingDetail from './pages/ListingDetail';
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
          {/* İleride eklenecek sayfalar için yer tutucu alan */}
          {/* <Route path="/listings" element={<MainLayout><Listings /></MainLayout>} /> */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
