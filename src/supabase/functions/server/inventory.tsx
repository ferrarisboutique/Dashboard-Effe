import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const inventory = new Hono();

// Custom function to get all inventory items with pagination to bypass 1000 row limit
const getAllInventoryItems = async (): Promise<any[]> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  
  try {
    // First, get total count of inventory items
    const { count, error: countError } = await supabase
      .from("kv_store_49468be0")
      .select("*", { count: 'exact', head: true })
      .like("key", "inventory_%");
    
    if (countError) {
      console.error('Error getting inventory count:', countError);
      throw new Error(countError.message);
    }
    
    console.log(`Found ${count} total inventory records`);
    
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
        
        console.log(`Fetching inventory page ${currentPage + 1}, range ${from}-${to}`);
        
        const { data: pageData, error } = await supabase
          .from("kv_store_49468be0")
          .select("key, value")
          .like("key", "inventory_%")
          .range(from, to);
        
        if (error) {
          console.error(`Error fetching inventory page ${currentPage + 1}:`, error);
          throw new Error(error.message);
        }
        
        if (pageData) {
          allData.push(...pageData.map((d) => ({ key: d.key, value: d.value })));
        }
        
        currentPage++;
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('Safety limit reached: too many pages, stopping pagination');
          break;
        }
      }
      
      console.log(`Retrieved ${allData.length} inventory records in ${currentPage} pages`);
      return allData;
    } else {
      // For smaller datasets, use single query with explicit limit
      const { data, error } = await supabase
        .from("kv_store_49468be0")
        .select("key, value")
        .like("key", "inventory_%")
        .limit(count);
      
      if (error) {
        console.error('Error fetching inventory (single query):', error);
        throw new Error(error.message);
      }
      
      console.log(`Retrieved ${data?.length || 0} inventory records (single query)`);
      return data?.map((d) => ({ key: d.key, value: d.value })) ?? [];
    }
  } catch (error) {
    console.error('Error in getAllInventoryItems:', error);
    throw error;
  }
};

// Get inventory items with pagination and filtering
inventory.get('/inventory', async (c) => {
  const requestStart = Date.now();
  const REQUEST_TIMEOUT = 25000; // 25 second timeout
  
  try {
    const url = new URL(c.req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50'))); // Reduced max limit to 100
    const search = url.searchParams.get('search')?.trim() || '';
    const brand = url.searchParams.get('brand')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    
    console.log(`Getting inventory items - Page: ${page}, Limit: ${limit}, Search: "${search}", Brand: "${brand}", Category: "${category}"`);
    
    // Use custom function to get all inventory items (bypasses 1000 row limit)
    const startTime = Date.now();
    const allInventoryItems = await getAllInventoryItems();
    console.log(`Loaded ${allInventoryItems.length} items in ${Date.now() - startTime}ms`);
    
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
    
    // Process items efficiently
    const processStartTime = Date.now();
    let filteredItems: any[] = [];
    const uniqueBrands = new Set<string>();
    const uniqueCategories = new Set<string>();
    
    // Single pass to collect data and apply filters with timeout protection
    for (let i = 0; i < allInventoryItems.length; i++) {
      // Check timeout every 1000 items
      if (i % 1000 === 0 && Date.now() - requestStart > REQUEST_TIMEOUT) {
        console.warn('Request timeout approaching, stopping processing');
        break;
      }
      
      const item = allInventoryItems[i];
      const inventoryItem = {
        ...item.value,
        key: item.key
      };
      
      // Collect unique values for filters
      uniqueBrands.add(inventoryItem.brand);
      if (inventoryItem.category && inventoryItem.category.trim()) {
        uniqueCategories.add(inventoryItem.category);
      }
      
      // Apply filters
      let matchesFilters = true;
      
      if (search) {
        const searchLower = search.toLowerCase();
        matchesFilters = matchesFilters && (
          inventoryItem.sku.toLowerCase().includes(searchLower) ||
          inventoryItem.brand.toLowerCase().includes(searchLower) ||
          (inventoryItem.category && inventoryItem.category.toLowerCase().includes(searchLower))
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
    
    console.log(`Processed and filtered ${filteredItems.length} items in ${Date.now() - processStartTime}ms`);
    
    // Calculate pagination
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(offset, offset + limit);
    
    console.log(`Returning ${paginatedItems.length} items out of ${total} total (page ${page}/${totalPages})`);
    
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
    console.error('Error getting inventory:', error);
    return c.json(
      { 
        success: false, 
        error: 'Failed to fetch inventory',
        details: error.message 
      }, 
      500
    );
  }
});

// Upload inventory items with chunked processing
inventory.post('/inventory', async (c) => {
  const startTime = Date.now();
  
  try {
    console.log('Inventory upload request received');
    const body = await c.req.json();
    console.log('Request body parsed successfully');
    const { inventory: inventoryData, chunk, totalChunks } = body;
    
    // Test database connectivity
    try {
      console.log('Testing database connectivity...');
      await kv.get('health_check_test_key');
      console.log('Database connectivity test passed');
    } catch (dbError) {
      console.error('Database connectivity test failed:', dbError);
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

    const chunkInfo = chunk && totalChunks ? ` (chunk ${chunk}/${totalChunks})` : '';
    console.log(`Processing ${inventoryData.length} inventory items${chunkInfo}...`);
    
    // Timeout protection - increased for large uploads
    const TIMEOUT_MS = 50000; // 50 seconds for large files (increased from 45)
    const timeoutId = setTimeout(() => {
      console.error('Processing timeout reached');
      throw new Error('Processing timeout - chunk too large or server overload');
    }, TIMEOUT_MS);
    
    try {
      const timestamp = new Date().toISOString();
      
      // Get existing SKUs to avoid duplicates (with timeout protection)
      console.log('Fetching existing inventory items...');
      const existingItems = await getAllInventoryItems();
      console.log(`Found ${existingItems.length} existing inventory items`);
      const existingSKUs = new Set(existingItems.map(item => item.value.sku));
      
      let skippedDuplicates = 0;
      let processedCount = 0;
      
      // Process in smaller batches to avoid memory issues
      const BATCH_SIZE = 500; // Smaller batches for better performance
      const kvData: Record<string, any> = {};
      
      console.log(`Starting to process ${inventoryData.length} items, existing SKUs: ${existingSKUs.size}`);
      
      for (let i = 0; i < inventoryData.length; i++) {
        const item = inventoryData[i];
        
        if (!item.sku || !item.brand) {
          console.warn('Skipping invalid inventory item (missing SKU or brand):', item);
          continue;
        }
        
        // Skip if SKU already exists
        if (existingSKUs.has(item.sku)) {
          skippedDuplicates++;
          continue;
        }
        
        // Add to existing SKUs set to check for duplicates within the same upload
        existingSKUs.add(item.sku);
        
        // Generate unique ID based on SKU and timestamp
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
            console.log(`Storing batch of ${Object.keys(kvData).length} items...`);
            await kv.mset(kvData);
            console.log(`Successfully stored batch of ${Object.keys(kvData).length} items (processed: ${processedCount})`);
            
            // Clear the batch data
            const batchSize = Object.keys(kvData).length;
            Object.keys(kvData).forEach(key => delete kvData[key]);
            console.log(`Cleared batch data (${batchSize} items)`);
          } catch (batchError) {
            console.error(`Error storing batch of ${Object.keys(kvData).length} items:`, batchError);
            console.error('Batch error details:', batchError.message);
            throw new Error(`Failed to store batch of ${Object.keys(kvData).length} items: ${batchError.message}`);
          }
          
          // Check if we're approaching timeout  
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > 42000) { // Increased to 42s (from 35s) for large files
            console.warn(`Approaching timeout at ${elapsedTime}ms, stopping processing`);
            console.warn(`Processed ${processedCount} items before timeout, ${skippedDuplicates} duplicates`);
            break;
          }
        }
      }
      
      // Store remaining items
      if (Object.keys(kvData).length > 0) {
        try {
          await kv.mset(kvData);
          console.log(`Successfully stored final batch of ${Object.keys(kvData).length} items`);
        } catch (finalBatchError) {
          console.error(`Error storing final batch:`, finalBatchError);
          throw new Error(`Failed to store final batch: ${finalBatchError.message}`);
        }
      }
      
      console.log(`Completed processing: ${processedCount} items processed, ${skippedDuplicates} duplicates skipped`);
      
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
      console.log(`Successfully stored ${processedCount} inventory items${chunkInfo} in ${processingTime}ms`);
      
      // Verify data was actually saved by doing a quick count check
      try {
        const verificationItems = await getAllInventoryItems();
        console.log(`Verification: Total inventory items in database: ${verificationItems.length}`);
      } catch (verificationError) {
        console.warn('Could not verify data was saved:', verificationError);
      }
      
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
    console.error(`Error uploading inventory after ${processingTime}ms:`, error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error type:', typeof error);
    
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
    
    console.log(`Deleted inventory item: ${id}`);
    
    return c.json({
      success: true,
      message: `Inventory item ${id} deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting inventory item:', error);
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

// Get inventory count (for debugging)
inventory.get('/inventory/count', async (c) => {
  try {
    console.log('Getting inventory count...');
    
    const allInventoryItems = await getAllInventoryItems();
    const count = allInventoryItems.length;
    
    console.log(`Total inventory items in database: ${count}`);
    
    return c.json({
      success: true,
      count,
      message: `Total inventory items: ${count}`
    });
    
  } catch (error) {
    console.error('Error getting inventory count:', error);
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
    console.log('Clearing all inventory...');
    
    const inventoryItems = await getAllInventoryItems();
    const keys = inventoryItems.map(item => item.key);
    
    if (keys.length > 0) {
      console.log(`Found ${keys.length} inventory items to delete`);
      
      // Delete in batches to avoid URL length limits
      const BATCH_SIZE = 100; // Delete in smaller batches
      let deletedCount = 0;
      
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        console.log(`Deleting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keys.length / BATCH_SIZE)} (${batch.length} items)`);
        
        try {
          await kv.mdel(batch);
          deletedCount += batch.length;
          console.log(`Successfully deleted batch of ${batch.length} items`);
        } catch (batchError) {
          console.error(`Error deleting batch starting at index ${i}:`, batchError);
          // Continue with other batches instead of failing completely
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + BATCH_SIZE < keys.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Deleted ${deletedCount} out of ${keys.length} inventory items`);
      
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
    console.error('Error clearing inventory:', error);
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