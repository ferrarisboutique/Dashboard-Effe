import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, ProcessedInventoryData } from '../types/inventory';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

// Test server connectivity with better error handling
const testServerConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000); // Reduced to 8 second timeout
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-49468be0/health`,
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
    
    if (response.ok) {
      console.log('Server connectivity test passed');
      return true;
    } else {
      console.warn(`Server connectivity test failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Server connectivity test timed out');
      } else {
        console.error('Server connection test failed:', error.message);
      }
    } else {
      console.error('Server connection test failed with unknown error:', error);
    }
    return false;
  }
};

export function useInventoryData(autoLoad: boolean = true) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false); // Start with false to avoid immediate loading
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50, // Reasonable default limit to prevent timeouts
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
      
      // Test server connectivity first (but don't fail completely if it fails)
      const isServerReachable = await testServerConnection();
      if (!isServerReachable) {
        console.warn('Health check failed, but attempting to fetch inventory anyway');
        // Don't throw error, just proceed to try the actual request
      }
      
      const searchParams = new URLSearchParams();
      // Always include page and limit for consistent pagination
      searchParams.append('page', (params?.page || 1).toString());
      searchParams.append('limit', (params?.limit || 50).toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.category) searchParams.append('category', params.category);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Inventory fetch request timed out');
        controller.abort();
      }, 25000); // Reduced to 25 second timeout
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-49468be0/inventory?${searchParams}`,
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
      console.error('Error fetching inventory:', error);
      // Don't set error for aborted requests
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
  }, []); // Remove problematic dependencies

  const uploadInventory = useCallback(async (
    inventoryData: ProcessedInventoryData[], 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; result?: any }> => {
    try {
      setLoading(true);
      setError(null);

      // Split large uploads into chunks of 5000 items
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
        
        console.log(`Uploading chunk ${chunkNumber}/${totalChunks} (${chunk.length} items)`);
        
        while (!success && retryCount <= maxRetries) {
          try {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount}/${maxRetries} for chunk ${chunkNumber}`);
              // Wait longer between retries
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn(`Timeout reached for chunk ${chunkNumber} (attempt ${retryCount + 1})`);
              controller.abort();
            }, 25000); // Reduced to 25 second timeout for uploads
            
            console.log(`Making request for chunk ${chunkNumber}/${totalChunks} (attempt ${retryCount + 1})...`);
            
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-49468be0/inventory`,
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
            
            console.log(`Response received for chunk ${chunkNumber}: ${response.status} ${response.statusText}`);
            
            clearTimeout(timeoutId);

            if (!response.ok) {
              let errorText;
              try {
                errorText = await response.text();
              } catch (textError) {
                errorText = `Unable to read error response: ${textError.message}`;
              }
              console.error(`Upload error for chunk ${chunkNumber} (attempt ${retryCount + 1}):`, response.status, errorText);
              throw new Error(`Errore ${response.status}: ${errorText}`);
            }

            try {
              result = await response.json();
              console.log(`Chunk ${chunkNumber} result:`, result);
              success = true;
            } catch (jsonError) {
              console.error(`Error parsing JSON response for chunk ${chunkNumber}:`, jsonError);
              throw new Error(`Errore nel parsing della risposta: ${jsonError.message}`);
            }
            
          } catch (error) {
            retryCount++;
            console.error(`Chunk ${chunkNumber} failed (attempt ${retryCount}):`, error);
            
            if (retryCount > maxRetries) {
              throw new Error(`Chunk ${chunkNumber} failed dopo ${maxRetries} tentativi: ${error.message}`);
            }
          }
        }
        
        allResults.push(result);
        
        processedCount += result.count || 0;
        totalSkippedDuplicates += result.skippedDuplicates || 0;
        
        // Update progress
        const progress = (chunkNumber / totalChunks) * 100;
        onProgress?.(progress);
        
        // Small delay between chunks to avoid overwhelming the server
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Refresh inventory after successful upload
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
      console.error('Error uploading inventory:', error);
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

      console.log('Starting inventory clear operation...');

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Clear inventory request timed out');
        controller.abort();
      }, 25000); // Reduced to 25 seconds to stay under environment limit
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-49468be0/inventory`,
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
      console.log('Clear inventory result:', result);
      
      if (result.success) {
        console.log(`Successfully cleared ${result.deletedCount || 'unknown'} inventory items`);
        // Refresh inventory after successful clear
        await refreshInventory();
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear inventory');
      }
    } catch (error) {
      console.error('Error clearing inventory:', error);
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
        console.warn('Get inventory count request timed out');
        controller.abort();
      }, 20000); // Reduced to 20 second timeout
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-49468be0/inventory/count`,
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
      console.log('Inventory count result:', result);
      
      return result.count || 0;
    } catch (error) {
      console.error('Error getting inventory count:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      refreshInventory();
    }
  }, [autoLoad, refreshInventory]); // refreshInventory is stable via useCallback

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