import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { InventoryItem } from "../types/inventory";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

interface InventoryStatsProps {
  inventory: InventoryItem[];
  loading?: boolean;
}

export function InventoryStats({ inventory, loading }: InventoryStatsProps) {
  const stats = useMemo(() => {
    if (!inventory || inventory.length === 0) {
      return {
        totalProducts: 0,
        totalValue: 0,
        avgMargin: 0,
        topBrands: [],
        topCategories: [],
        lowMarginProducts: 0,
        highValueProducts: 0
      };
    }

    const totalProducts = inventory.length;
    const totalPurchaseValue = inventory.reduce((sum, item) => sum + item.purchasePrice, 0);
    const totalSellValue = inventory.reduce((sum, item) => sum + item.sellPrice, 0);
    const avgMargin = totalSellValue > 0 ? ((totalSellValue - totalPurchaseValue) / totalSellValue * 100) : 0;

    // Brand analysis
    const brandCounts = inventory.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([brand, count]) => ({ brand, count }));

    // Category analysis
    const categoryCounts = inventory.reduce((acc, item) => {
      const category = item.category || 'Senza categoria';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Risk analysis
    const lowMarginProducts = inventory.filter(item => {
      const margin = item.sellPrice > 0 ? ((item.sellPrice - item.purchasePrice) / item.sellPrice * 100) : 0;
      return margin < 20; // Products with less than 20% margin
    }).length;

    const highValueProducts = inventory.filter(item => item.sellPrice > 200).length;

    return {
      totalProducts,
      totalValue: totalPurchaseValue,
      avgMargin,
      topBrands,
      topCategories,
      lowMarginProducts,
      highValueProducts
    };
  }, [inventory]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Prodotti Totali</span>
            </div>
            <div className="text-2xl font-bold mt-2">{stats.totalProducts.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Valore Inventario</span>
            </div>
            <div className="text-2xl font-bold mt-2">€{stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Margine Medio</span>
            </div>
            <div className="text-2xl font-bold mt-2">{stats.avgMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Margine Basso</span>
            </div>
            <div className="text-2xl font-bold mt-2">{stats.lowMarginProducts}</div>
            <div className="text-xs text-muted-foreground">prodotti {'<'} 20%</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Brands */}
        <Card>
          <CardHeader>
            <CardTitle>Top Brand (per quantità)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topBrands.map((brand, index) => (
                <div key={brand.brand} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{brand.brand}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{brand.count} prodotti</span>
                    <Progress 
                      value={(brand.count / stats.totalProducts) * 100} 
                      className="w-16 h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categorie (per quantità)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{category.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{category.count} prodotti</span>
                    <Progress 
                      value={(category.count / stats.totalProducts) * 100} 
                      className="w-16 h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      {stats.totalProducts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indicatori di Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {((stats.totalProducts - stats.lowMarginProducts) / stats.totalProducts * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Prodotti con margine sano</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {((stats.highValueProducts) / stats.totalProducts * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Prodotti alto valore ({'>'} €200)</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  €{(stats.totalValue / stats.totalProducts).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Valore medio per prodotto</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}