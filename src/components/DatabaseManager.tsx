import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Database, AlertTriangle, CheckCircle, Trash2, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface DatabaseManagerProps {
  getDatabaseStats: () => Promise<any>;
  getDuplicates: () => Promise<any>;
  removeDuplicates: () => Promise<boolean>;
  refreshSales: () => Promise<void>;
}

export function DatabaseManager({ 
  getDatabaseStats, 
  getDuplicates, 
  removeDuplicates,
  refreshSales 
}: DatabaseManagerProps) {
  const [stats, setStats] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getDatabaseStats();
      setStats(data);
    } catch (error) {
      toast.error('Errore nel caricamento statistiche');
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const data = await getDuplicates();
      setDuplicates(data);
    } catch (error) {
      toast.error('Errore nel caricamento duplicati');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('Sei sicuro di voler rimuovere i duplicati? Questa operazione non può essere annullata.')) {
      return;
    }
    
    setLoadingDuplicates(true);
    try {
      const success = await removeDuplicates();
      if (success) {
        await loadDuplicates();
        await loadStats();
        await refreshSales();
      }
    } catch (error) {
      toast.error('Errore nella rimozione duplicati');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestione Database
          </CardTitle>
          <CardDescription>
            Visualizza statistiche del database e gestisci i duplicati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistiche Database
              </h3>
              <Button onClick={loadStats} disabled={loading} size="sm" variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
            
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.totalSales.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Vendite Totali</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">€{stats.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">Valore Totale</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.ecommerceSales.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Vendite E-commerce</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.withDocumentoNumero.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Con Documento/Numero</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {stats && stats.byChannel && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Vendite per Canale</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byChannel).map(([channel, count]: [string, any]) => (
                    <Badge key={channel} variant="outline">
                      {channel}: {count.toLocaleString()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {stats && stats.byMonth && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Vendite per Mese</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byMonth)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 6)
                    .map(([month, count]: [string, any]) => (
                      <Badge key={month} variant="secondary">
                        {month}: {count.toLocaleString()}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Duplicates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Duplicati
              </h3>
              <div className="flex gap-2">
                <Button onClick={loadDuplicates} disabled={loadingDuplicates} size="sm" variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingDuplicates ? 'animate-spin' : ''}`} />
                  Cerca Duplicati
                </Button>
                {duplicates && duplicates.totalDuplicateRecords > 0 && (
                  <Button 
                    onClick={handleRemoveDuplicates} 
                    disabled={loadingDuplicates} 
                    size="sm" 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Rimuovi Duplicati
                  </Button>
                )}
              </div>
            </div>

            {duplicates && (
              <>
                {duplicates.totalDuplicateRecords > 0 ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Trovati {duplicates.totalDuplicateRecords} record duplicati</AlertTitle>
                    <AlertDescription>
                      Ci sono {duplicates.totalDuplicateGroups} gruppi di duplicati. 
                      Clicca su "Rimuovi Duplicati" per rimuoverli (verrà mantenuto il record più vecchio).
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Nessun duplicato trovato</AlertTitle>
                    <AlertDescription>
                      Il database non contiene record duplicati.
                    </AlertDescription>
                  </Alert>
                )}

                {duplicates.duplicates && duplicates.duplicates.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Esempi di Duplicati (primi 10 gruppi)</h4>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Gruppo</TableHead>
                            <TableHead>Conteggio</TableHead>
                            <TableHead>Esempi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {duplicates.duplicates.slice(0, 10).map((dup: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{dup.signature.substring(0, 50)}...</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{dup.count}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs space-y-1">
                                  {dup.sales.slice(0, 3).map((s: any, i: number) => (
                                    <div key={i}>
                                      {new Date(s.date).toLocaleDateString('it-IT')} - €{s.amount.toFixed(2)} - {s.channel || 'unknown'}
                                    </div>
                                  ))}
                                  {dup.sales.length > 3 && <div className="text-muted-foreground">... e altri {dup.sales.length - 3}</div>}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




