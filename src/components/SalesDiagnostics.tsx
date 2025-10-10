import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { 
  AlertCircle, 
  CheckCircle, 
  Bug, 
  RefreshCw, 
  Download,
  Wrench,
  TrendingUp,
  Database,
  FileWarning,
  Info
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-49468be0`;

interface DiagnosticsData {
  timestamp: string;
  summary: {
    totalRecords: number;
    validRecords: number;
    problematicRecords: number;
    problematicPercentage: string;
  };
  channelDistribution: Record<string, number>;
  issues: {
    nullChannels: number;
    undefinedChannels: number;
    invalidChannels: number;
  };
  samples: {
    nullChannelSample: any[];
    undefinedChannelSample: any[];
    invalidChannelSample: any[];
  };
  allProblematicRecords: any[];
}

interface AutoSuggestion {
  recordId: string;
  currentChannel: string;
  suggestedChannel: string;
  reason: string;
  user?: string;
}

interface SalesDiagnosticsProps {
  onDataFixed?: () => void;
}

export function SalesDiagnostics({ onDataFixed }: SalesDiagnosticsProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestion[]>([]);

  const getAutoSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/auto-suggest-channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Auto-suggest failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.suggestions) {
        setAutoSuggestions(result.suggestions);
        console.log('✅ Auto-suggestions generated:', result.suggestions);
        return result.suggestions;
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting auto-suggestions:', error);
      return [];
    }
  };

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      console.log('🔬 Running diagnostics...');
      
      const response = await fetch(`${API_BASE_URL}/sales/diagnostics`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Diagnostics failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDiagnostics(result.diagnostics);
        console.log('✅ Diagnostics completed:', result.diagnostics);
        
        // Auto-select all problematic records for fixing
        const problematicIds = result.diagnostics.allProblematicRecords
          .map((r: any) => r.id)
          .filter((id: string) => id);
        setSelectedRecords(problematicIds);
        
        // Get auto-suggestions
        if (problematicIds.length > 0) {
          await getAutoSuggestions();
        }
        
        toast.success(`Analisi completata: trovati ${result.diagnostics.summary.problematicRecords} record problematici`);
      } else {
        throw new Error(result.error || 'Diagnostics failed');
      }
    } catch (error) {
      console.error('❌ Error running diagnostics:', error);
      toast.error('Errore nell\'esecuzione della diagnostica');
    } finally {
      setLoading(false);
    }
  };

  const fixChannels = async () => {
    if (!selectedChannel) {
      toast.error('Seleziona un canale prima di correggere');
      return;
    }

    if (selectedRecords.length === 0) {
      toast.error('Nessun record selezionato');
      return;
    }

    try {
      setFixing(true);
      console.log(`🔧 Fixing ${selectedRecords.length} records to channel: ${selectedChannel}`);
      
      const response = await fetch(`${API_BASE_URL}/sales/fix-channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds: selectedRecords,
          newChannel: selectedChannel
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fix failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Records fixed:', result);
        toast.success(`${result.updatedCount} record aggiornati con successo!`);
        
        // Refresh diagnostics
        await runDiagnostics();
        
        // Notify parent component
        if (onDataFixed) {
          onDataFixed();
        }
      } else {
        throw new Error(result.error || 'Fix failed');
      }
    } catch (error) {
      console.error('❌ Error fixing channels:', error);
      toast.error('Errore nella correzione dei canali');
    } finally {
      setFixing(false);
    }
  };

  const exportProblematicData = () => {
    if (!diagnostics) return;

    const dataStr = JSON.stringify(diagnostics.allProblematicRecords, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `problematic-sales-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Dati problematici esportati');
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  if (loading && !diagnostics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Esecuzione diagnostica vendite...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 mb-2">
            <Bug className="w-6 h-6" />
            Diagnostica Dati Vendite
          </h2>
          <p className="text-sm text-muted-foreground">
            Analisi approfondita dei dati di vendita per identificare e correggere problemi
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Riesegui Diagnostica
        </Button>
      </div>

      {diagnostics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Totale Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics.summary.totalRecords}</div>
                <p className="text-xs text-muted-foreground mt-1">Record nel database</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Record Validi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{diagnostics.summary.validRecords}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((diagnostics.summary.validRecords / diagnostics.summary.totalRecords) * 100).toFixed(1)}% del totale
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Record Problematici
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{diagnostics.summary.problematicRecords}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {diagnostics.summary.problematicPercentage} del totale
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Stato Salute
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnostics.summary.problematicRecords === 0 ? (
                  <>
                    <div className="text-2xl font-bold text-green-600">Ottimo</div>
                    <p className="text-xs text-muted-foreground mt-1">Nessun problema</p>
                  </>
                ) : diagnostics.summary.problematicRecords < diagnostics.summary.totalRecords * 0.1 ? (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">Buono</div>
                    <p className="text-xs text-muted-foreground mt-1">Pochi problemi</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">Critico</div>
                    <p className="text-xs text-muted-foreground mt-1">Molti problemi</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Channel Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Canali</CardTitle>
              <CardDescription>
                Visualizzazione di tutti i canali trovati nel database, inclusi quelli non validi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(diagnostics.channelDistribution).map(([channel, count]) => {
                  const isValid = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'].includes(channel);
                  return (
                    <div 
                      key={channel} 
                      className={`p-4 border rounded-lg ${!isValid ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm">{channel}</span>
                        {isValid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-2xl font-bold">{count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((count / diagnostics.summary.totalRecords) * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Issues Breakdown */}
          {diagnostics.summary.problematicRecords > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-red-500" />
                  Dettaglio Problemi
                </CardTitle>
                <CardDescription>
                  Analisi dei tipi di problemi riscontrati nei dati
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Issues Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {diagnostics.issues.nullChannels > 0 && (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium">Canale NULL</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{diagnostics.issues.nullChannels}</div>
                      <p className="text-xs text-red-700 mt-1">Canale esplicitamente NULL</p>
                    </div>
                  )}
                  
                  {diagnostics.issues.undefinedChannels > 0 && (
                    <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">Canale UNDEFINED</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">{diagnostics.issues.undefinedChannels}</div>
                      <p className="text-xs text-orange-700 mt-1">Canale non definito</p>
                    </div>
                  )}
                  
                  {diagnostics.issues.invalidChannels > 0 && (
                    <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">Canale Non Valido</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-600">{diagnostics.issues.invalidChannels}</div>
                      <p className="text-xs text-amber-700 mt-1">Valore canale non riconosciuto</p>
                    </div>
                  )}
                </div>

                {/* Sample Records */}
                <div className="space-y-4">
                  <h4 className="font-medium">Esempi di Record Problematici</h4>
                  
                  {diagnostics.samples.nullChannelSample.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-2">Canale NULL (primi 3):</p>
                      <div className="bg-gray-50 p-3 rounded border text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(diagnostics.samples.nullChannelSample, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  
                  {diagnostics.samples.undefinedChannelSample.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-600 mb-2">Canale UNDEFINED (primi 3):</p>
                      <div className="bg-gray-50 p-3 rounded border text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(diagnostics.samples.undefinedChannelSample, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  
                  {diagnostics.samples.invalidChannelSample.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-600 mb-2">Canale Non Valido (primi 3):</p>
                      <div className="bg-gray-50 p-3 rounded border text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(diagnostics.samples.invalidChannelSample, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-Suggestions */}
                {autoSuggestions.length > 0 && (
                  <div className="border-t pt-6">
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Correzione Automatica Disponibile! 🤖</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Il sistema ha analizzato i dati e può correggere automaticamente {autoSuggestions.length} record 
                        basandosi sul campo "user". Clicca sul pulsante qui sotto per applicare le correzioni suggerite.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="mb-4 space-y-2">
                      <h4 className="font-medium">Anteprima Correzioni Automatiche:</h4>
                      <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto">
                        {autoSuggestions.slice(0, 10).map((suggestion, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex-1">
                              <span className="text-sm font-mono">{suggestion.user}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.currentChannel || 'NULL'}
                              </Badge>
                              <span>→</span>
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.suggestedChannel}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {autoSuggestions.length > 10 && (
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            ... e altri {autoSuggestions.length - 10} record
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={async () => {
                        // Group suggestions by suggested channel and fix in batches
                        const byChannel = autoSuggestions.reduce((acc, s) => {
                          if (!acc[s.suggestedChannel]) acc[s.suggestedChannel] = [];
                          acc[s.suggestedChannel].push(s.recordId);
                          return acc;
                        }, {} as Record<string, string[]>);
                        
                        setFixing(true);
                        try {
                          for (const [channel, ids] of Object.entries(byChannel)) {
                            await fetch(`${API_BASE_URL}/sales/fix-channels`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${publicAnonKey}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ recordIds: ids, newChannel: channel }),
                            });
                          }
                          toast.success(`${autoSuggestions.length} record corretti automaticamente!`);
                          await runDiagnostics();
                          if (onDataFixed) onDataFixed();
                        } catch (error) {
                          console.error('Error auto-fixing:', error);
                          toast.error('Errore nella correzione automatica');
                        } finally {
                          setFixing(false);
                        }
                      }}
                      disabled={fixing}
                      className="w-full"
                    >
                      {fixing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Correzione in corso...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Applica Correzioni Automatiche ({autoSuggestions.length} record)
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Manual Fix Section */}
                <div className="border-t pt-6">
                  <Alert className="mb-4">
                    <Wrench className="h-4 w-4" />
                    <AlertTitle>Correzione Manuale</AlertTitle>
                    <AlertDescription>
                      Se la correzione automatica non è disponibile o preferisci scegliere manualmente, 
                      seleziona un canale e applica la correzione a {selectedRecords.length} record.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Seleziona il canale da assegnare ai record problematici:
                      </label>
                      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un canale..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="negozio_donna">Negozio Donna</SelectItem>
                          <SelectItem value="negozio_uomo">Negozio Uomo</SelectItem>
                          <SelectItem value="ecommerce">E-commerce</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={fixChannels} 
                        disabled={!selectedChannel || selectedRecords.length === 0 || fixing}
                        variant="default"
                      >
                        {fixing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Correzione...
                          </>
                        ) : (
                          <>
                            <Wrench className="w-4 h-4 mr-2" />
                            Correggi {selectedRecords.length} Record
                          </>
                        )}
                      </Button>
                      
                      <Button onClick={exportProblematicData} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Esporta
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    ⚠️ Questa operazione aggiornerà permanentemente i record nel database. Assicurati di aver selezionato il canale corretto.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {diagnostics.summary.problematicRecords === 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Tutti i dati sono corretti!</AlertTitle>
              <AlertDescription className="text-green-700">
                Tutti i {diagnostics.summary.totalRecords} record nel database hanno canali validi.
                Non sono necessarie correzioni.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
