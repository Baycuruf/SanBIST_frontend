// src/services/marketApi.js
// Geçici mock data - gerçek API'ler entegre edilecek
export const getBISTData = async () => {
  // Mock BIST verileri
  return [
    { symbol: "THYAO", name: "Türk Hava Yolları", price: 130.25, change: 2.5 },
    { symbol: "GARAN", name: "Garanti Bankası", price: 45.80, change: -1.2 },
    { symbol: "AKBNK", name: "Akbank", price: 38.90, change: 0.8 },
    { symbol: "ASELS", name: "Aselsan", price: 245.60, change: 3.1 },
    { symbol: "KOZAA", name: "Koza Altın", price: 12.45, change: -0.5 },
    { symbol: "EREGL", name: "Ereğli Demir Çelik", price: 56.30, change: 1.7 }
  ];
};

export const getMetalPrices = async () => {
  // Mock kıymetli maden verileri
  return [
    { symbol: "ALTIN", name: "Altın (Gram)", price: 2450.75, change: 0.8 },
    { symbol: "GUMUS", name: "Gümüş (Gram)", price: 28.45, change: -0.3 },
    { symbol: "PLATIN", name: "Platin (Gram)", price: 1200.30, change: 1.2 }
  ];
};