import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import salesRoutes from "./sales.ts";
import { inventory } from "./inventory.ts";

const app = new Hono();

// Disable logger to prevent timeout
// app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
// Note: Supabase automatically adds /functions/v1/make-server-49468be0 prefix
app.get("/health", async (c) => {
  try {
    // Simple health check - test database connectivity
    // Note: kv.get() might fail if key doesn't exist, which is OK for health check
    try {
      await kv.get('health_check_test_key');
    } catch {
      // Key doesn't exist is fine - just testing connectivity
    }
    return c.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      message: "Server and database are healthy" 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({ 
      status: "error", 
      timestamp: new Date().toISOString(),
      message: "Database connectivity issue",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Mount sales routes
// Note: Routes are mounted at root since Supabase adds the function name prefix
app.route("/", salesRoutes);

// Mount inventory routes  
app.route("/", inventory);

Deno.serve(app.fetch);
