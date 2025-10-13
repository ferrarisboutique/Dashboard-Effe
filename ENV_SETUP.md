# Environment Variables Configuration

## Vercel Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

```bash
VITE_SUPABASE_URL=https://sbtkymupbjyikfwjeumk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo
VITE_SUPABASE_PROJECT_ID=sbtkymupbjyikfwjeumk
```

### Optional Variables

```bash
# Sentry DSN for error tracking (leave empty to disable)
VITE_SENTRY_DSN=
```

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with:
   - **Name**: Variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: The value from above
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your project for changes to take effect

## Local Development

For local development, the app will use the fallback values hardcoded in `src/utils/supabase/info.tsx`. If you want to override them locally, create a `.env.local` file (git-ignored) with the same variables.

## Supabase Edge Function Configuration

Make sure these environment variables are set in your Supabase Edge Function:

- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Set this in Supabase Dashboard → Edge Functions → Environment Variables

The service role key can be found in:
**Project Settings** → **API** → **service_role** (keep this secret!)

## Security Notes

- The `ANON_KEY` is safe to expose in the frontend (it's public)
- The `SERVICE_ROLE_KEY` must NEVER be exposed to the frontend
- Use Supabase Row Level Security (RLS) policies to protect your data
- Environment variables starting with `VITE_` are exposed to the frontend
