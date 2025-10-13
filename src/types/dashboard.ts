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
}

export interface Return {
  id: string;
  saleId: string;
  date: string;
  amount: number;
  reason: string;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  marketplace?: string;
}

// InventoryItem definition moved to types/inventory.ts to avoid conflicts

export interface DashboardMetrics {
  totalSales: number;
  totalReturns: number;
  returnRate: number;
  margin: number;
  salesByChannel: {
    negozio_donna: number;
    negozio_uomo: number;
    ecommerce: number;
    marketplace: number;
  };
  salesByBrand: Record<string, number>;
  salesByCategory: Record<string, number>;
}