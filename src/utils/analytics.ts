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

export function calculateMetrics(sales: Sale[], returns: Return[], inventory: InventoryItem[]): DashboardMetrics {
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalReturns = returns.reduce((sum, ret) => sum + ret.amount, 0);
  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;

  // Calculate margin based on purchase prices from inventory
  const totalCost = sales.reduce((sum, sale) => {
    const inventoryItem = inventory.find(item => item.sku === sale.productId);
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

export function getBrandData(sales: Sale[]) {
  const grouped = sales.reduce((acc, sale) => {
    acc[sale.brand] = (acc[sale.brand] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 brands
}