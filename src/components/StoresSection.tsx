import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getCategoryData, getBrandData, filterDataByDateRange } from "../utils/analytics";
import { Store, Users, ShoppingBag, TrendingUp } from "lucide-react";

interface StoresSectionProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
}

export function StoresSection({ sales, returns, inventory, dateRange }: StoresSectionProps) {
  // Apply date filter first
  const filteredSales = filterDataByDateRange(sales, dateRange);
  const filteredReturns = filterDataByDateRange(returns, dateRange);
  
  const allMetrics = calculateMetrics(filteredSales, filteredReturns, inventory);
  
  const womenStoreSales = filteredSales.filter(s => s.channel === 'negozio_donna');
  const menStoreSales = filteredSales.filter(s => s.channel === 'negozio_uomo');
  
  const womenStoreReturns = filteredReturns.filter(r => r.channel === 'negozio_donna');
  const menStoreReturns = filteredReturns.filter(r => r.channel === 'negozio_uomo');

  const womenMetrics = calculateMetrics(womenStoreSales, womenStoreReturns, inventory);
  const menMetrics = calculateMetrics(menStoreSales, menStoreReturns, inventory);

  const womenSalesByDate = getSalesByDate(womenStoreSales);
  const menSalesByDate = getSalesByDate(menStoreSales);
  
  const womenCategoryData = getCategoryData(womenStoreSales);
  const menCategoryData = getCategoryData(menStoreSales);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-6">
          <Store className="w-6 h-6" />
          Negozi Fisici
        </h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vendite Totali Negozi"
          value={allMetrics.salesByChannel.negozio_donna + allMetrics.salesByChannel.negozio_uomo}
          prefix="€"
          change={8.2}
          changeType="increase"
          description="Ultimi 7 giorni"
        />
        <MetricCard
          title="Negozio Donna"
          value={allMetrics.salesByChannel.negozio_donna}
          prefix="€"
          change={12.5}
          changeType="increase"
          badge="Top performer"
          badgeVariant="secondary"
        />
        <MetricCard
          title="Negozio Uomo"
          value={allMetrics.salesByChannel.negozio_uomo}
          prefix="€"
          change={-5.3}
          changeType="decrease"
        />
        <MetricCard
          title="Margine Medio"
          value={(womenMetrics.margin + menMetrics.margin) / 2}
          suffix="%"
          change={2.1}
          changeType="increase"
          description="Sulle vendite fisiche"
        />
      </div>

      <Tabs defaultValue="donna" className="space-y-4">
        <TabsList>
          <TabsTrigger value="donna" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Negozio Donna
          </TabsTrigger>
          <TabsTrigger value="uomo" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Negozio Uomo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="donna" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Vendite Totali"
              value={womenMetrics.totalSales}
              prefix="€"
              change={12.5}
              changeType="increase"
            />
            <MetricCard
              title="Resi"
              value={womenMetrics.totalReturns}
              prefix="€"
              change={-3.2}
              changeType="decrease"
            />
            <MetricCard
              title="Tasso di Reso"
              value={womenMetrics.returnRate.toFixed(1)}
              suffix="%"
              changeType="neutral"
            />
            <MetricCard
              title="Marginalità"
              value={womenMetrics.margin.toFixed(1)}
              suffix="%"
              change={2.8}
              changeType="increase"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Andamento Vendite - Negozio Donna"
              data={womenSalesByDate}
              type="line"
              dataKey="sales"
              xAxisKey="date"
            />
            <SalesChart
              title="Vendite per Categoria - Negozio Donna"
              data={womenCategoryData}
              type="pie"
              dataKey="value"
            />
          </div>
        </TabsContent>

        <TabsContent value="uomo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Vendite Totali"
              value={menMetrics.totalSales}
              prefix="€"
              change={-5.3}
              changeType="decrease"
            />
            <MetricCard
              title="Resi"
              value={menMetrics.totalReturns}
              prefix="€"
              change={15.7}
              changeType="increase"
            />
            <MetricCard
              title="Tasso di Reso"
              value={menMetrics.returnRate.toFixed(1)}
              suffix="%"
              changeType="increase"
            />
            <MetricCard
              title="Marginalità" 
              value={menMetrics.margin.toFixed(1)}
              suffix="%"
              change={-1.2}
              changeType="decrease"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Andamento Vendite - Negozio Uomo"
              data={menSalesByDate}
              type="line"
              dataKey="sales"
              xAxisKey="date"
            />
            <SalesChart
              title="Vendite per Categoria - Negozio Uomo"
              data={menCategoryData}
              type="pie"
              dataKey="value"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}