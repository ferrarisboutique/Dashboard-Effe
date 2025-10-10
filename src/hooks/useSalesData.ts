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
}

// Convert ProcessedSaleData to Sale format
function convertToSaleFormat(processedSale: ProcessedSaleData): Sale {
  return {
    id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: processedSale.date,
    amount: processedSale.amount,
    channel: processedSale.channel,
    brand: 'Unknown', // Will be mapped from inventory later
    category: 'abbigliamento', // Default category
    productId: processedSale.sku,
    quantity: processedSale.quantity,
    season: 'autunno_inverno' // Default season
  };
}

export function useSalesData(autoLoad: boolean = true): UseSalesDataReturn {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(autoLoad); // Start with loading if autoLoad is true
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
        console.log('✅ Raw data from server:', result.data.length, 'records');
        if (result.data.length > 0) {
          console.log('📊 Sample raw record:', result.data[0]);
          
          // Debug channel distribution
          const rawChannelDist = result.data.reduce((acc: any, item: any) => {
            const channel = item.channel || 'NULL/UNDEFINED';
            acc[channel] = (acc[channel] || 0) + 1;
            return acc;
          }, {});
          console.log('📈 Raw channel distribution:', rawChannelDist);
        }
        
        // Convert server data to Sale format
        const salesData = result.data.map((item: any) => {
          const converted = {
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
          };
          
          // Log any problematic conversions
          if (!['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'].includes(converted.channel)) {
            console.warn('⚠️ Problematic channel conversion:', {
              original: item,
              converted: converted
            });
          }
          
          return converted;
        });
        
        console.log('🔄 Converted sales data:', salesData.length, 'records');
        if (salesData.length > 0) {
          const convertedChannelDist = salesData.reduce((acc: any, item: any) => {
            const channel = item.channel || 'NULL/UNDEFINED';
            acc[channel] = (acc[channel] || 0) + 1;
            return acc;
          }, {});
          console.log('📈 Converted channel distribution:', convertedChannelDist);
        }
        
        setSales(salesData);
      } else {
        throw new Error(result.error || 'Failed to fetch sales data');
      }
    } catch (err) {
      console.error('❌ Error fetching sales:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Errore nel caricamento dei dati di vendita');
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps array since it only uses setState

  const uploadSales = useCallback(async (salesData: ProcessedSaleData[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);


      
      // Convert to Sale format
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
        console.error('Server response error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to upload sales: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.savedCount || salesData.length} vendite caricate con successo!`);
        // Refresh the sales data
        await fetchSales();
        return true;
      } else {
        throw new Error(result.error || 'Failed to upload sales data');
      }
    } catch (err) {
      console.error('Error uploading sales:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Errore nel caricamento delle vendite');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSales]); // Add fetchSales as dependency

  const refreshSales = useCallback(async () => {
    await fetchSales();
  }, [fetchSales]); // Add fetchSales as dependency

  const clearSales = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting sales clear operation...');

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Clear sales request timed out');
        controller.abort();
      }, 25000); // 25 second timeout
      
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
      console.log('Clear sales result:', result);
      
      if (result.success) {
        console.log(`Successfully cleared ${result.deletedCount || 'unknown'} sales records`);
        toast.success(`${result.deletedCount || 0} vendite cancellate con successo`);
        // Refresh sales after successful clear
        await fetchSales();
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear sales');
      }
    } catch (error) {
      console.error('Error clearing sales:', error);
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
  }, [fetchSales]); // Add fetchSales as dependency

  useEffect(() => {
    if (autoLoad) {
      fetchSales();
    }
  }, [autoLoad, fetchSales]); // fetchSales is stable via useCallback

  return {
    sales: sales || [],
    loading,
    error,
    uploadSales,
    refreshSales,
    clearSales,
  };
}