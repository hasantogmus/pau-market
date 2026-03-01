import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        {/* İleride eklenecek sayfalar için yer tutucu alan */}
        {/* <Route path="/login" element={<MainLayout><Login /></MainLayout>} /> */}
        {/* <Route path="/register" element={<MainLayout><Register /></MainLayout>} /> */}
        {/* <Route path="/listings" element={<MainLayout><Listings /></MainLayout>} /> */}
      </Routes>
    </Router>
  );
}

export default App;
