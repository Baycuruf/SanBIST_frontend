// src/components/layout/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';

import logo from '../../assets/logo2.png'; // Logoyu import et

const Navbar = () => {
  const { user, logout, virtualBalance, portfolio } = useApp(); // virtualBalance ve portfolio da eklendi
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return null;
  }

  // Anlık Portföy Değeri Hesaplaması (Basitçe, detaylısı Portfolio.js'te)
  const totalPortfolioValue = portfolio.reduce((sum, asset) => sum + asset.totalValue, 0);
  const totalAssets = virtualBalance + totalPortfolioValue;

  return (
    // Navbar'ın arka planını logonun ana rengine (koyu lacivert) yakın bir renge ayarlayalım
    // shadow-lg ile daha belirgin bir gölge verelim
    <nav className="bg-blue-900 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Sol Taraf - Logo ve Linkler */}
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <img
                className="h-10 w-auto" // Navbar için daha küçük logo boyutu
                src={logo}
                alt="Sanal Borsa Logo"
              />
              {/* SanBIST logosu zaten yazı içerdiği için tekrar yazı eklemeye gerek yok */}
              {/* İstersen logonun yanına "SanalBorsa" gibi bir metin ekleyebilirsin */}
              {/* <span className="text-xl font-bold text-white ml-2">SanalBorsa</span> */}
            </Link>

            {/* Navigasyon Linkleri - Logodaki altın rengine yakın bir text rengi verelim */}
            <div className="hidden sm:flex sm:space-x-4">
              <Link
                to="/dashboard"
                className="text-white hover:text-amber-300 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Gösterge Paneli
              </Link>
              <Link
                to="/market"
                className="text-white hover:text-amber-300 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Piyasalar
              </Link>
              <Link
                to="/portfolio"
                className="text-white hover:text-amber-300 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Portföy
              </Link>
            </div>
          </div>
          
          {/* Sağ Taraf - Kullanıcı Bilgisi ve Çıkış */}
          <div className="flex items-center space-x-4">
            {/* Anlık Varlık Bilgisi - Beyaz veya açık gri tonu */}
            <div className="hidden md:flex flex-col text-right text-gray-300 text-xs">
              
             
            </div>

            {/* Kullanıcı Adı - Daha belirgin ve logonun rengine uyumlu */}
            <span className="text-white text-sm font-semibold mr-2 hidden sm:block">
              Merhaba, <span className="text-amber-300">{user.username || user.email}</span>
            </span>

            {/* Çıkış Butonu - Kırmızı kalabilir veya daha nötr bir renk seçilebilir */}
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-blue-900"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;