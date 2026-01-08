import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCard } from "./MetricCard";
import { SalesChart } from "./SalesChart";
import { Sale, Return, ChannelCostSettings } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { calculateMetrics, getSalesByDate, getMarketplaceData, getCategoryData, getBrandData, filterDataByDateAdvanced, calculateYoYChange, getMarketplaceDetailedMetrics } from "../utils/analytics";
import { Globe, ShoppingCart, ExternalLink, Package, TrendingUp, Percent, Euro, Settings } from "lucide-react";
import { Badge } from "./ui/badge";
import { UnmappedPaymentMethodsAlert } from "./UnmappedPaymentMethodsAlert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface OnlineSectionProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  dateRange: string;
  customStart?: string;
  customEnd?: string;
  unmappedPaymentMethods?: string[];
  onNavigateToMapping?: () => void;
  channelCosts?: Record<string, ChannelCostSettings>;
}

export function OnlineSection({ sales, returns, inventory, dateRange, customStart, customEnd, unmappedPaymentMethods = [], onNavigateToMapping, channelCosts = {} }: OnlineSectionProps) {
  // Debug logging
  console.log('OnlineSection - Total sales received:', sales.length);
  console.log('OnlineSection - Date range:', dateRange);
  console.log('OnlineSection - Sample sales:', sales.slice(0, 3).map(s => ({
    channel: s.channel,
    date: s.date,
    amount: s.amount,
    documento: (s as any).documento,
    numero: (s as any).numero
  })));
  
  // Apply date filter first
  const filteredSales = filterDataByDateAdvanced(sales, dateRange, customStart, customEnd);
  const filteredReturns = filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
  
  console.log('OnlineSection - Filtered sales:', filteredSales.length);
  
  const allMetrics = calculateMetrics(filteredSales, filteredReturns, inventory);
  
  const ecommerceSales = filteredSales.filter(s => s.channel === 'ecommerce');
  const marketplaceSales = filteredSales.filter(s => s.channel === 'marketplace');
  
  console.log('OnlineSection - Ecommerce sales:', ecommerceSales.length);
  console.log('OnlineSection - Marketplace sales:', marketplaceSales.length);
  console.log('OnlineSection - All metrics:', allMetrics);
  
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
      // I resi hanno amount negativo, usiamo Math.abs() per visualizzarli come positivi
      marketplaceBreakdown[marketplace].returns += Math.abs(ret.amount);
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

      {/* Alert for unmapped payment methods */}
      <UnmappedPaymentMethodsAlert 
        unmappedMethods={unmappedPaymentMethods} 
        onNavigateToMapping={onNavigateToMapping}
      />

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
            {(() => {
              const ecommerceSalesYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'ecommerce'),
                dateRange,
                customStart,
                customEnd,
                (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
              );
              return (
                <MetricCard
                  title="Fatturato E-commerce"
                  value={ecommerceMetrics.totalSales}
                  prefix="€"
                  change={ecommerceSalesYoY.change}
                  changeType={ecommerceSalesYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const ecommerceReturnsYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'ecommerce'),
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'ecommerce'), dateRange, customStart, customEnd);
                  // I resi hanno amount negativo, usiamo Math.abs() per visualizzarli come positivi
                  return filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                }
              );
              return (
                <MetricCard
                  title="Resi E-commerce"
                  value={ecommerceMetrics.totalReturns}
                  prefix="€"
                  change={ecommerceReturnsYoY.change}
                  changeType={ecommerceReturnsYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const ecommerceReturnRateYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'ecommerce'),
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'ecommerce'), dateRange, customStart, customEnd);
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  // I resi hanno amount negativo, usiamo Math.abs() per il calcolo della percentuale
                  const totalReturns = filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                  return totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Tasso di Reso"
                  value={ecommerceMetrics.returnRate.toFixed(1)}
                  suffix="%"
                  change={ecommerceReturnRateYoY.change}
                  changeType={ecommerceReturnRateYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const ecommerceMarginYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'ecommerce'),
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
                  value={ecommerceMetrics.margin !== null ? ecommerceMetrics.margin.toFixed(1) : "N/D"}
                  suffix={ecommerceMetrics.margin !== null ? "%" : ""}
                  change={ecommerceMetrics.margin !== null ? ecommerceMarginYoY.change : undefined}
                  changeType={ecommerceMetrics.margin !== null ? ecommerceMarginYoY.changeType : "neutral"}
                  description={ecommerceMetrics.margin !== null ? "Variazione vs anno precedente" : "Carica inventario"}
                />
              );
            })()}
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
            {(() => {
              const marketplaceSalesYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'marketplace'),
                dateRange,
                customStart,
                customEnd,
                (s) => s.reduce((sum, sale) => sum + sale.amount, 0)
              );
              return (
                <MetricCard
                  title="Fatturato Marketplace"
                  value={marketplaceMetrics.totalSales}
                  prefix="€"
                  change={marketplaceSalesYoY.change}
                  changeType={marketplaceSalesYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const marketplaceReturnsYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'marketplace'),
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'marketplace'), dateRange, customStart, customEnd);
                  // I resi hanno amount negativo, usiamo Math.abs() per visualizzarli come positivi
                  return filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                }
              );
              return (
                <MetricCard
                  title="Resi Marketplace"
                  value={marketplaceMetrics.totalReturns}
                  prefix="€"
                  change={marketplaceReturnsYoY.change}
                  changeType={marketplaceReturnsYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const marketplaceReturnRateYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'marketplace'),
                dateRange,
                customStart,
                customEnd,
                (s) => {
                  const filtered = filterDataByDateAdvanced(returns.filter(r => r.channel === 'marketplace'), dateRange, customStart, customEnd);
                  const totalSales = s.reduce((sum, sale) => sum + sale.amount, 0);
                  // I resi hanno amount negativo, usiamo Math.abs() per il calcolo della percentuale
                  const totalReturns = filtered.reduce((sum, ret) => sum + Math.abs(ret.amount), 0);
                  return totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
                }
              );
              return (
                <MetricCard
                  title="Tasso di Reso"
                  value={marketplaceMetrics.returnRate.toFixed(1)}
                  suffix="%"
                  change={marketplaceReturnRateYoY.change}
                  changeType={marketplaceReturnRateYoY.changeType}
                  description="Variazione vs anno precedente"
                />
              );
            })()}
            {(() => {
              const marketplaceMarginYoY = calculateYoYChange(
                sales.filter(s => s.channel === 'marketplace'),
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
                  value={marketplaceMetrics.margin !== null ? marketplaceMetrics.margin.toFixed(1) : "N/D"}
                  suffix={marketplaceMetrics.margin !== null ? "%" : ""}
                  change={marketplaceMetrics.margin !== null ? marketplaceMarginYoY.change : undefined}
                  changeType={marketplaceMetrics.margin !== null ? marketplaceMarginYoY.changeType : "neutral"}
                  description={marketplaceMetrics.margin !== null ? "Variazione vs anno precedente" : "Carica inventario"}
                />
              );
            })()}
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

          {/* Marketplace Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analisi Dettagliata per Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const detailedMetrics = getMarketplaceDetailedMetrics(
                  filteredSales,
                  filteredReturns,
                  inventory,
                  channelCosts
                );
                
                if (detailedMetrics.length === 0) {
                  return (
                    <p className="text-muted-foreground text-center py-4">
                      Nessun dato marketplace disponibile.
                    </p>
                  );
                }
                
                return (
                  <TooltipProvider>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marketplace</TableHead>
                            <TableHead className="text-right">Venduto</TableHead>
                            <TableHead className="text-right">Ordini</TableHead>
                            <TableHead className="text-right">Costi Canale</TableHead>
                            <TableHead className="text-right">Netto da Canale</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead className="text-right">Resi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedMetrics.map((mp) => {
                            const totalChannelCosts = mp.totalCommissions + mp.totalFixedCosts + mp.totalReturnCosts;
                            const fixedCostPerOrder = mp.uniqueOrderCount > 0 ? mp.totalFixedCosts / mp.uniqueOrderCount : 0;
                            const returnCostPerReturn = mp.uniqueReturnCount > 0 ? mp.totalReturnCosts / mp.uniqueReturnCount : 0;
                            const commissionRate = mp.commissionPercent + mp.extraCommissionPercent;
                            
                            return (
                              <TableRow key={mp.name}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{mp.name}</span>
                                    {commissionRate > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {commissionRate}%
                                        {fixedCostPerOrder > 0 && ` + €${fixedCostPerOrder.toFixed(2)}/ord`}
                                        {returnCostPerReturn > 0 && ` + €${returnCostPerReturn.toFixed(2)}/reso`}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  €{mp.totalSales.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span>{mp.uniqueOrderCount}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{mp.orderCount} prodotti</p>
                                      <p>Media: €{mp.averageOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}/ord</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-right">
                                  {totalChannelCosts > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-red-600">
                                          -€{totalChannelCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="text-xs space-y-1">
                                          <p>Commissioni ({commissionRate}%): €{mp.totalCommissions.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                                          {mp.totalFixedCosts > 0 && (
                                            <p>Fissi ({mp.uniqueOrderCount} × €{fixedCostPerOrder.toFixed(2)}): €{mp.totalFixedCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                                          )}
                                          {mp.totalReturnCosts > 0 && (
                                            <p>Resi ({mp.uniqueReturnCount} × €{returnCostPerReturn.toFixed(2)}): €{mp.totalReturnCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  <span className={mp.netFromChannel >= 0 ? "text-green-600" : "text-red-600"}>
                                    €{mp.netFromChannel.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={
                                    mp.netFromChannelPercent > 70 ? "text-green-600 font-semibold" : 
                                    mp.netFromChannelPercent > 50 ? "text-yellow-600 font-semibold" : 
                                    "text-red-600 font-semibold"
                                  }>
                                    {mp.netFromChannelPercent.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {mp.totalReturns > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-orange-600">
                                          €{mp.totalReturns.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{mp.uniqueReturnCount} ordini ({mp.returnRate.toFixed(1)}%)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-muted-foreground">€0</span>
                                  )}
                                </TableCell>
                              </TableRow>
                  );
                })}
                          {/* Totals Row */}
                          <TableRow className="bg-muted/50 font-semibold border-t-2">
                            <TableCell>TOTALE</TableCell>
                            <TableCell className="text-right">
                              €{detailedMetrics.reduce((sum, mp) => sum + mp.totalSales, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {detailedMetrics.reduce((sum, mp) => sum + mp.uniqueOrderCount, 0)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              -€{detailedMetrics.reduce((sum, mp) => sum + mp.totalCommissions + mp.totalFixedCosts + mp.totalReturnCosts, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const totalNet = detailedMetrics.reduce((sum, mp) => sum + mp.netFromChannel, 0);
                                return (
                                  <span className={totalNet >= 0 ? "text-green-600" : "text-red-600"}>
                                    €{totalNet.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const totalSales = detailedMetrics.reduce((sum, mp) => sum + mp.totalSales, 0);
                                const totalNet = detailedMetrics.reduce((sum, mp) => sum + mp.netFromChannel, 0);
                                const pct = totalSales > 0 ? (totalNet / totalSales) * 100 : 0;
                                return (
                                  <span className={pct > 70 ? "text-green-600" : pct > 50 ? "text-yellow-600" : "text-red-600"}>
                                    {pct.toFixed(1)}%
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              €{detailedMetrics.reduce((sum, mp) => sum + mp.totalReturns, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
              </div>
                  </TooltipProvider>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}