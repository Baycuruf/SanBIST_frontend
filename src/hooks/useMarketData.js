// src/hooks/useMarketData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
// import { useApp } from '../App'; // BU SATIRI SİL VEYA YORUM YAP

const API_BASE_URL = 'https://sanbist-backend.onrender.com/api'; // Port 5000 olarak güncellendi

// Hook artık setter fonksiyonlarını props olarak alıyor
export const useMarketData = (
  setMarketData, // App.js'den gelen state güncelleyici
  setLoadingState, // App.js'den gelen state güncelleyici
  setErrorState, // App.js'den gelen state güncelleyici
  setMarketInfoState // App.js'den gelen state güncelleyici
) => {
  // Hook'un kendi iç state'leri (sadece dışarıya verilecek bilgiler için)
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState(null);
  const internalMarketInfo = useRef({
      lastUpdate: null,
      nextUpdate: null,
      marketStatus: 'unknown',
      dataSource: 'python-backend',
      backendStatus: 'checking',
      dataQuality: {}
  });

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if(isInitialLoad) {
        setLoadingState(true);
    }
    setInternalLoading(true);
    setErrorState(null);
    setInternalError(null);
    internalMarketInfo.current.backendStatus = 'checking';
    setMarketInfoState({...internalMarketInfo.current});

    try {
      // Port 5000'e istek
      const response = await axios.get(`${API_BASE_URL}/bist100/companies`);
      internalMarketInfo.current.backendStatus = 'running';

      if (Array.isArray(response.data)) {
        // Backend'den gelen veri (hisse, maden, döviz)
        const allData = response.data;
        
        // Veriyi global state'e yaz
        setMarketData(allData);

        // Hook'un info state'ini güncelle
        internalMarketInfo.current.lastUpdate = new Date();
        const qualityCounts = allData.reduce((acc, curr) => {
             const quality = curr.error ? 'error' : (curr.price ? 'live' : 'stale');
             acc[quality] = (acc[quality] || 0) + 1; return acc;
            }, {});
        internalMarketInfo.current.dataQuality = qualityCounts;
        
        // Piyasa durumu tahmini (BIST100 endeksine göre yapılabilir veya veriden)
        const bist100 = allData.find(item => item.symbol === 'XU100.IS');
        if (bist100 && bist100.marketState) {
            internalMarketInfo.current.marketStatus = bist100.marketState === 'REGULAR' ? 'open' : 'closed';
        } else {
            // Fallback: Veri zaman damgasına bak
            const latestTimestamp = Math.max(0, ...allData.filter(s => s.timestamp).map(s => new Date(s.timestamp).getTime()));
            if (latestTimestamp > 0) {
                const diffMinutes = (new Date().getTime() - latestTimestamp) / (1000 * 60);
                // Eğer veri 1 günden eskiyse (örn. 1440dk) veya hafta sonuysa kapalı kabul et
                internalMarketInfo.current.marketStatus = (diffMinutes < 60*12) ? 'open' : 'closed';
            } else {
                internalMarketInfo.current.marketStatus = 'unknown';
            }
        }
        
        setMarketInfoState({...internalMarketInfo.current});

      } else {
        throw new Error('API yanıt formatı beklenmedik.');
      }

    } catch (err) {
      console.error("[useMarketData] Veri çekme hatası:", err);
      internalMarketInfo.current.backendStatus = 'offline';
      let errorMessage;
      if (err.response) {
        errorMessage = `Veri sunucusundan hata (${err.response.status}): ${err.response.data?.error || err.message}`;
      } else if (err.request) {
        errorMessage = 'Veri sunucusuna ulaşılamıyor (Backend çalışıyor mu?).';
      } else {
        errorMessage = `Bir hata oluştu: ${err.message}`;
      }

      setErrorState(errorMessage);
      setInternalError(errorMessage);
      setMarketData([]);
      internalMarketInfo.current.dataQuality = {};
      internalMarketInfo.current.marketStatus = 'unknown';
      setMarketInfoState({...internalMarketInfo.current});

    } finally {
      setLoadingState(false);
      setInternalLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMarketData, setLoadingState, setErrorState, setMarketInfoState]);

  // Component mount olduğunda veriyi çek (isInitialLoad = true)
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Otomatik yenileme
  useEffect(() => {
    const interval = setInterval(() => {
      if (internalMarketInfo.current.marketStatus === 'open' && !internalLoading) {
          console.log("[useMarketData] Otomatik veri yenileme...");
          fetchData(false);
      }
    }, 15 * 60 * 1000); // 15 dakikada bir

    return () => clearInterval(interval);
  }, [fetchData, internalLoading]);


  // Hook'tan sadece yenileme fonksiyonunu döndür
  return {
    refreshData: () => fetchData(false)
  };
};
