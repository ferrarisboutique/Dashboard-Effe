export interface OSSCountry {
  code: string; // Codice paese (IT, DE, FR, etc.)
  name: string; // Nome paese
  vatRate: number; // Aliquota IVA standard
  vatRates?: Record<string, number>; // Aliquote per categoria (se diverse)
}

export interface OSSVATData {
  country: string;
  countryName: string;
  baseAmount: number; // Base imponibile (vendite - resi)
  vatRate: number;
  vatAmount: number; // IVA dovuta
  transactionCount: number;
  salesAmount: number;
  returnsAmount: number;
}

export interface OSSExportFormat {
  period: string;
  country: string;
  countryName: string;
  baseAmount: number;
  vatAmount: number;
  transactionCount: number;
  vatRate: number;
}

