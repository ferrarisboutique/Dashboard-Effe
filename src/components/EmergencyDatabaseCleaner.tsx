import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { AlertCircle, Trash2, RefreshCw, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-49468be0`;

interface CleanupStats {
  total: number;
  deleted: number;
  failed: number;
  progress: number;
}

export function EmergencyDatabaseCleaner({ onComplete }: { onComplete?: () => void }) {
  const [cleaning, setCleaning] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [salesCount, setSalesCount] = useState<number | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const checkDatabaseStatus = async () => {
    setChecking(true);
    try {
      // Check sales
      const salesResponse = await fetch(`${API_BASE_URL}/sales`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      });
      const salesResult = await salesResponse.json();
      setSalesCount(salesResult.success ? salesResult.data.length : 0);

      // Check inventory
      const inventoryResponse = await fetch(`${API_BASE_URL}/inventory?limit=1`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      });
      const inventoryResult = await inventoryResponse.json();
      setInventoryCount(inventoryResult.pagination?.total || 0);

      toast.success('Stato database aggiornato');
    } catch (error) {
      console.error('Error checking database:', error);
      toast.error('Errore nel controllo database');
    } finally {
      setChecking(false);
    }
  };

  const forceDeleteAllSales = async () => {
    if (!confirm('⚠️ ATTENZIONE: Questa operazione cancellerà TUTTE le vendite dal database.\n\nQuesta azione è IRREVERSIBILE!\n\nVuoi procedere?')) {
      return;
    }

    setCleaning(true);
    setStats({ total: 0, deleted: 0, failed: 0, progress: 0 });

    try {
      // 1. Get all sales
      console.log('📊 Recupero tutte le vendite...');
      const response = await fetch(`${API_BASE_URL}/sales`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Impossibile recuperare le vendite');
      }

      const sales = result.data;
      const total = sales.length;

      if (total === 0) {
        toast.info('Nessuna vendita da cancellare');
        setCleaning(false);
        return;
      }

      console.log(`✅ Trovate ${total} vendite da cancellare`);
      setStats({ total, deleted: 0, failed: 0, progress: 0 });

      // 2. Delete each sale individually with proper key
      let deleted = 0;
      let failed = 0;

      // Process in batches of 10 for better performance
      const BATCH_SIZE = 10;
      for (let i = 0; i < sales.length; i += BATCH_SIZE) {
        const batch = sales.slice(i, Math.min(i + BATCH_SIZE, sales.length));
        
        const deletePromises = batch.map(async (sale: any) => {
          try {
            const saleKey = sale.key || sale.id;
            const deleteResponse = await fetch(`${API_BASE_URL}/sales/${saleKey}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              }
            });

            const deleteResult = await deleteResponse.json();
            
            if (deleteResult.success) {
              return { success: true };
            } else {
              console.error(`Failed to delete ${saleKey}:`, deleteResult);
              return { success: false };
            }
          } catch (error) {
            console.error('Delete error:', error);
            return { success: false };
          }
        });

        const results = await Promise.all(deletePromises);
        
        results.forEach(result => {
          if (result.success) {
            deleted++;
          } else {
            failed++;
          }
        });

        const progress = Math.round((deleted + failed) / total * 100);
        setStats({ total, deleted, failed, progress });

        // Small delay between batches
        if (i + BATCH_SIZE < sales.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`\n✅ Cancellazione completata: ${deleted} successi, ${failed} fallimenti`);
      
      if (deleted > 0) {
        toast.success(`${deleted} vendite cancellate con successo!`);
      }
      
      if (failed > 0) {
        toast.warning(`${failed} vendite non sono state cancellate`);
      }

      // Refresh database status
      await checkDatabaseStatus();
      
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Error in force delete:', error);
      toast.error('Errore durante la cancellazione');
    } finally {
      setCleaning(false);
    }
  };

  const forceDeleteAllInventory = async () => {
    if (!confirm('⚠️ ATTENZIONE: Questa operazione cancellerà TUTTO l\'inventario dal database.\n\nQuesta azione è IRREVERSIBILE!\n\nVuoi procedere?')) {
      return;
    }

    setCleaning(true);

    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.deletedCount || 0} prodotti cancellati!`);
        await checkDatabaseStatus();
        if (onComplete) onComplete();
      } else {
        throw new Error(result.error || 'Operazione fallita');
      }
    } catch (error) {
      console.error('Error deleting inventory:', error);
      toast.error('Errore nella cancellazione inventario');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 mb-2 text-2xl font-bold">
          <Database className="w-6 h-6" />
          Pulizia Database di Emergenza
        </h2>
        <p className="text-muted-foreground">
          Usa questo strumento solo se le normali operazioni di cancellazione non funzionano.
        </p>
      </div>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Stato Database
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkDatabaseStatus}
              disabled={checking}
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Controllo...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aggiorna
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Vendite</span>
                {salesCount !== null && (
                  <Badge variant={salesCount > 0 ? "default" : "secondary"}>
                    {salesCount}
                  </Badge>
                )}
              </div>
              {salesCount === null ? (
                <p className="text-xs text-muted-foreground">Click "Aggiorna" per controllare</p>
              ) : salesCount > 0 ? (
                <p className="text-xs text-orange-600">{salesCount} record nel database</p>
              ) : (
                <p className="text-xs text-green-600">Database vuoto</p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Inventario</span>
                {inventoryCount !== null && (
                  <Badge variant={inventoryCount > 0 ? "default" : "secondary"}>
                    {inventoryCount}
                  </Badge>
                )}
              </div>
              {inventoryCount === null ? (
                <p className="text-xs text-muted-foreground">Click "Aggiorna" per controllare</p>
              ) : inventoryCount > 0 ? (
                <p className="text-xs text-orange-600">{inventoryCount} prodotti nel database</p>
              ) : (
                <p className="text-xs text-green-600">Database vuoto</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Attenzione</AlertTitle>
        <AlertDescription>
          Queste operazioni sono IRREVERSIBILI. Assicurati di aver fatto backup se necessario.
          La cancellazione può richiedere diversi minuti per grandi quantità di dati.
        </AlertDescription>
      </Alert>

      {/* Delete Sales */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Cancella Tutte le Vendite
          </CardTitle>
          <CardDescription>
            Rimuove TUTTI i record di vendita dal database usando cancellazione forzata.
            {salesCount !== null && salesCount > 0 && (
              <span className="block mt-2 font-semibold text-red-600">
                ⚠️ {salesCount} vendite saranno cancellate
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && stats.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso: {stats.deleted + stats.failed}/{stats.total}</span>
                <span>{stats.progress}%</span>
              </div>
              <Progress value={stats.progress} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-green-600">✓ Cancellate: {stats.deleted}</span>
                {stats.failed > 0 && <span className="text-red-600">✗ Fallite: {stats.failed}</span>}
              </div>
            </div>
          )}

          <Button 
            variant="destructive" 
            className="w-full"
            onClick={forceDeleteAllSales}
            disabled={cleaning || salesCount === 0}
          >
            {cleaning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Cancellazione in corso...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Cancella Tutte le Vendite ({salesCount || 0})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Inventory */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Trash2 className="w-5 h-5" />
            Cancella Tutto l'Inventario
          </CardTitle>
          <CardDescription>
            Rimuove TUTTI i prodotti dall'inventario.
            {inventoryCount !== null && inventoryCount > 0 && (
              <span className="block mt-2 font-semibold text-orange-600">
                ⚠️ {inventoryCount} prodotti saranno cancellati
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={forceDeleteAllInventory}
            disabled={cleaning || inventoryCount === 0}
          >
            {cleaning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Cancellazione in corso...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Cancella Tutto l'Inventario ({inventoryCount || 0})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Success Message */}
      {stats && stats.deleted > 0 && !cleaning && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Operazione Completata!</AlertTitle>
          <AlertDescription className="text-green-700">
            {stats.deleted} vendite cancellate con successo.
            {stats.failed > 0 && ` ${stats.failed} operazioni fallite.`}
            <br />
            Ricarica la dashboard per vedere i cambiamenti.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

