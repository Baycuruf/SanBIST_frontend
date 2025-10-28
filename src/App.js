// src/App.js
import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider } from './components/AuthProvider'; // BU SATIRI SİL
import { useAuth } from './hooks/useAuth'; // useAuth hook'u
import { useMarketData } from './hooks/useMarketData'; // Market data hook'u
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Market from './pages/Market';
import './index.css';

// App Context oluştur
const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

function App() {
  // --- 1. Auth, Kullanıcı ve Portföy Verisi ---
  // useAuth hook'u artık tüm bu state'leri kendi içinde yönetiyor
  // ve bize güncel değerleri döndürüyor (onSnapshot sayesinde)
  const {
    user,
    loading: authLoading,
    portfolio,
    virtualBalance,
    logout // Logout fonksiyonunu da buradan alıyoruz
  } = useAuth();

  // --- 2. Market Verisi ---
  // Ayrı state'lerde tutuluyor ve useMarketData tarafından güncelleniyor
  const [marketData, setMarketData] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState(null);
  const [marketInfo, setMarketInfo] = useState({
      lastUpdate: null, nextUpdate: null, marketStatus: 'unknown',
      dataSource: 'unknown', backendStatus: 'checking', dataQuality: {}
  });

  // useMarketData hook'unu *burada* (en üst seviyede) çağırıyoruz
  const marketHookData = useMarketData(
      setMarketData,
      setMarketLoading,
      setMarketError,
      setMarketInfo
  );

  // --- 3. Tüm State'leri Context için Birleştir ---
  const appState = {
    user,             // useAuth'tan (güncel)
    portfolio,        // useAuth'tan (güncel)
    virtualBalance,   // useAuth'tan (güncel)
    
    // Market verileri
    marketData,
    marketLoading,
    marketError,
    marketInfo,
    refreshMarketData: marketHookData.refreshData,

    authLoading,      // Auth yüklenme durumu
    loading: marketLoading || authLoading, // Genel yüklenme
    
    // Logout fonksiyonunu Navbar'ın kullanabilmesi için context'e ekle
    logout
  };

  // Auth verisi (kullanıcı, portföy) yüklenirken spinner göster
  if (appState.authLoading) {
       return (
           <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
           </div>
       );
   }

  return (
    <AppContext.Provider value={appState}>
      <Router>
        {/* AuthProvider'a artık gerek yok */}
        {/* <AuthProvider> */}
          <div className="min-h-screen bg-gray-100">
            {/* Navbar sadece kullanıcı giriş yaptıysa gösterilir */}
            {user && <Navbar />}
            
            <Routes>
              {/* Public Rotalar (Giriş yaptıysa Dashboard'a yönlendir) */}
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />

              {/* Private Rotalar (Giriş yapmadıysa Login'e yönlendir) */}
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
              <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/login" replace />} />
              <Route path="/market" element={user ? <Market /> : <Navigate to="/login" replace />} />
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
              
              {/* Eşleşmeyen tüm rotaları yönlendir */}
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
            </Routes>
          </div>
        {/* </AuthProvider> */}
      </Router>
    </AppContext.Provider>
  );
}

export default App;