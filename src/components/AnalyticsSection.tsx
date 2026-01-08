import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SalesChart } from "./SalesChart";
import { Sale } from "../types/dashboard";
import { filterDataByDateAdvanced, getBrandChannelDistribution } from "../utils/analytics";
import { BarChart3, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DateRangeFilter } from "./DateRangeFilter";

interface AnalyticsSectionProps {
  sales: Sale[];
  paymentMappings?: Record<string, { macroArea: string; channel: string }>;
  dateRange?: string;
  customStart?: string;
  customEnd?: string;
}

export function AnalyticsSection({ sales, paymentMappings, dateRange: globalDateRange = "all", customStart: globalCustomStart, customEnd: globalCustomEnd }: AnalyticsSectionProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  // Local date filter state for this section (can override global filter)
  const [localDateRange, setLocalDateRange] = useState<string>(globalDateRange);
  const [localCustomStart, setLocalCustomStart] = useState<string | undefined>(globalCustomStart);
  const [localCustomEnd, setLocalCustomEnd] = useState<string | undefined>(globalCustomEnd);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);

  // Sync with global filter when it changes (only if user hasn't set local override)
  React.useEffect(() => {
    if (!hasLocalOverride) {
      setLocalDateRange(globalDateRange);
      setLocalCustomStart(globalCustomStart);
      setLocalCustomEnd(globalCustomEnd);
    }
  }, [globalDateRange, globalCustomStart, globalCustomEnd, hasLocalOverride]);

  // Use local filter if set, otherwise fall back to global filter
  const activeDateRange = localDateRange;
  const activeCustomStart = localCustomStart;
  const activeCustomEnd = localCustomEnd;

  // Apply date filter to sales specifically for this section
  const filteredSales = useMemo(() => {
    return filterDataByDateAdvanced(sales, activeDateRange, activeCustomStart, activeCustomEnd);
  }, [sales, activeDateRange, activeCustomStart, activeCustomEnd]);

  // Get all unique brands
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    filteredSales.forEach(sale => {
      if (sale.brand && sale.brand !== 'Unknown') {
        brandSet.add(sale.brand);
      }
    });
    return Array.from(brandSet).sort();
  }, [filteredSales]);

  // Set first brand as default
  React.useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      setSelectedBrand(brands[0]);
    }
  }, [brands, selectedBrand]);

  // Calculate distribution for selected brand
  const distribution = useMemo(() => {
    if (!selectedBrand) return null;
    return getBrandChannelDistribution(filteredSales, selectedBrand, paymentMappings);
  }, [filteredSales, selectedBrand, paymentMappings]);

  if (brands.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics - Distribuzione Brand per Canale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nessun brand disponibile per l'analisi.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics - Distribuzione Brand per Canale
        </h2>
        {/* Date Filter for Analytics Section */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <DateRangeFilter
            dateRange={localDateRange}
            onDateRangeChange={(range) => {
              setLocalDateRange(range);
              setHasLocalOverride(true);
              // Reset custom dates when switching away from custom
              if (range !== 'custom') {
                setLocalCustomStart(undefined);
                setLocalCustomEnd(undefined);
              }
            }}
            customStart={localCustomStart}
            customEnd={localCustomEnd}
            onCustomStartChange={(start) => {
              setLocalCustomStart(start);
              setHasLocalOverride(true);
            }}
            onCustomEndChange={(end) => {
              setLocalCustomEnd(end);
              setHasLocalOverride(true);
            }}
          />
        </div>
      </div>

      {/* Brand Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleziona un brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {distribution && selectedBrand && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Macro Areas Pie Chart */}
            <SalesChart
              title={`Distribuzione per Macro Area - ${selectedBrand}`}
              data={distribution.macroAreas.map(area => ({
                name: area.name,
                value: area.value,
                percentage: area.percentage.toFixed(1)
              }))}
              type="pie"
              dataKey="value"
              height={400}
            />

            {/* Sub Channels Bar Chart */}
            <SalesChart
              title={`Distribuzione per Sotto-Canale - ${selectedBrand}`}
              data={distribution.subChannels.map(channel => ({
                name: channel.name,
                value: channel.value,
                percentage: channel.percentage.toFixed(1)
              }))}
              type="bar"
              dataKey="value"
              xAxisKey="name"
              height={400}
            />
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Dettaglio Distribuzione - {selectedBrand}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Macro Areas Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Macro Aree</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Macro Area</TableHead>
                        <TableHead className="text-right">Valore</TableHead>
                        <TableHead className="text-right">Percentuale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distribution.macroAreas.map(area => (
                        <TableRow key={area.name}>
                          <TableCell className="font-medium">{area.name}</TableCell>
                          <TableCell className="text-right">€{area.value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{area.percentage.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Sub Channels Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Sotto-Canali</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sotto-Canale</TableHead>
                        <TableHead>Macro Area</TableHead>
                        <TableHead className="text-right">Valore</TableHead>
                        <TableHead className="text-right">Percentuale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distribution.subChannels.map(channel => (
                        <TableRow key={channel.name}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>{channel.macroArea}</TableCell>
                          <TableCell className="text-right">€{channel.value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{channel.percentage.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}



