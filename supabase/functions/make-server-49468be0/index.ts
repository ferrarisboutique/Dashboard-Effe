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
app.get("/make-server-49468be0/health", async (c) => {
  try {
    // Simple health check that also tests database connectivity
    await kv.get('health_check_test_key');
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
      error: error.message 
    }, 500);
  }
});

// Mount sales routes
app.route("/make-server-49468be0", salesRoutes);

// Mount inventory routes  
app.route("/make-server-49468be0", inventory);

Deno.serve(app.fetch);
