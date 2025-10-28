// src/config/tradingConfig.js
export const TRADING_CONFIG = {
  COMMISSION_RATE: 0.002, // %0.20 komisyon
  MIN_COMMISSION: 5, // Minimum komisyon 5 ₺
  TAX_RATE: 0.0, // Stopaj (ileride eklenebilir)
};

// Komisyon hesaplama fonksiyonu
export const calculateCommission = (totalAmount) => {
  const commission = totalAmount * TRADING_CONFIG.COMMISSION_RATE;
  return Math.max(commission, TRADING_CONFIG.MIN_COMMISSION);
};

// Toplam maliyet hesaplama (alım için)
export const calculateTotalCost = (quantity, price) => {
  const baseCost = quantity * price;
  const commission = calculateCommission(baseCost);
  return {
    baseCost,
    commission,
    totalCost: baseCost + commission
  };
};

// Net gelir hesaplama (satış için)
export const calculateNetRevenue = (quantity, price) => {
  const baseRevenue = quantity * price;
  const commission = calculateCommission(baseRevenue);
  return {
    baseRevenue,
    commission,
    netRevenue: baseRevenue - commission
  };
};