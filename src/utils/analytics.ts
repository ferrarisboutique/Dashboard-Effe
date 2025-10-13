import { Sale, Return, DashboardMetrics } from '../types/dashboard';
import { InventoryItem } from '../types/inventory';

// Filter data by date range
export function filterDataByDateRange<T extends { date: string }>(data: T[], dateRange: string): T[] {
  if (dateRange === 'all') return data;
  
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (dateRange) {
    case '7d':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      cutoffDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return data;
  }
  
  const filtered = data.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate;
  });
  
  return filtered;
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
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalReturns = returns.reduce((sum, ret) => sum + ret.amount, 0);
  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;

  // Calculate margin based on purchase prices from inventory
  const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
  const totalCost = sales.reduce((sum, sale) => {
    const saleSku = normalizeSku((sale as any).sku || sale.productId);
    if (!saleSku) return sum;
    const inventoryItem = inventory.find(item => normalizeSku(item.sku) === saleSku);
    return sum + (inventoryItem ? inventoryItem.purchasePrice * sale.quantity : 0);
  }, 0);
  
  const margin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

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

  return {
    totalSales,
    totalReturns,
    returnRate,
    margin,
    salesByChannel,
    salesByBrand,
    salesByCategory,
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
  const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
  const grouped = sales.reduce((acc, sale) => {
    let brand = sale.brand;
    if ((!brand || brand === 'Unknown') && inventory) {
      const saleSku = normalizeSku((sale as any).sku || sale.productId);
      const inv = inventory.find(i => normalizeSku(i.sku) === saleSku);
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