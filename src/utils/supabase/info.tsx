/* Configuration for Supabase */

// Validate required environment variables
function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. Please check your .env.local file.`);
  }
  return value;
}

// Get required environment variables with validation
export const projectId = getRequiredEnvVar('VITE_SUPABASE_PROJECT_ID');
export const publicAnonKey = getRequiredEnvVar('VITE_SUPABASE_ANON_KEY');
export const supabaseUrl = getRequiredEnvVar('VITE_SUPABASE_URL');

// API base URL for Edge Functions
export const API_BASE_URL = `${supabaseUrl}/functions/v1/make-server-49468be0`;