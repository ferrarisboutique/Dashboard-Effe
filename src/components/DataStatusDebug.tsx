import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  CheckCircle, 
  AlertCircle, 
  Package, 
  ShoppingCart, 
  Eye, 
  Upload,
  Info,
  Bug
} from "lucide-react";
import { Sale } from "../types/dashboard";
import { InventoryItem } from "../types/inventory";
import { toast } from "sonner";

interface DataStatusDebugProps {
  sales: Sale[];
  inventory: InventoryItem[];
  onNavigateToUpload: () => void;
  onNavigateToInventoryUpload: () => void;
  onNavigateToDiagnostics?: () => void;
}

async function testRawServerData() {
  try {
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-49468be0/sales`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      }
    });
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      console.log('🔍 RAW SERVER DATA TEST:');
      console.log('Total records:', result.data.length);
      console.log('Sample record:', result.data[0]);
      
      // Analisi dei canali
      const channelDistribution = result.data.reduce((acc: any, item: any) => {
        const channel = item.channel || 'NULL/UNDEFINED';
        acc[channel] = (acc[channel] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Channel distribution:', channelDistribution);
      
      // Find records with problematic channels
      const problematicRecords = result.data.filter((item: any) => 
        !['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'].includes(item.channel)
      );
      
      if (problematicRecords.length > 0) {
        console.log('🚨 PROBLEMATIC RECORDS:', problematicRecords.slice(0, 3));
      }
      
      toast.success(`Test completato: ${result.data.length} record trovati. Vedi console per dettagli.`);
      
      return {
        total: result.data.length,
        channelDistribution,
        problematicRecords: problematicRecords.length,
        sampleRecord: result.data[0]
      };
    } else {
      toast.error('Nessun dato trovato o errore server');
      return null;
    }
  } catch (error) {
    console.error('Error testing raw server data:', error);
    toast.error('Errore nel test dei dati server');
    return null;
  }
}

export function DataStatusDebug({ 
  sales, 
  inventory, 
  onNavigateToUpload, 
  onNavigateToInventoryUpload,
  onNavigateToDiagnostics
}: DataStatusDebugProps) {
  const hasSales = sales.length > 0;
  const hasInventory = inventory.length > 0;
  
  // Analizza i canali delle vendite
  const salesByChannel = {
    negozio_donna: sales.filter(s => s.channel === 'negozio_donna').length,
    negozio_uomo: sales.filter(s => s.channel === 'negozio_uomo').length,
    ecommerce: sales.filter(s => s.channel === 'ecommerce').length,
    marketplace: sales.filter(s => s.channel === 'marketplace').length,
  };

  // Analizza i canali sconosciuti o vuoti
  const unknownChannels = sales.filter(s => 
    !['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'].includes(s.channel)
  );
  
  // Raggruppa per channel value per vedere cosa c'è di strano
  const channelDistribution = sales.reduce((acc, sale) => {
    const channelValue = sale.channel || 'NULL/UNDEFINED';
    acc[channelValue] = (acc[channelValue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Analizza l'inventario per categoria
  const inventoryByCategory = inventory.reduce((acc, item) => {
    const category = item.category || 'Non specificato';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-4">
          <Info className="w-6 h-6" />
          Stato Dati Dashboard
        </h2>
        <p className="text-muted-foreground mb-6">
          Questa pagina mostra lo stato attuale dei tuoi dati. L'inventario e le vendite sono due dataset separati necessari per il funzionamento completo della dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Dati di Vendita
              </div>
              {hasSales ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {sales.length} vendite
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Nessun dato
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasSales ? (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Vendite per Canale:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Negozio Donna</span>
                      <Badge variant="outline">{salesByChannel.negozio_donna}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Negozio Uomo</span>
                      <Badge variant="outline">{salesByChannel.negozio_uomo}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">E-commerce</span>
                      <Badge variant="outline">{salesByChannel.ecommerce}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Marketplace</span>
                      <Badge variant="outline">{salesByChannel.marketplace}</Badge>
                    </div>
                  </div>
                  
                  {unknownChannels.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-800 mb-2">⚠️ Vendite con Canale Sconosciuto:</p>
                      <p className="text-sm text-red-600 mb-2">{unknownChannels.length} vendite non sono attribuite a canali validi</p>
                      <div className="flex gap-2 mb-2">
                        <Button 
                          onClick={testRawServerData} 
                          size="sm" 
                          variant="outline"
                        >
                          <Bug className="w-3 h-3 mr-1" />
                          Debug Server Data
                        </Button>
                        {onNavigateToDiagnostics && (
                          <Button 
                            onClick={onNavigateToDiagnostics} 
                            size="sm" 
                            variant="default"
                          >
                            <Bug className="w-3 h-3 mr-1" />
                            Apri Diagnostica Avanzata
                          </Button>
                        )}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Distribuzione Canali (Debug)</summary>
                        <div className="mt-2 space-y-1">
                          {Object.entries(channelDistribution).map(([channel, count]) => (
                            <div key={channel} className="flex justify-between">
                              <span className="font-mono">"{channel}"</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <p><strong>Sample vendita senza canale:</strong></p>
                          <pre>{JSON.stringify(unknownChannels[0], null, 2)}</pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    ✅ I dati di vendita sono necessari per la dashboard e le sezioni Negozi/Online
                  </p>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Nessun dato di vendita trovato!</strong><br />
                    Le sezioni "Panoramica", "Negozi" e "Online" della dashboard appariranno vuote fino a quando non carichi i dati di vendita.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Button onClick={onNavigateToUpload} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Carica Dati di Vendita
                  </Button>
                  <Button 
                    onClick={testRawServerData} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Test Dati Server
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p><strong>Cosa caricare:</strong> File CSV/XLSX con colonne:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Data (dd/mm/aa o dd/mm/aaaa)</li>
                    <li>Utente (carla, alexander, paolo)</li>
                    <li>SKU del prodotto</li>
                    <li>Quantità venduta</li>
                    <li>Prezzo di vendita</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventario Prodotti
              </div>
              {hasInventory ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {inventory.length} prodotti
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Nessun dato
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasInventory ? (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Prodotti per Categoria:</p>
                  <div className="space-y-2">
                    {Object.entries(inventoryByCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    ✅ L'inventario è necessario per calcolare margini e statistiche prodotto
                  </p>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Inventario vuoto!</strong><br />
                    I calcoli di marginalità e le statistiche sui prodotti non saranno disponibili.
                  </AlertDescription>
                </Alert>
                <Button onClick={onNavigateToInventoryUpload} variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Carica Inventario
                </Button>
                <div className="text-xs text-muted-foreground">
                  <p><strong>Cosa caricare:</strong> File CSV/XLSX con colonne:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>SKU (univoco)</li>
                    <li>Categoria (abbigliamento, calzature, etc.)</li>
                    <li>Brand</li>
                    <li>Prezzo di acquisto (IVA esclusa)</li>
                    <li>Prezzo di vendita (IVA compresa)</li>
                    <li>Collezione/Stagione (opzionale)</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Status */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Stato Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {hasSales && hasInventory ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">Dashboard Completa</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasSales && hasInventory ? 
                  "Tutti i dati sono disponibili" : 
                  "Alcuni dati mancano"}
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {hasSales ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">Sezioni Negozi/Online</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasSales ? 
                  "Dati disponibili" : 
                  "Richiede dati di vendita"}
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {hasInventory ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">Calcolo Margini</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasInventory ? 
                  "Inventario disponibile" : 
                  "Richiede inventario"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {(!hasSales || !hasInventory) && (
        <Card>
          <CardHeader>
            <CardTitle>Prossimi Passi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!hasSales && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">Carica i Dati di Vendita</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Inizia caricando le transazioni dei tuoi negozi per vedere la dashboard in azione.
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-2" 
                      onClick={onNavigateToUpload}
                    >
                      Carica Vendite
                    </Button>
                  </div>
                </div>
              )}
              
              {!hasInventory && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {hasSales ? '2' : '1'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">Carica l'Inventario</p>
                    <p className="text-sm text-amber-600 mt-1">
                      Aggiungi i tuoi prodotti per calcolare margini e statistiche avanzate.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="mt-2" 
                      onClick={onNavigateToInventoryUpload}
                    >
                      Carica Inventario
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}