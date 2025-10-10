import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { processInventoryFile } from '../utils/fileParser';
import { ProcessedInventoryData } from '../types/inventory';
import { Upload, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface InventoryDataUploadProps {
  onDataUploaded: (data: ProcessedInventoryData[], onProgress?: (progress: number) => void) => Promise<{ success: boolean; result?: any }>;
  onClearInventory?: () => Promise<void>;
}

export function InventoryDataUpload({ onDataUploaded, onClearInventory }: InventoryDataUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const processFile = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    setIsProcessingFile(true);
    setResult(null);
    setUploadProgress(0);

    try {
      // Step 1: Process the file locally
      const uploadResult = await processInventoryFile(file);
      setResult(uploadResult);
      setIsProcessingFile(false);

      if (uploadResult.success && uploadResult.data) {
        const dataSize = uploadResult.data.length;
        console.log(`File processed successfully. ${dataSize} items ready for upload.`);
        
        if (dataSize > 10000) {
          console.log(`Large file detected (${dataSize} items). Will upload in chunks.`);
        }

        // Step 2: Upload to server with progress tracking
        const serverResult = await onDataUploaded(uploadResult.data, (progress) => {
          setUploadProgress(progress);
        });
        
        // Update the result with server response information
        if (serverResult && typeof serverResult === 'object' && 'result' in serverResult) {
          setResult({
            ...uploadResult,
            processedCount: serverResult.result?.count || uploadResult.data.length,
            skippedDuplicates: serverResult.result?.skippedDuplicates || 0,
            chunks: serverResult.result?.chunks || 1
          });
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Errore durante il processing del file',
        errors: [error instanceof Error ? error.message : 'Errore sconosciuto']
      });
    } finally {
      setUploading(false);
      setIsProcessingFile(false);
      setUploadProgress(0);
    }
  }, [file, onDataUploaded]);

  const resetUpload = useCallback(() => {
    setFile(null);
    setResult(null);
    setUploading(false);
    setUploadProgress(0);
    setIsProcessingFile(false);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Caricamento Inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Instructions */}
          <div className="space-y-4">
            <h4>Formato File Richiesto</h4>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm">
                Il file deve contenere le seguenti colonne (CSV o XLSX):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="space-y-1">
                  <Badge variant="outline">SKU</Badge>
                  <span className="ml-2">Codice prodotto (univoco)</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Categoria</Badge>
                  <span className="ml-2">Categoria del prodotto - <em>Opzionale</em></span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Brand</Badge>
                  <span className="ml-2">Marca del prodotto</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Prezzo di acquisto</Badge>
                  <span className="ml-2">Prezzo IVA esclusa</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Prezzo di vendita</Badge>
                  <span className="ml-2">Prezzo IVA compresa - <em>Opzionale</em></span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Collezione</Badge>
                  <span className="ml-2">Stagione (es. FW 2025) - <em>Opzionale</em></span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-blue-700">
                  <strong>Comportamento upload:</strong> Gli SKU già esistenti nel database verranno automaticamente saltati per evitare duplicati.
                </p>
                <p className="text-sm text-green-700">
                  <strong>Prezzo vendita opzionale:</strong> I prodotti senza prezzo di vendita saranno caricati con valore €0,00.
                </p>
                <p className="text-sm text-amber-700">
                  <strong>Righe con errori:</strong> Il sistema caricherà tutti i prodotti validi, saltando solo le righe con dati mancanti o non validi.
                </p>
              </div>
            </div>
          </div>

          <Separator />
          
          {/* Connection Test Section */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <h4 className="font-medium text-blue-900">Test Connessione Server</h4>
              <p className="text-sm text-blue-700">Verifica che il server sia raggiungibile prima dell'upload</p>
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    setResult({ testing: true });
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-49468be0/health`, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                    });
                    setResult({ 
                      connectionTest: true, 
                      success: response.ok, 
                      message: response.ok ? 'Server principale raggiungibile!' : `Errore ${response.status}: Server non raggiungibile`
                    });
                  } catch (error) {
                    setResult({ 
                      connectionTest: true, 
                      success: false, 
                      message: `Errore di connessione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
                    });
                  }
                }}
                disabled={uploading}
              >
                Test Server
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    setResult({ testing: true });
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-49468be0/inventory?page=1&limit=1`, {
                      method: 'GET',
                      headers: { 
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    const data = await response.json();
                    setResult({ 
                      connectionTest: true, 
                      success: response.ok, 
                      message: response.ok ? `Endpoint inventario OK! (${data.pagination?.total || 0} prodotti)` : `Errore ${response.status}: ${data.error || 'Endpoint inventario non raggiungibile'}`
                    });
                  } catch (error) {
                    setResult({ 
                      connectionTest: true, 
                      success: false, 
                      message: `Errore endpoint inventario: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
                    });
                  }
                }}
                disabled={uploading}
              >
                Test Inventario
              </Button>
            </div>
          </div>
          
          {/* Clear Inventory Section */}
          {onClearInventory && (
            <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div>
                <h4 className="font-medium text-destructive">Cancella Inventario Esistente</h4>
                <p className="text-sm text-muted-foreground">
                  Prima di caricare un nuovo inventario, puoi cancellare quello esistente.
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={async () => {
                  if (confirm('Sei sicuro di voler cancellare tutto l\'inventario? Questa azione non può essere annullata.')) {
                    await onClearInventory();
                  }
                }}
              >
                Cancella Tutto
              </Button>
            </div>
          )}

          {/* File Upload Area */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="mb-2">Trascina il file qui o clicca per selezionare</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Formati supportati: CSV, XLSX
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Seleziona File
                </label>
              </Button>
            </div>
          )}

          {/* Selected File Info */}
          {file && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={processFile} disabled={uploading}>
                    {uploading ? 'Processing...' : 'Processa File'}
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Rimuovi
                  </Button>
                </div>
              </div>
              
              {uploading && (
                <div className="space-y-2">
                  {isProcessingFile ? (
                    <>
                      <Progress value={25} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Elaborazione file in corso...
                      </p>
                    </>
                  ) : uploadProgress > 0 ? (
                    <>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Upload in corso: {Math.round(uploadProgress)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <Progress value={75} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Preparazione upload...
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Connection Test Results */}
              {result.connectionTest && (
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className={result.success ? "text-green-700" : "text-red-700"}>
                    {result.message}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Testing Indicator */}
              {result.testing && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-blue-700">
                    Test connessione in corso...
                  </AlertDescription>
                </Alert>
              )}
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              {result.success && result.processedCount && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Upload completato con successo!
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-green-700">{result.processedCount} prodotti caricati nell'inventario.</p>
                    {result.chunks && result.chunks > 1 && (
                      <p className="text-blue-700">Upload processato in {result.chunks} blocchi per ottimizzare le performance.</p>
                    )}
                    {result.skippedDuplicates > 0 && (
                      <p className="text-orange-700">{result.skippedDuplicates} SKU già esistenti sono stati ignorati.</p>
                    )}
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-800">Dettagli processing:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((error: string, index: number) => {
                      const isWarning = error.includes('Prezzo di vendita non specificato') || error.includes('duplicato nel file');
                      const bgColor = isWarning ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                      return (
                        <div key={index} className={`text-sm ${bgColor} p-2 rounded`}>
                          {error}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={resetUpload}>
                  Carica un altro file
                </Button>
                {result.success && (
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Visualizza Inventario
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}