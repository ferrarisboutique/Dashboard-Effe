# End-to-End Testing Checklist

## 🚀 Deployment Status

### ✅ Completed
- [x] Dependencies installed and updated
- [x] Unit tests passing (6/6)
- [x] Edge Function deployed to Supabase
- [x] Frontend built successfully
- [x] Production deployment to Vercel completed

### 📊 Deployed URLs
- **Frontend**: https://dashboard-effe-i3e087y6p-paolos-projects-18e1f9ba.vercel.app
- **Edge Function**: https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0
- **Health Check**: https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health

---

## 🧪 Testing Checklist

### 1. Initial Load & Health Check ✅

- [ ] Open the app URL in browser
- [ ] Verify no white screen / errors in console
- [ ] Check that the app loads with EmptyState (no data yet)
- [ ] Test health endpoint:
  ```bash
  curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health
  ```
  Expected: `{"status":"ok","message":"Server and database are healthy"}`

---

### 2. Inventory Upload Test 📦

**Goal**: Upload inventory data and verify it's stored and displayed correctly.

- [ ] Navigate to "Inventario" section
- [ ] Click "Carica Inventario"
- [ ] Upload a sample inventory file (CSV/XLSX) with columns:
  - `SKU`, `Categoria`, `Brand`, `Prezzo Acquisto`, `Prezzo Vendita`, `Collezione`
- [ ] Wait for upload confirmation toast
- [ ] **Expected**: Inventory items appear in the table below
- [ ] Test filters:
  - [ ] Search by SKU
  - [ ] Filter by brand (dropdown)
  - [ ] Filter by category (dropdown)
  - [ ] Filter by collection (dropdown)
- [ ] Test pagination (if > 50 items)
- [ ] **Check Console**: No errors

**Sample Inventory Data** (CSV):
```csv
SKU,Categoria,Brand,Prezzo Acquisto,Prezzo Vendita,Collezione
ABC123,Abbigliamento,Gucci,150.00,350.00,FW2025
DEF456,Calzature,Prada,200.00,450.00,SS2025
GHI789,Accessori,Unknown,50.00,120.00,FW2024
```

---

### 3. Sales Upload Test - Basic 💰

**Goal**: Upload sales data and verify it appears in all sections.

- [ ] Navigate to "Carica Dati"
- [ ] Click "Carica Vendite"
- [ ] Upload a sample sales file (CSV/XLSX) with columns:
  - `Data`, `Utente`, `SKU`, `Quant.`, `Prezzo`
  - Use dates in format: `30/09/2025 18:44:41` or `30/09/2025`
- [ ] Wait for upload confirmation
- [ ] **Expected**: Toast shows "X vendite caricate, Y duplicati saltati"

**Sample Sales Data** (CSV):
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 10:30:00,alice,ABC123,1,350.00
13/10/2025 11:15:30,bob,DEF456,2,450.00
13/10/2025 14:20:45,carol,GHI789,1,120.00
12/10/2025 09:00:00,admin,ABC123,1,350.00
```

- [ ] Navigate to "Panoramica"
- [ ] **Expected**: 
  - "Vendite Totali" shows correct count
  - "Fatturato" shows correct total (sum of `Quant. × Prezzo`)
  - "Marginalità" calculates correctly (using purchase price from inventory)
  - Charts display monthly trends
- [ ] Navigate to "Negozi"
  - [ ] Verify "Negozio Donna" and "Negozio Uomo" show correct data
  - [ ] Check "Vendite per Brand" chart
  - [ ] Check "Vendite Mensili" with YoY comparison
  - [ ] Verify percentages next to "Vendite Totali" refer to previous year
- [ ] Navigate to "Online"
  - [ ] Verify "Ecommerce" and "Marketplace" sections
  - [ ] Check aggregated data

---

### 4. Data Quality - Orphan Sales Test 🔍

**Goal**: Test the "Qualità Dati" feature for correcting orphan sales.

#### Step 1: Upload Sales with Unknown Brand/Channel

- [ ] Upload sales with:
  - **Unknown Brand**: Use SKUs not in inventory (e.g., `UNKNOWN_SKU`)
  - **Unknown User**: Use user not in `USER_STORE_MAPPING` (e.g., `unknown_user`)

**Sample Orphan Sales** (CSV):
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 16:00:00,unknown_user,ORPHAN_SKU1,1,100.00
13/10/2025 17:00:00,alice,ORPHAN_SKU2,2,150.00
```

- [ ] Navigate to "Impostazioni" → "Qualità Dati"
- [ ] **Expected**: Orphan sales appear in the list with:
  - Brand = "Unknown" OR
  - Channel = "unknown"

#### Step 2: Manual Correction

- [ ] Select an orphan sale
- [ ] Enter correct brand (e.g., "Nike")
- [ ] Click "Salva" button
- [ ] **Expected**: 
  - Success toast appears
  - Sale disappears from orphan list
  - Sale appears with corrected brand in "Panoramica" / "Negozi"

#### Step 3: Learn Mappings

- [ ] In "Qualità Dati", find orphan sale with SKU `ORPHAN_SKU1`
- [ ] Enter brand "Nike" for that SKU
- [ ] Click "Apprendi Mapping" button
- [ ] **Expected**: Toast shows "Mappature salvate"

#### Step 4: Verify Learned Mapping

- [ ] Upload a NEW sales file containing `ORPHAN_SKU1` again
- [ ] **Expected**: 
  - System automatically assigns brand "Nike" (no longer "Unknown")
  - Sale does NOT appear in orphan list
  - Appears correctly in dashboards with brand "Nike"

---

### 5. Date Range Filtering Test 📅

**Goal**: Verify custom date filtering and YoY comparison.

- [ ] Navigate to "Negozi"
- [ ] Click on date range picker
- [ ] Select range: March 1, 2025 - March 10, 2025
- [ ] **Expected**:
  - Metrics filter to show only sales in that range
  - Percentages show comparison to March 1-10, 2024
  - Charts update to show filtered data

- [ ] Test with different date ranges:
  - [ ] Last 7 days
  - [ ] Current month
  - [ ] Custom range spanning multiple months

---

### 6. Channel Mapping - Online Sales Test 🌐

**Goal**: Verify expanded `USER_STORE_MAPPING` for online channels.

#### Upload Online Sales

**Sample Online Sales** (CSV):
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 12:00:00,admin,ABC123,1,350.00
13/10/2025 13:00:00,online,DEF456,2,450.00
13/10/2025 14:00:00,amazon,GHI789,1,120.00
13/10/2025 15:00:00,zalando,ABC123,3,350.00
```

- [ ] Upload the file
- [ ] Navigate to "Online"
- [ ] **Expected**:
  - "Ecommerce" section shows sales from `admin`, `online`
  - "Marketplace" section shows sales from `amazon`, `zalando`
  - Correct aggregation and charts

---

### 7. Duplicate Detection Test 🔄

**Goal**: Verify duplicate sales are not saved twice.

- [ ] Upload the SAME sales file twice
- [ ] **Expected**: 
  - First upload: "X vendite caricate"
  - Second upload: "0 vendite caricate, X duplicati saltati"
- [ ] Verify no duplicates in database:
  ```bash
  curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales | jq '. | length'
  ```

---

### 8. Large Dataset Test 📊

**Goal**: Verify pagination and performance with large datasets.

- [ ] Upload a file with 2000+ sales
- [ ] **Expected**:
  - All sales are saved (not limited to 1000)
  - Dashboard loads without timeout
  - Pagination works in inventory/sales lists
- [ ] Check performance:
  - Page load time < 5s
  - No browser lag when scrolling

---

### 9. Error Handling & Edge Cases ⚠️

- [ ] Upload invalid CSV (wrong columns)
  - **Expected**: Error message with clear explanation
- [ ] Upload empty file
  - **Expected**: "No valid data found"
- [ ] Upload sales with missing required fields
  - **Expected**: Error listing which rows/fields are invalid
- [ ] Upload sales with invalid date format
  - **Expected**: Parser handles flexibly or provides clear error
- [ ] Network failure simulation:
  - Disable network → Try upload
  - **Expected**: Error toast "Network error" or similar

---

### 10. Browser Console Monitoring 🖥️

Throughout all tests, monitor browser console for:

- [ ] **No errors** (red messages)
- [ ] **No CORS issues**
- [ ] **No 500/400 errors** from API calls
- [ ] Verify all API responses return `success: true`

Check Network tab:
- [ ] `/sales` endpoint returns correct data
- [ ] `/inventory` endpoint returns correct data
- [ ] `/sales/orphans` returns orphan sales
- [ ] `/sales/bulk-update` updates sales correctly
- [ ] `/sales/learn` saves mappings

---

### 11. Supabase Edge Function Logs 📝

Check Supabase Dashboard:
- Navigate to: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
- Select `make-server-49468be0`
- View **Logs** tab

- [ ] No errors in function execution
- [ ] Verify successful requests logged
- [ ] Check response times (should be < 5s)

Or use CLI:
```bash
npx supabase functions logs make-server-49468be0
```

---

## 🎯 Success Criteria

### ✅ All tests pass if:
1. ✅ Inventory upload and display works
2. ✅ Sales upload and display works across all sections
3. ✅ Data quality manager detects and corrects orphan sales
4. ✅ Learned mappings are applied to future uploads
5. ✅ Date filtering and YoY comparison work
6. ✅ Online channels (ecommerce/marketplace) are correctly mapped
7. ✅ Duplicate detection works
8. ✅ Large datasets (>2000 rows) are handled correctly
9. ✅ No errors in console or Edge Function logs
10. ✅ All metrics (totals, margins, charts) calculate correctly

---

## 🐛 Bug Reporting Template

If you find issues, report them with:

```
**Section**: [e.g., Panoramica, Negozi, Qualità Dati]
**Action**: [e.g., Upload sales, Filter by date]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console Errors**: [Copy any errors from console]
**Edge Function Logs**: [Any relevant logs]
**Steps to Reproduce**: 
1. 
2. 
3. 
```

---

## 📦 Sample Data Files

Create these files for testing:

### inventory_sample.csv
```csv
SKU,Categoria,Brand,Prezzo Acquisto,Prezzo Vendita,Collezione
GUCCI_JACKET_001,Abbigliamento,Gucci,250.00,600.00,FW2025
PRADA_SHOES_002,Calzature,Prada,180.00,420.00,SS2025
HERMES_BAG_003,Accessori,Hermes,500.00,1200.00,FW2025
DIOR_DRESS_004,Abbigliamento,Dior,300.00,750.00,SS2025
BURBERRY_SCARF_005,Accessori,Burberry,80.00,220.00,FW2024
```

### sales_negozi_sample.csv
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 10:30:00,alice,GUCCI_JACKET_001,1,600.00
13/10/2025 11:15:30,bob,PRADA_SHOES_002,2,420.00
13/10/2025 14:20:45,carol,HERMES_BAG_003,1,1200.00
12/10/2025 09:00:00,alice,DIOR_DRESS_004,1,750.00
11/10/2025 16:45:00,bob,BURBERRY_SCARF_005,3,220.00
```

### sales_online_sample.csv
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 12:00:00,admin,GUCCI_JACKET_001,1,600.00
13/10/2025 13:00:00,online,PRADA_SHOES_002,2,420.00
13/10/2025 14:00:00,amazon,HERMES_BAG_003,1,1200.00
13/10/2025 15:00:00,zalando,DIOR_DRESS_004,3,750.00
```

### sales_orphan_sample.csv
```csv
Data,Utente,SKU,Quant.,Prezzo
13/10/2025 16:00:00,unknown_user,ORPHAN_SKU_001,1,100.00
13/10/2025 17:00:00,alice,ORPHAN_SKU_002,2,150.00
13/10/2025 18:00:00,invalid_user,GUCCI_JACKET_001,1,600.00
```

---

## ⚙️ Post-Testing Actions

After testing is complete:

1. **Configure Vercel Environment Variables**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_SUPABASE_PROJECT_ID`
   - Redeploy

2. **Monitor Error Tracking**:
   - Set up Sentry DSN if needed
   - Monitor Edge Function logs regularly

3. **Backup Data**:
   - Export KV store data periodically
   - Consider SQL migration for long-term (see `ARCHITECTURE.md`)

4. **Optional: Rename Edge Function**:
   - Follow guide in `ARCHITECTURE.md` to rename from `make-server-49468be0` to `dashboard-api`

---

**🎉 Happy Testing!**
