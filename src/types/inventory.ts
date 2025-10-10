export interface InventoryItem {
  id: string;
  sku: string;
  category: string;
  brand: string;
  purchasePrice: number; // Prezzo di acquisto (IVA esclusa)
  sellPrice: number; // Prezzo di vendita (IVA compresa)
  collection: string; // Collezione/stagione (es. FW 2025)
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcessedInventoryData {
  sku: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellPrice: number;
  collection: string;
}

export interface InventoryUploadResult {
  success: boolean;
  message: string;
  processedCount?: number;
  processedData?: ProcessedInventoryData[];
  errors?: string[];
}