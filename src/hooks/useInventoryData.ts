import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, ProcessedInventoryData } from '../types/inventory';
import { API_BASE_URL, publicAnonKey } from '../utils/supabase/info';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterInfo {
  brands: string[];
  categories: string[];
}

const testServerConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000);
    
    const response = await fetch(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    return false;
  }
};

export function useInventoryData(autoLoad: boolean = true) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<FilterInfo>({
    brands: [],
    categories: []
  });

  const refreshInventory = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    brand?: string;
    category?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      await testServerConnection();
      
      const searchParams = new URLSearchParams();
      searchParams.append('page', (params?.page || 1).toString());
      searchParams.append('limit', (params?.limit || 50).toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.category) searchParams.append('category', params.category);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000);
      
      const response = await fetch(
        `${API_BASE_URL}/inventory?${searchParams}`,
        {
          method: 'GET',
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

      const data = await response.json();
      setInventory(data.inventory || []);
      if (data.pagination) setPagination(data.pagination);
      if (data.filters) setFilters(data.filters);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Richiesta interrotta - il server potrebbe essere sovraccarico, riprova tra qualche momento');
        } else if (error.message.includes('Failed to fetch')) {
          setError('Errore di connessione - verifica la connessione internet e riprova');
        } else {
          setError(error.message);
        }
      } else {
        setError('Errore sconosciuto nel caricamento dell\'inventario');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadInventory = useCallback(async (
    inventoryData: ProcessedInventoryData[], 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; result?: any }> => {
    try {
      setLoading(true);
      setError(null);

      const CHUNK_SIZE = 5000;
      const chunks = [];
      for (let i = 0; i < inventoryData.length; i += CHUNK_SIZE) {
        chunks.push(inventoryData.slice(i, i + CHUNK_SIZE));
      }

      const totalChunks = chunks.length;
      let processedCount = 0;
      let totalSkippedDuplicates = 0;
      let allResults = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        let result;
        
        while (!success && retryCount <= maxRetries) {
          try {
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
            }, 25000);
            
            const response = await fetch(
              `${API_BASE_URL}/inventory`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  inventory: chunk,
                  chunk: chunkNumber,
                  totalChunks
                }),
                signal: controller.signal,
              }
            );
            
            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Errore ${response.status}: ${errorText}`);
            }

            result = await response.json();
            success = true;
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            retryCount++;

            if (retryCount > maxRetries) {
              throw new Error(`Chunk ${chunkNumber} failed dopo ${maxRetries} tentativi: ${errorMessage}`);
            }
          }
        }
        
        allResults.push(result);
        
        processedCount += result.count || 0;
        totalSkippedDuplicates += result.skippedDuplicates || 0;
        
        const progress = (chunkNumber / totalChunks) * 100;
        onProgress?.(progress);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      await refreshInventory();
      
      const finalResult = {
        success: true,
        count: processedCount,
        skippedDuplicates: totalSkippedDuplicates,
        chunks: totalChunks,
        message: `${processedCount} inventory items uploaded successfully in ${totalChunks} chunks`
      };
      
      return { success: true, result: finalResult };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore nell\'upload');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [refreshInventory]);

  const clearInventory = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000);
      
      const response = await fetch(
        `${API_BASE_URL}/inventory`,
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
        await refreshInventory();
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear inventory');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Operazione di cancellazione interrotta - il processo potrebbe richiedere più tempo. Riprova tra qualche momento.');
        } else if (error.message.includes('Failed to fetch')) {
          setError('Errore di connessione durante la cancellazione - verifica la connessione internet e riprova');
        } else {
          setError(error.message);
        }
      } else {
        setError('Errore sconosciuto nella cancellazione dell\'inventario');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshInventory]);

  const getInventoryCount = useCallback(async (): Promise<number | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000);
      
      const response = await fetch(
        `${API_BASE_URL}/inventory/count`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Errore ${response.status}`);
      }

      const result = await response.json();
      
      return result.count || 0;
    } catch (error) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      refreshInventory();
    }
  }, [autoLoad, refreshInventory]);

  return {
    inventory,
    loading,
    error,
    pagination,
    filters,
    uploadInventory,
    refreshInventory,
    clearInventory,
    getInventoryCount
  };
}
