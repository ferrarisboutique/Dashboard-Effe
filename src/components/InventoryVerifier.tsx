import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { AlertCircle, CheckCircle, RefreshCw, FileWarning, Package } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-49468be0`;

interface VerificationResult {
  totalInDatabase: number;
  estimatedTotal?: number;
  possibleMissing?: number;
  timeoutIssue?: boolean;
}

export function InventoryVerifier() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verifyInventory = async () => {
    setVerifying(true);
    
    try {
      // Get count
      const response = await fetch(`${API_BASE_URL}/inventory/count`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          totalInDatabase: data.count,
          estimatedTotal: 22000, // User's expected total
          possibleMissing: 22000 - data.count
        });
        
        toast.success('Verifica completata');
      } else {
        throw new Error('Errore nella verifica');
      }
    } catch (error) {
      console.error('Error verifying:', error);
      toast.error('Errore nella verifica inventario');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Verifica Completezza Inventario
          </CardTitle>
          <CardDescription>
            Controlla se tutti i prodotti sono stati caricati correttamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={verifyInventory}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifica in corso...
              </>
            ) : (
              <>
                <FileWarning className="w-4 h-4 mr-2" />
                Verifica Inventario
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Nel Database</p>
                  <Badge variant="default" className="text-xl p-2">
                    {result.totalInDatabase.toLocaleString()}
                  </Badge>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Previsti</p>
                  <Badge variant="outline" className="text-xl p-2">
                    {result.estimatedTotal?.toLocaleString()}
                  </Badge>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Differenza</p>
                  <Badge 
                    variant={result.possibleMissing && result.possibleMissing > 0 ? "destructive" : "secondary"}
                    className="text-xl p-2"
                  >
                    {result.possibleMissing?.toLocaleString() || 0}
                  </Badge>
                </div>
              </div>

              {result.possibleMissing && result.possibleMissing > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>⚠️ Possibili Prodotti Mancanti</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      <strong>Differenza rilevata:</strong> {result.possibleMissing.toLocaleString()} prodotti
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Possibili Cause:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Timeout Upload:</strong> Il sistema ha interrotto l'upload dopo 35 secondi per sicurezza</li>
                        <li><strong>SKU Duplicati:</strong> {result.possibleMissing.toLocaleString()} SKU duplicati nel tuo file Excel</li>
                        <li><strong>Errori Validazione:</strong> Prodotti con SKU o Brand mancanti</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">🔧 Soluzioni:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                        <li>Ricarica il file - i prodotti mancanti verranno aggiunti (duplicati saltati)</li>
                        <li>Oppure: Suddividi il file Excel in 2-3 parti più piccole e carica separatamente</li>
                        <li>Verifica nel tuo Excel se ci sono SKU duplicati</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result.possibleMissing === 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">✅ Inventario Completo!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Tutti i {result.totalInDatabase.toLocaleString()} prodotti sono stati caricati correttamente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Nota sulla Visualizzazione:</strong><br />
              La tabella inventario mostra <strong>50 prodotti per pagina</strong> per performance. 
              Usa i bottoni "Precedente" e "Successiva" in fondo alla tabella per navigare tutti i {result?.totalInDatabase.toLocaleString() || '15,000'} prodotti.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

