import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const inventory = new Hono();

// Custom function to get all inventory items with pagination to bypass 1000 row limit
const getAllInventoryItems = async (): Promise<any[]> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  
  try {
    const { count, error: countError } = await supabase
      .from("kv_store_49468be0")
      .select("*", { count: 'exact', head: true })
      .like("key", "inventory_%");
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    if (count === 0) {
      return [];
    }
    
    // If we have more than 1000 records, we need to paginate
    if (count > 1000) {
      const allData: any[] = [];
      const pageSize = 1000;
      let currentPage = 0;
      
      while (currentPage * pageSize < count) {
        const from = currentPage * pageSize;
        const to = from + pageSize - 1;
        
        const { data: pageData, error } = await supabase
          .from("kv_store_49468be0")
          .select("key, value")
          .like("key", "inventory_%")
          .range(from, to);
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (pageData) {
          allData.push(...pageData.map((d) => ({ key: d.key, value: d.value })));
        }
        
        currentPage++;
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          break;
        }
      }
      
      return allData;
    } else {
      // For smaller datasets, use single query with explicit limit
      const { data, error } = await supabase
        .from("kv_store_49468be0")
        .select("key, value")
        .like("key", "inventory_%")
        .limit(count);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data?.map((d) => ({ key: d.key, value: d.value })) ?? [];
    }
  } catch (error) {
    throw error;
  }
};

// Get inventory items with pagination and filtering
inventory.get('/inventory', async (c) => {
  const requestStart = Date.now();
  const REQUEST_TIMEOUT = 25000;
  
  try {
    const url = new URL(c.req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50')));
    const search = url.searchParams.get('search')?.trim() || '';
    const brand = url.searchParams.get('brand')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    
    const allInventoryItems = await getAllInventoryItems();
    
    if (allInventoryItems.length === 0) {
      return c.json({
        success: true,
        inventory: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          brands: [],
          categories: []
        }
      });
    }
    
    let filteredItems: any[] = [];
    const uniqueBrands = new Set<string>();
    const uniqueCategories = new Set<string>();
    
    // Single pass to collect data and apply filters with timeout protection
    for (let i = 0; i < allInventoryItems.length; i++) {
      if (i % 1000 === 0 && Date.now() - requestStart > REQUEST_TIMEOUT) {
        break;
      }
      
      const item = allInventoryItems[i];
      const v = item.value || {};
      const inventoryItem = {
        id: (v.id || item.key?.replace(/^inventory_/, '') || '').toString(),
        sku: (v.sku || '').toString(),
        brand: (v.brand || '').toString(),
        category: (v.category || '').toString(),
        collection: (v.collection || '').toString(),
        purchasePrice: typeof v.purchasePrice === 'number' ? v.purchasePrice : Number(v.purchasePrice || 0),
        sellPrice: typeof v.sellPrice === 'number' ? v.sellPrice : Number(v.sellPrice || 0),
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
      
      uniqueBrands.add(inventoryItem.brand);
      if (inventoryItem.category && inventoryItem.category.trim()) {
        uniqueCategories.add(inventoryItem.category);
      }
      
      // Apply filters
      let matchesFilters = true;
      
      if (search) {
        const searchLower = search.toLowerCase();
        const skuL = (inventoryItem.sku || '').toLowerCase();
        const brandL = (inventoryItem.brand || '').toLowerCase();
        const catL = (inventoryItem.category || '').toLowerCase();
        matchesFilters = matchesFilters && (
          skuL.includes(searchLower) || brandL.includes(searchLower) || catL.includes(searchLower)
        );
      }
      
      if (brand && brand !== 'all') {
        matchesFilters = matchesFilters && inventoryItem.brand === brand;
      }
      
      if (category && category !== 'all') {
        if (category === 'empty') {
          matchesFilters = matchesFilters && (!inventoryItem.category || inventoryItem.category.trim() === '');
        } else {
          matchesFilters = matchesFilters && inventoryItem.category === category;
        }
      }
      
      if (matchesFilters) {
        filteredItems.push(inventoryItem);
      }
    }
    
    // Calculate pagination
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(offset, offset + limit);
    
    return c.json({
      success: true,
      inventory: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        brands: Array.from(uniqueBrands).sort(),
        categories: Array.from(uniqueCategories).sort()
      }
    });
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch inventory',
        details: errorDetails
      },
      500
    );
  }
});

// Upload inventory items with chunked processing
inventory.post('/inventory', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json();
    const { inventory: inventoryData, chunk, totalChunks } = body;
    
    // Test database connectivity
    try {
      await kv.get('health_check_test_key');
    } catch (dbError) {
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
    
    if (!inventoryData || !Array.isArray(inventoryData)) {
      return c.json(
        { 
          success: false, 
          error: 'Invalid inventory data format' 
        }, 
        400
      );
    }
    
    // Timeout protection
    const TIMEOUT_MS = 50000;
    const timeoutId = setTimeout(() => {
      throw new Error('Processing timeout - chunk too large or server overload');
    }, TIMEOUT_MS);
    
    try {
      const timestamp = new Date().toISOString();
      
      const existingItems = await getAllInventoryItems();
      const existingSKUs = new Set(existingItems.map(item => item.value.sku));
      
      let skippedDuplicates = 0;
      let processedCount = 0;
      
      const BATCH_SIZE = 500;
      const kvData: Record<string, any> = {};
      
      for (let i = 0; i < inventoryData.length; i++) {
        const item = inventoryData[i];
        
        if (!item.sku || !item.brand) {
          continue;
        }
        
        if (existingSKUs.has(item.sku)) {
          skippedDuplicates++;
          continue;
        }
        
        existingSKUs.add(item.sku);
        
        const generatedId = `${item.sku}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const key = `inventory_${generatedId}`;
        const inventoryItem = {
          id: generatedId,
          sku: item.sku,
          category: item.category || '',
          brand: item.brand,
          purchasePrice: item.purchasePrice,
          sellPrice: item.sellPrice,
          collection: item.collection || '',
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        kvData[key] = inventoryItem;
        processedCount++;
        
        // Process in batches
        if (Object.keys(kvData).length >= BATCH_SIZE) {
          try {
            await kv.mset(kvData);
            Object.keys(kvData).forEach(key => delete kvData[key]);
          } catch (batchError) {
            throw new Error(`Failed to store batch: ${batchError.message}`);
          }
          
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > 42000) {
            break;
          }
        }
      }
      
      // Store remaining items
      if (Object.keys(kvData).length > 0) {
        try {
          await kv.mset(kvData);
        } catch (finalBatchError) {
          throw new Error(`Failed to store final batch: ${finalBatchError.message}`);
        }
      }
      
      clearTimeout(timeoutId);
      
      if (processedCount === 0) {
        return c.json(
          { 
            success: false, 
            error: 'No valid inventory items to process' 
          }, 
          400
        );
      }
      
      const processingTime = Date.now() - startTime;
      const chunkInfo = chunk && totalChunks ? ` (chunk ${chunk}/${totalChunks})` : '';
      
      let message = `${processedCount} inventory items uploaded successfully${chunkInfo}`;
      if (skippedDuplicates > 0) {
        message += ` (${skippedDuplicates} SKU duplicati ignorati)`;
      }
      
      return c.json({
        success: true,
        message,
        count: processedCount,
        skippedDuplicates,
        chunk,
        totalChunks,
        processingTime
      });
      
    } catch (innerError) {
      clearTimeout(timeoutId);
      throw innerError;
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return c.json(
      { 
        success: false, 
        error: 'Failed to upload inventory',
        details: error.message || 'Unknown error',
        errorType: error.name || 'UnknownError',
        processingTime
      }, 
      500
    );
  }
});

// Delete specific inventory item
inventory.delete('/inventory/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const key = `inventory_${id}`;
    
    await kv.del(key);
    
    return c.json({
      success: true,
      message: `Inventory item ${id} deleted successfully`
    });
    
  } catch (error) {
    return c.json(
      { 
        success: false, 
        error: 'Failed to delete inventory item',
        details: error.message 
      }, 
      500
    );
  }
});

// Get inventory count
inventory.get('/inventory/count', async (c) => {
  try {
    const allInventoryItems = await getAllInventoryItems();
    const count = allInventoryItems.length;
    
    return c.json({
      success: true,
      count,
      message: `Total inventory items: ${count}`
    });
    
  } catch (error) {
    return c.json(
      { 
        success: false, 
        error: 'Failed to get inventory count',
        details: error.message 
      }, 
      500
    );
  }
});

// Clear all inventory
inventory.delete('/inventory', async (c) => {
  try {
    const inventoryItems = await getAllInventoryItems();
    const keys = inventoryItems.map(item => item.key);
    
    if (keys.length > 0) {
      const BATCH_SIZE = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        
        try {
          await kv.mdel(batch);
          deletedCount += batch.length;
        } catch (batchError) {
          // Continue with other batches
        }
        
        if (i + BATCH_SIZE < keys.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return c.json({
        success: true,
        message: `${deletedCount} inventory items deleted successfully`,
        deletedCount,
        totalItems: keys.length
      });
    } else {
      return c.json({
        success: true,
        message: 'No inventory items to delete',
        deletedCount: 0,
        totalItems: 0
      });
    }
    
  } catch (error) {
    return c.json(
      { 
        success: false, 
        error: 'Failed to clear inventory',
        details: error.message 
      }, 
      500
    );
  }
});

export { inventory };
