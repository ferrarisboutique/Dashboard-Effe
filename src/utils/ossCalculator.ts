import { Sale, Return } from '../types/dashboard';
import { OSSCountry, OSSVATData, OSSTransactionDetail } from '../types/oss';

// Lista paesi OSS con aliquote IVA standard (esclusa Italia - paese di origine)
export const OSS_COUNTRIES: OSSCountry[] = [
  { code: 'AT', name: 'Austria', vatRate: 20 },
  { code: 'BE', name: 'Belgio', vatRate: 21 },
  { code: 'BG', name: 'Bulgaria', vatRate: 20 },
  { code: 'CY', name: 'Cipro', vatRate: 19 },
  { code: 'HR', name: 'Croazia', vatRate: 25 },
  { code: 'CZ', name: 'Repubblica Ceca', vatRate: 21 },
  { code: 'DK', name: 'Danimarca', vatRate: 25 },
  { code: 'EE', name: 'Estonia', vatRate: 20 },
  { code: 'FI', name: 'Finlandia', vatRate: 24 },
  { code: 'FR', name: 'Francia', vatRate: 20 },
  { code: 'DE', name: 'Germania', vatRate: 19 },
  { code: 'GR', name: 'Grecia', vatRate: 24 },
  { code: 'HU', name: 'Ungheria', vatRate: 27 },
  { code: 'IE', name: 'Irlanda', vatRate: 23 },
  // IT (Italia) esclusa - è il paese di origine, non rientra nell'OSS
  { code: 'LV', name: 'Lettonia', vatRate: 21 },
  { code: 'LT', name: 'Lituania', vatRate: 21 },
  { code: 'LU', name: 'Lussemburgo', vatRate: 17 },
  { code: 'MT', name: 'Malta', vatRate: 18 },
  { code: 'NL', name: 'Paesi Bassi', vatRate: 21 },
  { code: 'PL', name: 'Polonia', vatRate: 23 },
  { code: 'PT', name: 'Portogallo', vatRate: 23 },
  { code: 'RO', name: 'Romania', vatRate: 19 },
  { code: 'SK', name: 'Slovacchia', vatRate: 20 },
  { code: 'SI', name: 'Slovenia', vatRate: 22 },
  { code: 'ES', name: 'Spagna', vatRate: 21 },
  { code: 'SE', name: 'Svezia', vatRate: 25 },
];

// Helper: get country VAT rate
export function getCountryVATRate(countryCode: string): number {
  const country = OSS_COUNTRIES.find(c => c.code === countryCode.toUpperCase());
  return country?.vatRate || 0;
}

// Helper: get country name
export function getCountryName(countryCode: string): string {
  const country = OSS_COUNTRIES.find(c => c.code === countryCode.toUpperCase());
  return country?.name || countryCode;
}

// Calculate VAT by country for a given period
// OSS include solo vendite con documento "RICEVUTA" e resi con documento "RESO"
export function calculateVATByCountry(
  sales: Sale[],
  returns: Return[],
  period: { start: string; end: string }
): OSSVATData[] {
  // Filter by period
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);
  endDate.setHours(23, 59, 59, 999); // End of day

  // Filtra vendite: solo nel periodo E con documento "RICEVUTA"
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    const inPeriod = saleDate >= startDate && saleDate <= endDate;
    // Solo documenti RICEVUTA (case insensitive)
    const documento = ((sale as any).documento || '').toString().toUpperCase().trim();
    const isRicevuta = documento === 'RICEVUTA';
    return inPeriod && isRicevuta;
  });

  // Filtra resi: solo nel periodo E con documento "RESO" (non NOTA CRED o altri)
  const filteredReturns = returns.filter(ret => {
    const returnDate = new Date(ret.date);
    const inPeriod = returnDate >= startDate && returnDate <= endDate;
    // Solo documenti RESO (case insensitive)
    const reason = (ret.reason || '').toString().toUpperCase().trim();
    const isReso = reason === 'RESO';
    return inPeriod && isReso;
  });

  // Group by country
  const countryMap = new Map<string, {
    sales: Sale[];
    returns: Return[];
  }>();

  // Process sales
  for (const sale of filteredSales) {
    if (!sale.country) continue;
    const country = sale.country.toUpperCase();
    if (!countryMap.has(country)) {
      countryMap.set(country, { sales: [], returns: [] });
    }
    countryMap.get(country)!.sales.push(sale);
  }

  // Process returns
  for (const ret of filteredReturns) {
    if (!ret.country) continue;
    const country = ret.country.toUpperCase();
    if (!countryMap.has(country)) {
      countryMap.set(country, { sales: [], returns: [] });
    }
    countryMap.get(country)!.returns.push(ret);
  }

  // Calculate VAT for each country
  const vatData: OSSVATData[] = [];

  for (const [countryCode, data] of countryMap.entries()) {
    // Only process OSS countries
    const ossCountry = OSS_COUNTRIES.find(c => c.code === countryCode);
    if (!ossCountry) continue;

    const salesAmount = data.sales.reduce((sum, s) => sum + s.amount, 0);
    // I resi hanno amount negativo, usiamo Math.abs() per ogni reso
    const returnsAmount = data.returns.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const baseAmount = salesAmount - returnsAmount;
    const vatRate = ossCountry.vatRate;
    const vatAmount = (baseAmount * vatRate) / 100;
    const transactionCount = data.sales.length + data.returns.length;

    // Collect transaction details for drill-down
    const transactions: OSSTransactionDetail[] = [];
    
    // Add sales transactions
    for (const sale of data.sales) {
      transactions.push({
        type: 'sale',
        documentType: ((sale as any).documento || 'RICEVUTA').toString().toUpperCase(),
        documentNumber: ((sale as any).numero || sale.orderReference || sale.id).toString(),
        date: sale.date,
        amount: sale.amount,
        orderReference: sale.orderReference,
      });
    }
    
    // Add return transactions
    for (const ret of data.returns) {
      transactions.push({
        type: 'return',
        documentType: 'RESO',
        documentNumber: ret.orderReference || ret.saleId || ret.id,
        date: ret.date,
        amount: -Math.abs(ret.amount), // Negative for returns
        orderReference: ret.orderReference,
      });
    }
    
    // Sort transactions by date (most recent first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    vatData.push({
      country: countryCode,
      countryName: ossCountry.name,
      baseAmount,
      vatRate,
      vatAmount,
      transactionCount,
      salesAmount,
      returnsAmount,
      transactions,
    });
  }

  // Sort by country code
  return vatData.sort((a, b) => a.country.localeCompare(b.country));
}

// Get all OSS countries
export function getOSSCountries(): OSSCountry[] {
  return OSS_COUNTRIES;
}



