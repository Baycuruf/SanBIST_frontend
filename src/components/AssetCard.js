// src/components/AssetCard.js
import React from 'react';

// Fiyatı formatlamak için yardımcı fonksiyon (TL, $, vs.)
const formatPrice = (price, type, symbol) => {
    if (typeof price !== 'number') return <span className="text-gray-400">-</span>;

    let currency = 'TRY';
    let style = 'currency';
    let maximumFractionDigits = 2;

    if (type === 'maden_ons' || symbol === 'EURUSD=X') {
        currency = 'USD';
        maximumFractionDigits = 2; // Ons fiyatları için 2 yeterli
    } else if (type === 'doviz' || type === 'maden_gram' || type === 'hisse') {
        currency = 'TRY';
        maximumFractionDigits = 4; // Döviz ve gramlar için 4 haneye kadar gösterelim
    } else if (type === 'doviz_capraz') {
        // EURUSD dışındaki pariteler için (şimdilik yok ama ileride eklenebilir)
        style = 'decimal'; // Sadece sayı olarak göster
        maximumFractionDigits = 4;
    }

    // Hisse senedi fiyatlarını da 4 haneye kadar gösterelim (kuruş altı için)
    if (type === 'hisse') {
        maximumFractionDigits = 4;
    }


    try {
        if (style === 'currency') {
            return price.toLocaleString('tr-TR', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: maximumFractionDigits
            });
        } else {
             return price.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: maximumFractionDigits
            });
        }
    } catch (e) {
        console.error("Fiyat formatlama hatası:", e);
        return price.toFixed(maximumFractionDigits); // Fallback
    }
};

// Değişim yüzdesini formatlamak için yardımcı fonksiyon
const formatChange = (price, previousClose) => {
    if (typeof price !== 'number' || typeof previousClose !== 'number' || previousClose === 0) {
        return <span className="text-gray-400">-</span>;
    }
    const change = ((price - previousClose) / previousClose) * 100;
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = change >= 0 ? '+' : '';
    return (
        <span className={`font-semibold ${color}`}>
            {sign}{change.toFixed(2)}%
        </span>
    );
};


const AssetCard = ({ asset, onBuy, onSell }) => {
    // Prop olarak gelen asset objesi:
    // { symbol, name, price, previousClose, type, sector?, error? }

    const displaySymbol = asset.symbol.replace('.IS', '');

    // İşlem yapılabilir mi kontrolü
    const isDataInvalid = !asset.price || typeof asset.price !== 'number' || asset.price <= 0 || asset.error;
    const isNonTLAsset = asset.type === 'maden_ons' || asset.type === 'doviz_capraz';
    const isTradable = !isDataInvalid && !isNonTLAsset; // Alım/Satım yapılabilir mi?

    let disabledTitle = "";
    if (isDataInvalid) {
        disabledTitle = !asset.price ? "Fiyat bilgisi yok" : asset.error ? `Veri hatası: ${asset.error}` : "Geçersiz fiyat";
    } else if (isNonTLAsset) {
        disabledTitle = "Sadece TL varlıklar alınıp satılabilir";
    }

    return (
        <div className={`bg-white rounded-lg shadow-md p-4 flex flex-col justify-between transition-opacity duration-200 ${isDataInvalid ? 'opacity-60' : ''}`}>
            {/* Üst Kısım: Sembol ve İsim */}
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-lg font-bold text-gray-800">{displaySymbol}</span>
                    {/* Hata ikonu veya Tipi gösterilebilir (opsiyonel) */}
                    {asset.error && (
                        <span title={`Hata: ${asset.error}`} className="text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </span>
                    )}
                     {/* Tip bilgisi (örn. Maden, Döviz) - Opsiyonel */}
                     {/* <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{asset.type}</span> */}
                </div>
                {/* Tam İsim (varsa ve sembolden farklıysa) */}
                {asset.name && asset.name !== asset.symbol && (
                    <p className="text-xs text-gray-500 mb-3 truncate" title={asset.name}>
                        {asset.name}
                    </p>
                )}
            </div>

            {/* Orta Kısım: Fiyat ve Değişim */}
            <div className="mb-4 text-center">
                <p className="text-2xl font-semibold text-gray-900 mb-1">
                    {formatPrice(asset.price, asset.type, asset.symbol)}
                </p>
                <p className="text-sm">
                    {formatChange(asset.price, asset.previousClose)}
                </p>
            </div>

            {/* Alt Kısım: Butonlar */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={() => onBuy(asset)} // Dışarıdan gelen onBuy fonksiyonunu çağır
                    disabled={!isTradable}
                    className={`flex-1 text-sm text-green-700 bg-green-100 hover:bg-green-200 font-semibold px-4 py-2 rounded border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
                    title={!isTradable ? disabledTitle : "Al"}
                >
                    Al
                </button>
                <button
                    onClick={() => onSell(asset)} // Dışarıdan gelen onSell fonksiyonunu çağır
                    disabled={!isTradable}
                    className={`flex-1 text-sm text-red-700 bg-red-100 hover:bg-red-200 font-semibold px-4 py-2 rounded border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
                    title={!isTradable ? disabledTitle : "Sat"}
                >
                    Sat
                </button>
            </div>
        </div>
    );
};

export default AssetCard;