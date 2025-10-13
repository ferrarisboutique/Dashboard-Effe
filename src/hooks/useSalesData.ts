import { useState, useEffect, useCallback } from 'react';
import { Sale } from '../types/dashboard';
import { ProcessedSaleData } from '../types/upload';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-49468be0`;

export interface UseSalesDataReturn {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  uploadSales: (salesData: ProcessedSaleData[]) => Promise<boolean>;
  refreshSales: () => Promise<void>;
  clearSales: () => Promise<boolean>;
  fetchOrphans: () => Promise<any[]>;
  bulkUpdateSales: (updates: Array<{ id: string; brand?: string; channel?: string }>) => Promise<boolean>;
  learnMappings: (payload: { brandMappings?: Array<{ sku: string; brand: string }>; channelMappings?: Array<{ user: string; channel: string }> }) => Promise<boolean>;
}

// Convert ProcessedSaleData to Sale format
function convertToSaleFormat(processedSale: ProcessedSaleData): Sale {
  return {
    id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: processedSale.date,
    user: processedSale.user,
    channel: processedSale.channel,
    sku: processedSale.sku,
    productId: processedSale.sku,
    quantity: processedSale.quantity,
    price: processedSale.price,
    amount: processedSale.amount,
    brand: 'Unknown',
    category: 'abbigliamento',
    season: 'autunno_inverno'
  };
}

export function useSalesData(autoLoad: boolean = true): UseSalesDataReturn {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/sales`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const salesData = result.data.map((item: any) => ({
          id: item.id || `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: item.date,
          amount: item.amount,
          channel: item.channel,
          brand: item.brand || 'Unknown',
          category: item.category || 'abbigliamento',
          productId: item.productId || item.sku,
          quantity: item.quantity,
          season: item.season || 'autunno_inverno',
          marketplace: item.marketplace
        }));
        
        setSales(salesData);
      } else {
        throw new Error(result.error || 'Failed to fetch sales data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Errore nel caricamento dei dati di vendita');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadSales = useCallback(async (salesData: ProcessedSaleData[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const convertedSales = salesData.map(convertToSaleFormat);
      const requestBody = { sales: convertedSales };
      
      const response = await fetch(`${API_BASE_URL}/sales/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload sales: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        let message = `${result.savedCount || salesData.length} vendite caricate con successo!`;
        if (result.skippedDuplicates && result.skippedDuplicates > 0) {
          toast.warning(`${message}\n⚠️ ${result.skippedDuplicates} vendite duplicate sono state ignorate.`);
        } else {
          toast.success(message);
        }
        await fetchSales();
        return true;
      } else {
        throw new Error(result.error || 'Failed to upload sales data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Errore nel caricamento delle vendite');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSales]);

  const refreshSales = useCallback(async () => {
    await fetchSales();
  }, [fetchSales]);

  const clearSales = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000);
      
      const response = await fetch(
        `${API_BASE_URL}/sales/all`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.deletedCount || 0} vendite cancellate con successo`);
        await fetchSales();
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear sales');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Operazione di cancellazione interrotta - il processo potrebbe richiedere più tempo. Riprova tra qualche momento.');
          toast.error('Cancellazione interrotta - riprova');
        } else if (error.message.includes('Failed to fetch')) {
          setError('Errore di connessione durante la cancellazione - verifica la connessione internet e riprova');
          toast.error('Errore di connessione');
        } else {
          setError(error.message);
          toast.error('Errore nella cancellazione delle vendite');
        }
      } else {
        setError('Errore sconosciuto nella cancellazione delle vendite');
        toast.error('Errore sconosciuto');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSales]);

  useEffect(() => {
    if (autoLoad) {
      fetchSales();
    }
  }, [autoLoad, fetchSales]);

  return {
    sales: sales || [],
    loading,
    error,
    uploadSales,
    refreshSales,
    clearSales,
    fetchOrphans: async () => {
      const resp = await fetch(`${API_BASE_URL}/sales/orphans`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } });
      const r = await resp.json();
      return r.data || [];
    },
    bulkUpdateSales: async (updates) => {
      const resp = await fetch(`${API_BASE_URL}/sales/bulk-update`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const r = await resp.json();
      if (r.success) { await fetchSales(); return true; }
      return false;
    },
    learnMappings: async (payload) => {
      const resp = await fetch(`${API_BASE_URL}/sales/learn`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const r = await resp.json();
      return !!r.success;
    },
  };
}
