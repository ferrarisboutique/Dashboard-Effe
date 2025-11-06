import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Sale, Return } from '../types/dashboard';
import { calculateVATByCountry, getOSSCountries } from '../utils/ossCalculator';
import { generateOSSFile } from '../utils/ossExport';
import { OSSVATData } from '../types/oss';
import { toast } from 'sonner';

interface OSSSectionProps {
  sales: Sale[];
  returns: Return[];
}

export function OSSSection({ sales, returns }: OSSSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'quarter' | 'month' | 'custom'>('quarter');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Calculate period dates
  const period = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (selectedPeriod) {
      case 'quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'custom': {
        if (!customStart || !customEnd) {
          // Default to current month if custom dates not set
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
          start = new Date(customStart);
          end = new Date(customEnd);
        }
        break;
      }
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [selectedPeriod, customStart, customEnd]);

  // Calculate VAT data
  const vatData = useMemo(() => {
    return calculateVATByCountry(sales, returns, period);
  }, [sales, returns, period]);

  const totalBaseAmount = vatData.reduce((sum, d) => sum + d.baseAmount, 0);
  const totalVATAmount = vatData.reduce((sum, d) => sum + d.vatAmount, 0);
  const totalTransactions = vatData.reduce((sum, d) => sum + d.transactionCount, 0);

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (vatData.length === 0) {
      toast.error('Nessun dato da esportare per il periodo selezionato');
      return;
    }

    try {
      generateOSSFile(vatData, period, format);
      toast.success(`File OSS esportato in formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Errore durante l\'esportazione del file');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OSS (One Stop Shop) - Calcolo IVA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Period Selection */}
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(v: 'quarter' | 'month' | 'custom') => setSelectedPeriod(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarter">Trimestre Corrente</SelectItem>
                <SelectItem value="month">Mese Corrente</SelectItem>
                <SelectItem value="custom">Periodo Personalizzato</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                  placeholder="Data inizio"
                />
                <span>al</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                  placeholder="Data fine"
                />
              </>
            )}

            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={vatData.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('xlsx')}
                disabled={vatData.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export XLSX
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Base Imponibile Totale</div>
                <div className="text-2xl font-bold">
                  €{totalBaseAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">IVA Dovuta Totale</div>
                <div className="text-2xl font-bold text-blue-600">
                  €{totalVATAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Transazioni Totali</div>
                <div className="text-2xl font-bold">
                  {totalTransactions.toLocaleString('it-IT')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Data Table */}
          {vatData.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paese</TableHead>
                    <TableHead>Codice</TableHead>
                    <TableHead>Aliquota IVA</TableHead>
                    <TableHead className="text-right">Base Imponibile</TableHead>
                    <TableHead className="text-right">IVA Dovuta</TableHead>
                    <TableHead className="text-right">Transazioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatData.map((data) => (
                    <TableRow key={data.country}>
                      <TableCell>{data.countryName}</TableCell>
                      <TableCell>{data.country}</TableCell>
                      <TableCell>{data.vatRate}%</TableCell>
                      <TableCell className="text-right">
                        €{data.baseAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        €{data.vatAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {data.transactionCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Il calcolo dell'IVA è basato sulle vendite nette (vendite - resi) per ogni paese OSS.
              I dati esportati sono pronti per il caricamento sul sistema OSS.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

