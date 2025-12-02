import { Sale, Return, DashboardMetrics } from '../types/dashboard';
import { InventoryItem } from '../types/inventory';
import { normalizeSku } from './normalize';

// Filter data by date range
export function filterDataByDateRange<T extends { date: string }>(data: T[], dateRange: string): T[] {
  if (dateRange === 'all') return data;
  
  const now = new Date();
  const cutoffDate = new Date();
  const startDate = new Date();
  const endDate = new Date();
  
  switch (dateRange) {
    case '7d':
      cutoffDate.setDate(now.getDate() - 7);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    case '30d':
      cutoffDate.setDate(now.getDate() - 30);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    case '90d':
      cutoffDate.setDate(now.getDate() - 90);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    case '1y':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    case 'current_year':
      startDate.setFullYear(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setFullYear(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    case 'previous_year':
      startDate.setFullYear(now.getFullYear() - 1, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setFullYear(now.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    default:
      return data;
  }
}

// Advanced filter supporting custom start/end
export function filterDataByDateAdvanced<T extends { date: string }>(data: T[], dateRange: string, start?: string, end?: string): T[] {
  if (dateRange !== 'custom') return filterDataByDateRange(data, dateRange);
  if (!start || !end) return data;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return data.filter(item => {
    const d = new Date(item.date);
    return d >= startDate && d <= endDate;
  });
}

// YoY for arbitrary date window
export function getYoYForRange(sales: Sale[], start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  prevStart.setFullYear(prevStart.getFullYear() - 1);
  prevEnd.setFullYear(prevEnd.getFullYear() - 1);

  const sumIn = (from: Date, to: Date) => sales.reduce((s, sale) => {
    const d = new Date(sale.date);
    return (d >= from && d <= to) ? s + sale.amount : s;
  }, 0);

  const current = sumIn(startDate, endDate);
  const previous = sumIn(prevStart, prevEnd);
  const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { current, previous, changePct };
}

export function calculateMetrics(sales: Sale[], returns: Return[], inventory: InventoryItem[]): DashboardMetrics {
  const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.amount, 0);
  // I resi hanno amount misti:
  // - Articoli resi: negativi (rimborsi)
  // - Trattenute (spese di reso): positivi (riducono il rimborso)
  // Prendiamo il valore assoluto della SOMMA, non la somma dei valori assoluti
  const totalReturns = Math.abs(returns.reduce((sum, ret) => sum + ret.amount, 0));
  const returnRate = totalSalesAmount > 0 ? (totalReturns / totalSalesAmount) * 100 : 0;

  // Calculate margin based on purchase prices from inventory
  // Build a normalized SKU -> inventory item map for O(1) lookups
  const inventoryMap = new Map<string, InventoryItem>();
  inventory.forEach(item => {
    if (item.sku) {
      inventoryMap.set(normalizeSku(item.sku), item);
    }
  });
  
  // Count matched vs unmatched sales for inventory stats
  let matchedSalesCount = 0;
  let matchedSalesAmount = 0;
  let totalCost = 0;
  
  sales.forEach(sale => {
    const saleSku = normalizeSku((sale as any).sku || sale.productId);
    if (!saleSku) return;
    const inventoryItem = inventoryMap.get(saleSku);
    if (inventoryItem && inventoryItem.purchasePrice > 0) {
      matchedSalesCount++;
      matchedSalesAmount += sale.amount;
      totalCost += inventoryItem.purchasePrice * sale.quantity;
    }
  });
  
  // Calculate margin only if we have inventory matches
  // If no inventory or no matches, margin is null (not calculable)
  const hasInventory = inventory.length > 0;
  const hasMatches = matchedSalesCount > 0 && totalCost > 0;
  
  let margin: number | null = null;
  if (hasMatches && matchedSalesAmount > 0) {
    // Calculate margin only on matched sales (more accurate)
    margin = ((matchedSalesAmount - totalCost) / matchedSalesAmount) * 100;
  }

  const salesByChannel = {
    negozio_donna: sales.filter(s => s.channel === 'negozio_donna').reduce((sum, s) => sum + s.amount, 0),
    negozio_uomo: sales.filter(s => s.channel === 'negozio_uomo').reduce((sum, s) => sum + s.amount, 0),
    ecommerce: sales.filter(s => s.channel === 'ecommerce').reduce((sum, s) => sum + s.amount, 0),
    marketplace: sales.filter(s => s.channel === 'marketplace').reduce((sum, s) => sum + s.amount, 0),
  };

  const salesByBrand = sales.reduce((acc, sale) => {
    acc[sale.brand] = (acc[sale.brand] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  const salesByCategory = sales.reduce((acc, sale) => {
    acc[sale.category] = (acc[sale.category] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  // Inventory matching statistics
  const inventoryMatchStats = {
    totalSales: sales.length,
    matchedSales: matchedSalesCount,
    unmatchedSales: sales.length - matchedSalesCount,
    matchPercentage: sales.length > 0 ? (matchedSalesCount / sales.length) * 100 : 0,
    hasInventory,
  };

  return {
    totalSales: totalSalesAmount,
    totalReturns,
    returnRate,
    margin,
    salesByChannel,
    salesByBrand,
    salesByCategory,
    inventoryMatchStats,
  };
}

export function getSalesByDate(sales: Sale[], days: number = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const dateRange = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateRange.push(new Date(d));
  }

  return dateRange.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const dailySales = sales.filter(sale => sale.date === dateStr);
    const totalAmount = dailySales.reduce((sum, sale) => sum + sale.amount, 0);
    
    return {
      date: date.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
      sales: totalAmount,
    };
  });
}

export function getMarketplaceData(sales: Sale[]) {
  const marketplaceSales = sales.filter(sale => sale.channel === 'marketplace');
  const grouped = marketplaceSales.reduce((acc, sale) => {
    const marketplace = sale.marketplace || 'Altro';
    acc[marketplace] = (acc[marketplace] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}

export function getCategoryData(sales: Sale[]) {
  const categoryLabels: Record<string, string> = {
    'abbigliamento': 'Abbigliamento',
    'calzature': 'Calzature',
    'accessori': 'Accessori',
    'borse': 'Borse'
  };

  const grouped = sales.reduce((acc, sale) => {
    const category = categoryLabels[sale.category] || sale.category;
    acc[category] = (acc[category] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}

export function getBrandData(sales: Sale[], inventory?: InventoryItem[]) {
  // Build a normalized SKU -> inventory item map for O(1) lookups
  const inventoryMap = new Map<string, InventoryItem>();
  if (inventory) {
    inventory.forEach(item => {
      if (item.sku) {
        inventoryMap.set(normalizeSku(item.sku), item);
      }
    });
  }
  
  const grouped = sales.reduce((acc, sale) => {
    let brand = sale.brand;
    if ((!brand || brand === 'Unknown') && inventory) {
      const saleSku = normalizeSku((sale as any).sku || sale.productId);
      const inv = inventoryMap.get(saleSku);
      if (inv?.brand) brand = inv.brand;
    }
    const key = (brand || 'Sconosciuto').toString();
    acc[key] = (acc[key] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 brands
}

// Monthly sales with YoY comparison (last `months` months)
export function getMonthlySalesWithYOY(sales: Sale[], months: number = 12) {
  const now = new Date();
  const series: Array<{ label: string; current: number; previous: number }> = [];
  const itFmt: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    ref.setUTCMonth(ref.getUTCMonth() - i);
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();

    const currentStart = new Date(Date.UTC(y, m, 1));
    const currentEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    const prevStart = new Date(Date.UTC(y - 1, m, 1));
    const prevEnd = new Date(Date.UTC(y - 1, m + 1, 0, 23, 59, 59));

    const currentSum = sales.reduce((sum, s) => {
      const d = new Date(s.date);
      return d >= currentStart && d <= currentEnd ? sum + s.amount : sum;
    }, 0);

    const prevSum = sales.reduce((sum, s) => {
      const d = new Date(s.date);
      return d >= prevStart && d <= prevEnd ? sum + s.amount : sum;
    }, 0);

    series.push({
      label: currentStart.toLocaleDateString('it-IT', itFmt),
      current: currentSum,
      previous: prevSum,
    });
  }

  return series;
}

// Helper: map date to season code (SSYYYY or FWYYYY)
export function getSeasonCode(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  return m <= 6 ? `SS${y}` : `FW${y}`;
}

// Aggregate sales by fashion season
export function getSeasonData(sales: Sale[]) {
  const grouped = sales.reduce((acc, sale) => {
    const code = getSeasonCode(sale.date);
    acc[code] = (acc[code] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Calculate YoY change for a metric value
export function calculateYoYChange(
  sales: Sale[],
  dateRange: string,
  customStart?: string,
  customEnd?: string,
  metricFn?: (sales: Sale[]) => number
): { change: number; changeType: 'increase' | 'decrease' | 'neutral' } {
  if (!metricFn) {
    // Default: calculate total sales
    metricFn = (s: Sale[]) => s.reduce((sum, sale) => sum + sale.amount, 0);
  }

  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  const now = new Date();

  if (dateRange === 'custom' && customStart && customEnd) {
    currentStart = new Date(customStart);
    currentEnd = new Date(customEnd);
    previousStart = new Date(currentStart);
    previousEnd = new Date(currentEnd);
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    previousEnd.setFullYear(previousEnd.getFullYear() - 1);
  } else {
    switch (dateRange) {
      case '7d':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case '30d':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 30);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 30);
        break;
      case '90d':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 90);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 90);
        break;
      case '1y':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setFullYear(currentStart.getFullYear() - 1);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
      case 'current_year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'previous_year':
        // For previous year, compare with year before that
        currentStart = new Date(now.getFullYear() - 1, 0, 1);
        currentEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        previousStart = new Date(now.getFullYear() - 2, 0, 1);
        previousEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59);
        break;
      default:
        // For 'all', compare last 12 months vs previous 12 months
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setMonth(currentStart.getMonth() - 12);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 12);
    }
  }

  const currentSales = sales.filter(sale => {
    const d = new Date(sale.date);
    return d >= currentStart && d <= currentEnd;
  });

  const previousSales = sales.filter(sale => {
    const d = new Date(sale.date);
    return d >= previousStart && d <= previousEnd;
  });

  const currentValue = metricFn(currentSales);
  const previousValue = metricFn(previousSales);

  const change = previousValue > 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : (currentValue > 0 ? 100 : 0);

  return {
    change: Number(change.toFixed(1)),
    changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral'
  };
}

// Get brand channel distribution
export function getBrandChannelDistribution(
  sales: Sale[],
  brand: string,
  paymentMappings?: Record<string, { macroArea: string; channel: string }>
): {
  macroAreas: Array<{ name: string; value: number; percentage: number }>;
  subChannels: Array<{ name: string; value: number; percentage: number; macroArea: string }>;
} {
  const brandSales = sales.filter(s => s.brand === brand);
  const total = brandSales.reduce((sum, s) => sum + s.amount, 0);

  // Group by macro area
  const macroAreaMap: Record<string, number> = {
    'Sito': 0,
    'Negozio': 0,
    'Marketplace': 0,
    'Altro': 0
  };

  const subChannelMap: Record<string, { value: number; macroArea: string }> = {};

  brandSales.forEach(sale => {
    let macroArea = 'Altro';
    let subChannel = '';

    if (sale.channel === 'ecommerce') {
      macroArea = 'Sito';
      subChannel = 'Sito';
    } else if (sale.channel === 'negozio_donna' || sale.channel === 'negozio_uomo') {
      macroArea = 'Negozio';
      subChannel = sale.channel === 'negozio_donna' ? 'Negozio Donna' : 'Negozio Uomo';
    } else if (sale.channel === 'marketplace') {
      macroArea = 'Marketplace';
      // Use paymentMethod if available and mapped, otherwise use marketplace field
      if (sale.paymentMethod && paymentMappings?.[sale.paymentMethod]) {
        subChannel = sale.paymentMethod;
      } else if (sale.marketplace) {
        subChannel = sale.marketplace;
      } else {
        subChannel = 'Marketplace';
      }
    }

    macroAreaMap[macroArea] = (macroAreaMap[macroArea] || 0) + sale.amount;

    if (!subChannelMap[subChannel]) {
      subChannelMap[subChannel] = { value: 0, macroArea };
    }
    subChannelMap[subChannel].value += sale.amount;
  });

  const macroAreas = Object.entries(macroAreaMap)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  const subChannels = Object.entries(subChannelMap)
    .map(([name, data]) => ({
      name,
      value: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      macroArea: data.macroArea
    }))
    .sort((a, b) => b.value - a.value);

  return { macroAreas, subChannels };
}

// Get sales by country
export function getSalesByCountry(sales: Sale[]) {
  const grouped = sales.reduce((acc, sale) => {
    const country = sale.country || 'Unknown';
    acc[country] = (acc[country] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([country, value]) => ({ country, amount: value }))
    .sort((a, b) => b.amount - a.amount);
}

// Get brand distribution by country
export function getBrandByCountry(sales: Sale[]) {
  const countryBrandMap = new Map<string, Record<string, number>>();

  sales.forEach(sale => {
    if (!sale.country || !sale.brand || sale.brand === 'Unknown') return;
    
    if (!countryBrandMap.has(sale.country)) {
      countryBrandMap.set(sale.country, {});
    }
    
    const brandMap = countryBrandMap.get(sale.country)!;
    brandMap[sale.brand] = (brandMap[sale.brand] || 0) + sale.amount;
  });

  const result: Array<{ country: string; brands: Array<{ brand: string; amount: number; percentage: number }> }> = [];

  for (const [country, brandMap] of countryBrandMap.entries()) {
    const total = Object.values(brandMap).reduce((sum, val) => sum + val, 0);
    const brands = Object.entries(brandMap)
      .map(([brand, amount]) => ({
        brand,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    result.push({ country, brands });
  }

  return result.sort((a, b) => a.country.localeCompare(b.country));
}

// Get return rate by country
export function getReturnRateByCountry(sales: Sale[], returns: Return[]) {
  const salesByCountry = sales.reduce((acc, sale) => {
    const country = sale.country || 'Unknown';
    acc[country] = (acc[country] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  const returnsByCountry = returns.reduce((acc, ret) => {
    const country = ret.country || 'Unknown';
    // Somma gli amount (negativi per articoli resi, positivi per trattenute)
    acc[country] = (acc[country] || 0) + ret.amount;
    return acc;
  }, {} as Record<string, number>);

  const result = Object.keys({ ...salesByCountry, ...returnsByCountry }).map(country => {
    const salesAmount = salesByCountry[country] || 0;
    const returnsAmount = returnsByCountry[country] || 0;
    const returnRate = salesAmount > 0 ? (returnsAmount / salesAmount) * 100 : 0;

    return {
      country,
      salesAmount,
      returnsAmount,
      returnRate
    };
  });

  return result.sort((a, b) => b.salesAmount - a.salesAmount);
}

// Get country rankings
export function getCountryRankings(sales: Sale[], returns: Return[]) {
  const salesByCountry = getSalesByCountry(sales);
  const returnRates = getReturnRateByCountry(sales, returns);

  const topSales = salesByCountry.slice(0, 10);
  const bestReturnRate = [...returnRates]
    .filter(r => r.salesAmount > 0)
    .sort((a, b) => a.returnRate - b.returnRate)
    .slice(0, 10);
  const worstReturnRate = [...returnRates]
    .filter(r => r.salesAmount > 0)
    .sort((a, b) => b.returnRate - a.returnRate)
    .slice(0, 10);

  return {
    topSales,
    bestReturnRate,
    worstReturnRate
  };
}

// Get channel distribution by country
export function getChannelByCountry(sales: Sale[]) {
  const countryChannelMap = new Map<string, Record<string, number>>();

  sales.forEach(sale => {
    if (!sale.country) return;
    
    if (!countryChannelMap.has(sale.country)) {
      countryChannelMap.set(sale.country, {});
    }
    
    const channelMap = countryChannelMap.get(sale.country)!;
    const channel = sale.channel;
    channelMap[channel] = (channelMap[channel] || 0) + sale.amount;
  });

  const result: Array<{ country: string; channels: Array<{ channel: string; amount: number; percentage: number }> }> = [];

  for (const [country, channelMap] of countryChannelMap.entries()) {
    const total = Object.values(channelMap).reduce((sum, val) => sum + val, 0);
    const channels = Object.entries(channelMap)
      .map(([channel, amount]) => ({
        channel,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    result.push({ country, channels });
  }

  return result.sort((a, b) => a.country.localeCompare(b.country));
}

// Get area distribution by country
export function getAreaByCountry(sales: Sale[]) {
  const countryAreaMap = new Map<string, Record<string, number>>();

  sales.forEach(sale => {
    if (!sale.country || !sale.area) return;
    
    if (!countryAreaMap.has(sale.country)) {
      countryAreaMap.set(sale.country, {});
    }
    
    const areaMap = countryAreaMap.get(sale.country)!;
    const area = sale.area;
    areaMap[area] = (areaMap[area] || 0) + sale.amount;
  });

  const result: Array<{ country: string; areas: Array<{ area: string; amount: number; percentage: number }> }> = [];

  for (const [country, areaMap] of countryAreaMap.entries()) {
    const total = Object.values(areaMap).reduce((sum, val) => sum + val, 0);
    const areas = Object.entries(areaMap)
      .map(([area, amount]) => ({
        area,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    result.push({ country, areas });
  }

  return result.sort((a, b) => a.country.localeCompare(b.country));
}