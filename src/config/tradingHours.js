// src/config/tradingHours.js
export const TRADING_HOURS = {
  MARKET_OPEN: 10, // 10:00
  MARKET_CLOSE: 18, // 18:00
  DATA_UPDATE_INTERVAL: 15 * 60 * 1000, // 15 dakika (milisaniye)
  AFTER_HOURS_UPDATE_INTERVAL: 60 * 60 * 1000 // 60 dakika (borsa kapalıyken)
};

// Borsa açık mı kontrolü
export const isMarketOpen = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + currentMinute / 100;

  // Hafta içi kontrolü (Pazartesi-Cuma)
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // Borsa saatleri: 10:00 - 18:00
  const isTradingHours = currentTime >= 10.00 && currentTime < 18.00;

  return isWeekday && isTradingHours;
};

// Sonraki veri güncelleme zamanını hesapla
export const getNextUpdateTime = () => {
  const now = new Date();
  
  if (isMarketOpen()) {
    // Borsa açıksa 15 dakika sonra
    return new Date(now.getTime() + TRADING_HOURS.DATA_UPDATE_INTERVAL);
  } else {
    // Borsa kapalıysa ertesi gün 10:00'da
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(10, 0, 0, 0);
    return nextDay;
  }
};