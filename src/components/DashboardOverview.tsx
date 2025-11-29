import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { InventoryStats } from "./InventoryStats";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getBrandData, getCategoryData, filterDataByDateAdvanced, calculateYoYChange } from "../utils/analytics";
import { TrendingUp, ShoppingBag, Target } from "lucide-react";

interface DashboardOverviewProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
  customStart?: string;
  customEnd?: string;
  totalInventoryCount?: number;
}

export function DashboardOverview({ sales, returns, inventory, dateRange, customStart, customEnd, totalInventoryCount }: DashboardOverviewProps) {
  // Apply date filter to sales and returns
  const filteredSales = filterDataByDateAdvanced(sales, dateRange, customStart, customEnd);
  const filteredReturns = filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
  
  const metrics = calculateMetrics(filteredSales, filteredReturns, inventory);
  const salesByDate = getSalesByDate(filteredSales, 30); // Use filtered data
  
  const brandData = getBrandData(filteredSales);
  const categoryData = getCategoryData(filteredSales);

  // Calculate YoY changes
  const totalSalesYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => s.reduce((sum, sale) => sum + sale.amount, 0));
  const totalReturnsYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => {
    const filtered = filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
    return filtered.reduce((sum, ret) => sum + ret.amount, 0);
  });
  const returnRateYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => {
    const filtered = filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
    const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
    const totalReturns = filtered.reduce((sum, ret) => sum + ret.amount, 0);
    return totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
  });
  const marginYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => {
    const normalizeSku = (sku?: string) => (sku || '').toString().trim().toUpperCase();
    const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
    const totalCost = s.reduce((sum, sale) => {
      const saleSku = normalizeSku((sale as any).sku || sale.productId);
      if (!saleSku) return sum;
      const inventoryItem = inventory.find(item => normalizeSku(item.sku) === saleSku);
      return sum + (inventoryItem ? inventoryItem.purchasePrice * sale.quantity : 0);
    }, 0);
    return totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;
  });
  const negozioDonnaYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => 
    s.filter(sale => sale.channel === 'negozio_donna').reduce((sum, sale) => sum + sale.amount, 0)
  );
  const negozioUomoYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => 
    s.filter(sale => sale.channel === 'negozio_uomo').reduce((sum, sale) => sum + sale.amount, 0)
  );
  const ecommerceYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => 
    s.filter(sale => sale.channel === 'ecommerce').reduce((sum, sale) => sum + sale.amount, 0)
  );
  const marketplaceYoY = calculateYoYChange(sales, dateRange, customStart, customEnd, (s) => 
    s.filter(sale => sale.channel === 'marketplace').reduce((sum, sale) => sum + sale.amount, 0)
  );

  // Handle empty data state within sections
  const hasData = filteredSales.length > 0;
  const hasInventoryOnly = inventory.length > 0 && filteredSales.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6" />
          Panoramica Generale
        </h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Fatturato Totale"
          value={metrics.totalSales}
          prefix="€"
          change={totalSalesYoY.change}
          changeType={totalSalesYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="Resi Totali"
          value={metrics.totalReturns}
          prefix="€"
          change={totalReturnsYoY.change}
          changeType={totalReturnsYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="Tasso di Reso"
          value={metrics.returnRate.toFixed(1)}
          suffix="%"
          change={returnRateYoY.change}
          changeType={returnRateYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="Marginalità Media"
          value={metrics.margin !== null ? metrics.margin.toFixed(1) : "N/D"}
          suffix={metrics.margin !== null ? "%" : ""}
          change={metrics.margin !== null ? marginYoY.change : undefined}
          changeType={metrics.margin !== null ? marginYoY.changeType : "neutral"}
          description={metrics.margin !== null 
            ? "Variazione vs anno precedente" 
            : "Carica inventario per calcolare"
          }
        />
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Negozio Donna"
          value={metrics.salesByChannel.negozio_donna}
          prefix="€"
          change={negozioDonnaYoY.change}
          changeType={negozioDonnaYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="Negozio Uomo"
          value={metrics.salesByChannel.negozio_uomo}
          prefix="€"
          change={negozioUomoYoY.change}
          changeType={negozioUomoYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="E-commerce"
          value={metrics.salesByChannel.ecommerce}
          prefix="€"
          change={ecommerceYoY.change}
          changeType={ecommerceYoY.changeType}
          description="Variazione vs anno precedente"
        />
        <MetricCard
          title="Marketplace"
          value={metrics.salesByChannel.marketplace}
          prefix="€"
          change={marketplaceYoY.change}
          changeType={marketplaceYoY.changeType}
          description="Variazione vs anno precedente"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart
          title="Andamento Vendite (30 giorni)"
          data={salesByDate}
          type="line"
          dataKey="sales"
          xAxisKey="date"
          height={400}
        />
        <SalesChart
          title="Top Brand per Fatturato"
          data={brandData}
          type="bar"
          dataKey="value"
          height={400}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart
          title="Vendite per Categoria"
          data={categoryData}
          type="pie"
          dataKey="value"
          height={400}
        />
        <div className="space-y-4">
          <h3 className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Obiettivi e Performance
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <MetricCard
              title="Obiettivo Mensile"
              value="15.000"
              prefix="€"
              description={`Raggiunto ${Math.round((metrics.totalSales / 15000) * 100)}%`}
              badge={metrics.totalSales >= 15000 ? "Obiettivo raggiunto" : "In corso"}
              badgeVariant={metrics.totalSales >= 15000 ? "default" : "outline"}
            />
            <MetricCard
              title="Prodotti in Inventario"
              value={totalInventoryCount || inventory.length}
              description="Totale prodotti caricati"
            />
          </div>
        </div>
      </div>

      {/* Inventory Statistics Section */}
      {inventory.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Analisi Inventario
            {hasInventoryOnly && (
              <span className="text-sm text-muted-foreground ml-2">
                (Carica dati vendita per analisi complete)
              </span>
            )}
          </h3>
          <InventoryStats inventory={inventory} />
        </div>
      )}
    </div>
  );
}