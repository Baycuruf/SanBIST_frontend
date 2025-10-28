// src/services/portfolioService.js
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { calculateTotalCost, calculateNetRevenue } from '../config/tradingConfig';

// Portföy verilerini getir
export const getPortfolioData = async (userId) => {
  try {
    if (!userId) {
      console.error('Kullanıcı ID gerekli');
      throw new Error('Kullanıcı ID gerekli');
    }
    
    console.log('Portföy verisi getiriliyor:', userId);
    const portfolioRef = doc(db, 'portfolios', userId);
    const portfolioDoc = await getDoc(portfolioRef);
    
    if (portfolioDoc.exists()) {
      console.log('Portföy verisi bulundu');
      return portfolioDoc.data();
    } else {
      console.log('Portföy verisi bulunamadı, yeni portföy oluşturuluyor');
      // Portföy yoksa, boş portföy oluştur
      const initialPortfolio = {
        assets: [],
        transactions: [],
        totalValue: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      await setDoc(portfolioRef, initialPortfolio);
      return initialPortfolio;
    }
  } catch (error) {
    console.error('Portföy verisi getirme hatası:', error);
    throw error;
  }
};

// Kullanıcı verilerini getir
export const getUserData = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı verisi getirme hatası:', error);
    throw error;
  }
};

// Hisse alımı (komisyonlu)
export const buyStock = async (userId, stock, quantity, price) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioRef = doc(db, 'portfolios', userId);
    const userRef = doc(db, 'users', userId);
    
    // Komisyonlu maliyet hesapla
    const { baseCost, commission, totalCost } = calculateTotalCost(quantity, price);
    
    // 1. Kullanıcı bakiyesini kontrol et
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    const userData = userDoc.data();
    
    if (userData.virtualBalance < totalCost) {
      throw new Error(`Yetersiz bakiye. Gerekli: ${totalCost.toLocaleString('tr-TR')} ₺ (Hisse: ${baseCost.toLocaleString('tr-TR')} ₺ + Komisyon: ${commission.toLocaleString('tr-TR')} ₺), Mevcut: ${userData.virtualBalance.toLocaleString('tr-TR')} ₺`);
    }
    
    // 2. Portföy verisini getir
    const portfolioData = await getPortfolioData(userId);
    const existingAsset = portfolioData.assets.find(asset => asset.symbol === stock.symbol);
    
    let updatedAssets;
    if (existingAsset) {
      // Mevcut hisseyi güncelle
      const newQuantity = existingAsset.quantity + quantity;
      const newAvgPrice = ((existingAsset.avgPrice * existingAsset.quantity) + (price * quantity)) / newQuantity;
      
      updatedAssets = portfolioData.assets.map(asset =>
        asset.symbol === stock.symbol
          ? {
              ...asset,
              quantity: newQuantity,
              avgPrice: parseFloat(newAvgPrice.toFixed(2)),
              currentPrice: price,
              totalValue: newQuantity * price
            }
          : asset
      );
    } else {
      // Yeni hisse ekle
      updatedAssets = [
        ...portfolioData.assets,
        {
          symbol: stock.symbol,
          name: stock.name,
          quantity: quantity,
          avgPrice: price,
          currentPrice: price,
          totalValue: quantity * price
        }
      ];
    }
    
    // 3. İşlemi kaydet (komisyon bilgisi ile)
    const transaction = {
      type: 'buy',
      symbol: stock.symbol,
      name: stock.name,
      quantity: quantity,
      price: price,
      baseAmount: baseCost,
      commission: commission,
      totalAmount: totalCost,
      timestamp: new Date()
    };
    
    // 4. Firestore'da güncelleme yap
    await updateDoc(portfolioRef, {
      assets: updatedAssets,
      transactions: arrayUnion(transaction),
      totalValue: updatedAssets.reduce((total, asset) => total + asset.totalValue, 0),
      lastUpdated: new Date()
    });
    
    // 5. Kullanıcı bakiyesini güncelle
    await updateDoc(userRef, {
      virtualBalance: userData.virtualBalance - totalCost
    });
    
    return {
      success: true,
      newBalance: userData.virtualBalance - totalCost,
      transaction,
      portfolio: updatedAssets,
      commission
    };
    
  } catch (error) {
    console.error('Alım işlemi hatası:', error);
    throw error;
  }
};

// Hisse satışı (komisyonlu)
export const sellStock = async (userId, stock, quantity, price) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioRef = doc(db, 'portfolios', userId);
    const userRef = doc(db, 'users', userId);
    
    // Komisyonlu net gelir hesapla
    const { baseRevenue, commission, netRevenue } = calculateNetRevenue(quantity, price);
    
    // 1. Portföy verisini getir
    const portfolioData = await getPortfolioData(userId);
    const existingAsset = portfolioData.assets.find(asset => asset.symbol === stock.symbol);
    
    if (!existingAsset) {
      throw new Error('Portföyde bu hisse bulunmuyor');
    }
    
    if (existingAsset.quantity < quantity) {
      throw new Error(`Yetersiz hisse miktarı. Sahip olunan: ${existingAsset.quantity}, Satılmak istenen: ${quantity}`);
    }
    
    let updatedAssets;
    if (existingAsset.quantity === quantity) {
      // Tüm hisseleri sat
      updatedAssets = portfolioData.assets.filter(asset => asset.symbol !== stock.symbol);
    } else {
      // Kısmi satış
      updatedAssets = portfolioData.assets.map(asset =>
        asset.symbol === stock.symbol
          ? {
              ...asset,
              quantity: asset.quantity - quantity,
              totalValue: (asset.quantity - quantity) * price
            }
          : asset
      );
    }
    
    // 2. İşlemi kaydet (komisyon bilgisi ile)
    const transaction = {
      type: 'sell',
      symbol: stock.symbol,
      name: stock.name,
      quantity: quantity,
      price: price,
      baseAmount: baseRevenue,
      commission: commission,
      totalAmount: netRevenue,
      timestamp: new Date()
    };
    
    // 3. Kullanıcı verisini getir
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    // 4. Firestore'da güncelleme yap
    await updateDoc(portfolioRef, {
      assets: updatedAssets,
      transactions: arrayUnion(transaction),
      totalValue: updatedAssets.reduce((total, asset) => total + asset.totalValue, 0),
      lastUpdated: new Date()
    });
    
    // 5. Kullanıcı bakiyesini güncelle
    await updateDoc(userRef, {
      virtualBalance: userData.virtualBalance + netRevenue
    });
    
    return {
      success: true,
      newBalance: userData.virtualBalance + netRevenue,
      transaction,
      portfolio: updatedAssets,
      commission
    };
    
  } catch (error) {
    console.error('Satış işlemi hatası:', error);
    throw error;
  }
};

// Portföy değerini güncelle (piyasa fiyatlarına göre)
export const updatePortfolioValues = async (userId, marketData) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const updatedAssets = portfolioData.assets.map(asset => {
      const marketItem = marketData.find(item => item.symbol === asset.symbol);
      if (marketItem) {
        return {
          ...asset,
          currentPrice: marketItem.price,
          totalValue: asset.quantity * marketItem.price
        };
      }
      return asset;
    });

    const totalValue = updatedAssets.reduce((total, asset) => total + asset.totalValue, 0);

    const portfolioRef = doc(db, 'portfolios', userId);
    await updateDoc(portfolioRef, {
      assets: updatedAssets,
      totalValue: totalValue,
      lastUpdated: new Date()
    });

    return {
      assets: updatedAssets,
      totalValue: totalValue
    };
  } catch (error) {
    console.error('Portföy değer güncelleme hatası:', error);
    throw error;
  }
};

// İşlem geçmişini getir
export const getTransactionHistory = async (userId, limit = 10) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const transactions = portfolioData.transactions || [];
    
    // Son işlemleri sırala (en yeni en üstte)
    const sortedTransactions = transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return sortedTransactions;
  } catch (error) {
    console.error('İşlem geçmişi getirme hatası:', error);
    throw error;
  }
};
// Portföy özetini getir
export const getPortfolioSummary = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const userData = await getUserData(userId);
    
    const totalInvestment = portfolioData.assets.reduce((total, asset) => {
      return total + (asset.avgPrice * asset.quantity);
    }, 0);
    
    const currentValue = portfolioData.assets.reduce((total, asset) => {
      return total + (asset.currentPrice * asset.quantity);
    }, 0);
    
    const totalProfitLoss = currentValue - totalInvestment;
    const totalProfitLossPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;
    
    return {
      totalInvestment,
      currentValue,
      totalProfitLoss,
      totalProfitLossPercent,
      cashBalance: userData?.virtualBalance || 0,
      totalAssets: (userData?.virtualBalance || 0) + currentValue,
      assetCount: portfolioData.assets.length,
      transactionCount: portfolioData.transactions?.length || 0
    };
  } catch (error) {
    console.error('Portföy özeti getirme hatası:', error);
    throw error;
  }
};

// En çok kazandıran/kaybettiren hisseleri getir
export const getTopPerformers = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    
    const performers = portfolioData.assets.map(asset => {
      const profitLoss = (asset.currentPrice - asset.avgPrice) * asset.quantity;
      const profitLossPercent = ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100;
      
      return {
        symbol: asset.symbol,
        name: asset.name,
        quantity: asset.quantity,
        avgPrice: asset.avgPrice,
        currentPrice: asset.currentPrice,
        profitLoss,
        profitLossPercent,
        totalValue: asset.totalValue
      };
    });
    
    // En çok kazandıranlar
    const topGainers = performers
      .filter(asset => asset.profitLoss > 0)
      .sort((a, b) => b.profitLoss - a.profitLoss);
    
    // En çok kaybettirenler
    const topLosers = performers
      .filter(asset => asset.profitLoss < 0)
      .sort((a, b) => a.profitLoss - b.profitLoss);
    
    return {
      topGainers: topGainers.slice(0, 5),
      topLosers: topLosers.slice(0, 5),
      allPerformers: performers.sort((a, b) => b.profitLossPercent - a.profitLossPercent)
    };
  } catch (error) {
    console.error('Performans verisi getirme hatası:', error);
    throw error;
  }
};

// Varlık dağılımını getir
export const getAssetAllocation = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const userData = await getUserData(userId);
    
    const totalPortfolioValue = portfolioData.totalValue;
    const cashBalance = userData?.virtualBalance || 0;
    const totalAssets = totalPortfolioValue + cashBalance;
    
    // Hisse senetlerine göre dağılım
    const stockAllocation = portfolioData.assets.map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      value: asset.totalValue,
      percentage: totalAssets > 0 ? (asset.totalValue / totalAssets) * 100 : 0,
      type: 'stock'
    }));
    
    // Nakit dağılımı
    const cashAllocation = {
      symbol: 'CASH',
      name: 'Nakit',
      value: cashBalance,
      percentage: totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0,
      type: 'cash'
    };
    
    const allAllocations = [...stockAllocation, cashAllocation];
    
    return {
      allocations: allAllocations,
      totalPortfolioValue,
      cashBalance,
      totalAssets
    };
  } catch (error) {
    console.error('Varlık dağılımı getirme hatası:', error);
    throw error;
  }
};

// Aylık performans verilerini getir
export const getMonthlyPerformance = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const transactions = portfolioData.transactions || [];
    
    // Aylara göre grupla
    const monthlyData = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          buys: 0,
          sells: 0,
          totalAmount: 0,
          commission: 0,
          transactionCount: 0
        };
      }
      
      if (transaction.type === 'buy') {
        acc[monthKey].buys += transaction.totalAmount;
      } else {
        acc[monthKey].sells += transaction.totalAmount;
      }
      
      acc[monthKey].totalAmount += transaction.totalAmount;
      acc[monthKey].commission += transaction.commission;
      acc[monthKey].transactionCount += 1;
      
      return acc;
    }, {});
    
    // Ayları sırala
    const sortedMonths = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return sortedMonths;
  } catch (error) {
    console.error('Aylık performans getirme hatası:', error);
    throw error;
  }
};

// Risk analizi getir
export const getRiskAnalysis = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const userData = await getUserData(userId);
    
    const totalValue = portfolioData.totalValue;
    const cashBalance = userData?.virtualBalance || 0;
    const totalAssets = totalValue + cashBalance;
    
    // Çeşitlilik skoru (hisse başına ortalama yüzde)
    const diversityScore = portfolioData.assets.length > 0 
      ? 100 / portfolioData.assets.length 
      : 100;
    
    // En büyük pozisyon
    const largestPosition = portfolioData.assets.length > 0
      ? portfolioData.assets.reduce((max, asset) => 
          asset.totalValue > max.totalValue ? asset : max
        )
      : null;
    
    const largestPositionPercentage = largestPosition 
      ? (largestPosition.totalValue / totalAssets) * 100 
      : 0;
    
    // Risk seviyesi
    let riskLevel = 'DÜŞÜK';
    if (largestPositionPercentage > 50) {
      riskLevel = 'YÜKSEK';
    } else if (largestPositionPercentage > 25) {
      riskLevel = 'ORTA';
    }
    
    return {
      diversityScore: Math.min(diversityScore, 100),
      largestPosition: largestPosition ? {
        symbol: largestPosition.symbol,
        name: largestPosition.name,
        percentage: largestPositionPercentage
      } : null,
      riskLevel,
      cashPercentage: (cashBalance / totalAssets) * 100,
      stockPercentage: (totalValue / totalAssets) * 100,
      positionCount: portfolioData.assets.length
    };
  } catch (error) {
    console.error('Risk analizi getirme hatası:', error);
    throw error;
  }
};

// Portföyü sıfırla (test amaçlı)
export const resetPortfolio = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioRef = doc(db, 'portfolios', userId);
    const userRef = doc(db, 'users', userId);
    
    const resetPortfolioData = {
      assets: [],
      transactions: [],
      totalValue: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    await setDoc(portfolioRef, resetPortfolioData);
    await updateDoc(userRef, {
      virtualBalance: 100000
    });
    
    return {
      success: true,
      message: 'Portföy başarıyla sıfırlandı'
    };
  } catch (error) {
    console.error('Portföy sıfırlama hatası:', error);
    throw error;
  }
};

// Toplam komisyon giderini getir
export const getTotalCommission = async (userId) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const portfolioData = await getPortfolioData(userId);
    const transactions = portfolioData.transactions || [];
    
    const totalCommission = transactions.reduce((total, transaction) => {
      return total + transaction.commission;
    }, 0);
    
    const totalTradingVolume = transactions.reduce((total, transaction) => {
      return total + transaction.baseAmount;
    }, 0);
    
    return {
      totalCommission,
      totalTradingVolume,
      commissionRate: totalTradingVolume > 0 ? (totalCommission / totalTradingVolume) * 100 : 0,
      transactionCount: transactions.length
    };
  } catch (error) {
    console.error('Komisyon verisi getirme hatası:', error);
    throw error;
  }
};

// Portföy önerileri getir (basit)
export const getPortfolioSuggestions = async (userId, marketData) => {
  try {
    if (!userId) throw new Error('Kullanıcı ID gerekli');
    
    const userData = await getUserData(userId);
    const portfolioData = await getPortfolioData(userId);
    const cashBalance = userData?.virtualBalance || 0;
    
    // Portföyde olmayan hisseleri bul
    const portfolioSymbols = portfolioData.assets.map(asset => asset.symbol);
    const availableStocks = marketData.filter(stock => 
      !portfolioSymbols.includes(stock.symbol) && stock.change > 0
    );
    
    // En iyi performans gösteren hisseleri öner
    const suggestions = availableStocks
      .sort((a, b) => b.change - a.change)
      .slice(0, 5)
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        recommendedAmount: Math.min(cashBalance * 0.2, 10000), // Maksimum %20 veya 10.000 ₺
        reason: 'Yükseliş trendinde'
      }));
    
    return {
      suggestions,
      availableCash: cashBalance,
      recommendation: cashBalance > 1000 ? 
        `${suggestions.length} hisse önerisi bulundu` : 
        'Yeterli nakit bulunmuyor'
    };
  } catch (error) {
    console.error('Portföy önerisi getirme hatası:', error);
    throw error;
  }
};