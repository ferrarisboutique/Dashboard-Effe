# 🚀 Redeploy Edge Functions - CORS Fix

## Issue Fixed
The sales upload was failing on production because the `sales.ts` Edge Function had a restrictive CORS policy that only allowed:
- `http://localhost:3000`
- `https://*.supabase.co`

But **NOT** Vercel domains! This meant sales uploads worked locally but failed in production.

## Solution
Removed the duplicate CORS middleware from `sales.ts`. CORS is now handled globally in `index.ts` with `origin: "*"` which allows all domains including Vercel.

## Files Changed
- ✅ `supabase/functions/make-server-49468be0/sales.ts` - Removed restrictive CORS
- ✅ `.gitignore` - Removed supabase from ignore list
- ✅ All Edge Functions code now tracked in git

## How to Redeploy

### Method 1: Supabase CLI (Recommended)

1. **Get Access Token from Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Give it a name like "CLI Deployment"
   - Copy the token (starts with `sbp_...`)

2. **Login to Supabase CLI**:
   ```bash
   npx supabase login
   ```
   Paste your access token when prompted.

3. **Deploy the Edge Functions**:
   ```bash
   cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
   npx supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk
   ```

4. **Verify Deployment**:
   ```bash
   curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health
   ```
   Should return: `{"status":"ok",...}`

### Method 2: Supabase Dashboard (Alternative)

If CLI doesn't work:

1. Go to: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
2. Find the `make-server-49468be0` function
3. Click "Deploy new version"
4. Upload the files from `supabase/functions/make-server-49468be0/`:
   - `index.ts`
   - `sales.ts` (⚠️ THIS IS THE FIXED FILE)
   - `inventory.ts`
   - `kv_store.ts`
   - `deno.json`

### Method 3: GitHub Integration (If Available)

1. Go to: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
2. If GitHub integration is enabled, click "Sync from GitHub"
3. Select the `main` branch
4. Deploy

## Testing After Deployment

1. **Test Edge Functions Health**:
   ```bash
   curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health
   ```

2. **Test CORS from Vercel Domain**:
   - Go to: https://dashboard-effe-mf36do446-paolos-projects-18e1f9ba.vercel.app
   - Open DevTools Console (F12)
   - Try uploading a sales file
   - Check Network tab - you should see successful POST to `/sales/bulk`
   - No CORS errors should appear

3. **Verify Sales Data Appears in Stores Section**:
   - Upload a sales file with store data (users: carla, alexander, paolo)
   - Click "Conferma e Carica Dati"
   - Navigate to "Negozi" section
   - Data should now appear in "Negozio Donna" and "Negozio Uomo" tabs

## Expected Results

✅ Sales uploads should work from Vercel production domain
✅ Data should appear in the stores section after upload
✅ No CORS errors in browser console
✅ Edge Functions health check returns `{"status":"ok"}`

## Troubleshooting

### CORS errors still appearing?
- Verify the Edge Function was actually redeployed (check timestamp in Supabase dashboard)
- Clear browser cache and try again
- Check Edge Functions logs in Supabase dashboard for errors

### Deployment fails?
- Make sure your access token is valid (not expired)
- Check you have deployment permissions on the Supabase project
- Try deploying from Supabase dashboard instead of CLI

### Sales still not appearing?
- Check browser DevTools Network tab for API errors
- Verify the Edge Functions health endpoint returns OK
- Check Supabase Edge Functions logs for errors

## Next Steps After Successful Deployment

1. Test the complete sales upload flow on production
2. Verify data appears correctly in all sections (Panoramica, Negozi, etc.)
3. Monitor Edge Functions logs for any errors
4. Optionally: Set up monitoring/alerting for Edge Functions

---

**Deployed Code Version**: Commit `483ca09`
**Date**: 2025-10-13
**Fixed By**: Claude Code
