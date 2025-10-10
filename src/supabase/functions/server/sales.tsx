import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://*.supabase.co'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

interface SaleData {
  id?: string;
  date: string;
  user: string;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  sku: string;
  quantity: number;
  price: number;
  amount: number;
  marketplace?: string;
  brand?: string;
  category?: string;
  productId?: string;
  season?: string;
}

// Get all sales data
app.get('/sales', async (c) => {
  try {
    console.log('🔍 Fetching sales data from KV store...');
    const salesData = await kv.getByPrefix('sale_');
    console.log(`✅ Found ${salesData.length} sales records in database`);
    
    if (salesData.length > 0) {
      console.log('📊 Sample sales record:', salesData[0]);
      
      // Group by channel for debug
      const byChannel = salesData.reduce((acc, sale) => {
        acc[sale.channel] = (acc[sale.channel] || 0) + 1;
        return acc;
      }, {});
      console.log('📈 Sales by channel:', byChannel);
    }
    
    return c.json({ success: true, data: salesData });
  } catch (error) {
    console.error('❌ Error fetching sales:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Save bulk sales data (from upload)
app.post('/sales/bulk', async (c) => {
  try {
    const requestBody = await c.req.json();
    console.log('Raw request body:', JSON.stringify(requestBody));
    
    const { sales } = requestBody;
    
    if (!sales) {
      console.error('No sales data in request body');
      return c.json({ success: false, error: 'No sales data provided' }, 400);
    }
    
    console.log(`Saving ${sales.length} sales records...`);
    
    if (!Array.isArray(sales)) {
      return c.json({ success: false, error: 'Sales data must be an array' }, 400);
    }

    const salesToSave: Record<string, SaleData> = {};
    const timestamp = Date.now();
    
    sales.forEach((sale: SaleData, index: number) => {
      console.log(`Processing sale ${index}:`, sale);
      const saleId = `sale_${timestamp}_${index}`;
      salesToSave[saleId] = {
        ...sale,
        id: saleId,
        // Map the store upload data to our sale format
        channel: sale.channel,
        brand: sale.brand || 'Unknown',
        category: sale.category || 'abbigliamento',
        productId: sale.sku, // Use SKU as productId for now
        season: sale.season || 'autunno_inverno'
      };
    });

    const keys = Object.keys(salesToSave);
    console.log('Saving to KV store with keys:', keys);
    
    await kv.mset(salesToSave);
    console.log(`Successfully saved ${keys.length} sales records`);
    
    return c.json({ 
      success: true, 
      message: `${Object.keys(salesToSave).length} sales records saved`,
      savedCount: Object.keys(salesToSave).length
    });
  } catch (error) {
    console.error('Error saving bulk sales:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Clear all sales data (MUST be before /sales/:id route)
app.delete('/sales/all', async (c) => {
  try {
    console.log('🗑️ Starting sales data clear operation...');
    
    // Get all sales records
    const salesData = await kv.getByPrefix('sale_');
    const saleIds = salesData.map((sale: any) => sale.id);
    
    console.log(`Found ${saleIds.length} sales records to delete`);
    
    if (saleIds.length > 0) {
      // Delete all sales records
      await kv.mdel(saleIds);
      console.log(`✅ Successfully deleted ${saleIds.length} sales records`);
    }
    
    return c.json({ 
      success: true, 
      deletedCount: saleIds.length,
      message: `Deleted ${saleIds.length} sales records`
    });
  } catch (error) {
    console.error('❌ Error clearing sales:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Save single sale
app.post('/sales', async (c) => {
  try {
    const saleData = await c.req.json();
    console.log('Saving single sale:', saleData);
    
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sale: SaleData = {
      ...saleData,
      id: saleId
    };
    
    await kv.set(saleId, sale);
    console.log(`Successfully saved sale: ${saleId}`);
    
    return c.json({ success: true, data: sale });
  } catch (error) {
    console.error('Error saving sale:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete sale by ID
app.delete('/sales/:id', async (c) => {
  try {
    const saleId = c.req.param('id');
    console.log(`Deleting sale: ${saleId}`);
    
    await kv.del(saleId);
    console.log(`Successfully deleted sale: ${saleId}`);
    
    return c.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Diagnostic endpoint - analyze sales data for issues
app.get('/sales/diagnostics', async (c) => {
  try {
    console.log('🔬 Running sales diagnostics...');
    const salesData = await kv.getByPrefix('sale_');
    
    const validChannels = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'];
    
    // Analyze channel distribution
    const channelDistribution: Record<string, number> = {};
    const problematicRecords: any[] = [];
    const nullChannelRecords: any[] = [];
    const undefinedChannelRecords: any[] = [];
    const invalidChannelRecords: any[] = [];
    
    salesData.forEach((sale: any) => {
      const channel = sale.channel;
      
      // Count all channels (including problematic ones)
      const channelKey = channel === null ? 'NULL' : (channel === undefined ? 'UNDEFINED' : channel);
      channelDistribution[channelKey] = (channelDistribution[channelKey] || 0) + 1;
      
      // Identify problematic records
      if (channel === null) {
        nullChannelRecords.push(sale);
        problematicRecords.push({ ...sale, issue: 'NULL channel' });
      } else if (channel === undefined) {
        undefinedChannelRecords.push(sale);
        problematicRecords.push({ ...sale, issue: 'UNDEFINED channel' });
      } else if (!validChannels.includes(channel)) {
        invalidChannelRecords.push(sale);
        problematicRecords.push({ ...sale, issue: `Invalid channel: ${channel}` });
      }
    });
    
    // Calculate statistics
    const totalRecords = salesData.length;
    const validRecords = salesData.filter((s: any) => validChannels.includes(s.channel)).length;
    const problematicCount = problematicRecords.length;
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecords,
        validRecords,
        problematicRecords: problematicCount,
        problematicPercentage: ((problematicCount / totalRecords) * 100).toFixed(2) + '%'
      },
      channelDistribution,
      issues: {
        nullChannels: nullChannelRecords.length,
        undefinedChannels: undefinedChannelRecords.length,
        invalidChannels: invalidChannelRecords.length
      },
      samples: {
        nullChannelSample: nullChannelRecords.slice(0, 3),
        undefinedChannelSample: undefinedChannelRecords.slice(0, 3),
        invalidChannelSample: invalidChannelRecords.slice(0, 3)
      },
      allProblematicRecords: problematicRecords
    };
    
    console.log('📊 Diagnostics complete:', {
      total: totalRecords,
      valid: validRecords,
      problematic: problematicCount
    });
    
    return c.json({ success: true, diagnostics });
  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Auto-suggest channels based on user mapping
app.post('/sales/auto-suggest-channels', async (c) => {
  try {
    console.log('🤖 Running auto-suggest for channels...');
    const salesData = await kv.getByPrefix('sale_');
    
    const validChannels = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'];
    const problematicRecords = salesData.filter((s: any) => !validChannels.includes(s.channel));
    
    // User to channel mapping (same as upload logic)
    const userMapping: Record<string, string> = {
      'carla': 'negozio_donna',
      'alexander': 'negozio_uomo',
      'paolo': 'negozio_uomo'
    };
    
    const suggestions: Array<{
      recordId: string;
      currentChannel: string;
      suggestedChannel: string;
      reason: string;
      user?: string;
    }> = [];
    
    problematicRecords.forEach((record: any) => {
      if (record.user) {
        const userLower = record.user.toLowerCase().trim();
        const suggestedChannel = userMapping[userLower];
        
        if (suggestedChannel) {
          suggestions.push({
            recordId: record.id,
            currentChannel: record.channel,
            suggestedChannel,
            reason: `User "${record.user}" maps to ${suggestedChannel}`,
            user: record.user
          });
        }
      }
    });
    
    console.log(`✅ Generated ${suggestions.length} suggestions from ${problematicRecords.length} problematic records`);
    
    return c.json({ 
      success: true, 
      suggestions,
      totalProblematic: problematicRecords.length,
      canAutoFix: suggestions.length
    });
  } catch (error) {
    console.error('❌ Error generating suggestions:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Fix channel issues - update records with missing/invalid channels
app.post('/sales/fix-channels', async (c) => {
  try {
    const { recordIds, newChannel } = await c.req.json();
    
    if (!recordIds || !Array.isArray(recordIds) || !newChannel) {
      return c.json({ 
        success: false, 
        error: 'Invalid request: recordIds (array) and newChannel required' 
      }, 400);
    }
    
    const validChannels = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'];
    if (!validChannels.includes(newChannel)) {
      return c.json({ 
        success: false, 
        error: `Invalid channel: ${newChannel}. Must be one of: ${validChannels.join(', ')}` 
      }, 400);
    }
    
    console.log(`🔧 Fixing ${recordIds.length} records, setting channel to: ${newChannel}`);
    
    // Get all records that need updating
    const recordsToUpdate: Record<string, any> = {};
    
    for (const recordId of recordIds) {
      const record = await kv.get(recordId);
      if (record) {
        recordsToUpdate[recordId] = {
          ...record,
          channel: newChannel
        };
      }
    }
    
    // Update all records in batch
    if (Object.keys(recordsToUpdate).length > 0) {
      await kv.mset(recordsToUpdate);
      console.log(`✅ Updated ${Object.keys(recordsToUpdate).length} records`);
    }
    
    return c.json({ 
      success: true, 
      updatedCount: Object.keys(recordsToUpdate).length,
      message: `Updated ${Object.keys(recordsToUpdate).length} records to channel: ${newChannel}`
    });
  } catch (error) {
    console.error('❌ Error fixing channels:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;