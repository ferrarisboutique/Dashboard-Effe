import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getCategoryData, getBrandData, filterDataByDateRange, getMonthlySalesWithYOY, getSeasonData, getYoYForRange, filterDataByDateAdvanced } from "../utils/analytics";
import { DateRange } from "react-day-picker";
import { Input } from "./ui/input";
import { Store, Users, ShoppingBag, TrendingUp } from "lucide-react";

interface StoresSectionProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
}

export function StoresSection({ sales, returns, inventory, dateRange }: StoresSectionProps) {
  const [customStart, setCustomStart] = React.useState<string | undefined>(undefined);
  const [customEnd, setCustomEnd] = React.useState<string | undefined>(undefined);
  // Apply date filter first
  const filteredSales = filterDataByDateAdvanced(sales, dateRange, customStart, customEnd);
  const filteredReturns = filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
  
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
  const womenSeasonData = getSeasonData(womenStoreSales);
  const menSeasonData = getSeasonData(menStoreSales);

  // Monthly with YoY
  const womenMonthlyYOY = getMonthlySalesWithYOY(womenStoreSales, 12).map(s => ({ name: s.label, current: s.current, previous: s.previous }));
  const menMonthlyYOY = getMonthlySalesWithYOY(menStoreSales, 12).map(s => ({ name: s.label, current: s.current, previous: s.previous }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-6">
          <Store className="w-6 h-6" />
          Negozi Fisici
        </h2>
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 mb-4">
            <Input type="date" value={customStart || ''} onChange={(e) => setCustomStart(e.target.value)} />
            <span>→</span>
            <Input type="date" value={customEnd || ''} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          // YoY change for selected range or last month fallback
          let yoy = 0;
          if (dateRange === 'custom' && customStart && customEnd) {
            const r = getYoYForRange(filteredSales, customStart, customEnd);
            yoy = r.changePct;
          } else {
            const months = getMonthlySalesWithYOY(filteredSales.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo'), 12);
            const last = months[months.length - 1];
            yoy = last && last.previous > 0 ? ((last.current - last.previous) / last.previous) * 100 : 0;
          }
          return (
            <MetricCard
              title="Vendite Totali Negozi"
              value={allMetrics.salesByChannel.negozio_donna + allMetrics.salesByChannel.negozio_uomo}
              prefix="€"
              change={Number(yoy.toFixed(1))}
              changeType={yoy >= 0 ? 'increase' : 'decrease'}
              description="Variazione vs anno precedente"
            />
          );
        })()}
        {(() => {
          const months = getMonthlySalesWithYOY(womenStoreSales, 12);
          const last = months[months.length - 1];
          const yoy = last && last.previous > 0 ? ((last.current - last.previous) / last.previous) * 100 : 0;
          return (
            <MetricCard
              title="Negozio Donna"
              value={allMetrics.salesByChannel.negozio_donna}
              prefix="€"
              change={Number(yoy.toFixed(1))}
              changeType={yoy >= 0 ? 'increase' : 'decrease'}
              badge="YoY"
              badgeVariant="secondary"
            />
          );
        })()}
        {(() => {
          const months = getMonthlySalesWithYOY(menStoreSales, 12);
          const last = months[months.length - 1];
          const yoy = last && last.previous > 0 ? ((last.current - last.previous) / last.previous) * 100 : 0;
          return (
            <MetricCard
              title="Negozio Uomo"
              value={allMetrics.salesByChannel.negozio_uomo}
              prefix="€"
              change={Number(yoy.toFixed(1))}
              changeType={yoy >= 0 ? 'increase' : 'decrease'}
            />
          );
        })()}
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
              data={womenMonthlyYOY}
              type="line-dual"
              dataKey="current"
              xAxisKey="name"
            />
            <SalesChart
              title="Vendite per Brand - Negozio Donna"
              data={getBrandData(womenStoreSales, inventory).map(x => ({ name: x.name, value: x.value }))}
              type="bar"
              dataKey="value"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Vendite per Stagione - Negozio Donna"
              data={womenSeasonData}
              type="bar"
              dataKey="value"
              xAxisKey="name"
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
              data={menMonthlyYOY}
              type="line-dual"
              dataKey="current"
              xAxisKey="name"
            />
            <SalesChart
              title="Vendite per Brand - Negozio Uomo"
              data={getBrandData(menStoreSales, inventory).map(x => ({ name: x.name, value: x.value }))}
              type="bar"
              dataKey="value"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Vendite per Stagione - Negozio Uomo"
              data={menSeasonData}
              type="bar"
              dataKey="value"
              xAxisKey="name"
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