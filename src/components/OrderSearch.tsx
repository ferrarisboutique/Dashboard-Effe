import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Package, MapPin, CreditCard, Calendar, Euro, Percent, ShoppingBag, RotateCcw } from "lucide-react";
import { Sale, Return, ChannelCostSettings } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { normalizeSku } from "../utils/normalize";
import { calculateSaleCommission } from "../utils/analytics";

interface OrderSearchProps {
  sales: Sale[];
  returns: Return[];
  inventory: InventoryItem[];
  channelCosts?: Record<string, ChannelCostSettings>;
}

interface OrderResult {
  sale: Sale;
  inventoryItem?: InventoryItem;
  purchaseCost: number;
  commission: number;
  margin: number | null;
  marginPercent: number | null;
  relatedReturns: Return[];
}

export function OrderSearch({ sales, returns, inventory, channelCosts }: OrderSearchProps) {
  const [documentType, setDocumentType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [searchResults, setSearchResults] = useState<OrderResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Build inventory map for quick lookups
  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach(item => {
      if (item.sku) {
        map.set(normalizeSku(item.sku), item);
      }
    });
    return map;
  }, [inventory]);

  // Get unique document types from sales
  const documentTypes = useMemo(() => {
    const types = new Set<string>();
    sales.forEach(sale => {
      if (sale.documento) {
        types.add(sale.documento);
      }
    });
    return Array.from(types).sort();
  }, [sales]);

  const handleSearch = () => {
    setHasSearched(true);
    
    // Filter sales by documento and/or numero
    let filtered = sales;
    
    if (documentType) {
      filtered = filtered.filter(sale => 
        sale.documento?.toLowerCase().includes(documentType.toLowerCase())
      );
    }
    
    if (documentNumber.trim()) {
      filtered = filtered.filter(sale => 
        sale.numero?.toLowerCase().includes(documentNumber.toLowerCase().trim())
      );
    }
    
    // Build results with calculated metrics
    const results: OrderResult[] = filtered.map(sale => {
      const saleSku = normalizeSku((sale as any).sku || sale.productId);
      const inventoryItem = saleSku ? inventoryMap.get(saleSku) : undefined;
      const purchaseCost = inventoryItem?.purchasePrice 
        ? inventoryItem.purchasePrice * sale.quantity 
        : 0;
      const commission = calculateSaleCommission(sale, channelCosts);
      
      // Calculate margin
      let margin: number | null = null;
      let marginPercent: number | null = null;
      if (purchaseCost > 0) {
        margin = sale.amount - purchaseCost - commission;
        marginPercent = (margin / sale.amount) * 100;
      }
      
      // Find related returns (by orderReference or documento/numero)
      const relatedReturns = returns.filter(ret => 
        (sale.orderReference && ret.orderReference === sale.orderReference) ||
        (sale.documento && sale.numero && 
         ret.reason?.includes(sale.documento) && 
         (ret as any).numero === sale.numero)
      );
      
      return {
        sale,
        inventoryItem,
        purchaseCost,
        commission,
        margin,
        marginPercent,
        relatedReturns
      };
    });
    
    setSearchResults(results);
  };

  const handleClear = () => {
    setDocumentType('');
    setDocumentNumber('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'negozio_donna': return 'Negozio Donna';
      case 'negozio_uomo': return 'Negozio Uomo';
      case 'ecommerce': return 'E-commerce';
      case 'marketplace': return 'Marketplace';
      default: return channel;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-2">
          <Search className="w-6 h-6" />
          Ricerca Ordini
        </h2>
        <p className="text-muted-foreground">
          Cerca ordini per tipo e numero documento per visualizzare tutti i dettagli.
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Criteri di Ricerca</CardTitle>
          <CardDescription>
            Inserisci il tipo di documento (es. Ricevuta, Fattura) e/o il numero documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo Documento</Label>
              <Select value={documentType || "all"} onValueChange={(val) => setDocumentType(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Numero Documento</Label>
              <Input
                id="documentNumber"
                placeholder="es. 123IT"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button onClick={handleSearch} className="gap-2">
              <Search className="w-4 h-4" />
              Cerca
            </Button>
            
            <Button variant="outline" onClick={handleClear} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Pulisci
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Risultati ({searchResults.length})</span>
              {searchResults.length > 0 && (
                <Badge variant="secondary">
                  Totale: €{searchResults.reduce((sum, r) => sum + r.sale.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nessun ordine trovato con i criteri specificati.
              </p>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <Card key={result.sale.id || index} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Basic Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            Informazioni Ordine
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Data:</span>
                              <span>{new Date(result.sale.date).toLocaleDateString('it-IT')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Documento:</span>
                              <span>{result.sale.documento || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Numero:</span>
                              <span>{result.sale.numero || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rif. Ordine:</span>
                              <span className="truncate max-w-[150px]">{result.sale.orderReference || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            Prodotto
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SKU:</span>
                              <span className="font-mono">{(result.sale as any).sku || result.sale.productId || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Brand:</span>
                              <span>{result.sale.brand !== 'Unknown' ? result.sale.brand : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quantità:</span>
                              <span>{result.sale.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Categoria:</span>
                              <span className="capitalize">{result.sale.category}</span>
                            </div>
                          </div>
                        </div>

                        {/* Location & Channel */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            Canale e Località
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Canale:</span>
                              <Badge variant="outline">{getChannelLabel(result.sale.channel)}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paese:</span>
                              <span>{result.sale.country || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Area:</span>
                              <span>{result.sale.area || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pagamento:</span>
                              <span>{result.sale.paymentMethod || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Euro className="w-4 h-4 text-muted-foreground" />
                            Dati Economici
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prezzo vendita:</span>
                              <span className="font-semibold">€{result.sale.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Costo prodotto:</span>
                              <span>{result.purchaseCost > 0 ? `€${result.purchaseCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commissioni:</span>
                              <span>{result.commission > 0 ? `€${result.commission.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Margine:</span>
                              <span className={result.marginPercent !== null 
                                ? result.marginPercent > 30 ? 'text-green-600 font-semibold' 
                                : result.marginPercent > 10 ? 'text-yellow-600 font-semibold'
                                : 'text-red-600 font-semibold'
                                : ''
                              }>
                                {result.marginPercent !== null 
                                  ? `${result.marginPercent.toFixed(1)}% (€${result.margin?.toLocaleString('it-IT', { minimumFractionDigits: 2 })})`
                                  : 'N/D'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Related Returns */}
                      {result.relatedReturns.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-2">
                            <ShoppingBag className="w-4 h-4" />
                            Resi Associati ({result.relatedReturns.length})
                          </div>
                          <div className="space-y-1">
                            {result.relatedReturns.map((ret, retIndex) => (
                              <div key={ret.id || retIndex} className="flex justify-between text-sm bg-orange-50 p-2 rounded">
                                <span>{new Date(ret.date).toLocaleDateString('it-IT')} - {ret.reason}</span>
                                <span className="text-orange-600">
                                  €{Math.abs(ret.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

