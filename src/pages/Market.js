// src/pages/Market.js
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import TradeModal from '../components/TradeModal';
// AssetCard import kaldırıldı
import AssetDetailModal from '../components/AssetDetailModal'; // Detay modalı import edildi
import { Link } from 'react-router-dom';

// Sektör isimlerini Türkçeleştirmek için bir harita
const SECTOR_MAP = {
  'financial-services': 'Finansal Hizmetler',
  'basic-materials': 'Temel Materyaller',
  'conglomerates': 'Holdingler',
  'consumer-cyclical': 'Tüketici Ürünleri (Döngüsel)',
  'consumer-defensive': 'Tüketici Ürünleri (Savunmacı)',
  'energy': 'Enerji',
  'healthcare': 'Sağlık',
  'industrials': 'Endüstriyel',
  'real-estate': 'Gayrimenkul',
  'technology': 'Teknoloji',
  'communication-services': 'İletişim Hizmetleri',
  'utilities': 'Kamu Hizmetleri',
  'diğer': 'Diğer',
  'bilinmiyor': 'Bilinmiyor',
  'maden': 'Maden',
  'doviz': 'Döviz'
};

// Varlık tiplerini Türkçeleştirmek için (Grup başlıkları)
const TYPE_MAP = {
    'hisse': 'Hisseler',
    'doviz': 'Döviz Kurları (TL)',
    'maden_gram': 'Değerli Madenler (TL)',
    'maden_ons': 'Değerli Madenler (USD/Ons)',
    'doviz_capraz': 'Çapraz Kurlar (Parite)'
};

const Market = () => {
  const {
    user, marketData, loading: marketLoading, marketError: error,
    marketInfo, refreshMarketData
  } = useApp();

  const [activeTab, setActiveTab] = useState('hisse');
  const [tradeModal, setTradeModal] = useState({ isOpen: false, stock: null, action: null });
  const [tradeResult, setTradeResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Detay Modalı State ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  // --- BİTTİ ---

  // --- Helper Fonksiyonlar ---
  const handleTrade = (stock, action) => {
     const isNonTLAsset = stock.type === 'maden_ons' || stock.type === 'doviz_capraz';
     if (!stock || typeof stock.price !== 'number' || stock.price <= 0 || stock.error || isNonTLAsset) {
        let alertMessage = "Bu varlık için şu an işlem yapılamaz.";
        if (!stock.price || typeof stock.price !== 'number' || stock.price <= 0) { alertMessage += " (Geçerli fiyat yok)"; }
        else if (stock.error) { alertMessage += ` (Veri hatası: ${stock.error})`; }
        else if (isNonTLAsset) { alertMessage += " (Sadece TL cinsinden varlıklar alınıp satılabilir)"; }
        alert(alertMessage);
        return;
      }
     const stockForModal = stock;
     setTradeModal({ isOpen: true, stock: stockForModal, action });
  };

  const handleTradeSuccess = (result) => {
    setTradeModal({ isOpen: false, stock: null, action: null });
    setTradeResult(result);
    setTimeout(() => setTradeResult(null), 5000);
  };

  // --- YENİ: Detay Modalını Açan Fonksiyon ---
  const handleShowDetails = (asset) => {
      setSelectedAsset(asset);
      setIsDetailModalOpen(true);
  };
  // --- BİTTİ ---

  const formatTimeRemaining = (nextUpdate) => {
    if (!nextUpdate) return '';
    const now = new Date();
    const diff = nextUpdate.getTime() - now.getTime();
    if (diff <= 0) return 'Şimdi';
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (minutes > 0) return `${minutes} dk ${seconds} sn`;
    return `${seconds} sn`;
   };
  const getDataSourceColor = (source) => {
    switch(source) {
      case 'python-backend': return 'bg-blue-100 text-blue-800';
      case 'cache': return 'bg-yellow-100 text-yellow-800';
      case 'mock-fallback': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
   const getDataSourceText = (source) => {
     switch(source) {
       case 'python-backend': return 'Python Backend (yfinance)';
       case 'cache': return 'Önbellek';
       case 'mock-fallback': return 'Yedek Veri';
       default: return source || 'Bilinmiyor';
     }
   };
  // --- Helper Fonksiyonlar Sonu ---

  // --- Veri Filtreleme, Gruplama ve ARAMA (useMemo ile) ---
  const filteredAndGroupedData = useMemo(() => {
    if (!marketData) return { filtered: [], grouped: {}, sortedGroupKeys: [] };
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    const searchedData = !lowerCaseSearchTerm ? marketData : marketData.filter(item => {
        const displaySymbol = item.symbol.replace('.IS', '').toLowerCase();
        const name = item.name?.toLowerCase() || '';
        return displaySymbol.includes(lowerCaseSearchTerm) || name.includes(lowerCaseSearchTerm);
    });
    let filtered = [];
    if (activeTab === 'hisse') { filtered = searchedData.filter(item => item.type === 'hisse'); }
    else if (activeTab === 'maden') { filtered = searchedData.filter(item => item.type === 'maden_gram' || item.type === 'maden_ons'); }
    else if (activeTab === 'doviz') { filtered = searchedData.filter(item => item.type === 'doviz' || item.type === 'doviz_capraz'); }
    else { filtered = searchedData; }

    let grouped = {};
    if (searchTerm) { // Eğer arama varsa, gruplama yapma, tek grup döndür
        grouped = {'arama_sonuclari': filtered };
    } else if (activeTab === 'hisse') {
       grouped = filtered.reduce((acc, stock) => { const sector = stock.sector || 'bilinmiyor'; if (!acc[sector]) { acc[sector] = []; } acc[sector].push(stock); return acc; }, {});
    } else if (activeTab === 'maden') {
       grouped = filtered.reduce((acc, item) => { const groupKey = item.type === 'maden_gram' ? 'maden_gram' : 'maden_ons'; if (!acc[groupKey]) acc[groupKey] = []; acc[groupKey].push(item); return acc; }, {});
    } else if (activeTab === 'doviz') {
       grouped = filtered.reduce((acc, item) => { const groupKey = item.type === 'doviz' ? 'doviz' : 'doviz_capraz'; if (!acc[groupKey]) acc[groupKey] = []; acc[groupKey].push(item); return acc; }, {});
    }

    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'arama_sonuclari') return -1; // Arama sonuçları her zaman üstte (gerçi tek grup olacak)
        if (b === 'arama_sonuclari') return 1;
        if(activeTab === 'hisse') { return (SECTOR_MAP[a] || a).localeCompare(SECTOR_MAP[b] || b); }
        if(activeTab === 'maden') return a === 'maden_gram' ? -1 : (a === 'maden_ons' ? 1 : 0);
        if(activeTab === 'doviz') return a === 'doviz' ? -1 : (a === 'doviz_capraz' ? 1 : 0);
        return 0;
    });
    return { filtered, grouped, sortedGroupKeys };
  }, [marketData, activeTab, searchTerm]);
  // --- Veri Filtreleme Sonu ---

  // Giriş kontrolü
  if (!user) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900"> Piyasa verilerini görmek için lütfen giriş yapın. </h1>
            <Link to="/login" className="text-blue-600 hover:underline mt-2 inline-block">Giriş Yap</Link>
          </div>
        );
  }

  // --- JSX (Render) ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Başarılı İşlem Bildirimi */}
      {tradeResult && (
        <div className="fixed top-20 sm:top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded shadow-lg z-50 transition-opacity duration-300" role="alert">
          <div className="font-bold"> {tradeResult.action === 'buy' ? '✅ Alım İşlemi Başarılı!' : '✅ Satış İşlemi Başarılı!'} </div>
          <div className="text-sm mt-1"> {tradeResult.quantity} {tradeResult.symbol.startsWith('GRAM') ? 'gr' : 'adet'} {tradeResult.symbol.replace('.IS', '')} @ {tradeResult.price.toLocaleString('tr-TR')} ₺ - {tradeResult.action === 'buy' ? ' Toplam Maliyet:' : ' Net Gelir:'} {tradeResult.totalAmount.toLocaleString('tr-TR')} ₺ </div>
          <div className="text-xs text-gray-600 mt-1"> Komisyon: {tradeResult.commission.toLocaleString('tr-TR')} ₺ </div>
          <button onClick={() => setTradeResult(null)} className="absolute top-1 right-1 text-green-700 hover:text-green-900 focus:outline-none p-1"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> </button>
        </div>
      )}

      {/* Sayfa Başlığı ve Bilgi Paneli */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900">Piyasalar</h1>
           {/* Market Info */}
           <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm">
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${ marketInfo.backendStatus === 'running' ? 'bg-green-100 text-green-800' : marketInfo.backendStatus === 'offline' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}> <span className={`w-2 h-2 rounded-full mr-1.5 ${ marketInfo.backendStatus === 'running' ? 'bg-green-500' : marketInfo.backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`}></span> Backend: {marketInfo.backendStatus === 'running' ? 'Aktif' : marketInfo.backendStatus === 'offline' ? 'Çevrimdışı' : 'Kontrol'} </span>
             {marketInfo.dataSource && marketInfo.dataSource !== 'unknown' && (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${getDataSourceColor(marketInfo.dataSource)}`}> Kaynak: {getDataSourceText(marketInfo.dataSource)}</span>)}
             {marketInfo.dataQuality && Object.keys(marketInfo.dataQuality).length > 0 && (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800"> Kalite: {Object.entries(marketInfo.dataQuality).map(([key, value]) => value > 0 ? ` ${value} ${key}` : null).filter(Boolean).join(',') || ' Yok'}</span>)}
             {marketInfo.marketStatus && marketInfo.marketStatus !== 'unknown' && (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${ marketInfo.marketStatus === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}> <span className={`w-2 h-2 rounded-full mr-1.5 ${ marketInfo.marketStatus === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></span> Borsa: {marketInfo.marketStatus === 'open' ? 'Açık' : 'Kapalı'}</span>)}
             {marketInfo.lastUpdate && (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800"> Son Veri: {marketInfo.lastUpdate.toLocaleTimeString('tr-TR')}</span>)}
           </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
             {/* ARAMA ÇUBUĞU */}
             <div className="relative w-full sm:w-64">
                 <input type="text" placeholder="Sembol veya Şirket Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm pr-10" />
                 <span className="absolute inset-y-0 right-0 flex items-center pr-3"> <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg> </span>
             </div>
           {/* Yenile Butonu (Düzeltilmiş) */}
<button
  onClick={() => refreshMarketData()}
  disabled={marketLoading}
  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition duration-150 ease-in-out w-full sm:w-auto"
>
  {marketLoading ? (
    <>
      {/* Yükleniyor ikonu */}
      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {/* Yükleniyor yazısı (div içinde değil) */}
      Yenileniyor...
    </>
  ) : (
    <>
      {/* Yenile ikonu */}
      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 00-15.357-2m15.357 2H15" />
      </svg>
      {/* Yenile yazısı (div içinde değil) */}
      Yenile
    </>
  )}
</button>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">Bir Hata Oluştu</p> <p>{error}</p>
          <button onClick={() => refreshMarketData()} className="mt-2 text-sm text-red-800 underline hover:text-red-900 focus:outline-none"> Tekrar Deneyin </button>
        </div>
      )}

      {/* SEKMELİ YAPI (TABS) */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
             <button onClick={() => { setActiveTab('hisse'); setSearchTerm(''); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === 'hisse' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}> Hisseler (BIST100) </button>
             <button onClick={() => { setActiveTab('maden'); setSearchTerm(''); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === 'maden' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}> Değerli Madenler </button>
             <button onClick={() => { setActiveTab('doviz'); setSearchTerm(''); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === 'doviz' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}> Döviz Kurları </button>
          </nav>
        </div>
      </div>

      {/* Yüklenme Durumu */}
      {marketLoading && (!marketData || marketData.length === 0) ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" /*...*/><circle/><path/></svg>
              <p className="mt-4 text-gray-600">Piyasa verileri yükleniyor...</p>
          </div>
      ) : ( /* Kategorize Edilmiş Veri Gösterimi (TABLOLARLA) */
        <div className="space-y-8">
            {filteredAndGroupedData.sortedGroupKeys.length === 0 && !marketLoading && (
                 <div className="bg-white rounded-lg shadow-md p-8 text-center">
                     <p className="text-gray-500"> {searchTerm ? `"${searchTerm}" için sonuç bulunamadı.` : 'Bu kategoride veri bulunamadı.'} </p>
                     {searchTerm && ( <button onClick={() => setSearchTerm('')} className="mt-4 text-sm text-blue-600 hover:underline"> Aramayı Temizle </button> )}
                 </div>
            )}

            {filteredAndGroupedData.sortedGroupKeys.map(groupKey => {
                const groupItems = filteredAndGroupedData.grouped[groupKey];
                let groupTitle = groupKey;
                if (activeTab === 'hisse') { groupTitle = SECTOR_MAP[groupKey] || groupKey.charAt(0).toUpperCase() + groupKey.slice(1); }
                else if (activeTab === 'maden') { groupTitle = TYPE_MAP[groupKey] || 'Madenler'; }
                else if (activeTab === 'doviz') { groupTitle = TYPE_MAP[groupKey] || 'Döviz'; }
                else if (groupKey === 'arama_sonuclari') { groupTitle = `"${searchTerm}" Arama Sonuçları (${groupItems.length})`;}

                return (
                    <div key={groupKey} className="bg-white rounded-lg shadow-md overflow-hidden">
                      {/* Grup Başlığı */}
                      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800 leading-tight"> {groupTitle} </h2>
                      </div>
                      {/* --- TABLO YAPISI --- */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sembol / İsim</th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Günlük Değişim (%)</th>
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupItems.map((item, index) => {
                              const isDataInvalid = !item.price || typeof item.price !== 'number' || item.price <= 0 || item.error;
                              const isNonTLAsset = item.type === 'maden_ons' || item.type === 'doviz_capraz';
                              const isDisabled = isDataInvalid || isNonTLAsset;
                              const disabledTitle = isDataInvalid ? (!item.price ? "Fiyat bilgisi yok" : item.error ? `Veri hatası: ${item.error}` : "Geçersiz fiyat") : (isNonTLAsset ? "Sadece TL varlıklar alınabilir/satılabilir" : "");
                              const displaySymbol = item.symbol.replace('.IS', '');
                              let priceSuffix = (item.type === 'doviz' || item.type === 'maden_gram' || item.type === 'hisse') ? ' ₺' : ((item.type === 'maden_ons' || item.symbol === 'EURUSD=X') ? ' $' : '');

                              return (
                                // Satır (Tıklanabilir değil, sadece ilk hücre tıklanabilir)
                                <tr key={item.symbol || index} className={`hover:bg-gray-100 ${isDisabled ? 'opacity-60' : ''}`}>
                                  {/* Sembol ve İsim (Tıklanabilir) */}
                                  <td
                                    className="px-6 py-4 whitespace-nowrap cursor-pointer group"
                                    onClick={() => handleShowDetails(item)} // Sadece bu hücreye tıklandığında modal açılır
                                    title={`${displaySymbol} detaylarını gör`}
                                  >
                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{displaySymbol}</div>
                                    {item.name && item.name !== item.symbol && (
                                      <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-[200px]" title={item.name}> {item.name} </div>
                                    )}
                                    {item.error && <div className="text-xs text-red-500 mt-1" title={item.error}>Hata alındı</div>}
                                  </td>
                                  {/* Fiyat */}
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                    {typeof item.price === 'number'
                                      ? item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + priceSuffix
                                      : <span className="text-gray-400">-</span>
                                    }
                                  </td>
                                  {/* Değişim */}
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                     {typeof item.price === 'number' && typeof item.previousClose === 'number' && item.previousClose !== 0 ? (
                                        (() => {
                                            const change = ((item.price - item.previousClose) / item.previousClose) * 100;
                                            return ( <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}> {change >= 0 ? '+' : ''}{change.toFixed(2)}% </span> );
                                        })()
                                     ) : ( <span className="text-gray-400">-</span> )}
                                  </td>
                                  {/* İşlem Butonları (stopPropagation ile) */}
                                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button onClick={(e) => { e.stopPropagation(); handleTrade(item, 'buy'); }} disabled={isDisabled} className={`text-green-600 hover:text-green-900 font-semibold px-3 py-1 rounded border border-green-300 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent`} title={isDisabled ? disabledTitle : "Al"}> Al </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleTrade(item, 'sell'); }} disabled={isDisabled} className={`ml-2 text-red-600 hover:text-red-900 font-semibold px-3 py-1 rounded border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent`} title={isDisabled ? disabledTitle : "Sat"}> Sat </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* Bilgilendirme Kutusu */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
             <div className="flex-shrink-0"> <svg className="h-5 w-5 text-blue-400" /* ... */ ><path /* ... */ /></svg> </div>
             <div className="ml-3">
               <h3 className="text-sm font-medium text-blue-800">Sanal Borsa Bilgilendirme</h3>
               <div className="mt-2 text-sm text-blue-700">
                 <ul className="list-disc list-inside space-y-1">
                   <li>Piyasa verileri Python backend'i aracılığıyla yaklaşık 15 dakika gecikmeli olarak çekilmektedir.</li>
                   <li>Gram Altın, Gümüş ve Platin fiyatları, Ons fiyatları ve USD/TRY kuru üzerinden sunucuda hesaplanmaktadır.</li>
                   <li>Sanal alım/satım işlemleri sadece TL cinsinden varlıklar (Hisseler, Gram Madenler, TL Döviz Kurları) için yapılabilir.</li>
                   <li>Veri alınamayan veya hatalı olan varlıklar için işlem yapılamaz.</li>
                 </ul>
               </div>
             </div>
           </div>
      </div>

      {/* Alım/Satım Modalı */}
      <TradeModal
        isOpen={tradeModal.isOpen}
        onClose={() => setTradeModal({ isOpen: false, stock: null, action: null })}
        stock={tradeModal.stock}
        action={tradeModal.action}
        onTradeSuccess={handleTradeSuccess}
      />

      {/* Detay Modalı */}
      <AssetDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        asset={selectedAsset}
      />

    </div>
  );
};

export default Market;