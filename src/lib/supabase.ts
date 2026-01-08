import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallback
function getEnvVar(key: string, fallback: string): string {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Missing environment variable: ${key}. Using fallback value.`);
    return fallback;
  }
  return value;
}

export const supabaseUrl = getEnvVar(
  'VITE_SUPABASE_URL',
  'https://sbtkymupbjyikfwjeumk.supabase.co'
);

export const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
);

// Create a single Supabase client for the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Types for the auth system
export type UserRole = 'admin' | 'analyst' | 'uploader';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// API base URL for Edge Functions
export const API_BASE_URL = `${supabaseUrl}/functions/v1/make-server-49468be0`;





