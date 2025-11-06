export interface StoreUploadRow {
  Data: string;
  Utente: string;
  SKU: string;
  'Quant.': number;
  Prezzo: number;
}

export interface ProcessedSaleData {
  date: string;
  user: string;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  sku: string;
  quantity: number;
  price: number;
  amount: number;
  paymentMethod?: string;
  area?: 'Ferraris' | 'Zuklat';
  country?: string;
  orderReference?: string;
  shippingCost?: number;
  taxRate?: number;
}

export interface EcommerceUploadRow {
  Documento?: string;
  Numero?: string;
  Data?: string;
  'Ragione soci'?: string;
  Nazione?: string;
  Totale?: number | string;
  Area?: string;
  'Metodo paga'?: string;
  'Spese traspc'?: number | string;
  Qty?: number;
  Articolo?: string;
  'Prezzo articc'?: number | string;
  'Aliquota per'?: number;
  SKU?: string;
  Personalizza?: string;
  // Campi documenti passivi
  'Name/Entity'?: string;
  'Total Amount'?: number | string;
  'Supplier/Platform'?: string;
  'Additional Amount'?: number | string;
  'Item Description'?: string;
  'Item Amount'?: number | string;
  'Tax Rate'?: number;
  'Order/Reference Number'?: string;
  'Status/Additional Info'?: string;
}

export interface ProcessedEcommerceSaleData extends ProcessedSaleData {
  area?: 'Ferraris' | 'Zuklat';
  country?: string;
  orderReference?: string;
  shippingCost?: number;
  taxRate?: number;
}

export interface ProcessedReturnData {
  date: string;
  country?: string;
  area?: 'Ferraris' | 'Zuklat';
  channel: 'ecommerce' | 'marketplace';
  sku?: string;
  quantity: number;
  price: number;
  amount: number; // Sempre negativo
  paymentMethod?: string;
  orderReference?: string;
  returnShippingCost?: number;
  taxRate?: number;
  reason?: string; // "RESO" o "NOTA CRED"
}

export interface EcommerceUploadResult {
  success: boolean;
  sales?: ProcessedEcommerceSaleData[];
  returns?: ProcessedReturnData[];
  errors?: string[];
  totalRows: number;
  validSalesRows: number;
  validReturnsRows: number;
  skippedDuplicates: number;
}

export interface UploadResult {
  success: boolean;
  data?: ProcessedSaleData[];
  errors?: string[];
  totalRows: number;
  validRows: number;
}

export const USER_STORE_MAPPING: Record<string, 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace'> = {
  // Negozi fisici
  'carla': 'negozio_donna',
  'alexander': 'negozio_uomo',
  'paolo': 'negozio_uomo',
  // E-commerce
  'admin': 'ecommerce',
  'online': 'ecommerce',
  'shop': 'ecommerce',
  'ecommerce': 'ecommerce',
  // Marketplace
  'amazon': 'marketplace',
  'zalando': 'marketplace',
  'farfetch': 'marketplace',
  'ebay': 'marketplace',
  'marketplace': 'marketplace',
};