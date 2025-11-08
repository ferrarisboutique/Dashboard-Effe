/* Configuration for Supabase */

// Validate required environment variables with fallback
function getEnvVarWithFallback(key: string, fallback: string): string {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Missing environment variable: ${key}. Using fallback value.`);
    return fallback;
  }
  return value;
}

// Get environment variables with fallback to hardcoded values
export const projectId = getEnvVarWithFallback('VITE_SUPABASE_PROJECT_ID', 'sbtkymupbjyikfwjeumk');
export const publicAnonKey = getEnvVarWithFallback('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo');
export const supabaseUrl = getEnvVarWithFallback('VITE_SUPABASE_URL', 'https://sbtkymupbjyikfwjeumk.supabase.co');

// API base URL for Edge Functions
export const API_BASE_URL = `${supabaseUrl}/functions/v1/make-server-49468be0`;