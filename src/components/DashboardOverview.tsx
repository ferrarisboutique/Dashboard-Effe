import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { InventoryStats } from "./InventoryStats";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getBrandData, getCategoryData, filterDataByDateRange } from "../utils/analytics";
import { TrendingUp, ShoppingBag, RotateCcw, Target, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

interface DashboardOverviewProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
  onNavigateToDiagnostics?: () => void;
}

export function DashboardOverview({ sales, returns, inventory, dateRange, onNavigateToDiagnostics }: DashboardOverviewProps) {
  // Apply date filter to sales and returns
  const filteredSales = filterDataByDateRange(sales, dateRange);
  const filteredReturns = filterDataByDateRange(returns, dateRange);
  
  const metrics = calculateMetrics(filteredSales, filteredReturns, inventory);
  const salesByDate = getSalesByDate(filteredSales, 30); // Use filtered data
  
  const brandData = getBrandData(filteredSales);
  const categoryData = getCategoryData(filteredSales);

  // Handle empty data state within sections
  const hasData = filteredSales.length > 0;
  const hasInventoryOnly = inventory.length > 0 && filteredSales.length === 0;
  
  // Check for problematic channels
  const validChannels = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'];
  const problematicSales = sales.filter(s => !validChannels.includes(s.channel));
  const hasProblematicChannels = problematicSales.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6" />
          Panoramica Generale
        </h2>
      </div>

      {/* Warning for problematic channels */}
      {hasProblematicChannels && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Attenzione: Dati Incompleti</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Trovate {problematicSales.length} vendite senza canale valido. Questi dati non vengono visualizzati correttamente nella dashboard.
            </span>
            {onNavigateToDiagnostics && (
              <Button 
                onClick={onNavigateToDiagnostics} 
                variant="outline" 
                size="sm"
                className="ml-4 flex-shrink-0"
              >
                Correggi Ora
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Fatturato Totale"
          value={metrics.totalSales}
          prefix="€"
          change={14.2}
          changeType="increase"
          description="Tutti i canali"
          badge="Questo mese"
          badgeVariant="secondary"
        />
        <MetricCard
          title="Resi Totali"
          value={metrics.totalReturns}
          prefix="€"
          change={-5.1}
          changeType="decrease"
          description="Tutti i canali"
        />
        <MetricCard
          title="Tasso di Reso"
          value={metrics.returnRate.toFixed(1)}
          suffix="%"
          changeType="decrease"
          description="Media ponderata"
        />
        <MetricCard
          title="Marginalità Media"
          value={metrics.margin.toFixed(1)}
          suffix="%"
          change={2.3}
          changeType="increase"
          description="Su tutti i prodotti"
        />
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Negozio Donna"
          value={metrics.salesByChannel.negozio_donna}
          prefix="€"
          change={12.5}
          changeType="increase"
          badge="Top"
          badgeVariant="default"
        />
        <MetricCard
          title="Negozio Uomo"
          value={metrics.salesByChannel.negozio_uomo}
          prefix="€"
          change={-5.3}
          changeType="decrease"
        />
        <MetricCard
          title="E-commerce"
          value={metrics.salesByChannel.ecommerce}
          prefix="€"
          change={18.7}
          changeType="increase"
          badge="Crescita"
          badgeVariant="secondary"
        />
        <MetricCard
          title="Marketplace"
          value={metrics.salesByChannel.marketplace}
          prefix="€"
          change={11.2}
          changeType="increase"
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
              value={inventory.length}
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