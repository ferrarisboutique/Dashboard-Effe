# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fashion Performance Dashboard - A React-based dashboard for monitoring sales and inventory across physical stores (women's/men's) and online channels (e-commerce/marketplace). Built with Vite, TypeScript, Supabase Edge Functions, and deployed to Supabase.

## Development Commands

### Running the Application
```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Build for production (outputs to build/)
npm run preview    # Preview production build locally
```

### Testing
```bash
npm test           # Run tests in watch mode
npm run test:run   # Run tests once (CI mode)
npm run test:ui    # Run tests with UI
```

### Linting
```bash
npm run lint       # Run ESLint on TypeScript files
```

## Architecture

### Frontend Architecture

**Entry Point**: `src/App.tsx` is the main component that orchestrates the entire application with a sidebar navigation and section-based routing.

**State Management**: Custom React hooks (`useSalesData`, `useInventoryData`) manage all data fetching, caching, and mutations. Both hooks support auto-loading and expose methods for CRUD operations.

**Data Flow**:
1. Excel/CSV files are uploaded via `StoreDataUpload` or `InventoryDataUpload` components
2. Files are parsed client-side using `src/utils/fileParser.ts` (supports European number formats with comma decimals)
3. Parsed data is validated and transformed into `ProcessedSaleData` or `ProcessedInventoryData`
4. Data is sent to Supabase Edge Functions via POST requests
5. Edge Functions use a KV store pattern for data persistence
6. Hooks refresh data automatically after mutations

**User-to-Channel Mapping**: Sales uploads map users to channels via `USER_STORE_MAPPING` in `src/types/upload.ts`:
- Physical stores: `carla` → negozio_donna, `alexander`/`paolo` → negozio_uomo
- E-commerce: `admin`/`online`/`shop`/`ecommerce` → ecommerce
- Marketplace: `amazon`/`zalando`/`farfetch`/`ebay`/`marketplace` → marketplace

### Backend Architecture (Supabase Edge Functions)

**Location**: `supabase/functions/make-server-49468be0/`

**Framework**: Hono (lightweight web framework) running on Deno runtime

**Key Files**:
- `index.ts` - Main server setup with CORS, health check, and route mounting
- `sales.ts` - Sales CRUD operations, duplicate detection, bulk upload with chunking
- `inventory.ts` - Inventory CRUD operations with server-side pagination and filtering
- `kv_store.ts` - KV store abstraction over Supabase database table `kv_store_49468be0`

**Data Storage Pattern**:
- Uses `kv_store_49468be0` table as a key-value store
- Sales stored with keys like `sale_{timestamp}_{index}`
- Inventory items stored with keys like `inventory_{sku}`
- Learned mappings stored as `mapping_brand_{SKU}` and `mapping_channel_{user}`

**Pagination Strategy**: Edge functions handle large datasets (>1000 rows) by paginating in chunks of 1000 to bypass Supabase's row limit. This is critical for both reading and writing operations.

**Duplicate Detection**: Sales uploads check for duplicates using signature: `${date}_${sku}_${quantity}_${amount}`. Duplicates are skipped and reported to the user.

**Data Quality Features**:
- Orphan detection: Identifies sales with missing/unknown brand or invalid channel
- Bulk update: Allows correcting brand/channel for multiple sales at once
- Learning system: Saves corrections as mappings (`/sales/learn`) that auto-apply to future uploads

### Type Safety

**Shared Contracts**: `src/shared/contracts.ts` defines Zod schemas and TypeScript types used across frontend and backend:
- `SaleSchema`, `ProcessedSaleDataSchema`
- `InventoryItemSchema`, `ProcessedInventoryDataSchema`
- Response schemas for API validation

**Type Definitions**:
- `src/types/dashboard.ts` - Core domain types (Sale, Return)
- `src/types/upload.ts` - Upload-related types and user mappings
- `src/types/inventory.ts` - Inventory types and pagination info

### UI Components

**Shadcn/ui**: The project uses Shadcn/ui components (all in `src/components/ui/`) built on Radix UI primitives. These are already installed - do not add new UI component libraries.

**Main Components**:
- `DashboardOverview` - Top-level KPIs and charts (sales, inventory, margins)
- `StoresSection` / `OnlineSection` - Channel-specific analytics
- `InventoryTableSimple` - Server-paginated table with search/filter
- `StoreDataUpload` / `InventoryDataUpload` - File upload with validation
- `DataQualityManager` - Lazy-loaded component for correcting orphan data

**Charts**: Uses Recharts for all data visualizations.

### File Parsing

**European Number Support**: The `parseEuroNumber` function in `fileParser.ts` correctly handles:
- European format: `1.234,56` (dot as thousands, comma as decimal)
- US format: `1,234.56` (comma as thousands, dot as decimal)
- Currency symbols: `€ 123,45`

**Date Parsing**: Accepts multiple formats:
- `dd/mm/yy` or `dd/mm/yyyy` (e.g., 15/12/24)
- `dd/mm/yyyy hh:mm:ss` (e.g., 30/09/2025 18:44:41)
- Excel serial dates (automatically converted)

Date values are stored as ISO 8601 strings to preserve time information for uniqueness.

## Important Patterns

### Adding New Endpoints

When adding new Edge Function endpoints:
1. Define route in appropriate module (`sales.ts` or `inventory.ts`)
2. Use Hono's context `c` for request/response handling
3. Always wrap in try-catch and return JSON with `{ success: boolean, ... }`
4. For large datasets, implement pagination (see `getAllSalesItems()` pattern)
5. Add corresponding hook method in `useSalesData` or `useInventoryData`

### Modifying Data Schemas

If changing data structure:
1. Update Zod schemas in `src/shared/contracts.ts`
2. Update TypeScript types in `src/types/`
3. Update Edge Function interfaces (e.g., `SaleData` in `sales.ts`)
4. Consider backward compatibility for existing KV store data

### Testing

Tests are configured with:
- Vitest for test runner
- jsdom for DOM environment
- Setup file: `src/test/setup.ts`
- Example tests in `src/utils/__tests__/`

When writing tests, import test utilities from `@testing-library/react` and place tests in `__tests__` directories next to the code being tested.

## Configuration

**Vite Config**: `vite.config.ts` includes path aliases (`@/` maps to `./src/`) and extensive package aliases for dependency resolution.

**Environment**: Supabase connection info is in `src/utils/supabase/info.tsx` (projectId and publicAnonKey).

**Build Output**: Production builds go to `build/` directory (not `dist/`).

## Data Quality Workflow

1. Upload sales data → Some sales may have missing brand or unknown channel (orphans)
2. Navigate to "Qualità Dati" section to view orphans
3. Correct brand/channel for orphans (manually or in bulk)
4. Use "Learn" feature to save corrections as mappings
5. Future uploads automatically apply learned mappings

This ensures data quality improves over time as the system learns from user corrections.

## Deployment

The application is deployed to Supabase with Edge Functions. When making changes to Edge Functions:
- Edge Functions are in TypeScript and run on Deno
- Use JSR imports for Supabase client: `jsr:@supabase/supabase-js@2.49.8`
- Use npm imports via `npm:` prefix for other packages (e.g., `npm:hono`)
- Test locally before deploying to production

## Key Constraints

- Supabase has a 1000-row query limit - always paginate large datasets
- Sales uploads handle chunked processing with retry logic (up to 3 retries per chunk)
- Inventory uploads process in 5000-item chunks with progress reporting
- All API requests have 25-second timeout with AbortController
- Duplicate sales are detected and skipped, not overwritten
