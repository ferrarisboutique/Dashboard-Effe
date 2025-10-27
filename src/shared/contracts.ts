import { z } from 'zod';

// Sales schemas
export const SaleSchema = z.object({
  id: z.string(),
  date: z.string(),
  user: z.string().optional(),
  channel: z.enum(['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace']),
  sku: z.string().optional(),
  productId: z.string(),
  quantity: z.number(),
  price: z.number().optional(),
  amount: z.number(),
  brand: z.string(),
  category: z.string(),
  season: z.string(),
  marketplace: z.string().optional(),
  purchasePrice: z.number().optional(),
});

export const ProcessedSaleDataSchema = z.object({
  date: z.string(),
  user: z.string(),
  channel: z.enum(['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace']),
  sku: z.string(),
  quantity: z.number(),
  price: z.number(),
  amount: z.number(),
});

// Inventory schemas
export const InventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  category: z.string(),
  brand: z.string(),
  purchasePrice: z.number(),
  sellPrice: z.number(),
  collection: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const ProcessedInventoryDataSchema = z.object({
  sku: z.string(),
  category: z.string(),
  brand: z.string(),
  purchasePrice: z.number(),
  sellPrice: z.number(),
  collection: z.string(),
});

// API Response schemas
export const SalesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(SaleSchema),
});

export const InventoryResponseSchema = z.object({
  success: z.boolean(),
  inventory: z.array(InventoryItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  filters: z.object({
    brands: z.array(z.string()),
    categories: z.array(z.string()),
  }),
});

export const OrphansResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.object({
    id: z.string(),
    date: z.string(),
    user: z.string().optional(),
    channel: z.string().optional(),
    sku: z.string().optional(),
    amount: z.number(),
    brand: z.string().optional(),
  })),
});

// Type exports
export type Sale = z.infer<typeof SaleSchema>;
export type ProcessedSaleData = z.infer<typeof ProcessedSaleDataSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type ProcessedInventoryData = z.infer<typeof ProcessedInventoryDataSchema>;
export type SalesResponse = z.infer<typeof SalesResponseSchema>;
export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;
export type OrphansResponse = z.infer<typeof OrphansResponseSchema>;

