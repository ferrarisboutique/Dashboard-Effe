import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { Sale, Return } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getMarketplaceData, getCategoryData, getBrandData, filterDataByDateRange } from "../utils/analytics";
import { Globe, ShoppingCart, ExternalLink, Package } from "lucide-react";
import { Badge } from "./ui/badge";

interface OnlineSectionProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
}

export function OnlineSection({ sales, returns, inventory, dateRange }: OnlineSectionProps) {
  // Apply date filter first
  const filteredSales = filterDataByDateRange(sales, dateRange);
  const filteredReturns = filterDataByDateRange(returns, dateRange);
  
  const allMetrics = calculateMetrics(filteredSales, filteredReturns, inventory);
  
  const ecommerceSales = filteredSales.filter(s => s.channel === 'ecommerce');
  const marketplaceSales = filteredSales.filter(s => s.channel === 'marketplace');
  
  const ecommerceReturns = filteredReturns.filter(r => r.channel === 'ecommerce');
  const marketplaceReturns = filteredReturns.filter(r => r.channel === 'marketplace');

  const ecommerceMetrics = calculateMetrics(ecommerceSales, ecommerceReturns, inventory);
  const marketplaceMetrics = calculateMetrics(marketplaceSales, marketplaceReturns, inventory);

  const ecommerceSalesByDate = getSalesByDate(ecommerceSales);
  const marketplaceSalesByDate = getSalesByDate(marketplaceSales);
  
  const marketplaceData = getMarketplaceData(marketplaceSales);
  const ecommerceCategoryData = getCategoryData(ecommerceSales);
  const marketplaceCategoryData = getCategoryData(marketplaceSales);

  // Calculate marketplace specific metrics
  const marketplaceBreakdown = marketplaceSales.reduce((acc, sale) => {
    const marketplace = sale.marketplace || 'Altro';
    if (!acc[marketplace]) {
      acc[marketplace] = { sales: 0, returns: 0, count: 0 };
    }
    acc[marketplace].sales += sale.amount;
    acc[marketplace].count += 1;
    return acc;
  }, {} as Record<string, { sales: number; returns: number; count: number }>);

  marketplaceReturns.forEach(ret => {
    const marketplace = ret.marketplace || 'Altro';
    if (marketplaceBreakdown[marketplace]) {
      marketplaceBreakdown[marketplace].returns += ret.amount;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-6">
          <Globe className="w-6 h-6" />
          Canali Online
        </h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vendite Online Totali"
          value={allMetrics.salesByChannel.ecommerce + allMetrics.salesByChannel.marketplace}
          prefix="€"
          change={15.7}
          changeType="increase"
          description="Ultimi 7 giorni"
        />
        <MetricCard
          title="E-commerce"
          value={allMetrics.salesByChannel.ecommerce}
          prefix="€"
          change={18.3}
          changeType="increase"
          badge="Crescita forte"
          badgeVariant="secondary"
        />
        <MetricCard
          title="Marketplace"
          value={allMetrics.salesByChannel.marketplace}
          prefix="€"
          change={12.1}
          changeType="increase"
        />
        <MetricCard
          title="Tasso Reso Online"
          value={((ecommerceMetrics.returnRate + marketplaceMetrics.returnRate) / 2).toFixed(1)}
          suffix="%"
          change={-2.5}
          changeType="decrease"
          description="Media pesata"
        />
      </div>

      <Tabs defaultValue="ecommerce" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ecommerce" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            E-commerce
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ecommerce" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Fatturato E-commerce"
              value={ecommerceMetrics.totalSales}
              prefix="€"
              change={18.3}
              changeType="increase"
            />
            <MetricCard
              title="Resi E-commerce"
              value={ecommerceMetrics.totalReturns}
              prefix="€"
              change={-8.5}
              changeType="decrease"
            />
            <MetricCard
              title="Tasso di Reso"
              value={ecommerceMetrics.returnRate.toFixed(1)}
              suffix="%"
              changeType="decrease"
            />
            <MetricCard
              title="Marginalità"
              value={ecommerceMetrics.margin.toFixed(1)}
              suffix="%"
              change={3.2}
              changeType="increase"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Andamento Vendite E-commerce"
              data={ecommerceSalesByDate}
              type="line"
              dataKey="sales"
              xAxisKey="date"
            />
            <SalesChart
              title="Vendite per Categoria - E-commerce"
              data={ecommerceCategoryData}
              type="pie"
              dataKey="value"
            />
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Fatturato Marketplace"
              value={marketplaceMetrics.totalSales}
              prefix="€"
              change={12.1}
              changeType="increase"
            />
            <MetricCard
              title="Resi Marketplace"
              value={marketplaceMetrics.totalReturns}
              prefix="€"
              change={22.3}
              changeType="increase"
            />
            <MetricCard
              title="Tasso di Reso"
              value={marketplaceMetrics.returnRate.toFixed(1)}
              suffix="%"
              changeType="increase"
            />
            <MetricCard
              title="Marginalità"
              value={marketplaceMetrics.margin.toFixed(1)}
              suffix="%"
              change={-0.8}
              changeType="decrease"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesChart
              title="Vendite per Marketplace"
              data={marketplaceData}
              type="bar"
              dataKey="value"
            />
            <SalesChart
              title="Andamento Vendite Marketplace"
              data={marketplaceSalesByDate}
              type="line"
              dataKey="sales"
              xAxisKey="date"
            />
          </div>

          {/* Marketplace Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Dettaglio per Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(marketplaceBreakdown).map(([marketplace, data]) => {
                  const returnRate = data.sales > 0 ? (data.returns / data.sales) * 100 : 0;
                  return (
                    <Card key={marketplace}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{marketplace}</h4>
                            <Badge variant="outline">{data.count} ordini</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Vendite:</span>
                              <span>€{data.sales.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Resi:</span>
                              <span>€{data.returns.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tasso reso:</span>
                              <span className={returnRate > 20 ? "text-red-500" : returnRate > 10 ? "text-yellow-500" : "text-green-500"}>
                                {returnRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}