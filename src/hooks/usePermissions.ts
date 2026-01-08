import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../lib/supabase';

// Define which sections each role can access
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'overview',
    'stores',
    'online',
    'inventory',
    'order-search',
    'data-quality',
    'upload',
    'upload-ecommerce',
    'upload-inventory',
    'analytics',
    'oss',
    'payment-mapping',
    'settings',
    'admin', // Admin panel for user management
  ],
  analyst: [
    'overview',
    'stores',
    'online',
    'inventory',
    'order-search',
    'analytics',
    'oss',
  ],
  uploader: [
    'upload',
    'upload-ecommerce',
    'upload-inventory',
  ],
};

// Map section IDs to human-readable names
export const SECTION_NAMES: Record<string, string> = {
  'overview': 'Panoramica',
  'stores': 'Negozi',
  'online': 'Online',
  'inventory': 'Inventario',
  'order-search': 'Ricerca Ordini',
  'data-quality': 'Qualità Dati',
  'upload': 'Carica Vendite',
  'upload-ecommerce': 'Carica Ecommerce',
  'upload-inventory': 'Carica Inventario',
  'analytics': 'Analytics',
  'oss': 'OSS',
  'payment-mapping': 'Mapping Pagamenti',
  'settings': 'Impostazioni',
  'admin': 'Gestione Utenti',
};

// Map role IDs to human-readable names
export const ROLE_NAMES: Record<UserRole, string> = {
  admin: 'Amministratore',
  analyst: 'Analista',
  uploader: 'Uploader',
};

// Get the default section for each role
export const DEFAULT_SECTIONS: Record<UserRole, string> = {
  admin: 'overview',
  analyst: 'overview',
  uploader: 'upload',
};

export function usePermissions() {
  const { profile, isAdmin } = useAuth();

  // Get allowed sections for current user
  const allowedSections = useMemo(() => {
    if (!profile) return [];
    return ROLE_PERMISSIONS[profile.role] || [];
  }, [profile]);

  // Check if user can access a specific section
  const canAccess = (sectionId: string): boolean => {
    if (!profile) return false;
    return allowedSections.includes(sectionId);
  };

  // Get the default section for the current user
  const defaultSection = useMemo(() => {
    if (!profile) return 'overview';
    return DEFAULT_SECTIONS[profile.role] || 'overview';
  }, [profile]);

  // Filter sidebar items based on permissions
  const filterSidebarItems = <T extends { id: string }>(items: T[]): T[] => {
    return items.filter(item => canAccess(item.id));
  };

  // Get all permissions for a specific role (for admin panel)
  const getPermissionsForRole = (role: UserRole): string[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  // Check if user can manage users (admin only)
  const canManageUsers = isAdmin;

  return {
    allowedSections,
    canAccess,
    defaultSection,
    filterSidebarItems,
    getPermissionsForRole,
    canManageUsers,
    SECTION_NAMES,
    ROLE_NAMES,
    ROLE_PERMISSIONS,
  };
}

// Export the permissions map for use in other components
export { ROLE_PERMISSIONS };






