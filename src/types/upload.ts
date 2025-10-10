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
  channel: 'negozio_donna' | 'negozio_uomo';
  sku: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface UploadResult {
  success: boolean;
  data?: ProcessedSaleData[];
  errors?: string[];
  totalRows: number;
  validRows: number;
}

export const USER_STORE_MAPPING: Record<string, 'negozio_donna' | 'negozio_uomo'> = {
  'carla': 'negozio_donna',
  'alexander': 'negozio_uomo',
  'paolo': 'negozio_uomo'
};