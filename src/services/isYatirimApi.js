// src/services/isYatirimApi.js
const API_BASE_URL = 'http://localhost:5000/api';

// Python backend'den GERÇEK market verilerini çek
export const getMarketDataFromBackend = async () => {
  try {
    console.log('📡 GENİŞLETİLMİŞ İş Yatırım verileri çekiliyor...');
    
    const response = await fetch(`${API_BASE_URL}/market-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend hatası: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      console.log(`✅ GENİŞLETİLMİŞ veriler alındı: ${result.data.length} varlık`);
      console.log(`📊 Dağılım: ${result.breakdown?.stocks || 0} hisse, ${result.breakdown?.metals || 0} kıymetli maden`);
      
      return {
        success: true,
        data: result.data,
        source: result.source || 'is-yatirim-extended',
        lastUpdate: new Date(result.lastUpdate),
        timestamp: new Date(),
        breakdown: result.breakdown || { stocks: 0, metals: 0, total: 0 },
        // dataQuality yerine breakdown kullan
        dataQuality: {
          real: result.breakdown?.stocks || 0,
          fallback: 0,
          metals: result.breakdown?.metals || 0
        }
      };
    } else {
      throw new Error('Backend veri formatı hatası');
    }
    
  } catch (error) {
    console.error('❌ GENİŞLETİLMİŞ veri çekme hatası:', error);
    
    // Fallback data - genişletilmiş
    return {
      success: false,
      data: getExtendedFallbackData(),
      source: 'mock-fallback-extended',
      lastUpdate: new Date(),
      timestamp: new Date(),
      breakdown: { stocks: 40, metals: 7, total: 47 },
      dataQuality: { real: 0, fallback: 40, metals: 7 }
    };
  }
};

// Manuel yenileme
export const refreshMarketData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Refresh hatası: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('🔄 Manuel yenileme başarılı');
    return result;
  } catch (error) {
    console.error('❌ Manuel yenileme hatası:', error);
    throw error;
  }
};

// Backend durumunu kontrol et
export const checkBackendStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`Status hatası: ${response.status}`);
    }
    
    const result = await response.json();
    return { 
      status: result.status, 
      lastUpdate: result.lastUpdate ? new Date(result.lastUpdate) : null,
      dataCount: result.dataCount || 0,
      breakdown: result.breakdown || { stocks: 0, metals: 0 }
    };
  } catch (error) {
    console.error('❌ Backend status hatası:', error);
    return { 
      status: 'offline', 
      error: error.message,
      lastUpdate: null,
      dataCount: 0,
      breakdown: { stocks: 0, metals: 0 }
    };
  }
};

// Genişletilmiş fallback data
const getExtendedFallbackData = () => {
  const stockPrices = {
    'THYAO': 132.50, 'GARAN': 47.20, 'AKBNK': 39.85, 'YKBNK': 18.45,
    'ISCTR': 9.80, 'HALKB': 15.20, 'VAKBN': 22.10, 'ICBCT': 6.75,
    'KCHOL': 188.40, 'SAHOL': 94.25, 'ALARK': 85.60, 'DOAS': 42.30,
    'KOZAA': 12.95, 'KOZAL': 8.40, 'ASELS': 248.90, 'HEKTS': 15.80,
    'TCELL': 87.60, 'TKNSA': 12.35, 'FROTO': 845.00, 'TOASO': 245.80,
    'OTKAR': 320.50, 'FORD': 65.40, 'EREGL': 57.80, 'SASA': 45.20,
    'BRSAN': 120.75, 'CCOLA': 580.00, 'AEFES': 185.30, 'TUPRS': 152.75,
    'TUKAS': 28.90, 'BIMAS': 485.30, 'MGROS': 420.80, 'SISE': 38.75,
    'CIMSA': 15.60, 'MIGROS': 425.00, 'ARCLK': 210.45, 'VESBE': 85.20,
    'VESTL': 9.85, 'PETKM': 18.90, 'TSPOR': 12.30, 'PGSUS': 245.60,
    'KORDS': 45.80, 'DOCO': 42.10, 'TTKOM': 12.45, 'AKSA': 46.75,
    'CLEBI': 245.00, 'ISDMR': 32.80
  };
  
  const metalPrices = {
    'ALTIN': 2450, 'GUMUS': 28.5, 'USDTRY': 32.15, 'EURTRY': 34.80,
    'GBPTRY': 40.50, 'XAUUSD': 1950, 'XAGUSD': 23.20
  };
  
  const stockData = Object.entries(stockPrices).map(([symbol, basePrice]) => {
    const changePercent = (Math.random() * 6 - 3); // -3% ile +3% arası
    const change = (basePrice * changePercent) / 100;
    const currentPrice = basePrice + change;
    
    return {
      symbol: symbol,
      name: getStockName(symbol),
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((currentPrice * 1.03).toFixed(2)),
      low: parseFloat((currentPrice * 0.97).toFixed(2)),
      volume: Math.floor(100000 + Math.random() * 5000000),
      timestamp: new Date().toISOString(),
      dataQuality: 'fallback',
      type: 'stock'
    };
  });
  
  const metalData = Object.entries(metalPrices).map(([symbol, basePrice]) => {
    const changePercent = (Math.random() * 4 - 2); // -2% ile +2% arası
    const change = (basePrice * changePercent) / 100;
    const currentPrice = basePrice + change;
    
    return {
      symbol: symbol,
      name: getMetalName(symbol),
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((currentPrice * 1.02).toFixed(2)),
      low: parseFloat((currentPrice * 0.98).toFixed(2)),
      volume: Math.floor(50000 + Math.random() * 500000),
      timestamp: new Date().toISOString(),
      dataQuality: 'simulated',
      type: 'metal'
    };
  });
  
  return [...stockData, ...metalData];
};

const getStockName = (symbol) => {
  const names = {
    'THYAO': 'Türk Hava Yolları', 'GARAN': 'Garanti Bankası', 'AKBNK': 'Akbank',
    'YKBNK': 'Yapı Kredi Bankası', 'ISCTR': 'İş Bankası', 'HALKB': 'Halkbank',
    'VAKBN': 'Vakıfbank', 'ICBCT': 'ICBC Turkey', 'KCHOL': 'Koç Holding',
    'SAHOL': 'Sabancı Holding', 'ALARK': 'Alarko', 'DOAS': 'Doğuş Holding',
    'KOZAA': 'Koza Altın', 'KOZAL': 'Koza Anadolu', 'ASELS': 'Aselsan',
    'HEKTS': 'Hektaş', 'TCELL': 'Turkcell', 'TKNSA': 'Türk Telekom',
    'FROTO': 'Ford Otosan', 'TOASO': 'Tofaş', 'OTKAR': 'Otokar', 'FORD': 'Ford',
    'EREGL': 'Ereğli Demir Çelik', 'SASA': 'Sasa', 'BRSAN': 'Borusan',
    'CCOLA': 'Coca-Cola', 'AEFES': 'Anadolu Efes', 'TUPRS': 'Tüpraş',
    'TUKAS': 'Tukaş', 'BIMAS': 'Bim Mağazalar', 'MGROS': 'Migros',
    'SISE': 'Şişe Cam', 'CIMSA': 'Çimsa', 'MIGROS': 'Migros', 'ARCLK': 'Arçelik',
    'VESBE': 'Vestel Beyaz', 'VESTL': 'Vestel', 'PETKM': 'Petkim',
    'TSPOR': 'Trabzonspor', 'PGSUS': 'Pegasus', 'KORDS': 'Kordsa',
    'DOCO': 'Döhler', 'TTKOM': 'Türk Telekom', 'AKSA': 'Aksa',
    'CLEBI': 'Çelebi', 'ISDMR': 'İş Yatırım'
  };
  return names[symbol] || symbol;
};

const getMetalName = (symbol) => {
  const names = {
    'ALTIN': 'Altın (Gram)', 'GUMUS': 'Gümüş (Gram)', 'USDTRY': 'Dolar/TL',
    'EURTRY': 'Euro/TL', 'GBPTRY': 'Sterlin/TL', 'XAUUSD': 'Altın (Ons)',
    'XAGUSD': 'Gümüş (Ons)'
  };
  return names[symbol] || symbol;
};