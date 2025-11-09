import { Sale, Return } from '../types/dashboard';
import { OSSCountry, OSSVATData } from '../types/oss';

// Lista paesi OSS con aliquote IVA standard
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
  { code: 'IT', name: 'Italia', vatRate: 22 },
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
export function calculateVATByCountry(
  sales: Sale[],
  returns: Return[],
  period: { start: string; end: string }
): OSSVATData[] {
  // Filter by period
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);
  endDate.setHours(23, 59, 59, 999); // End of day

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= startDate && saleDate <= endDate;
  });

  const filteredReturns = returns.filter(ret => {
    const returnDate = new Date(ret.date);
    return returnDate >= startDate && returnDate <= endDate;
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
    const returnsAmount = Math.abs(data.returns.reduce((sum, r) => r.amount, 0)); // Returns are negative
    const baseAmount = salesAmount - returnsAmount;
    const vatRate = ossCountry.vatRate;
    const vatAmount = (baseAmount * vatRate) / 100;
    const transactionCount = data.sales.length + data.returns.length;

    vatData.push({
      country: countryCode,
      countryName: ossCountry.name,
      baseAmount,
      vatRate,
      vatAmount,
      transactionCount,
      salesAmount,
      returnsAmount
    });
  }

  // Sort by country code
  return vatData.sort((a, b) => a.country.localeCompare(b.country));
}

// Get all OSS countries
export function getOSSCountries(): OSSCountry[] {
  return OSS_COUNTRIES;
}



