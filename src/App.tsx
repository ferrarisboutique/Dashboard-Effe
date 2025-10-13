import { useState, useEffect, lazy, Suspense } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { StoreDataUpload } from "./components/StoreDataUpload";
import { InventoryDataUpload } from "./components/InventoryDataUpload";
import { DashboardOverview } from "./components/DashboardOverview";
import { StoresSection } from "./components/StoresSection";
import { OnlineSection } from "./components/OnlineSection";
import { InventoryTableSimple } from "./components/InventoryTableSimple";
import { EmptyState } from "./components/EmptyState";
import { ProcessedSaleData } from "./types/upload";
import { ProcessedInventoryData } from "./types/inventory";
import { Return } from "./types/dashboard";
import { useSalesData } from "./hooks/useSalesData";
import { useInventoryData } from "./hooks/useInventoryData";
import { 
  Home, 
  Store, 
  Globe, 
  Package, 
  Settings, 
  BarChart3, 
  Calendar,
  Upload,
  RefreshCw,
  ShoppingCart,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Badge } from "./components/ui/badge";

export default function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [dataLoadAttempted, setDataLoadAttempted] = useState(false);
  
  // Use hooks with autoLoad disabled to prevent immediate loading
  const { 
    sales, 
    loading: salesLoading, 
    error: salesError, 
    uploadSales, 
    refreshSales,
    clearSales
  } = useSalesData(false);
  
  const { 
    inventory, 
    loading: inventoryLoading, 
    error: inventoryError, 
    pagination,
    filters,
    refreshInventory, 
    uploadInventory, 
    clearInventory 
  } = useInventoryData(false);

  // Check for existing data on mount
  useEffect(() => {
    if (dataLoadAttempted) return;
    
    setDataLoadAttempted(true);
    
    const loadData = async () => {
      try {
        await Promise.all([
          refreshSales(),
          refreshInventory()
        ]);
      } catch (error) {
        // Error handling is done in hooks
      }
    };

    loadData();
  }, [dataLoadAttempted, refreshSales, refreshInventory]);

  const sidebarItems = [
    { id: 'overview', label: 'Panoramica', icon: Home },
    { id: 'stores', label: 'Negozi', icon: Store },
    { id: 'online', label: 'Online', icon: Globe },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'data-quality', label: 'Qualità Dati', icon: AlertCircle },
    { id: 'upload', label: 'Carica Vendite', icon: Upload },
    { id: 'upload-inventory', label: 'Carica Inventario', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleDataUploaded = async (data: ProcessedSaleData[]) => {
    try {
      const success = await uploadSales(data);
      if (success) {
        toast.success('Dati di vendita caricati con successo!');
        setActiveSection('overview');
      }
    } catch (error) {
      console.error('Error uploading sales data:', error);
      toast.error('Errore nel caricamento dei dati di vendita');
    }
  };

  const handleInventoryUploaded = async (
    data: ProcessedInventoryData[], 
    onProgress?: (progress: number) => void
  ) => {
    try {
      const result = await uploadInventory(data, onProgress);
      if (result.success) {
        toast.success('Inventario caricato con successo!');
        setActiveSection('inventory');
        return { success: true, message: 'Upload completato' };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading inventory:', error);
      toast.error('Errore nel caricamento dell\'inventario');
      return { success: false, message: 'Errore nell\'upload' };
    }
  };

  const handleRefreshData = async () => {
    try {
      await Promise.all([refreshSales(), refreshInventory()]);
      toast.success('Dati aggiornati!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Errore nell\'aggiornamento dati');
    }
  };

  // Helper to determine if we have data
  const hasSalesData = sales.length > 0;
  const hasInventoryData = inventory.length > 0;
  const hasAnyData = hasSalesData || hasInventoryData;

  // Mock returns data for now (you can implement this later)
  const returns: Return[] = [];

  const renderContent = () => {
    const isLoading = salesLoading || inventoryLoading;
    const hasErrors = salesError || inventoryError;

    switch (activeSection) {
      case 'overview':
        if (!hasAnyData && !isLoading) {
          return (
            <EmptyState
              icon={Home}
              title="Benvenuto nella Fashion Dashboard"
              description="Per iniziare, carica i tuoi dati di vendita e inventario."
              action={
                <div className="flex gap-3">
                  <Button onClick={() => setActiveSection('upload')}>
                    Carica Dati Vendita
                  </Button>
                  <Button variant="outline" onClick={() => setActiveSection('upload-inventory')}>
                    Carica Inventario
                  </Button>
                </div>
              }
            />
          );
        }
        
        // Se abbiamo solo inventario ma non vendite, mostra un messaggio specifico
        if (hasInventoryData && !hasSalesData && !isLoading) {
          return (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="mb-2">Inventario Caricato!</h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Hai caricato {inventory.length} prodotti nell'inventario, ma per vedere la dashboard completa 
                  devi anche caricare i dati di vendita dei tuoi negozi.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setActiveSection('upload')}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Carica Dati Vendita
                  </Button>
                </div>
              </div>
              
              {/* Mostra comunque le statistiche inventario disponibili */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Statistiche Inventario
                </h3>
                <DashboardOverview
                  sales={[]} // Vendite vuote
                  returns={returns}
                  inventory={inventory}
                  dateRange={dateRange}
                />
              </div>
            </div>
          );
        }
        
        return (
          <DashboardOverview
            sales={sales}
            returns={returns}
            inventory={inventory}
            dateRange={dateRange}
          />
        );
      
      case 'stores':
        if (!hasSalesData && !isLoading) {
          return (
            <EmptyState
              icon={Store}
              title="Nessun dato di vendita"
              description="Carica i dati di vendita dei negozi per visualizzare le performance."
              action={
                <Button onClick={() => setActiveSection('upload')}>
                  Carica Dati Vendita
                </Button>
              }
            />
          );
        }
        
        return (
          <StoresSection
            sales={sales.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo')}
            returns={returns}
            inventory={inventory}
            dateRange={dateRange}
          />
        );
      
      case 'online':
        if (!hasSalesData && !isLoading) {
          return (
            <EmptyState
              icon={Globe}
              title="Nessun dato online"
              description="Carica i dati di vendita online per visualizzare le performance."
              action={
                <Button onClick={() => setActiveSection('upload')}>
                  Carica Dati Vendita
                </Button>
              }
            />
          );
        }
        
        return (
          <OnlineSection
            sales={sales.filter(s => s.channel === 'ecommerce' || s.channel === 'marketplace')}
            returns={returns}
            inventory={inventory}
            dateRange={dateRange}
          />
        );
      
      case 'inventory':
        if (!hasInventoryData && !isLoading) {
          return (
            <EmptyState
              icon={Package}
              title="Nessun inventario caricato"
              description="Carica il tuo inventario per visualizzare prodotti, brand e prezzi."
              action={
                <Button onClick={() => setActiveSection('upload-inventory')}>
                  Carica Inventario
                </Button>
              }
            />
          );
        }
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="flex items-center gap-2">
                <Package className="w-6 h-6" />
                Inventario
              </h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveSection('upload-inventory')}
                >
                  Carica Altri Prodotti
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (confirm('Sei sicuro di voler cancellare tutto l\'inventario?')) {
                      const success = await clearInventory();
                      if (success) {
                        toast.success('Inventario cancellato');
                      }
                    }
                  }}
                >
                  Cancella Tutto
                </Button>
              </div>
            </div>
            <InventoryTableSimple 
              inventory={inventory} 
              loading={inventoryLoading}
              pagination={pagination}
              filters={filters}
              onRefresh={refreshInventory}
            />
          </div>
        );
      
      case 'upload':
        return (
          <div className="space-y-6">
            <StoreDataUpload onDataUploaded={handleDataUploaded} />
            {hasSalesData && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestione Dati di Vendita</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Cancella Tutti i Dati di Vendita</p>
                      <p className="text-sm text-muted-foreground">
                        Rimuovi tutti i {sales.length} record di vendita per ricominciare da zero
                      </p>
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={async () => {
                        if (confirm(`Sei sicuro di voler cancellare tutti i ${sales.length} record di vendita? Questa azione non può essere annullata.`)) {
                          const success = await clearSales();
                          if (success) {
                            toast.success('Tutti i dati di vendita sono stati cancellati');
                          }
                        }
                      }}
                    >
                      Cancella Tutto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      case 'upload-inventory':
        return (
          <InventoryDataUpload 
            onDataUploaded={handleInventoryUploaded} 
            onClearInventory={clearInventory} 
          />
        );
      
      case 'analytics':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Analytics Avanzate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Sezione in sviluppo. Qui saranno disponibili analisi dettagliate su:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
                <li>Analisi predittive delle vendite</li>
                <li>Segmentazione clienti</li>
                <li>Performance stagionali</li>
                <li>Analisi ABC dei prodotti</li>
                <li>Ottimizzazione scorte</li>
              </ul>
            </CardContent>
          </Card>
        );
      case 'data-quality':
        {
          const LazyDataQuality = lazy(() => import('./components/DataQualityManager').then(m => ({ default: m.DataQualityManager })));
          return (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Qualità Dati</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Correggi brand/canale mancanti e addestra il sistema.</p>
                  <Suspense fallback={<div>Caricamento...</div>}>
                    <LazyDataQuality />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          );
        }
      
      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Data Status */}
                <div>
                  <h4 className="font-medium mb-4">Stato Dati</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="w-4 h-4" />
                        <span className="font-medium">Dati Vendita</span>
                        {hasSalesData ? (
                          <Badge variant="secondary" className="ml-auto">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {sales.length} record
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Nessun dato
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {hasSalesData 
                          ? `Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}`
                          : 'Carica i dati di vendita per iniziare'
                        }
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">Inventario</span>
                        {hasInventoryData ? (
                          <Badge variant="secondary" className="ml-auto">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {inventory.length} prodotti
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Nessun dato
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {hasInventoryData 
                          ? `Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}`
                          : 'Carica l\'inventario per vedere i prodotti'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="font-medium mb-4">Gestione Dati</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Aggiorna Dati</p>
                        <p className="text-sm text-muted-foreground">
                          Ricarica tutti i dati dal database
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleRefreshData}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Aggiorna
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Carica Nuovi Dati</p>
                        <p className="text-sm text-muted-foreground">
                          Aggiungi vendite e prodotti all'inventario
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveSection('upload')}
                        >
                          Vendite
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveSection('upload-inventory')}
                        >
                          Inventario
                        </Button>
                      </div>
                    </div>
                    
                    {/* Data Deletion Options */}
                    <div className="pt-4 border-t">
                      <h5 className="font-medium mb-3 text-destructive">Cancellazione Dati</h5>
                      <div className="space-y-3">
                        {hasSalesData && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Cancella Dati Vendita</p>
                              <p className="text-sm text-muted-foreground">
                                Rimuovi tutti i {sales.length} record di vendita
                              </p>
                            </div>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Sei sicuro di voler cancellare tutti i ${sales.length} record di vendita? Questa azione non può essere annullata.`)) {
                                  const success = await clearSales();
                                  if (success) {
                                    toast.success('Tutti i dati di vendita sono stati cancellati');
                                  }
                                }
                              }}
                            >
                              Cancella Vendite
                            </Button>
                          </div>
                        )}
                        
                        {hasInventoryData && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Cancella Inventario</p>
                              <p className="text-sm text-muted-foreground">
                                Rimuovi tutti i {inventory.length} prodotti
                              </p>
                            </div>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Sei sicuro di voler cancellare tutto l'inventario con ${inventory.length} prodotti? Questa azione non può essere annullata.`)) {
                                  const success = await clearInventory();
                                  if (success) {
                                    toast.success('Inventario cancellato');
                                  }
                                }
                              }}
                            >
                              Cancella Inventario
                            </Button>
                          </div>
                        )}
                        
                        {hasSalesData && hasInventoryData && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Cancella Tutto</p>
                              <p className="text-sm text-muted-foreground">
                                Rimuovi tutti i dati (vendite e inventario)
                              </p>
                            </div>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm('Sei sicuro di voler cancellare TUTTI i dati (vendite e inventario)? Questa azione non può essere annullata.')) {
                                  const salesSuccess = await clearSales();
                                  const inventorySuccess = await clearInventory();
                                  if (salesSuccess && inventorySuccess) {
                                    toast.success('Tutti i dati sono stati cancellati');
                                  }
                                }
                              }}
                            >
                              Cancella Tutto
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <h4 className="font-medium mb-4">Integrazioni</h4>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Shopify</p>
                        <p className="text-sm text-muted-foreground">
                          Connetti il tuo store Shopify per importare automaticamente prodotti e ordini
                        </p>
                      </div>
                      <Button variant="outline" disabled>
                        In Sviluppo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <EmptyState
            icon={Home}
            title="Fashion Dashboard"
            description="Benvenuto nella tua dashboard per il monitoraggio delle performance di moda."
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <Toaster />
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              <span className="font-semibold">Fashion Dashboard</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4 py-4">
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      onClick={() => handleSectionChange(item.id)}
                      isActive={activeSection === item.id}
                      className="w-full justify-start"
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                      {/* Show data indicators */}
                      {item.id === 'overview' && hasAnyData && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {sales.length + inventory.length}
                        </Badge>
                      )}
                      {item.id === 'stores' && hasSalesData && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {sales.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo').length}
                        </Badge>
                      )}
                      {item.id === 'inventory' && hasInventoryData && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {inventory.length}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <div className="flex items-center gap-4">
                {/* Status indicators */}
                {(salesLoading || inventoryLoading) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Caricamento...
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i dati</SelectItem>
                      <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                      <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                      <SelectItem value="90d">Ultimi 3 mesi</SelectItem>
                      <SelectItem value="1y">Ultimo anno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={salesLoading || inventoryLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${(salesLoading || inventoryLoading) ? 'animate-spin' : ''}`} />
                  Aggiorna
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/50">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}