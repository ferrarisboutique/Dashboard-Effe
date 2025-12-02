import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getCategoryData, getBrandData, filterDataByDateRange, getMonthlySalesWithYOY, getSeasonData, getYoYForRange, filterDataByDateAdvanced, calculateYoYChange } from "../utils/analytics";
import { Store, Users, ShoppingBag, TrendingUp } from "lucide-react";

interface StoresSectionProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
  customStart?: string;
  customEnd?: string;
}

export function StoresSection({ sales, returns, inventory, dateRange, customStart, customEnd }: StoresSectionProps) {
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
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const totalStoresYoY = calculateYoYChange(
            sales.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo'),
            dateRange,
            customStart,
            customEnd,
            (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
          );
          return (
            <MetricCard
              title="Vendite Totali Negozi"
              value={allMetrics.salesByChannel.negozio_donna + allMetrics.salesByChannel.negozio_uomo}
              prefix="€"
              change={totalStoresYoY.change}
              changeType={totalStoresYoY.changeType}
              description="Variazione vs anno precedente"
            />
          );
        })()}
        {(() => {
          const womenYoY = calculateYoYChange(
            sales.filter(s => s.channel === 'negozio_donna'),
            dateRange,
            customStart,
            customEnd,
            (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
          );
          return (
            <MetricCard
              title="Negozio Donna"
              value={allMetrics.salesByChannel.negozio_donna}
              prefix="€"
              change={womenYoY.change}
              changeType={womenYoY.changeType}
              description="Variazione vs anno precedente"
            />
          );
        })()}
        {(() => {
          const menYoY = calculateYoYChange(
            sales.filter(s => s.channel === 'negozio_uomo'),
            dateRange,
            customStart,
            customEnd,
            (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
          );
          return (
            <MetricCard
              title="Negozio Uomo"
              value={allMetrics.salesByChannel.negozio_uomo}
              prefix="€"
              change={menYoY.change}
              changeType={menYoY.changeType}
              description="Variazione vs anno precedente"
            />
          );
        })()}
        {(() => {
          const avgMarginYoY = calculateYoYChange(
            sales.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo'),
            dateRange,
            customStart,
            customEnd,
            (s) => {
              const normalizeSku = (sku?: string) => (sku || '').toString().trim().toUpperCase();
              const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
              const totalCost = s.reduce((sum, sale) => {
                const saleSku = normalizeSku((sale as any).sku || sale.productId);
                if (!saleSku) return sum;
                const inventoryItem = inventory.find(item => normalizeSku(item.sku) === saleSku);
                return sum + (inventoryItem ? inventoryItem.purchasePrice * sale.quantity : 0);
              }, 0);
              return totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;
            }
          );
          const avgMargin = (womenMetrics.margin !== null && menMetrics.margin !== null)
            ? (womenMetrics.margin + menMetrics.margin) / 2
            : null;
          return (
            <MetricCard
              title="Margine Medio"
              value={avgMargin !== null ? avgMargin.toFixed(1) : "N/D"}
              suffix={avgMargin !== null ? "%" : ""}
              change={avgMargin !== null ? avgMarginYoY.change : undefined}
              changeType={avgMargin !== null ? avgMarginYoY.changeType : "neutral"}
              description={avgMargin !== null ? "Variazione vs anno precedente" : "Carica inventario"}
            />
          );
        })()}
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
            {(() => {
              const womenSalesYoY = calculateYoYChange(
                womenStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
              );
              return (
                <MetricCard
                  title="Vendite Totali"
                  value={womenMetrics.totalSales}
                  prefix="€"
                  change={womenSalesYoY.change}
                  changeType={womenSalesYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const womenReturnsYoY = calculateYoYChange(
                womenStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'negozio_donna'), dateRange, customStart, customEnd);
                  // I resi hanno amount negativo, usiamo Math.abs() per visualizzarli come positivi
                  return filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                }
              );
              return (
                <MetricCard
                  title="Resi"
                  value={womenMetrics.totalReturns}
                  prefix="€"
                  change={womenReturnsYoY.change}
                  changeType={womenReturnsYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const womenReturnRateYoY = calculateYoYChange(
                womenStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'negozio_donna'), dateRange, customStart, customEnd);
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  // I resi hanno amount negativo, usiamo Math.abs() per il calcolo della percentuale
                  const totalReturns = filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                  return totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Tasso di Reso"
                  value={womenMetrics.returnRate.toFixed(1)}
                  suffix="%"
                  change={womenReturnRateYoY.change}
                  changeType={womenReturnRateYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const womenMarginYoY = calculateYoYChange(
                womenStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const normalizeSku = (sku?: string) => (sku || '').toString().trim().toUpperCase();
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  const totalCost = s.reduce((sum, sale) => {
                    const saleSku = normalizeSku((sale as any).sku || sale.productId);
                    if (!saleSku) return sum;
                    const inventoryItem = inventory.find(item => normalizeSku(item.sku) === saleSku);
                    return sum + (inventoryItem ? inventoryItem.purchasePrice * sale.quantity : 0);
                  }, 0);
                  return totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Marginalità"
                  value={womenMetrics.margin !== null ? womenMetrics.margin.toFixed(1) : "N/D"}
                  suffix={womenMetrics.margin !== null ? "%" : ""}
                  change={womenMetrics.margin !== null ? womenMarginYoY.change : undefined}
                  changeType={womenMetrics.margin !== null ? womenMarginYoY.changeType : "neutral"}
                  description={womenMetrics.margin !== null ? "Variazione vs anno precedente" : "Carica inventario"}
                />
              );
            })()}
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
            {(() => {
              const menSalesYoY = calculateYoYChange(
                menStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
              );
              return (
                <MetricCard
                  title="Vendite Totali"
                  value={menMetrics.totalSales}
                  prefix="€"
                  change={menSalesYoY.change}
                  changeType={menSalesYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const menReturnsYoY = calculateYoYChange(
                menStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'negozio_uomo'), dateRange, customStart, customEnd);
                  // I resi hanno amount negativo, usiamo Math.abs() per visualizzarli come positivi
                  return filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                }
              );
              return (
                <MetricCard
                  title="Resi"
                  value={menMetrics.totalReturns}
                  prefix="€"
                  change={menReturnsYoY.change}
                  changeType={menReturnsYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const menReturnRateYoY = calculateYoYChange(
                menStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'negozio_uomo'), dateRange, customStart, customEnd);
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  // I resi hanno amount negativo, usiamo Math.abs() per il calcolo della percentuale
                  const totalReturns = filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                  return totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Tasso di Reso"
                  value={menMetrics.returnRate.toFixed(1)}
                  suffix="%"
                  change={menReturnRateYoY.change}
                  changeType={menReturnRateYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const menMarginYoY = calculateYoYChange(
                menStoreSales,
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const normalizeSku = (sku?: string) => (sku || '').toString().trim().toUpperCase();
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  const totalCost = s.reduce((sum, sale) => {
                    const saleSku = normalizeSku((sale as any).sku || sale.productId);
                    if (!saleSku) return sum;
                    const inventoryItem = inventory.find(item => normalizeSku(item.sku) === saleSku);
                    return sum + (inventoryItem ? inventoryItem.purchasePrice * sale.quantity : 0);
                  }, 0);
                  return totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Marginalità" 
                  value={menMetrics.margin !== null ? menMetrics.margin.toFixed(1) : "N/D"}
                  suffix={menMetrics.margin !== null ? "%" : ""}
                  change={menMetrics.margin !== null ? menMarginYoY.change : undefined}
                  changeType={menMetrics.margin !== null ? menMarginYoY.changeType : "neutral"}
                  description={menMetrics.margin !== null ? "Variazione vs anno precedente" : "Carica inventario"}
                />
              );
            })()}
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