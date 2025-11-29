export interface Sale {
  id: string;
  date: string;
  user?: string;
  amount: number;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  marketplace?: string;
  brand: string;
  category: 'abbigliamento' | 'calzature' | 'accessori' | 'borse';
  sku?: string;
  productId: string;
  quantity: number;
  price?: number;
  season: 'primavera_estate' | 'autunno_inverno';
  paymentMethod?: string;
  area?: 'Ferraris' | 'Zuklat';
  country?: string;
  orderReference?: string;
  shippingCost?: number;
  taxRate?: number;
  documento?: string;
  numero?: string;
}

export interface Return {
  id: string;
  saleId: string;
  date: string;
  amount: number;
  reason: string;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  marketplace?: string;
  area?: 'Ferraris' | 'Zuklat';
  country?: string;
  orderReference?: string;
  returnShippingCost?: number;
  taxRate?: number;
}

// InventoryItem definition moved to types/inventory.ts to avoid conflicts

export interface DashboardMetrics {
  totalSales: number;
  totalReturns: number;
  returnRate: number;
  margin: number | null; // null when inventory is empty or no matches
  salesByChannel: {
    negozio_donna: number;
    negozio_uomo: number;
    ecommerce: number;
    marketplace: number;
  };
  salesByBrand: Record<string, number>;
  salesByCategory: Record<string, number>;
  // Inventory matching stats
  inventoryMatchStats?: {
    totalSales: number;
    matchedSales: number;
    unmatchedSales: number;
    matchPercentage: number;
    hasInventory: boolean;
  };
}