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

// Channel cost settings for commission calculations
export interface ChannelCostSettings {
  paymentMethod: string;           // es. "miinto", "Zalando"
  macroArea: 'Marketplace' | 'Sito' | 'Altro';
  commissionPercent?: number;      // es. 30 (%)
  extraCommissionPercent?: number; // es. 3 (%)
  fixedCost?: number;              // es. 0.50 EUR per transaction
  returnCost?: number;             // solo per Marketplace, costo per reso
  applyOnVatIncluded: boolean;     // true = IVA inclusa, false = usa taxRate per scorporare
}

// Detailed metrics for each marketplace
export interface MarketplaceMetrics {
  name: string;
  totalSales: number;
  orderCount: number;              // Numero righe/prodotti venduti
  uniqueOrderCount: number;        // Numero ordini unici (per costi fissi)
  totalReturns: number;
  returnCount: number;             // Numero righe reso
  uniqueReturnCount: number;       // Numero ordini reso unici (per costi reso)
  returnRate: number;
  margin: number | null;           // Alias per grossMarginPercent (backwards compat)
  grossMarginPercent: number | null; // Marginalità lorda % (Venduto - Costo Prodotti) / Venduto
  averageOrderValue: number;
  totalQuantity: number;
  // Cost breakdown
  totalCommissions: number;        // Totale commissioni € (calcolate su TUTTO il venduto)
  commissionPercent: number;       // % commissione configurata
  extraCommissionPercent: number;  // % extra commissione configurata
  totalFixedCosts: number;         // Totale costi fissi € (per ordine unico)
  totalReturnCosts: number;        // Totale costi reso € (per reso unico)
  totalProductCost: number;        // Totale costo prodotti €
  // Profits
  grossProfit: number;             // Venduto - Costo Prodotti
  netProfit: number;               // Venduto - Costo Prodotti - Costi Canale
  netMargin: number | null;        // Marginalità netta % (dopo tutti i costi, solo se abbiamo costo prodotti)
  // Net from channel (sempre calcolabile, anche senza costo prodotti)
  netFromChannel: number;          // Venduto - Costi Canale (quanto resta dopo commissioni)
  netFromChannelPercent: number;   // % di quanto resta dopo i costi canale
}

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