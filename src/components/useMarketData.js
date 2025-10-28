// src/hooks/useMarketData.js
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { getMarketDataFromBackend, checkBackendStatus } from '../services/isYatirimApi';
import { TRADING_HOURS, isMarketOpen, getNextUpdateTime } from '../config/tradingHours';

export const useMarketData = () => {
  const { marketData, setMarketData } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);
  const [marketStatus, setMarketStatus] = useState('checking');
  const [dataSource, setDataSource] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [dataQuality, setDataQuality] = useState({ real: 0, fallback: 0 });

  // Backend durumunu kontrol et
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkBackendStatus();
      setBackendStatus(status.status);
    };
    
    checkStatus();
    // Her 30 saniyede bir backend durumunu kontrol et
    const statusInterval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(statusInterval);
  }, []);

  // Veri çekme fonksiyonu
  const fetchMarketData = useCallback(async () => {
    const marketOpen = isMarketOpen();
    setMarketStatus(marketOpen ? 'open' : 'closed');

    // Borsa kapalı ve backend offline ise güncelleme yapma
    if (!marketOpen && backendStatus === 'offline') {
      console.log('⏸️  Borsa kapalı ve backend offline, güncelleme atlandı');
      setNextUpdate(getNextUpdateTime());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 GERÇEK piyasa verileri güncelleniyor...');
      
      const result = await getMarketDataFromBackend();
      
      setDataSource(result.source);
      setLastUpdate(result.lastUpdate);
      setDataQuality(result.dataQuality || { real: 0, fallback: 0 });
      
      if (result.success) {
        setMarketData(result.data);
        setNextUpdate(getNextUpdateTime());
        
        console.log(`✅ Gerçek veriler güncellendi: ${result.data.length} hisse`);
        
        // Local storage'a kaydet
        localStorage.setItem('lastMarketUpdate', result.lastUpdate.toISOString());
        localStorage.setItem('marketData', JSON.stringify(result.data));
        localStorage.setItem('dataSource', result.source);
        localStorage.setItem('dataQuality', JSON.stringify(result.dataQuality));
        
      } else {
        throw new Error('Gerçek veri alınamadı');
      }
      
    } catch (err) {
      console.error('❌ Gerçek veri güncelleme hatası:', err);
      setError(err.message);
      setDataSource('error');
      
      // Son kayıtlı verileri yükle
      const savedData = localStorage.getItem('marketData');
      const savedSource = localStorage.getItem('dataSource');
      const savedQuality = localStorage.getItem('dataQuality');
      
      if (savedData) {
        setMarketData(JSON.parse(savedData));
        setDataSource(savedSource || 'cache');
        setDataQuality(JSON.parse(savedQuality || '{"real":0,"fallback":0}'));
        console.log('💾 Kayıtlı veriler yüklendi');
      }
    } finally {
      setLoading(false);
    }
  }, [setMarketData, backendStatus]);

  // İlk yükleme
  useEffect(() => {
    const initializeMarketData = async () => {
      const marketOpen = isMarketOpen();
      setMarketStatus(marketOpen ? 'open' : 'closed');
      
      // Backend durumunu kontrol et
      const status = await checkBackendStatus();
      setBackendStatus(status.status);
      
      // Backend çalışıyorsa veya borsa açıksa verileri güncelle
      if (status.status === 'running' || marketOpen) {
        await fetchMarketData();
      } else {
        // Backend offline ve borsa kapalıysa kayıtlı verileri yükle
        const savedData = localStorage.getItem('marketData');
        if (savedData) {
          setMarketData(JSON.parse(savedData));
          setDataSource('cache');
          setLoading(false);
          console.log('💾 Kayıtlı veriler yüklendi (backend offline)');
        } else {
          await fetchMarketData();
        }
      }
    };

    initializeMarketData();
  }, [fetchMarketData, setMarketData]);

  // Otomatik güncelleme interval'i
  useEffect(() => {
    if (!lastUpdate) return;

    const updateInterval = isMarketOpen() 
      ? TRADING_HOURS.DATA_UPDATE_INTERVAL
      : TRADING_HOURS.AFTER_HOURS_UPDATE_INTERVAL;

    console.log(`⏰ Sonraki güncelleme: ${updateInterval / (1000 * 60)} dakika sonra`);

    const intervalId = setInterval(() => {
      if (isMarketOpen() || backendStatus === 'running') {
        fetchMarketData();
      } else {
        console.log('⏸️  Güncelleme koşulları uygun değil');
        setNextUpdate(getNextUpdateTime());
      }
    }, updateInterval);

    return () => clearInterval(intervalId);
  }, [lastUpdate, fetchMarketData, backendStatus]);

  // Borsa açılış kontrolü
  useEffect(() => {
    const checkMarketSchedule = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Borsa açılışına 1 dakika kala hazırlık
      if (currentHour === 9 && currentMinute === 59 && marketStatus !== 'open') {
        console.log('🔔 Borsa açılışına 1 dakika kaldı, hazırlık yapılıyor...');
      }
      
      // Borsa açıldığında verileri güncelle
      if (currentHour === 10 && currentMinute === 0 && marketStatus !== 'open') {
        console.log('🏛️  Borsa açıldı! Veriler güncelleniyor...');
        setMarketStatus('open');
        fetchMarketData();
      }
      
      // Borsa kapanışı
      if (currentHour === 18 && currentMinute === 0 && marketStatus !== 'closed') {
        console.log('🏛️  Borsa kapandı!');
        setMarketStatus('closed');
      }
    };

    // Her dakika borsa durumunu kontrol et
    const scheduleCheckInterval = setInterval(checkMarketSchedule, 60000);
    
    return () => clearInterval(scheduleCheckInterval);
  }, [marketStatus, fetchMarketData]);

  return {
    marketData,
    loading,
    error,
    lastUpdate,
    nextUpdate,
    marketStatus,
    dataSource,
    backendStatus,
    dataQuality,
    refreshData: fetchMarketData
  };
};