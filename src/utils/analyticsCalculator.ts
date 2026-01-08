import { Sale, Return } from '../types/dashboard';
import {
  AnalyticsTransactionDetail,
  CountryAnalytics,
  ChannelAnalytics,
  DocumentTypeAnalytics,
  BrandAnalytics,
  COUNTRY_NAMES,
  CHANNEL_NAMES,
  MACRO_CHANNELS,
} from '../types/analytics';

// Helper: get country name from code
export function getCountryName(code: string): string {
  if (!code) return 'Sconosciuto';
  const upperCode = code.toUpperCase();
  return COUNTRY_NAMES[upperCode] || code;
}

// Helper: get channel display name
export function getChannelDisplayName(channel: string, marketplace?: string): string {
  if (channel === 'marketplace' && marketplace) {
    return marketplace;
  }
  return CHANNEL_NAMES[channel] || channel;
}

// Helper: get macro channel
export function getMacroChannel(channel: string): string {
  return MACRO_CHANNELS[channel] || 'Altro';
}

// Helper: create transaction detail from sale
function saleToTransaction(sale: Sale): AnalyticsTransactionDetail {
  const documento = ((sale as any).documento || 'VENDITA').toString().toUpperCase().trim();
  const numero = ((sale as any).numero || sale.orderReference || sale.id).toString();
  
  return {
    type: 'sale',
    documentType: documento,
    documentNumber: numero,
    date: sale.date,
    amount: sale.amount,
    channel: sale.channel,
    channelSpecific: sale.channel === 'marketplace' ? (sale.paymentMethod || sale.marketplace) : undefined,
    country: sale.country,
    brand: sale.brand,
    orderReference: sale.orderReference,
  };
}

// Helper: create transaction detail from return
function returnToTransaction(ret: Return): AnalyticsTransactionDetail {
  const documentType = (ret.reason || 'RESO').toString().toUpperCase().trim();
  const numero = ret.orderReference || ret.saleId || ret.id;
  
  return {
    type: 'return',
    documentType: documentType,
    documentNumber: numero,
    date: ret.date,
    amount: -Math.abs(ret.amount), // Sempre negativo per resi
    channel: ret.channel,
    channelSpecific: ret.channel === 'marketplace' ? ret.marketplace : undefined,
    country: ret.country,
    orderReference: ret.orderReference,
  };
}

// Helper: check if sale is from physical store
function isStoreSale(sale: Sale): boolean {
  return sale.channel === 'negozio_donna' || sale.channel === 'negozio_uomo';
}

// Helper: check if return is from physical store
function isStoreReturn(ret: Return): boolean {
  return ret.channel === 'negozio_donna' || ret.channel === 'negozio_uomo';
}

// Calculate analytics aggregated by country (excludes store sales)
export function calculateCountryAnalytics(
  sales: Sale[],
  returns: Return[]
): CountryAnalytics[] {
  const countryMap = new Map<string, {
    sales: Sale[];
    returns: Return[];
  }>();

  // Group sales by country (exclude store sales)
  for (const sale of sales) {
    // Skip store sales - they don't have meaningful country data
    if (isStoreSale(sale)) continue;
    
    const country = (sale.country || 'UNKNOWN').toUpperCase();
    if (!countryMap.has(country)) {
      countryMap.set(country, { sales: [], returns: [] });
    }
    countryMap.get(country)!.sales.push(sale);
  }

  // Group returns by country (exclude store returns)
  for (const ret of returns) {
    // Skip store returns
    if (isStoreReturn(ret)) continue;
    
    const country = (ret.country || 'UNKNOWN').toUpperCase();
    if (!countryMap.has(country)) {
      countryMap.set(country, { sales: [], returns: [] });
    }
    countryMap.get(country)!.returns.push(ret);
  }

  // Calculate analytics for each country
  const result: CountryAnalytics[] = [];

  for (const [countryCode, data] of countryMap.entries()) {
    const salesAmount = data.sales.reduce((sum, s) => sum + s.amount, 0);
    const returnsAmount = data.returns.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const netAmount = salesAmount - returnsAmount;

    // Build transaction details
    const transactions: AnalyticsTransactionDetail[] = [
      ...data.sales.map(saleToTransaction),
      ...data.returns.map(returnToTransaction),
    ];

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    result.push({
      country: countryCode,
      countryName: getCountryName(countryCode),
      salesAmount,
      returnsAmount,
      netAmount,
      transactionCount: transactions.length,
      salesCount: data.sales.length,
      returnsCount: data.returns.length,
      transactions,
    });
  }

  // Sort by sales amount descending
  return result.sort((a, b) => b.salesAmount - a.salesAmount);
}

// Calculate analytics aggregated by channel
export function calculateChannelAnalytics(
  sales: Sale[],
  returns: Return[]
): ChannelAnalytics[] {
  const channelMap = new Map<string, {
    channelName: string;
    macroChannel: string;
    sales: Sale[];
    returns: Return[];
  }>();

  // Group sales by specific channel
  for (const sale of sales) {
    let channelKey: string;
    let channelName: string;
    let macroChannel: string;

    if (sale.channel === 'marketplace') {
      // Per marketplace, raggruppa per paymentMethod o marketplace
      channelKey = sale.paymentMethod || sale.marketplace || 'Altro Marketplace';
      channelName = channelKey;
      macroChannel = 'Marketplace';
    } else {
      channelKey = sale.channel;
      channelName = CHANNEL_NAMES[sale.channel] || sale.channel;
      macroChannel = getMacroChannel(sale.channel);
    }

    if (!channelMap.has(channelKey)) {
      channelMap.set(channelKey, { channelName, macroChannel, sales: [], returns: [] });
    }
    channelMap.get(channelKey)!.sales.push(sale);
  }

  // Group returns by specific channel
  for (const ret of returns) {
    let channelKey: string;
    let channelName: string;
    let macroChannel: string;

    if (ret.channel === 'marketplace') {
      channelKey = ret.marketplace || 'Altro Marketplace';
      channelName = channelKey;
      macroChannel = 'Marketplace';
    } else {
      channelKey = ret.channel;
      channelName = CHANNEL_NAMES[ret.channel] || ret.channel;
      macroChannel = getMacroChannel(ret.channel);
    }

    if (!channelMap.has(channelKey)) {
      channelMap.set(channelKey, { channelName, macroChannel, sales: [], returns: [] });
    }
    channelMap.get(channelKey)!.returns.push(ret);
  }

  // Calculate analytics for each channel
  const result: ChannelAnalytics[] = [];

  for (const [channelKey, data] of channelMap.entries()) {
    const salesAmount = data.sales.reduce((sum, s) => sum + s.amount, 0);
    const returnsAmount = data.returns.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const netAmount = salesAmount - returnsAmount;

    // Build transaction details
    const transactions: AnalyticsTransactionDetail[] = [
      ...data.sales.map(saleToTransaction),
      ...data.returns.map(returnToTransaction),
    ];

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    result.push({
      channel: channelKey,
      channelName: data.channelName,
      macroChannel: data.macroChannel,
      salesAmount,
      returnsAmount,
      netAmount,
      transactionCount: transactions.length,
      salesCount: data.sales.length,
      returnsCount: data.returns.length,
      transactions,
    });
  }

  // Sort by sales amount descending
  return result.sort((a, b) => b.salesAmount - a.salesAmount);
}

// Calculate analytics aggregated by document type
export function calculateDocumentTypeAnalytics(
  sales: Sale[],
  returns: Return[]
): DocumentTypeAnalytics[] {
  const docTypeMap = new Map<string, {
    sales: Sale[];
    returns: Return[];
  }>();

  // Group sales by document type
  for (const sale of sales) {
    const docType = ((sale as any).documento || 'VENDITA').toString().toUpperCase().trim();
    if (!docTypeMap.has(docType)) {
      docTypeMap.set(docType, { sales: [], returns: [] });
    }
    docTypeMap.get(docType)!.sales.push(sale);
  }

  // Group returns by reason (document type)
  for (const ret of returns) {
    const docType = (ret.reason || 'RESO').toString().toUpperCase().trim();
    if (!docTypeMap.has(docType)) {
      docTypeMap.set(docType, { sales: [], returns: [] });
    }
    docTypeMap.get(docType)!.returns.push(ret);
  }

  // Calculate analytics for each document type
  const result: DocumentTypeAnalytics[] = [];

  for (const [docType, data] of docTypeMap.entries()) {
    const salesAmount = data.sales.reduce((sum, s) => sum + s.amount, 0);
    const returnsAmount = data.returns.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const netAmount = salesAmount - returnsAmount;

    // Build transaction details
    const transactions: AnalyticsTransactionDetail[] = [
      ...data.sales.map(saleToTransaction),
      ...data.returns.map(returnToTransaction),
    ];

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    result.push({
      documentType: docType,
      salesAmount,
      returnsAmount,
      netAmount,
      transactionCount: transactions.length,
      salesCount: data.sales.length,
      returnsCount: data.returns.length,
      transactions,
    });
  }

  // Sort by transaction count descending
  return result.sort((a, b) => b.transactionCount - a.transactionCount);
}

// Calculate brand analytics with breakdowns
export function calculateBrandAnalytics(
  sales: Sale[],
  brand: string
): BrandAnalytics {
  const brandSales = sales.filter(s => s.brand === brand);
  const totalAmount = brandSales.reduce((sum, s) => sum + s.amount, 0);
  const transactionCount = brandSales.length;

  // Breakdown by country
  const countryMap = new Map<string, number>();
  brandSales.forEach(sale => {
    const country = (sale.country || 'UNKNOWN').toUpperCase();
    countryMap.set(country, (countryMap.get(country) || 0) + sale.amount);
  });

  const byCountry = Array.from(countryMap.entries())
    .map(([country, amount]) => ({
      country,
      countryName: getCountryName(country),
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Breakdown by macro channel
  const macroChannelMap = new Map<string, number>();
  brandSales.forEach(sale => {
    const macro = getMacroChannel(sale.channel);
    macroChannelMap.set(macro, (macroChannelMap.get(macro) || 0) + sale.amount);
  });

  const byMacroChannel = Array.from(macroChannelMap.entries())
    .map(([macroChannel, amount]) => ({
      macroChannel,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Breakdown by specific channel
  const channelMap = new Map<string, { amount: number; macroChannel: string }>();
  brandSales.forEach(sale => {
    let channelKey: string;
    let macroChannel: string;

    if (sale.channel === 'marketplace') {
      channelKey = sale.paymentMethod || sale.marketplace || 'Altro Marketplace';
      macroChannel = 'Marketplace';
    } else {
      channelKey = sale.channel;
      macroChannel = getMacroChannel(sale.channel);
    }

    if (!channelMap.has(channelKey)) {
      channelMap.set(channelKey, { amount: 0, macroChannel });
    }
    channelMap.get(channelKey)!.amount += sale.amount;
  });

  const byChannel = Array.from(channelMap.entries())
    .map(([channel, data]) => ({
      channel,
      channelName: CHANNEL_NAMES[channel] || channel,
      macroChannel: data.macroChannel,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    brand,
    totalAmount,
    transactionCount,
    byCountry,
    byMacroChannel,
    byChannel,
  };
}

// Get list of unique brands from sales
export function getUniqueBrands(sales: Sale[]): string[] {
  const brands = new Set<string>();
  sales.forEach(sale => {
    if (sale.brand && sale.brand !== 'Unknown') {
      brands.add(sale.brand);
    }
  });
  return Array.from(brands).sort();
}

