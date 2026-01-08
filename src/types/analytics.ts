// Analytics drill-down types

// Dettaglio singola transazione per drill-down
export interface AnalyticsTransactionDetail {
  type: 'sale' | 'return';
  documentType: string;    // "RICEVUTA", "FATTURA ACCOMPAGNATORIA", "DDT", "RESO", "NOTA CRED", etc.
  documentNumber: string;  // Numero documento
  date: string;
  amount: number;          // Positivo per vendite, negativo per resi
  channel: string;         // Canale di vendita
  channelSpecific?: string; // Marketplace specifico (Miinto, Zalando, etc.)
  country?: string;
  brand?: string;
  orderReference?: string;
}

// Dati aggregati per paese con transactions per drill-down
export interface CountryAnalytics {
  country: string;
  countryName: string;
  salesAmount: number;
  returnsAmount: number;
  netAmount: number;
  transactionCount: number;
  salesCount: number;
  returnsCount: number;
  transactions: AnalyticsTransactionDetail[];
}

// Dati aggregati per canale con transactions per drill-down
export interface ChannelAnalytics {
  channel: string;          // Identificativo canale (negozio_donna, ecommerce, miinto, etc.)
  channelName: string;      // Nome visualizzato
  macroChannel: string;     // Macro canale (Negozio, Sito, Marketplace)
  salesAmount: number;
  returnsAmount: number;
  netAmount: number;
  transactionCount: number;
  salesCount: number;
  returnsCount: number;
  transactions: AnalyticsTransactionDetail[];
}

// Dati aggregati per tipo documento con transactions per drill-down
export interface DocumentTypeAnalytics {
  documentType: string;     // Tipo documento (RICEVUTA, FATTURA ACCOMPAGNATORIA, etc.)
  salesAmount: number;
  returnsAmount: number;
  netAmount: number;
  transactionCount: number;
  salesCount: number;
  returnsCount: number;
  transactions: AnalyticsTransactionDetail[];
}

// Dati aggregati per brand con breakdown
export interface BrandAnalytics {
  brand: string;
  totalAmount: number;
  transactionCount: number;
  // Breakdown per paese
  byCountry: Array<{
    country: string;
    countryName: string;
    amount: number;
    percentage: number;
  }>;
  // Breakdown per macro canale
  byMacroChannel: Array<{
    macroChannel: string;
    amount: number;
    percentage: number;
  }>;
  // Breakdown per canale specifico
  byChannel: Array<{
    channel: string;
    channelName: string;
    macroChannel: string;
    amount: number;
    percentage: number;
  }>;
}

// Mappa nomi paesi
export const COUNTRY_NAMES: Record<string, string> = {
  'IT': 'Italia',
  'DE': 'Germania',
  'FR': 'Francia',
  'ES': 'Spagna',
  'GB': 'Regno Unito',
  'UK': 'Regno Unito',
  'AT': 'Austria',
  'BE': 'Belgio',
  'NL': 'Paesi Bassi',
  'CH': 'Svizzera',
  'PT': 'Portogallo',
  'PL': 'Polonia',
  'CZ': 'Repubblica Ceca',
  'SE': 'Svezia',
  'DK': 'Danimarca',
  'FI': 'Finlandia',
  'NO': 'Norvegia',
  'IE': 'Irlanda',
  'GR': 'Grecia',
  'HU': 'Ungheria',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croazia',
  'SK': 'Slovacchia',
  'SI': 'Slovenia',
  'LT': 'Lituania',
  'LV': 'Lettonia',
  'EE': 'Estonia',
  'CY': 'Cipro',
  'MT': 'Malta',
  'LU': 'Lussemburgo',
  'US': 'Stati Uniti',
};

// Mappa nomi canali
export const CHANNEL_NAMES: Record<string, string> = {
  'negozio_donna': 'Negozio Donna',
  'negozio_uomo': 'Negozio Uomo',
  'ecommerce': 'Sito Web',
  'marketplace': 'Marketplace',
};

// Mappa macro canali
export const MACRO_CHANNELS: Record<string, string> = {
  'negozio_donna': 'Negozio',
  'negozio_uomo': 'Negozio',
  'ecommerce': 'Sito',
  'marketplace': 'Marketplace',
};

