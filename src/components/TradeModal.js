// src/components/TradeModal.js (veya al/sat yapılan yer)
import React, { useState } from 'react';
import { useApp } from '../App'; // AppContext'i kullanmak için
import { buyStock, sellStock } from '../services/portfolioService'; // Firestore işlemlerini import et
import { calculateTotalCost, calculateNetRevenue } from '../config/tradingConfig'; // Maliyet hesaplama

const TradeModal = ({ isOpen, onClose, stock, action, onTradeSuccess }) => {
    // ... (modal'ın diğer state'leri: quantity, loading, error vb.)
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // AppContext'ten gerekli fonksiyonları ve bilgileri al
    const { user, virtualBalance, setPortfolio, setVirtualBalance, portfolio: currentPortfolio } = useApp();

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setQuantity(isNaN(value) || value < 1 ? 1 : value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !stock || quantity <= 0) return;

        setLoading(true);
        setError('');

        try {
            let result;
            if (action === 'buy') {
                result = await buyStock(user.uid, stock, quantity, stock.price); // portfolioService'i çağır
                console.log("Alım başarılı:", result);
            } else { // action === 'sell'
                 // Satış yapmadan önce portföydeki miktarı tekrar kontrol et (opsiyonel ama güvenli)
                 const assetInPortfolio = currentPortfolio.find(p => p.symbol === stock.symbol);
                 if (!assetInPortfolio || assetInPortfolio.quantity < quantity) {
                     throw new Error("Satış için yeterli hisse yok.");
                 }
                result = await sellStock(user.uid, stock, quantity, stock.price); // portfolioService'i çağır
                console.log("Satış başarılı:", result);
            }

            // !!! ÖNEMLİ: Firestore BAŞARIYLA güncellendikten SONRA AppContext state'ini güncelle !!!
            // Not: portfolioService fonksiyonları artık güncel portföyü döndürmüyorsa,
            // burada getPortfolioData'yı tekrar çağırmak gerekebilir, ama onSnapshot bunu gereksiz kılar.
            // onSnapshot kullandığımız için bu satırlara artık GEREK YOK! Firestore dinleyicisi state'i güncelleyecek.
            // setPortfolio(result.portfolio); // <--- BU SATIRI SİL veya YORUM SATIRINA AL
            // setVirtualBalance(result.newBalance); // <--- BU SATIRI SİL veya YORUM SATIRINA AL

            // Başarı bildirimi için callback'i çağır (bu kalmalı)
            onTradeSuccess({
                action: action,
                symbol: stock.symbol,
                quantity: quantity,
                price: stock.price,
                totalAmount: result.transaction.totalAmount, // Service'den dönen işlem tutarı
                commission: result.transaction.commission, // Service'den dönen komisyon
            });
            // onClose(); // Modal'ı burada kapatabiliriz veya onTradeSuccess içinde

        } catch (err) {
            console.error(`İşlem hatası (${action}):`, err);
            setError(err.message || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Modal kapanınca state'leri sıfırla
    const handleClose = () => {
        setQuantity(1);
        setError('');
        setLoading(false);
        onClose();
    };

    if (!isOpen || !stock) return null;

    // Maliyet/Gelir hesaplaması (önizleme için)
    const calculation = action === 'buy'
        ? calculateTotalCost(quantity, stock.price)
        : calculateNetRevenue(quantity, stock.price);

    // Maksimum alınabilecek/satılabilecek miktar (opsiyonel)
    const maxBuy = Math.floor(virtualBalance / (stock.price * (1 + (calculateTotalCost(1, stock.price).commission / stock.price)))); // Komisyonu da hesaba kat
    const assetInPortfolio = currentPortfolio.find(p => p.symbol === stock.symbol);
    const maxSell = assetInPortfolio ? assetInPortfolio.quantity : 0;


    // --- JSX ---
    return (
        // ... (Modal JSX'i - form, butonlar vb.)
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {stock.symbol} - {action === 'buy' ? 'Alış' : 'Satış'} İşlemi
            </h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit}>
              {/* ... (Miktar inputu, fiyat bilgisi vb.) */}
               <div className="mb-4">
                 <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Miktar:</label>
                 <input
                   type="number"
                   id="quantity"
                   min="1"
                   value={quantity}
                   onChange={handleQuantityChange}
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                   required
                 />
                 {action === 'buy' && <p className="text-xs text-gray-500 mt-1">Maksimum alınabilir: ~{maxBuy} adet</p>}
                 {action === 'sell' && <p className="text-xs text-gray-500 mt-1">Sahip olunan: {maxSell} adet</p>}
               </div>
               <div className="mb-4 text-sm bg-gray-50 p-3 rounded">
                  <p><strong>Fiyat:</strong> {stock.price?.toLocaleString('tr-TR')} ₺ / adet</p>
                  <p><strong>{action === 'buy' ? 'Tahmini Maliyet:' : 'Tahmini Gelir:'}</strong> {calculation.baseCost?.toLocaleString('tr-TR') || calculation.baseRevenue?.toLocaleString('tr-TR')} ₺</p>
                  <p><strong>Tahmini Komisyon:</strong> {calculation.commission?.toLocaleString('tr-TR')} ₺</p>
                  <p className="font-semibold"><strong>{action === 'buy' ? 'Toplam Ödenecek:' : 'Hesaba Geçecek:'}</strong> {(calculation.totalCost?.toLocaleString('tr-TR') || calculation.netRevenue?.toLocaleString('tr-TR'))} ₺</p>
               </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading || (action === 'sell' && quantity > maxSell)}
                  className={`px-4 py-2 text-white rounded disabled:opacity-50 ${
                    action === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'İşleniyor...' : (action === 'buy' ? 'Onayla ve Al' : 'Onayla ve Sat')}
                </button>
              </div>
            </form>
          </div>
        </div>
    );
};

export default TradeModal;