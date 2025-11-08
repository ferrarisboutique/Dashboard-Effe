import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Eye, ShoppingCart, RotateCcw, X } from "lucide-react";
import { parseEcommerceFile } from "../utils/ecommerceParser";
import { EcommerceUploadResult, ProcessedEcommerceSaleData, ProcessedReturnData, DuplicateInfo } from "../types/upload";
import { toast } from "sonner";

interface EcommerceDataUploadProps {
  onSalesUploaded: (data: ProcessedEcommerceSaleData[], onProgress?: (progress: number) => void) => Promise<boolean>;
  onReturnsUploaded: (data: ProcessedReturnData[], onProgress?: (progress: number) => void) => Promise<boolean>;
  paymentMappings?: Record<string, { macroArea: string; channel: string }>;
}

export function EcommerceDataUpload({ onSalesUploaded, onReturnsUploaded, paymentMappings }: EcommerceDataUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<EcommerceUploadResult | null>(null);
  const [previewSales, setPreviewSales] = useState<ProcessedEcommerceSaleData[]>([]);
  const [previewReturns, setPreviewReturns] = useState<ProcessedReturnData[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setPreviewSales([]);
    setPreviewReturns([]);
    setUploadProgress(0);

    try {
      const result = await parseEcommerceFile(file, paymentMappings);
      setUploadResult(result);
      
      if (result.success) {
        setPreviewSales(result.sales?.slice(0, 10) || []);
        setPreviewReturns(result.returns?.slice(0, 10) || []);
        toast.success(
          `File processato: ${result.validSalesRows} vendite, ${result.validReturnsRows} resi. ${result.skippedDuplicates} duplicati ignorati.`
        );
      } else {
        toast.error(`Errori nel processing: ${result.errors?.length || 0} errori trovati.`);
      }
    } catch (error) {
      toast.error('Errore nel caricamento del file');
      setUploadResult({
        success: false,
        errors: ['Errore sconosciuto nel caricamento del file'],
        totalRows: 0,
        validSalesRows: 0,
        validReturnsRows: 0,
        skippedDuplicates: 0
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [paymentMappings]);

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadResult?.success) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      let salesSuccess = true;
      let returnsSuccess = true;

      // Upload sales
      if (uploadResult.sales && uploadResult.sales.length > 0) {
        salesSuccess = await onSalesUploaded(
          uploadResult.sales,
          (progress) => setUploadProgress(progress * 0.5) // Sales take first 50%
        );
      }

      // Upload returns
      if (uploadResult.returns && uploadResult.returns.length > 0) {
        returnsSuccess = await onReturnsUploaded(
          uploadResult.returns,
          (progress) => setUploadProgress(50 + progress * 0.5) // Returns take last 50%
        );
      }

      if (salesSuccess && returnsSuccess) {
        toast.success('Dati ecommerce caricati con successo!');
        setUploadResult(null);
        setPreviewSales([]);
        setPreviewReturns([]);
        setFileInputKey(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Errore durante il caricamento dei dati');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [uploadResult, onSalesUploaded, onReturnsUploaded]);

  const totalSales = uploadResult?.sales?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const totalReturns = uploadResult?.returns?.reduce((sum, r) => sum + Math.abs(r.amount), 0) || 0;
  const netAmount = totalSales - totalReturns;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Carica Dati Ecommerce (Vendite e Resi)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Formato file:</strong> CSV o XLSX con colonne: Documento, Numero, Data, Nazione, Area, Metodo paga, Spese traspc, Qty, Prezzo articc, SKU, etc.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Il sistema identificherà automaticamente vendite (FATTURA ACC, RICEVUTA) e resi (RESO, NOTA CRED).
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={uploading}
              key={fileInputKey}
              className="flex-1"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress < 50 ? 'Elaborazione file...' : uploadProgress < 100 ? 'Caricamento dati...' : 'Completato!'}
              </p>
            </div>
          )}

          {uploadResult && (
            <div className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Vendite</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.validSalesRows}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      €{totalSales.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium">Resi</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.validReturnsRows}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      €{totalReturns.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Netto</span>
                    </div>
                    <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{netAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vendite - Resi
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium">Duplicati</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {uploadResult.skippedDuplicates}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Righe ignorate
                    </div>
                    {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => setDuplicatesDialogOpen(true)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Visualizza duplicati
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="max-h-40 overflow-y-auto">
                      <p className="font-medium mb-2">Errori trovati ({uploadResult.errors.length}):</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {uploadResult.errors.slice(0, 10).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {uploadResult.errors.length > 10 && (
                          <li className="text-muted-foreground">... e altri {uploadResult.errors.length - 10} errori</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {uploadResult.success && (
                <Tabs defaultValue="sales" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="sales" className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Vendite ({uploadResult.validSalesRows})
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Resi ({uploadResult.validReturnsRows})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales" className="space-y-4">
                    {previewSales.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Paese</TableHead>
                              <TableHead>Area</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Prezzo</TableHead>
                              <TableHead>Importo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewSales.map((sale, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{new Date(sale.date).toLocaleDateString('it-IT')}</TableCell>
                                <TableCell>{sale.sku}</TableCell>
                                <TableCell>{sale.country || '-'}</TableCell>
                                <TableCell>{sale.area || '-'}</TableCell>
                                <TableCell>{sale.quantity}</TableCell>
                                <TableCell>€{sale.price.toFixed(2)}</TableCell>
                                <TableCell className="font-medium">€{sale.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {uploadResult.validSalesRows > 10 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Mostrate prime 10 righe su {uploadResult.validSalesRows}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">Nessuna vendita trovata</p>
                    )}
                  </TabsContent>

                  <TabsContent value="returns" className="space-y-4">
                    {previewReturns.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Paese</TableHead>
                              <TableHead>Area</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Prezzo</TableHead>
                              <TableHead>Importo</TableHead>
                              <TableHead>Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewReturns.map((ret, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{new Date(ret.date).toLocaleDateString('it-IT')}</TableCell>
                                <TableCell>{ret.sku || '-'}</TableCell>
                                <TableCell>{ret.country || '-'}</TableCell>
                                <TableCell>{ret.area || '-'}</TableCell>
                                <TableCell>{ret.quantity}</TableCell>
                                <TableCell>€{Math.abs(ret.price).toFixed(2)}</TableCell>
                                <TableCell className="font-medium text-red-600">€{ret.amount.toFixed(2)}</TableCell>
                                <TableCell>{ret.reason || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {uploadResult.validReturnsRows > 10 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Mostrate prime 10 righe su {uploadResult.validReturnsRows}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">Nessun reso trovato</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              {/* Confirm Button */}
              {uploadResult.success && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadResult(null);
                      setPreviewSales([]);
                      setPreviewReturns([]);
                      setFileInputKey(prev => prev + 1);
                    }}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleConfirmUpload}
                    disabled={uploading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Conferma e Carica
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for duplicates - rendered outside Card to ensure portal works */}
      {uploadResult?.duplicates && uploadResult.duplicates.length > 0 && (
        <Dialog 
          open={duplicatesDialogOpen} 
          onOpenChange={setDuplicatesDialogOpen}
        >
          <DialogContent 
            className="max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <DialogHeader>
              <DialogTitle>Righe Duplicate ({uploadResult.duplicates.length})</DialogTitle>
              <DialogDescription>
                Elenco delle righe duplicate rilevate durante l'elaborazione del file.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Riga</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Prezzo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResult.duplicates.map((dup, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{dup.rowNumber}</TableCell>
                      <TableCell>
                        <Badge variant={dup.reason === 'sale' ? 'default' : 'destructive'}>
                          {dup.reason === 'sale' ? 'Vendita' : 'Reso'}
                        </Badge>
                      </TableCell>
                      <TableCell>{dup.documento}</TableCell>
                      <TableCell>{dup.numero}</TableCell>
                      <TableCell>{new Date(dup.date).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{dup.sku}</TableCell>
                      <TableCell>{dup.quantity}</TableCell>
                      <TableCell>€{dup.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

