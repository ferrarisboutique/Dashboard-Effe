import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Eye } from "lucide-react";
import { processUploadedFile } from "../utils/fileParser";
import { UploadResult, ProcessedSaleData, USER_STORE_MAPPING } from "../types/upload";
import { toast } from "sonner@2.0.3";

interface StoreDataUploadProps {
  onDataUploaded: (data: ProcessedSaleData[]) => void;
}

export function StoreDataUpload({ onDataUploaded }: StoreDataUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<ProcessedSaleData[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setPreviewData([]);

    try {
      const result = await processUploadedFile(file);
      setUploadResult(result);
      
      if (result.success && result.data) {
        setPreviewData(result.data.slice(0, 10)); // Show first 10 rows for preview
        toast.success(`File processato con successo! ${result.validRows} righe valide su ${result.totalRows}`);
      } else {
        toast.error(`Errori nel processing del file. ${result.errors?.length || 0} errori trovati.`);
      }
    } catch (error) {
      toast.error('Errore nel caricamento del file');
      setUploadResult({
        success: false,
        errors: ['Errore sconosciuto nel caricamento del file'],
        totalRows: 0,
        validRows: 0
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (uploadResult?.success && uploadResult.data) {
      onDataUploaded(uploadResult.data);
      toast.success('Dati caricati con successo nella dashboard!');
      setUploadResult(null);
      setPreviewData([]);
      // Reset file input by changing key
      setFileInputKey(prev => prev + 1);
    }
  }, [uploadResult, onDataUploaded]);

  const downloadTemplate = useCallback(() => {
    const csvContent = 'Data,Utente,SKU,Quant.,Prezzo\n01/12/24,carla,PROD-001,2,50.00\n01/12/2024,alexander,PROD-002,1,89.99\n02/12/24,paolo,PROD-003,3,25.50\n15/11/24,carla,PROD-004,1,75.00';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_vendite_negozio.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Carica Dati Vendite Negozio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Primo accesso?</strong> Scarica il template CSV per vedere il formato richiesto, poi carica i tuoi dati di vendita per iniziare ad utilizzare la dashboard.
            </p>
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-49468be0/sales`, {
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                      }
                    });
                    const result = await response.json();
                    alert(`Database check: ${result.success ? `Trovati ${result.data.length} record di vendita nel database` : `Errore: ${result.error}`}`);
                  } catch (error) {
                    alert(`Errore connessione: ${error}`);
                  }
                }}
              >
                Verifica Dati Esistenti
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              key={fileInputKey}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-muted-foreground">Processing file...</p>
            </div>
          )}

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato richiesto:</strong> CSV o XLSX con colonne: Data, Utente, SKU, Quant., Prezzo
              <br />
              <strong>Formato Data:</strong> dd/mm/aa o dd/mm/aaaa (es: 15/12/24 o 15/12/2024)
              <br />
              <strong>Utenti validi:</strong> {Object.keys(USER_STORE_MAPPING).join(', ')}
            </AlertDescription>
          </Alert>

          {/* User Mapping Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mapping Utenti-Negozi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(USER_STORE_MAPPING).map(([user, store]) => (
                  <div key={user} className="flex justify-between items-center">
                    <span className="capitalize">{user}</span>
                    <Badge variant="outline">
                      {store === 'negozio_donna' ? 'Negozio Donna' : 'Negozio Uomo'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              Risultato Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Righe Totali</p>
                  <p className="text-xl">{uploadResult.totalRows}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Righe Valide</p>
                  <p className="text-xl text-green-600">{uploadResult.validRows}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Errori</p>
                  <p className="text-xl text-red-600">{uploadResult.errors?.length || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Successo</p>
                  <p className="text-xl">
                    {uploadResult.totalRows > 0 ? 
                      Math.round((uploadResult.validRows / uploadResult.totalRows) * 100) : 0}%
                  </p>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <details>
                      <summary className="cursor-pointer font-medium">
                        {uploadResult.errors.length} errori trovati (clicca per dettagli)
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {uploadResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index} className="text-sm">• {error}</li>
                        ))}
                        {uploadResult.errors.length > 10 && (
                          <li className="text-sm">• ... e altri {uploadResult.errors.length - 10} errori</li>
                        )}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {uploadResult.success && uploadResult.data && (
                <div className="space-y-4">
                  <Tabs defaultValue="preview">
                    <TabsList>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Anteprima Dati
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview">
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Utente</TableHead>
                              <TableHead>Negozio</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Quantità</TableHead>
                              <TableHead>Prezzo</TableHead>
                              <TableHead>Totale</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(row.date).toLocaleDateString('it-IT')}</TableCell>
                                <TableCell className="capitalize">{row.user}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {row.channel === 'negozio_donna' ? 'Donna' : 'Uomo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                                <TableCell>{row.quantity}</TableCell>
                                <TableCell>€{row.price.toFixed(2)}</TableCell>
                                <TableCell>€{row.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {uploadResult.data.length > 10 && (
                          <div className="p-4 text-center text-sm text-muted-foreground border-t">
                            Mostrate le prime 10 righe di {uploadResult.data.length} totali
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setUploadResult(null);
                      setPreviewData([]);
                      setFileInputKey(prev => prev + 1);
                    }}>
                      Annulla
                    </Button>
                    <Button onClick={handleConfirmUpload}>
                      Conferma e Carica Dati
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