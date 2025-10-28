// src/components/AssetDetailModal.js
import React from 'react';

// Fiyat ve Değişim Formatlama Fonksiyonları (AssetCard'dan kopyalandı)
const formatPrice = (price, type, symbol) => {
    if (typeof price !== 'number') return '-';
    let currency = 'TRY'; let style = 'currency'; let maxDigits = 2;
    if (type === 'maden_ons' || symbol === 'EURUSD=X') { currency = 'USD'; }
    else if (type === 'doviz' || type === 'maden_gram' || type === 'hisse') { currency = 'TRY'; maxDigits = 4; }
    else if (type === 'doviz_capraz') { style = 'decimal'; maxDigits = 4; }
    if (type === 'hisse') { maxDigits = 4; }
    try {
        if (style === 'currency') {
            return price.toLocaleString('tr-TR', { style, currency, minimumFractionDigits: 2, maximumFractionDigits: maxDigits });
        } else {
            return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: maxDigits });
        }
    } catch (e) { return price.toFixed(maxDigits); }
};
const formatChange = (price, previousClose) => {
    if (typeof price !== 'number' || typeof previousClose !== 'number' || previousClose === 0) return '-';
    const change = ((price - previousClose) / previousClose) * 100;
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = change >= 0 ? '+' : '';
    return <span className={`font-semibold ${color}`}>{sign}{change.toFixed(2)}%</span>;
};
const formatVolume = (volume) => {
    if (typeof volume !== 'number') return '-';
    return volume.toLocaleString('tr-TR');
};


const AssetDetailModal = ({ isOpen, onClose, asset }) => {
    if (!isOpen || !asset) return null;

    const displaySymbol = asset.symbol.replace('.IS', '');
    const priceSuffix = (asset.type === 'maden_ons' || asset.symbol === 'EURUSD=X') ? ' $' : ' ₺';

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                {/* Kapatma Butonu */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 focus:outline-none"
                    aria-label="Kapat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Modal Başlığı */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">{displaySymbol}</h2>
                    {asset.name && asset.name !== asset.symbol && (
                        <p className="text-sm text-gray-600">{asset.name}</p>
                    )}
                    {asset.sector && asset.sector !== 'bilinmiyor' && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full mt-1 inline-block">{asset.sector}</span>
                    )}
                     {asset.error && <p className="text-sm text-red-600 mt-1">Hata: {asset.error}</p>}
                </div>

                {/* Modal İçeriği */}
                <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {/* Güncel Fiyat */}
                    <div className="col-span-2 text-center mb-2">
                        <p className="text-xs text-gray-500 uppercase">Güncel Fiyat</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {formatPrice(asset.price, asset.type, asset.symbol)}
                        </p>
                        <p className="mt-1">
                            {formatChange(asset.price, asset.previousClose)}
                            {asset.timestamp && (
                                <span className="text-xs text-gray-500 ml-2">(Son Veri: {new Date(asset.timestamp).toLocaleTimeString('tr-TR')})</span>
                            )}
                        </p>
                    </div>

                    {/* Diğer Detaylar */}
                    <div>
                        <p className="text-gray-500">Önceki Kapanış:</p>
                        <p className="font-medium">{formatPrice(asset.previousClose, asset.type, asset.symbol)}</p>
                    </div>
                     <div>
                        <p className="text-gray-500">Açılış:</p>
                        <p className="font-medium">{formatPrice(asset.open, asset.type, asset.symbol)}</p>
                    </div>
                     <div>
                        <p className="text-gray-500">Gün İçi Yüksek:</p>
                        <p className="font-medium">{formatPrice(asset.high, asset.type, asset.symbol)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Gün İçi Düşük:</p>
                        <p className="font-medium">{formatPrice(asset.low, asset.type, asset.symbol)}</p>
                    </div>
                    {asset.volume != null && ( // Hacim sadece varsa göster
                         <div>
                            <p className="text-gray-500">Hacim:</p>
                            <p className="font-medium">{formatVolume(asset.volume)}</p>
                        </div>
                    )}
                     {/* Boşluk bırakmak için veya başka bir veri eklenebilir */}
                     <div></div>

                    {/* Al/Sat Butonları (İsteğe bağlı, modal içinde de olabilir) */}
                    {/* Şimdilik sadece bilgi modalı olduğu için butonları koymayalım */}
                     {/*
                     <div className="col-span-2 mt-4 pt-4 border-t border-gray-200 flex justify-center gap-4">
                         <button className="...">Al</button>
                         <button className="...">Sat</button>
                     </div>
                     */}
                </div>
            </div>
        </div>
    );
};

export default AssetDetailModal;