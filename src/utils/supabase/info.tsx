/* Configuration for Supabase */

// Use environment variables in production, fallback to hardcoded values for development
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "sbtkymupbjyikfwjeumk";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo";

// Construct Supabase URL from project ID
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;

// API base URL for Edge Functions
export const API_BASE_URL = `${supabaseUrl}/functions/v1/make-server-49468be0`;