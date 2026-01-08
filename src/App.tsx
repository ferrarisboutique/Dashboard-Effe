import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { captureError } from "./utils/sentry";
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
import { DateRangeFilter } from "./components/DateRangeFilter";
import { WarningBar } from "./components/WarningBar";
import { PaymentMethodMapping } from "./components/PaymentMethodMapping";
import { ChannelCostSettings } from "./components/ChannelCostSettings";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { EcommerceDataUpload } from "./components/EcommerceDataUpload";
import { OSSSection } from "./components/OSSSection";
import { OrderSearch } from "./components/OrderSearch";
import { DatabaseManager } from "./components/DatabaseManager";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import { DashboardSkeleton, InventorySkeleton } from "./components/ui/skeleton";
import { LoginPage } from "./components/LoginPage";
import { AdminPanel } from "./components/AdminPanel";
import { ProcessedSaleData, ProcessedEcommerceSaleData, ProcessedReturnData } from "./types/upload";
import { ProcessedInventoryData } from "./types/inventory";
import { Return, ChannelCostSettings as ChannelCostSettingsType } from "./types/dashboard";
import { useSalesData } from "./hooks/useSalesData";
import { useInventoryData } from "./hooks/useInventoryData";
import { useAuth } from "./contexts/AuthContext";
import { usePermissions, ROLE_NAMES } from "./hooks/usePermissions";
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
  CheckCircle,
  CreditCard,
  Search,
  Shield,
  LogOut,
  User,
  Loader2
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Badge } from "./components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { EffeLogo } from "./components/EffeLogo";
import { API_BASE_URL, publicAnonKey as ANON_KEY } from "./utils/supabase/info";

export default function App() {
  // Auth state
  const { user, profile, loading: authLoading, signOut, isAdmin } = useAuth();
  const { filterSidebarItems, canAccess, defaultSection } = usePermissions();
  
  const [activeSection, setActiveSection] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState<string | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<string | undefined>(undefined);
  const [paymentMappings, setPaymentMappings] = useState<Record<string, { macroArea: string; channel: string }>>({});
  const [channelCosts, setChannelCosts] = useState<Record<string, ChannelCostSettingsType>>({});
  const [unmappedPaymentMethods, setUnmappedPaymentMethods] = useState<string[]>([]);
  const [dismissedWarning, setDismissedWarning] = useState(false);
  
  // Use hooks with autoLoad enabled for production
  const { 
    sales, 
    returns,
    loading: salesLoading, 
    error: salesError, 
    uploadSales,
    uploadReturns,
    refreshSales,
    refreshReturns,
    clearSales,
    getDatabaseStats,
    getDuplicates,
    removeDuplicates
  } = useSalesData(!!user);
  
  const { 
    inventory, 
    loading: inventoryLoading, 
    error: inventoryError, 
    pagination,
    filters,
    totalDatabaseCount, // Conteggio totale database (non influenzato dai filtri)
    refreshInventory, 
    uploadInventory, 
    clearInventory 
  } = useInventoryData(!!user);

  // All sidebar items
  const allSidebarItems = [
    { id: 'overview', label: 'Panoramica', icon: Home },
    { id: 'stores', label: 'Negozi', icon: Store },
    { id: 'online', label: 'Online', icon: Globe },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'order-search', label: 'Ricerca Ordini', icon: Search },
    { id: 'data-quality', label: 'Qualità Dati', icon: AlertCircle },
    { id: 'upload', label: 'Carica Vendite', icon: Upload },
    { id: 'upload-ecommerce', label: 'Carica Ecommerce', icon: Upload },
    { id: 'upload-inventory', label: 'Carica Inventario', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'oss', label: 'OSS', icon: BarChart3 },
    { id: 'payment-mapping', label: 'Mapping Pagamenti', icon: CreditCard },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
    { id: 'admin', label: 'Gestione Utenti', icon: Shield },
  ];

  // Filter sidebar items based on user permissions
  const sidebarItems = useMemo(() => {
    return filterSidebarItems(allSidebarItems);
  }, [profile?.role]);

  // Set default section based on role when user logs in
  useEffect(() => {
    if (profile && !canAccess(activeSection)) {
      setActiveSection(defaultSection);
    }
  }, [profile, defaultSection]);

  // Backend now applies payment mappings, but we keep a minimal fallback for ecommerce sales without channel
  const salesWithMappings = useMemo(() => {
    const mapped = sales.map(sale => {
      // Backend applies payment mappings, so we just use the channel from backend
      // Only apply fallback for ecommerce sales without channel (shouldn't happen, but safety net)
      const isEcommerceSale = (sale as any).documento && (sale as any).numero;
      const channel = sale.channel as 'ecommerce' | 'negozio_donna' | 'negozio_uomo' | 'marketplace' | undefined;
      if (isEcommerceSale && (!channel || (channel as string) === 'unknown')) {
        return {
          ...sale,
          channel: 'ecommerce' as const // Fallback default for ecommerce sales
        };
      }
      return sale;
    });
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('Total sales:', sales.length);
      console.log('Sales with mappings:', mapped.length);
      const ecommerceCount = mapped.filter(s => s.channel === 'ecommerce').length;
      const marketplaceCount = mapped.filter(s => s.channel === 'marketplace').length;
      const onlineCount = ecommerceCount + marketplaceCount;
      console.log('Online sales:', onlineCount, '(ecommerce:', ecommerceCount, ', marketplace:', marketplaceCount, ')');
    }
    
    return mapped;
  }, [sales, paymentMappings]);

  // Load payment mappings and channel costs
  useEffect(() => {
    loadPaymentMappings();
    loadChannelCosts();
  }, []);

  // Check for unmapped payment methods
  useEffect(() => {
    if (salesWithMappings.length > 0) {
      const uniqueMethods = new Set<string>();
      salesWithMappings.forEach(sale => {
        if (sale.paymentMethod && !paymentMappings[sale.paymentMethod]) {
          uniqueMethods.add(sale.paymentMethod);
        }
      });
      setUnmappedPaymentMethods(Array.from(uniqueMethods));
    }
  }, [salesWithMappings, paymentMappings]);

  const loadPaymentMappings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/payment-mappings`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.mappings) {
          setPaymentMappings(data.mappings);
        }
      }
    } catch (error) {
      console.error('Error loading payment mappings:', error);
    }
  };

  const loadChannelCosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/channel-costs`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.costs) {
          setChannelCosts(data.costs);
        }
      }
    } catch (error) {
      console.error('Error loading channel costs:', error);
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleDataUploaded = async (data: ProcessedSaleData[]) => {
    try {
      const success = await uploadSales(data);
      if (success) {
        toast.success('Dati di vendita caricati con successo!');
        // Force refresh to get the newly uploaded sales data
        await refreshSales();
        setActiveSection('overview');
      }
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { context: 'handleSalesUploaded' });
      }
      toast.error('Errore nel caricamento dei dati di vendita');
    }
  };

  const handleEcommerceSalesUploaded = async (
    data: ProcessedEcommerceSaleData[],
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    try {
      const success = await uploadSales(data, onProgress);
      if (success) {
        // Force refresh to get the newly uploaded sales data
        await refreshSales();
        // Reload payment mappings to update unmapped methods
        await loadPaymentMappings();
      }
      return success;
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { context: 'handleEcommerceSalesUploaded' });
      }
      toast.error('Errore nel caricamento delle vendite ecommerce');
      return false;
    }
  };

  const handleEcommerceReturnsUploaded = async (
    data: ProcessedReturnData[],
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    try {
      const success = await uploadReturns(data, onProgress);
      if (success) {
        // Force refresh to get the newly uploaded returns data
        await refreshSales();
        await refreshReturns();
      }
      return success;
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { context: 'handleEcommerceReturnsUploaded' });
      }
      toast.error('Errore nel caricamento dei resi ecommerce');
      return false;
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
        // Force refresh to get the newly uploaded inventory data
        await refreshInventory();
        setActiveSection('inventory');
        return { success: true, message: 'Upload completato' };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { context: 'handleInventoryUploaded' });
      }
      toast.error('Errore nel caricamento dell\'inventario');
      return { success: false, message: 'Errore nell\'upload' };
    }
  };

  const handleRefreshData = async () => {
    try {
      await Promise.all([refreshSales(), refreshInventory()]);
      toast.success('Dati aggiornati!');
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { context: 'handleRefreshData' });
      }
      toast.error('Errore nell\'aggiornamento dati');
    }
  };

  // Helper to determine if we have data
  const hasSalesData = salesWithMappings.length > 0;
  // Use totalDatabaseCount to check if inventory exists in database (not affected by search filters)
  const hasInventoryData = (totalDatabaseCount || 0) > 0;
  const hasAnyData = hasSalesData || hasInventoryData;

  // Get total counts (use pagination.total for inventory to get real count)
  const totalInventoryCount = pagination.total || inventory.length;
  const totalSalesCount = salesWithMappings.length;

  const renderContent = () => {
    const isLoading = salesLoading || inventoryLoading;
    const hasErrors = salesError || inventoryError;

    switch (activeSection) {
      case 'overview':
        // Show skeleton during initial loading
        if (isLoading && !hasAnyData) {
          return <DashboardSkeleton />;
        }
        
        if (!hasAnyData && !isLoading) {
          return (
            <EmptyState
              icon={Home}
              title="Benvenuto in EFFE Dashboard"
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
                  Hai caricato {totalInventoryCount} prodotti nell'inventario, ma per vedere la dashboard completa
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
                <SectionErrorBoundary sectionName="Dashboard Overview">
                  <DashboardOverview
                    sales={[]} // Vendite vuote
                    returns={returns}
                    inventory={inventory}
                    dateRange={dateRange}
                    totalInventoryCount={totalInventoryCount}
                  />
                </SectionErrorBoundary>
              </div>
            </div>
          );
        }
        
        return (
          <SectionErrorBoundary sectionName="Dashboard Overview" onReset={handleRefreshData}>
            <DashboardOverview
              sales={salesWithMappings}
              returns={returns}
              inventory={inventory}
              dateRange={dateRange}
              customStart={customStart}
              customEnd={customEnd}
              totalInventoryCount={totalInventoryCount}
            />
          </SectionErrorBoundary>
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
            sales={salesWithMappings.filter(s => s.channel === 'negozio_donna' || s.channel === 'negozio_uomo')}
            returns={returns}
            inventory={inventory}
            dateRange={dateRange}
            customStart={customStart}
            customEnd={customEnd}
          />
        );
      
      case 'online':
        const onlineSales = salesWithMappings.filter(s => s.channel === 'ecommerce' || s.channel === 'marketplace');
        const hasOnlineSales = onlineSales.length > 0;
        
        if (!hasOnlineSales && !isLoading) {
          return (
            <EmptyState
              icon={Globe}
              title="Nessun dato online"
              description="Carica i dati di vendita online per visualizzare le performance."
              action={
                <Button onClick={() => setActiveSection('upload-ecommerce')}>
                  Carica Dati Ecommerce
                </Button>
              }
            />
          );
        }
        
        return (
          <OnlineSection
            sales={onlineSales}
            returns={returns}
            inventory={inventory}
            dateRange={dateRange}
            customStart={customStart}
            customEnd={customEnd}
            unmappedPaymentMethods={unmappedPaymentMethods}
            onNavigateToMapping={() => setActiveSection('payment-mapping')}
            channelCosts={channelCosts}
          />
        );
      
      case 'inventory':
        // Show skeleton during initial loading
        if (inventoryLoading && !hasInventoryData) {
          return <InventorySkeleton />;
        }
        
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
          <SectionErrorBoundary sectionName="Inventario" onReset={refreshInventory}>
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
                error={inventoryError}
                onRefresh={refreshInventory}
              />
            </div>
          </SectionErrorBoundary>
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
          <AnalyticsSection 
            sales={salesWithMappings}
            returns={returns}
            paymentMappings={paymentMappings}
            dateRange={dateRange}
            customStart={customStart}
            customEnd={customEnd}
          />
        );
      
      case 'upload-ecommerce':
        return (
          <EcommerceDataUpload
            onSalesUploaded={handleEcommerceSalesUploaded}
            onReturnsUploaded={handleEcommerceReturnsUploaded}
            paymentMappings={paymentMappings}
          />
        );
      
      case 'order-search':
        return (
          <OrderSearch
            sales={salesWithMappings}
            returns={returns}
            inventory={inventory}
          />
        );
      
      case 'oss':
        return (
          <OSSSection
            sales={salesWithMappings}
            returns={returns}
          />
        );
      
      case 'payment-mapping':
        return (
          <div className="space-y-6">
            <PaymentMethodMapping 
              sales={salesWithMappings}
              onMappingChange={async () => {
                await loadPaymentMappings();
                await refreshSales(); // Refresh sales to apply new mappings
              }}
            />
            <ChannelCostSettings 
              paymentMappings={paymentMappings}
              onCostsChange={async () => {
                // Reload channel costs and refresh sales to recalculate margins
                await loadChannelCosts();
                await refreshSales();
              }}
            />
          </div>
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
      
      case 'admin':
        return (
          <SectionErrorBoundary sectionName="Admin Panel">
            <AdminPanel />
          </SectionErrorBoundary>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <DatabaseManager
              getDatabaseStats={getDatabaseStats}
              getDuplicates={getDuplicates}
              removeDuplicates={removeDuplicates}
              refreshSales={refreshSales}
            />
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
                            {totalInventoryCount} prodotti
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
                                Rimuovi tutti i {totalInventoryCount} prodotti
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Sei sicuro di voler cancellare tutto l'inventario con ${totalInventoryCount} prodotti? Questa azione non può essere annullata.`)) {
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
          </div>
        );
      
      default:
        return (
          <EmptyState
            icon={Home}
            title="EFFE Dashboard"
            description="Benvenuto nella tua dashboard per il monitoraggio delle performance di moda."
          />
        );
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !profile) {
    return (
      <>
        <Toaster />
        <LoginPage />
      </>
    );
  }

  return (
    <SidebarProvider>
      <Toaster />
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <EffeLogo className="w-8 h-8" />
              <span className="font-semibold text-lg">EFFE Dashboard</span>
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
                
                <DateRangeFilter
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  customStart={customStart}
                  customEnd={customEnd}
                  onCustomStartChange={setCustomStart}
                  onCustomEndChange={setCustomEnd}
                />
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={salesLoading || inventoryLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${(salesLoading || inventoryLoading) ? 'animate-spin' : ''}`} />
                  Aggiorna
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="hidden md:inline-block max-w-[120px] truncate">
                        {profile?.display_name || profile?.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.display_name || 'Utente'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Badge variant="outline" className="mr-2">
                        {profile?.role && ROLE_NAMES[profile.role]}
                      </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => signOut()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Esci
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/50">
            <div className="mx-auto max-w-7xl">
              {/* Warning Bar for unmapped payment methods */}
              {unmappedPaymentMethods.length > 0 && !dismissedWarning && (
                <WarningBar
                  message={`Ci sono ${unmappedPaymentMethods.length} metodo${unmappedPaymentMethods.length > 1 ? 'i' : ''} di pagamento non mappato${unmappedPaymentMethods.length > 1 ? 'i' : ''}. Configura il mapping nella sezione "Mapping Pagamenti".`}
                  count={unmappedPaymentMethods.length}
                  onDismiss={() => setDismissedWarning(true)}
                />
              )}
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}