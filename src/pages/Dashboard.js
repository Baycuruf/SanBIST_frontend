// src/pages/Dashboard.js
import React, { useMemo } from 'react';
import { useApp } from '../App';
import { Link } from 'react-router-dom';
import { Pie } from 'react-chartjs-2'; // Pie chart için
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'; // Chart.js elemanları

// Chart.js elemanlarını kaydet
ChartJS.register(ArcElement, Tooltip, Legend);

// Basit ikon component'leri (Görsellik için)
const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);
const ProfitLossIcon = ({ isProfit }) => (
    isProfit ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17.5V17.5C13 18.8807 14.1193 20 15.5 20V20C16.8807 20 18 18.8807 18 17.5V17.5" transform="rotate(180 15.5 18.75)" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17.5V17.5C13 18.8807 14.1193 20 15.5 20V20C16.8807 20 18 18.8807 18 17.5V17.5" transform="rotate(180 15.5 18.75)" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7L13 7C13 5.61929 14.1193 4.5 15.5 4.5V4.5C16.8807 4.5 18 5.61929 18 7L18 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7L13 7C13 5.61929 14.1193 4.5 15.5 4.5V4.5C16.8807 4.5 18 5.61929 18 7L18 7" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5m0 0l-5-5m5 5H6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7L13 7C13 8.38071 14.1193 9.5 15.5 9.5V9.5C16.8807 9.5 18 8.38071 18 7L18 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7L13 7C13 8.38071 14.1193 9.5 15.5 9.5V9.5C16.8807 9.5 18 8.38071 18 7L18 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17.5V17.5C13 16.1193 14.1193 15 15.5 15V15C16.8807 15 18 16.1193 18 17.5V17.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17.5V17.5C13 16.1193 14.1193 15 15.5 15V15C16.8807 15 18 16.1193 18 17.5V17.5" />
        </svg>
    )
);

const Dashboard = () => {
  const { user, portfolio: rawPortfolioFromAuth, virtualBalance, marketData, authLoading } = useApp();

  // --- 1. Canlı Veri Hesaplamaları (Portfolio.js'den kopyalandı) ---
  const enrichedPortfolioData = useMemo(() => {
    if (!rawPortfolioFromAuth || rawPortfolioFromAuth.length === 0 || !marketData || marketData.length === 0) {
      const initialInvestment = rawPortfolioFromAuth?.reduce((sum, asset) => sum + (asset.quantity * asset.avgPrice), 0) || 0;
      return {
        assets: rawPortfolioFromAuth || [],
        totalCurrentValue: initialInvestment,
        totalInvestment: initialInvestment,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
      };
    }
    let totalCurrentValue = 0;
    let totalInvestment = 0;
    const enrichedAssets = rawPortfolioFromAuth.map(asset => {
      const marketItem = marketData.find(item => item.symbol === asset.symbol && !item.error && typeof item.price === 'number');
      const currentPrice = marketItem ? marketItem.price : (asset.avgPrice || 0);
      const avgPrice = asset.avgPrice || 0;
      const quantity = asset.quantity || 0;
      const totalValue = quantity * currentPrice;
      const investmentCost = quantity * avgPrice;
      return { ...asset, name: marketItem?.name || asset.name || asset.symbol, currentPrice, totalValue, investmentCost };
    });
    totalCurrentValue = enrichedAssets.reduce((sum, asset) => sum + asset.totalValue, 0);
    totalInvestment = enrichedAssets.reduce((sum, asset) => sum + asset.investmentCost, 0);
    const totalProfitLoss = totalCurrentValue - totalInvestment;
    const totalProfitLossPercent = totalInvestment !== 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;
    return { assets: enrichedAssets, totalCurrentValue, totalInvestment, totalProfitLoss, totalProfitLossPercent };
  }, [rawPortfolioFromAuth, marketData]);

  const {
    assets: portfolio, // Artık bu, canlı fiyatlarla zenginleştirilmiş liste
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercent
  } = enrichedPortfolioData;

  const totalAssets = virtualBalance + totalCurrentValue;

  // --- 2. Pasta Grafiği Verisi (Portfolio.js'den kopyalandı) ---
  const chartData = useMemo(() => {
     const labels = portfolio.map(asset => asset.symbol.replace('.IS', ''));
     labels.push('Nakit');
     const dataValues = portfolio.map(asset => Math.max(0, asset.totalValue));
     dataValues.push(Math.max(0, virtualBalance));
     const backgroundColors = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#839A9A', '#C6D8D7' ];
     backgroundColors.push('#9ca3af'); // Nakit rengi
     return {
        labels: labels,
        datasets: [{
             label: 'Varlık Dağılımı (₺)', data: dataValues,
             backgroundColor: backgroundColors.slice(0, dataValues.length), hoverOffset: 4,
             borderColor: '#ffffff', borderWidth: 1
        }],
     };
  }, [portfolio, virtualBalance]);

  // --- 3. Top 5 Yükselenler (Piyasa) ---
  const topMovers = useMemo(() => {
      if (!marketData) return [];
      return marketData
          .filter(item => (item.type === 'hisse' || item.type === 'maden_gram' || item.type === 'doviz') && typeof item.price === 'number' && typeof item.previousClose === 'number' && item.previousClose !== 0)
          .map(item => ({
              ...item,
              change: ((item.price - item.previousClose) / item.previousClose) * 100
          }))
          .sort((a, b) => b.change - a.change) // En çok artana göre sırala
          .slice(0, 5); // İlk 5'i al
  }, [marketData]);

  // --- 4. Top 5 Varlık (Portföy) ---
  const topHoldings = useMemo(() => {
      return portfolio
          .sort((a, b) => b.totalValue - a.totalValue) // En yüksek değere göre sırala
          .slice(0, 5);
  }, [portfolio]);


  // Yüklenme veya Giriş Yapılmamışsa Kontrolleri
  if (authLoading) {
       return (
           <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
           </div>
       );
   }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900"> Lütfen giriş yapın </h1>
          <Link to="/login" className="text-blue-600 hover:underline mt-2 inline-block">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  // --- JSX (Render) ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Hoş Geldiniz, {user.username || user.email}!
      </h1>

      {/* 4'lü Stat Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Nakit Bakiye */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider"> Nakit Bakiye </h3>
              <p className="text-2xl font-bold text-green-600"> {virtualBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} </p>
            </div>
            <WalletIcon />
        </div>
        {/* Yatırım Değeri */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
             <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider"> Yatırım Değeri </h3>
              <p className="text-2xl font-bold text-blue-600"> {totalCurrentValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} </p>
             </div>
             <BriefcaseIcon />
        </div>
        {/* Toplam Varlık */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
             <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider"> Toplam Varlık </h3>
              <p className="text-2xl font-bold text-purple-600"> {totalAssets.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} </p>
             </div>
             <ChartIcon />
        </div>
        {/* Toplam Kâr/Zarar */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
             <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider"> Toplam Kâr/Zarar </h3>
              <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}> {totalProfitLoss.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} </p>
              <p className={`text-sm font-medium ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}> ({totalProfitLossPercent.toFixed(2)}%) </p>
             </div>
             <ProfitLossIcon isProfit={totalProfitLoss >= 0} />
        </div>
      </div>

      {/* 2 Sütunlu Ana Alan: Pasta Grafik + Hızlı Bakış */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Sütun (Daha Geniş) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Hızlı İşlemler */}
            <div className="bg-white rounded-lg shadow-md p-6">
                 <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/market" className="block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
                        <h3 className="text-lg font-semibold text-blue-800">Piyasalar</h3>
                        <p className="text-sm text-blue-700 mt-1">Yeni varlıkları keşfet, alım/satım yap.</p>
                        <span className="text-blue-600 font-medium text-sm mt-2 inline-block group-hover:underline">Hemen Git &rarr;</span>
                    </Link>
                    <Link to="/portfolio" className="block p-6 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                        <h3 className="text-lg font-semibold text-green-800">Portföyüm</h3>
                        <p className="text-sm text-green-700 mt-1">Mevcut varlıklarını ve K/Z durumunu incele.</p>
                         <span className="text-green-600 font-medium text-sm mt-2 inline-block group-hover:underline">Detayları Gör &rarr;</span>
                    </Link>
                 </div>
            </div>

            {/* Piyasanın Yıldızları (Top 5 Yükselen) */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Piyasanın Yıldızları (Günlük Top 5)</h2>
                    <p className="text-sm text-gray-500">Piyasadaki en çok yükselen TL varlıklar</p>
                </div>
                <ul className="divide-y divide-gray-200">
                    {topMovers.length === 0 && <li className="p-4 text-center text-gray-500">Piyasa verisi yükleniyor veya yükselen yok.</li>}
                    {topMovers.map(item => (
                        <li key={item.symbol} className="px-6 py-3 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{item.symbol.replace('.IS', '')}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 4 })}</p>
                                <p className="text-sm font-semibold text-green-600">+{item.change.toFixed(2)}%</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Portföy Özeti (Top 5 Varlık) */}
             <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Portföy Özeti (En Büyük 5)</h2>
                    <p className="text-sm text-gray-500">Portföyünüzdeki en değerli varlıklar</p>
                </div>
                <ul className="divide-y divide-gray-200">
                    {topHoldings.length === 0 && <li className="p-4 text-center text-gray-500">Henüz portföyünüzde varlık yok.</li>}
                    {topHoldings.map(asset => (
                        <li key={asset.symbol} className="px-6 py-3 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{asset.symbol.replace('.IS', '')}</p>
                                <p className="text-xs text-gray-500">{asset.quantity} {asset.symbol.startsWith('GRAM') ? 'gr' : 'adet'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{asset.totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                                <p className="text-xs text-gray-500">Ort. Maliyet: {asset.avgPrice.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

        </div>

        {/* Sağ Sütun (Dar) */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
               <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Varlık Dağılımı</h2>
              {(totalAssets > 0 && (portfolio.length > 0 || virtualBalance > 0)) ? (
                <div className="relative mx-auto" style={{ height: '300px', maxWidth: '300px' }}>
                  <Pie data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } } }} />
                </div>
              ) : (
                 <div className="p-6 text-center text-gray-500 h-[300px] flex items-center justify-center">
                    <p>Grafik için portföy veya nakit verisi yok.</p>
                 </div>
              )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;