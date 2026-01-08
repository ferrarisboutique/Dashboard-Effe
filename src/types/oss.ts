export interface OSSCountry {
  code: string; // Codice paese (IT, DE, FR, etc.)
  name: string; // Nome paese
  vatRate: number; // Aliquota IVA standard
  vatRates?: Record<string, number>; // Aliquote per categoria (se diverse)
}

// Dettaglio singola transazione per drill-down
export interface OSSTransactionDetail {
  type: 'sale' | 'return';
  documentType: string;    // "RICEVUTA" o "RESO"
  documentNumber: string;  // Numero documento
  date: string;
  amount: number;
  orderReference?: string;
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
  transactions: OSSTransactionDetail[]; // Dettagli documenti per drill-down
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



