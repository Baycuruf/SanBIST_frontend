// src/pages/Portfolio.js
import React, { useMemo, useState } from 'react';
import { useApp } from '../App'; // AppContext'e erişim (marketData, marketLoading vs. için)
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import TradeModal from '../components/TradeModal'; // TradeModal import edildi
import { Link } from 'react-router-dom'; // Giriş yapılmamışsa veya portföy boşsa yönlendirme için

ChartJS.register(ArcElement, Tooltip, Legend);

const Portfolio = () => {
  // rawPortfolio (isim değişikliği yapalım daha anlaşılır olsun) ve virtualBalance useAuth'tan geliyor
  // marketData ve marketLoading ise useMarketData -> App.js -> useApp üzerinden geliyor
  const { user, portfolio: rawPortfolioFromAuth, virtualBalance, marketData, loading: globalLoading, marketLoading, authLoading } = useApp();

  // --- TradeModal State ve Fonksiyonları ---
  const [tradeModal, setTradeModal] = useState({ isOpen: false, stock: null, action: null });
  const [tradeResult, setTradeResult] = useState(null); // Başarılı işlem bildirimi için

  // TradeModal'ı açan fonksiyon
  const handleTrade = (asset, action) => {
    // Portföydeki asset objesi marketData formatına (price anahtarı) uygun değilse dönüştür
    const stockDataForModal = {
      symbol: asset.symbol, // .IS uzantılı tam sembolü servise gönder
      name: asset.name,
      price: asset.currentPrice, // Portföydeki HESAPLANMIŞ güncel fiyatı kullan
    };

    // Fiyat kontrolü
    if (!stockDataForModal || typeof stockDataForModal.price !== 'number' || stockDataForModal.price <= 0 || !asset.marketDataAvailable) {
       alert("Bu hisse senedi için şu an işlem yapılamaz (güncel piyasa verisi yok).");
       return;
     }
    setTradeModal({ isOpen: true, stock: stockDataForModal, action });
  };

  // Başarılı trade sonrası bildirimi gösteren fonksiyon
  const handleTradeSuccess = (result) => {
    setTradeModal({ isOpen: false, stock: null, action: null }); // Modalı kapat
    setTradeResult(result);
    // Bildirimi 5 saniye sonra kaldır
    setTimeout(() => setTradeResult(null), 5000);
  };
  // --- TradeModal Sonu ---


  // Verileri birleştir ve hesaplamaları yap (useMemo)
  const enrichedPortfolioData = useMemo(() => {
    if (!rawPortfolioFromAuth || rawPortfolioFromAuth.length === 0) {
      return {
        assets: [], totalCurrentValue: 0, totalInvestment: 0,
        totalProfitLoss: 0, totalProfitLossPercent: 0,
      };
    }

    let totalCurrentValue = 0;
    let totalInvestment = 0;

    const enrichedAssets = rawPortfolioFromAuth.map(asset => {
      const marketItem = marketData?.find(item => item.symbol === asset.symbol && !item.error && typeof item.price === 'number');
      const currentPrice = marketItem ? marketItem.price : (asset.avgPrice || 0);
      const avgPrice = asset.avgPrice || 0;
      const quantity = asset.quantity || 0;
      const totalValue = quantity * currentPrice;
      const investmentCost = quantity * avgPrice;
      const profitLoss = totalValue - investmentCost;
      const profitLossPercent = investmentCost !== 0 ? (profitLoss / investmentCost) * 100 : 0;
      totalCurrentValue += totalValue;
      totalInvestment += investmentCost;
      return {
        ...asset,
        name: marketItem?.name || asset.name || asset.symbol,
        currentPrice: currentPrice,
        totalValue: totalValue,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        marketDataAvailable: !!marketItem
      };
    });

    const totalProfitLoss = totalCurrentValue - totalInvestment;
    const totalProfitLossPercent = totalInvestment !== 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    return {
      assets: enrichedAssets,
      totalCurrentValue,
      totalInvestment,
      totalProfitLoss,
      totalProfitLossPercent,
    };
  }, [rawPortfolioFromAuth, marketData]);

  // Hesaplanan değerleri kullan
  const {
    assets: portfolio,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercent
  } = enrichedPortfolioData;

  const totalAssets = virtualBalance + totalCurrentValue;

  // Pasta grafiği verisi
  const chartData = useMemo(() => {
     // .IS UZANTISI BURADA DA KALDIRILDI
     const labels = portfolio.map(asset => asset.symbol.replace('.IS', ''));
     labels.push('Nakit');
     const dataValues = portfolio.map(asset => Math.max(0, asset.totalValue));
     dataValues.push(Math.max(0, virtualBalance));
     const backgroundColors = [
       '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
       '#E7E9ED', '#839A9A', '#C6D8D7', '#B7B4A3', '#A89291', '#D6AEAD',
       '#fca5a5', '#fdba74', '#fde047', '#bef264', '#86efac', '#6ee7b7',
       '#7dd3fc', '#a5b4fc', '#c4b5fd', '#f9a8d4'
     ];
     backgroundColors.push('#9ca3af'); // Nakit rengi

     return {
        labels: labels,
        datasets: [{
             label: 'Varlık Dağılımı (₺)',
             data: dataValues,
             backgroundColor: backgroundColors.slice(0, dataValues.length),
             hoverOffset: 4,
             borderColor: '#ffffff',
             borderWidth: 1
        }],
     };
  }, [portfolio, virtualBalance]);


  // --- JSX (Render) ---

  // Giriş kontrolü
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Portföyünüzü görmek için lütfen giriş yapın.
          </h1>
          <Link to="/login" className="text-blue-600 hover:underline mt-2 inline-block">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  // Yüklenme durumu
  if (authLoading || (marketLoading && rawPortfolioFromAuth && rawPortfolioFromAuth.length > 0)) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                  {authLoading ? "Kullanıcı verileri yükleniyor..." : "Portföy değerleri güncelleniyor..."}
               </p>
          </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-8">
       {/* Başarılı İşlem Bildirimi */}
       {tradeResult && (
         <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded shadow-lg z-50 transition-opacity duration-300" role="alert">
           <div className="font-bold">
             {tradeResult.action === 'buy' ? '✅ Alım İşlemi Başarılı!' : '✅ Satış İşlemi Başarılı!'}
           </div>
           <div className="text-sm mt-1">
             {/* .IS UZANTISI BURADA DA KALDIRILDI */}
             {tradeResult.quantity} {tradeResult.symbol.startsWith('GRAM') ? 'gr' : 'adet'} {tradeResult.symbol.replace('.IS', '')} @ {tradeResult.price.toLocaleString('tr-TR')} ₺ -
             {tradeResult.action === 'buy' ? ' Toplam Maliyet:' : ' Net Gelir:'} {tradeResult.totalAmount.toLocaleString('tr-TR')} ₺
           </div>
           <div className="text-xs text-gray-600 mt-1">
             Komisyon: {tradeResult.commission.toLocaleString('tr-TR')} ₺
           </div>
            <button onClick={() => setTradeResult(null)} className="absolute top-1 right-1 text-green-700 hover:text-green-900 focus:outline-none p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
         </div>
       )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Portföyüm</h1>

      {/* Özet Kartları */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           {/* Nakit */}
           <div className="bg-white rounded-lg shadow-md p-6">
             <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nakit Bakiye</h3>
             <p className="text-2xl font-bold text-green-600">{virtualBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
           </div>
           {/* Yatırım */}
           <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Yatırım Değeri</h3>
              <p className="text-2xl font-bold text-blue-600">{totalCurrentValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
           </div>
           {/* Toplam */}
            <div className="bg-white rounded-lg shadow-md p-6">
             <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Toplam Varlık</h3>
             <p className="text-2xl font-bold text-purple-600">{totalAssets.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
           </div>
           {/* K/Z */}
           <div className="bg-white rounded-lg shadow-md p-6">
             <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Toplam Kâr/Zarar</h3>
             <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalProfitLoss.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
             <p className={`text-sm ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>({totalProfitLossPercent.toFixed(2)}%)</p>
           </div>
       </div>

      {/* Varlık Tablosu ve Pasta Grafiği */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Varlık Tablosu */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
           <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-900">Varlıklarım</h2></div>

          {portfolio.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <p>Henüz portföyünüzde hisse senedi bulunmuyor.</p>
              <Link to="/market" className="text-blue-600 hover:underline mt-2 inline-block">Piyasalara Göz At</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sembol / İsim</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ort. Maliyet</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Güncel Fiyat</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Değer</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kâr/Zarar</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">K/Z (%)</th>
                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                   </tr>
                 </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio.map((asset, index) => {
                     const isDisabled = !asset.marketDataAvailable;
                     const disabledTitle = isDisabled ? "Güncel piyasa verisi yok, işlem yapılamaz" : "";
                     // Sembolü .IS olmadan göster
                     const displaySymbol = asset.symbol.replace('.IS', '');

                     return (
                      <tr key={index} className={`hover:bg-gray-50 ${isDisabled ? 'opacity-70' : ''}`}>
                         {/* Sembol ve İsim (Değiştirildi) */}
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{displaySymbol}</div>
                            {/* İsim sembolden farklıysa göster */}
                            {asset.name && asset.name !== asset.symbol && (
                                <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-[200px]" title={asset.name}>
                                    {asset.name}
                                </div>
                            )}
                         </td>
                         {/* Miktar */}
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.quantity}</td>
                         {/* Ort. Maliyet */}
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{asset.avgPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>
                         {/* Güncel Fiyat */}
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                           {asset.marketDataAvailable
                             ? asset.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
                             : <span className="text-xs text-gray-400 italic" title="Piyasa verisi bulunamadı">({asset.avgPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)*</span>
                           }
                         </td>
                         {/* Toplam Değer */}
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">{asset.totalValue?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>
                         {/* K/Z */}
                         <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${asset.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{asset.profitLoss?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>
                         {/* K/Z % */}
                         <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${asset.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>{asset.profitLossPercent?.toFixed(2)}%</td>
                         {/* İşlemler */}
                         <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                            <button
                              onClick={() => handleTrade(asset, 'buy')}
                              disabled={isDisabled}
                              className={`text-green-600 hover:text-green-900 font-semibold px-2 py-1 rounded border border-green-200 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent`}
                              title={isDisabled ? disabledTitle : `Ek ${displaySymbol} Al`}
                            >
                              Al
                            </button>
                            <button
                              onClick={() => handleTrade(asset, 'sell')}
                              disabled={isDisabled || asset.quantity <= 0}
                              className={`ml-1 text-red-600 hover:text-red-900 font-semibold px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent`}
                              title={isDisabled ? disabledTitle : asset.quantity <= 0 ? "Satacak hisse yok" : `${displaySymbol} Sat`}
                            >
                              Sat
                            </button>
                          </td>
                      </tr>
                     );
                   })}
                </tbody>
              </table>
               {/* Dipnot */}
               {!marketLoading && portfolio.some(a => !a.marketDataAvailable) && (
                   <div className="px-6 py-2 text-xs text-gray-400 italic text-right border-t border-gray-200">
                       (*): Güncel piyasa verisi yok, ortalama maliyet baz alındı.
                   </div>
               )}
            </div>
          )}
        </div>

        {/* Pasta Grafiği */}
        <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className="text-xl font-semibold text-gray-900 mb-4">Varlık Dağılımı</h2>
          {(totalAssets > 0 && (portfolio.length > 0 || virtualBalance > 0) ) ? (
            <div className="relative mx-auto" style={{ height: '300px', maxWidth: '300px' }}>
              <Pie data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } } }} />
            </div>
          ) : (
             <div className="p-6 text-center text-gray-500">Dağılım grafiği için yeterli veri yok.</div>
          )}
        </div>
      </div>

       {/* TradeModal Component'i */}
       <TradeModal
         isOpen={tradeModal.isOpen}
         onClose={() => setTradeModal({ isOpen: false, stock: null, action: null })}
         stock={tradeModal.stock}
         action={tradeModal.action}
         onTradeSuccess={handleTradeSuccess}
       />

    </div> // Ana container div'inin kapanışı
  );
};

export default Portfolio;