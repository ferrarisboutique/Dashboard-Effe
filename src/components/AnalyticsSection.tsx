import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SalesChart } from "./SalesChart";
import { Sale, Return } from "../types/dashboard";
import { filterDataByDateAdvanced } from "../utils/analytics";
import { 
  calculateCountryAnalytics, 
  calculateChannelAnalytics, 
  calculateDocumentTypeAnalytics,
  calculateBrandAnalytics,
  getUniqueBrands 
} from "../utils/analyticsCalculator";
import { 
  BarChart3, 
  ChevronRight, 
  ChevronDown, 
  Receipt, 
  RotateCcw,
  Globe,
  Store,
  FileText,
  Tag
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface AnalyticsSectionProps {
  sales: Sale[];
  returns: Return[];
  paymentMappings?: Record<string, { macroArea: string; channel: string }>;
  dateRange?: string;
  customStart?: string;
  customEnd?: string;
}

export function AnalyticsSection({ 
  sales, 
  returns,
  paymentMappings, 
  dateRange = "all", 
  customStart, 
  customEnd 
}: AnalyticsSectionProps) {
  // Brand tab state
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Expanded rows state for drill-down
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedDocTypes, setExpandedDocTypes] = useState<Set<string>>(new Set());

  // Filter data by date using global filter
  const filteredSales = useMemo(() => {
    return filterDataByDateAdvanced(sales, dateRange, customStart, customEnd);
  }, [sales, dateRange, customStart, customEnd]);

  const filteredReturns = useMemo(() => {
    return filterDataByDateAdvanced(returns, dateRange, customStart, customEnd);
  }, [returns, dateRange, customStart, customEnd]);

  // Get unique brands
  const brands = useMemo(() => getUniqueBrands(filteredSales), [filteredSales]);

  // Set first brand as default
  React.useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      setSelectedBrand(brands[0]);
    }
  }, [brands, selectedBrand]);

  // Calculate analytics data
  const countryAnalytics = useMemo(
    () => calculateCountryAnalytics(filteredSales, filteredReturns),
    [filteredSales, filteredReturns]
  );

  const channelAnalytics = useMemo(
    () => calculateChannelAnalytics(filteredSales, filteredReturns),
    [filteredSales, filteredReturns]
  );

  const documentTypeAnalytics = useMemo(
    () => calculateDocumentTypeAnalytics(filteredSales, filteredReturns),
    [filteredSales, filteredReturns]
  );

  const brandAnalytics = useMemo(
    () => selectedBrand ? calculateBrandAnalytics(filteredSales, selectedBrand) : null,
    [filteredSales, selectedBrand]
  );

  // Toggle functions
  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(country)) newSet.delete(country);
      else newSet.add(country);
      return newSet;
    });
  };

  const toggleChannel = (channel: string) => {
    setExpandedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channel)) newSet.delete(channel);
      else newSet.add(channel);
      return newSet;
    });
  };

  const toggleDocType = (docType: string) => {
    setExpandedDocTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docType)) newSet.delete(docType);
      else newSet.add(docType);
      return newSet;
    });
  };

  // Format helpers
  const formatCurrency = (value: number) => 
    `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Totals
  const totalSales = filteredSales.reduce((sum, s) => sum + s.amount, 0);
  const totalReturns = filteredReturns.reduce((sum, r) => sum + Math.abs(r.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Vendite Totali</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <div className="text-xs text-muted-foreground">{filteredSales.length} transazioni</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Resi Totali</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalReturns)}</div>
            <div className="text-xs text-muted-foreground">{filteredReturns.length} transazioni</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Netto</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalSales - totalReturns)}</div>
            <div className="text-xs text-muted-foreground">
              Tasso resi: {totalSales > 0 ? formatPercentage((totalReturns / totalSales) * 100) : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="brand" className="space-y-4">
        <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg gap-1 flex-wrap sm:flex-nowrap">
          <TabsTrigger value="brand" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Tag className="w-4 h-4" />
            <span>Brand</span>
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Globe className="w-4 h-4" />
            <span>Paesi</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Store className="w-4 h-4" />
            <span>Canali</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <FileText className="w-4 h-4" />
            <span>Documenti</span>
          </TabsTrigger>
        </TabsList>

        {/* BRAND TAB */}
        <TabsContent value="brand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisi per Brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand Selector */}
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Seleziona un brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {brandAnalytics && (
                <>
                  {/* Brand Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Vendite {selectedBrand}</div>
                        <div className="text-xl font-bold">{formatCurrency(brandAnalytics.totalAmount)}</div>
                        <div className="text-xs text-muted-foreground">{brandAnalytics.transactionCount} transazioni</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">% sul Totale</div>
                        <div className="text-xl font-bold">
                          {totalSales > 0 ? formatPercentage((brandAnalytics.totalAmount / totalSales) * 100) : '0%'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SalesChart
                      title={`Distribuzione per Macro Canale`}
                      data={brandAnalytics.byMacroChannel.map(m => ({
                        name: m.macroChannel,
                        value: m.amount,
                        percentage: m.percentage.toFixed(1)
                      }))}
                      type="pie"
                      dataKey="value"
                      height={300}
                    />
                    <SalesChart
                      title={`Top Paesi`}
                      data={brandAnalytics.byCountry.slice(0, 10).map(c => ({
                        name: c.countryName,
                        value: c.amount
                      }))}
                      type="bar"
                      dataKey="value"
                      xAxisKey="name"
                      height={300}
                    />
                  </div>

                  {/* Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Country */}
                    <div>
                      <h4 className="font-semibold mb-2">Per Paese</h4>
                      <div className="border rounded-lg max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Paese</TableHead>
                              <TableHead className="text-right">Vendite</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {brandAnalytics.byCountry.map(c => (
                              <TableRow key={c.country}>
                                <TableCell>{c.countryName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                                <TableCell className="text-right">{formatPercentage(c.percentage)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* By Channel */}
                    <div>
                      <h4 className="font-semibold mb-2">Per Canale</h4>
                      <div className="border rounded-lg max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Canale</TableHead>
                              <TableHead>Macro</TableHead>
                              <TableHead className="text-right">Vendite</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {brandAnalytics.byChannel.map(ch => (
                              <TableRow key={ch.channel}>
                                <TableCell>{ch.channelName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{ch.macroChannel}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(ch.amount)}</TableCell>
                                <TableCell className="text-right">{formatPercentage(ch.percentage)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!brandAnalytics && brands.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nessun brand disponibile per l'analisi nel periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COUNTRIES TAB */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisi per Paese</CardTitle>
            </CardHeader>
            <CardContent>
              {countryAnalytics.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Paese</TableHead>
                        <TableHead className="text-right">Vendite</TableHead>
                        <TableHead className="text-right">Resi</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Transazioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countryAnalytics.map(data => {
                        const isExpanded = expandedCountries.has(data.country);
                        return (
                          <React.Fragment key={data.country}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleCountry(data.country)}
                            >
                              <TableCell className="w-10">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{data.countryName}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(data.salesAmount)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(data.returnsAmount)}</TableCell>
                              <TableCell className="text-right font-medium text-blue-600">{formatCurrency(data.netAmount)}</TableCell>
                              <TableCell className="text-right">{data.transactionCount}</TableCell>
                            </TableRow>
                            {isExpanded && data.transactions.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0 bg-muted/30">
                                  <div className="px-4 py-3">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                      Dettaglio Documenti ({data.transactions.length})
                                    </div>
                                    <div className="border rounded-md bg-background max-h-[300px] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="text-xs">
                                            <TableHead className="py-2">Tipo</TableHead>
                                            <TableHead className="py-2">Documento</TableHead>
                                            <TableHead className="py-2">Data</TableHead>
                                            <TableHead className="py-2">Canale</TableHead>
                                            <TableHead className="py-2 text-right">Importo</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {data.transactions.map((tx, idx) => (
                                            <TableRow key={idx} className="text-sm">
                                              <TableCell className="py-2">
                                                <Badge variant={tx.type === 'sale' ? 'default' : 'destructive'} className="text-xs">
                                                  {tx.type === 'sale' ? <><Receipt className="w-3 h-3 mr-1" /> Vendita</> : <><RotateCcw className="w-3 h-3 mr-1" /> Reso</>}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="py-2 font-mono text-xs">
                                                {tx.documentType} N. {tx.documentNumber}
                                              </TableCell>
                                              <TableCell className="py-2">{formatDate(tx.date)}</TableCell>
                                              <TableCell className="py-2 text-muted-foreground">
                                                {tx.channelSpecific || tx.channel}
                                              </TableCell>
                                              <TableCell className={`py-2 text-right font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(tx.amount)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nessun dato disponibile per il periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHANNELS TAB */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisi per Canale</CardTitle>
            </CardHeader>
            <CardContent>
              {channelAnalytics.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Canale</TableHead>
                        <TableHead>Macro</TableHead>
                        <TableHead className="text-right">Vendite</TableHead>
                        <TableHead className="text-right">Resi</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Transazioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channelAnalytics.map(data => {
                        const isExpanded = expandedChannels.has(data.channel);
                        return (
                          <React.Fragment key={data.channel}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleChannel(data.channel)}
                            >
                              <TableCell className="w-10">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{data.channelName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{data.macroChannel}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(data.salesAmount)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(data.returnsAmount)}</TableCell>
                              <TableCell className="text-right font-medium text-blue-600">{formatCurrency(data.netAmount)}</TableCell>
                              <TableCell className="text-right">{data.transactionCount}</TableCell>
                            </TableRow>
                            {isExpanded && data.transactions.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0 bg-muted/30">
                                  <div className="px-4 py-3">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                      Dettaglio Documenti ({data.transactions.length})
                                    </div>
                                    <div className="border rounded-md bg-background max-h-[300px] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="text-xs">
                                            <TableHead className="py-2">Tipo</TableHead>
                                            <TableHead className="py-2">Documento</TableHead>
                                            <TableHead className="py-2">Data</TableHead>
                                            <TableHead className="py-2">Paese</TableHead>
                                            <TableHead className="py-2 text-right">Importo</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {data.transactions.map((tx, idx) => (
                                            <TableRow key={idx} className="text-sm">
                                              <TableCell className="py-2">
                                                <Badge variant={tx.type === 'sale' ? 'default' : 'destructive'} className="text-xs">
                                                  {tx.type === 'sale' ? <><Receipt className="w-3 h-3 mr-1" /> Vendita</> : <><RotateCcw className="w-3 h-3 mr-1" /> Reso</>}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="py-2 font-mono text-xs">
                                                {tx.documentType} N. {tx.documentNumber}
                                              </TableCell>
                                              <TableCell className="py-2">{formatDate(tx.date)}</TableCell>
                                              <TableCell className="py-2 text-muted-foreground">
                                                {tx.country || '-'}
                                              </TableCell>
                                              <TableCell className={`py-2 text-right font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(tx.amount)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nessun dato disponibile per il periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisi per Tipo Documento</CardTitle>
            </CardHeader>
            <CardContent>
              {documentTypeAnalytics.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Tipo Documento</TableHead>
                        <TableHead className="text-right">Vendite</TableHead>
                        <TableHead className="text-right">Resi</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Transazioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentTypeAnalytics.map(data => {
                        const isExpanded = expandedDocTypes.has(data.documentType);
                        return (
                          <React.Fragment key={data.documentType}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleDocType(data.documentType)}
                            >
                              <TableCell className="w-10">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{data.documentType}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(data.salesAmount)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(data.returnsAmount)}</TableCell>
                              <TableCell className="text-right font-medium text-blue-600">{formatCurrency(data.netAmount)}</TableCell>
                              <TableCell className="text-right">{data.transactionCount}</TableCell>
                            </TableRow>
                            {isExpanded && data.transactions.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0 bg-muted/30">
                                  <div className="px-4 py-3">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                      Dettaglio Documenti ({data.transactions.length})
                                    </div>
                                    <div className="border rounded-md bg-background max-h-[300px] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="text-xs">
                                            <TableHead className="py-2">Tipo</TableHead>
                                            <TableHead className="py-2">Numero</TableHead>
                                            <TableHead className="py-2">Data</TableHead>
                                            <TableHead className="py-2">Canale</TableHead>
                                            <TableHead className="py-2">Paese</TableHead>
                                            <TableHead className="py-2 text-right">Importo</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {data.transactions.map((tx, idx) => (
                                            <TableRow key={idx} className="text-sm">
                                              <TableCell className="py-2">
                                                <Badge variant={tx.type === 'sale' ? 'default' : 'destructive'} className="text-xs">
                                                  {tx.type === 'sale' ? <><Receipt className="w-3 h-3 mr-1" /> Vendita</> : <><RotateCcw className="w-3 h-3 mr-1" /> Reso</>}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="py-2 font-mono text-xs">
                                                N. {tx.documentNumber}
                                              </TableCell>
                                              <TableCell className="py-2">{formatDate(tx.date)}</TableCell>
                                              <TableCell className="py-2 text-muted-foreground">
                                                {tx.channelSpecific || tx.channel}
                                              </TableCell>
                                              <TableCell className="py-2 text-muted-foreground">
                                                {tx.country || '-'}
                                              </TableCell>
                                              <TableCell className={`py-2 text-right font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(tx.amount)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nessun dato disponibile per il periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
