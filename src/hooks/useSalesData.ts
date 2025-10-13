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
  uploadSales: (salesData: ProcessedSaleData[], onProgress?: (progress: number) => void) => Promise<boolean>;
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

  const uploadSales = useCallback(async (
    salesData: ProcessedSaleData[],
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const convertedSales = salesData.map(convertToSaleFormat);

      // For large datasets, use chunked upload
      const CHUNK_SIZE = 500; // Upload 500 sales at a time
      const totalChunks = Math.ceil(convertedSales.length / CHUNK_SIZE);

      if (totalChunks > 1) {
        toast.info(`Caricamento di ${convertedSales.length} vendite in ${totalChunks} blocchi...`);
      }

      let totalSaved = 0;
      let totalDuplicates = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, convertedSales.length);
        const chunk = convertedSales.slice(start, end);

        // Update progress
        if (onProgress) {
          const progress = ((chunkIndex + 1) / totalChunks) * 100;
          onProgress(Math.min(progress, 99)); // Keep at 99% until final refresh
        }

        const requestBody = { sales: chunk };

        // Add timeout for large uploads (2 minutes per chunk)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
          const response = await fetch(`${API_BASE_URL}/sales/bulk`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${response.status} ${response.statusText}. Details: ${errorText}`);
          }

          const result = await response.json();

          if (result.success) {
            totalSaved += (result.savedCount || chunk.length);
            totalDuplicates += (result.skippedDuplicates || 0);
          } else {
            throw new Error(result.error || `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
          }
        } catch (chunkError) {
          clearTimeout(timeoutId);
          if (chunkError.name === 'AbortError') {
            throw new Error(`Timeout durante l'upload del blocco ${chunkIndex + 1}/${totalChunks}. Il file è troppo grande o la connessione è lenta.`);
          }
          throw chunkError;
        }

        // Show progress toast for multi-chunk uploads
        if (totalChunks > 1 && chunkIndex < totalChunks - 1) {
          toast.info(`Blocco ${chunkIndex + 1}/${totalChunks} completato...`);
        }
      }

      // Final success message
      let message = `${totalSaved} vendite caricate con successo!`;
      if (totalDuplicates > 0) {
        toast.warning(`${message}\n⚠️ ${totalDuplicates} vendite duplicate sono state ignorate.`);
      } else {
        toast.success(message);
      }

      // Refresh sales data
      await fetchSales();

      if (onProgress) {
        onProgress(100);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error(`Errore nel caricamento delle vendite: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/sales/orphans`, { 
          headers: { 'Authorization': `Bearer ${publicAnonKey}` } 
        });
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        }
        
        const result = await resp.json();
        
        if (result.success) {
          return result.data || [];
        } else {
          throw new Error(result.error || 'Failed to fetch orphans');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching orphans';
        setError(errorMsg);
        toast.error('Errore nel caricamento vendite orfane');
        return [];
      } finally {
        setLoading(false);
      }
    },
    bulkUpdateSales: async (updates) => {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/sales/bulk-update`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${publicAnonKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ updates })
        });
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        }
        
        const result = await resp.json();
        
        if (result.success) {
          toast.success(`${result.updated || 0} vendite aggiornate con successo`);
          await fetchSales(); // Reload to get fresh data
          return true;
        } else {
          throw new Error(result.error || 'Failed to update sales');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error updating sales';
        setError(errorMsg);
        toast.error('Errore nell\'aggiornamento vendite');
        return false;
      } finally {
        setLoading(false);
      }
    },
    learnMappings: async (payload) => {
      try {
        const resp = await fetch(`${API_BASE_URL}/sales/learn`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${publicAnonKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(payload)
        });
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        }
        
        const result = await resp.json();
        
        if (result.success) {
          const count = result.learned || 0;
          toast.success(`${count} mapping salvati! Verranno applicati ai prossimi upload.`);
          return true;
        } else {
          throw new Error(result.error || 'Failed to learn mappings');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error learning mappings';
        setError(errorMsg);
        toast.error('Errore nel salvataggio mapping');
        return false;
      }
    },
  };
}
