// Supabase Edge Function - Native Deno (no Hono)
import { handleSalesRoutes } from './sales.ts';
import { handleInventoryRoutes } from './inventory.ts';

// CORS headers helper
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  };
}

// JSON response helper
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

// Main request handler
Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    let path = url.pathname;
    const method = req.method;

    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Supabase includes the function name in the path: /make-server-49468be0/health
    // We need to remove the function name prefix
    let cleanPath = path;
    
    // Remove function name prefix if present
    if (cleanPath.startsWith('/make-server-49468be0')) {
      cleanPath = cleanPath.replace('/make-server-49468be0', '');
    }
    
    // Handle empty path (root)
    if (!cleanPath || cleanPath === '') {
      cleanPath = '/';
    }
    
    // Ensure it starts with /
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    // Root endpoint
    if (cleanPath === '/' || cleanPath === '') {
      return jsonResponse({
        status: 'ok',
        message: 'Edge Function is running',
        endpoints: {
          health: '/health',
          sales: '/sales',
          inventory: '/inventory',
        },
      });
    }

    // Health check endpoint
    if (cleanPath === '/health' && method === 'GET') {
      const hasUrl = !!Deno.env.get('SUPABASE_URL');
      const hasKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Server is healthy',
        env: {
          hasSupabaseUrl: hasUrl,
          hasServiceRoleKey: hasKey,
        },
      });
    }

    // Route to sales handlers
    if (cleanPath.startsWith('/sales')) {
      return handleSalesRoutes(req, cleanPath, method);
    }

    // Route to inventory handlers
    if (cleanPath.startsWith('/inventory')) {
      return handleInventoryRoutes(req, cleanPath, method);
    }

    // 404 for unknown routes
    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Request error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
