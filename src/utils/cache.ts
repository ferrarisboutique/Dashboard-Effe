/**
 * Sistema di caching semplice per i dati dell'app.
 * Utilizza sessionStorage per persistere tra refresh e memoria per performance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Tempo di vita del cache in millisecondi (default: 5 minuti) */
  ttl?: number;
  /** Se usare sessionStorage per persistenza */
  persist?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minuti
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Imposta un valore nel cache
 */
export function setCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  const { ttl = DEFAULT_TTL, persist = true } = options;
  const now = Date.now();
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  };
  
  // Salva in memoria
  memoryCache.set(key, entry);
  
  // Salva in sessionStorage se richiesto
  if (persist) {
    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (e) {
      // sessionStorage pieno o non disponibile - ignora silenziosamente
      if (import.meta.env.DEV) {
        console.warn('Cache: Unable to persist to sessionStorage', e);
      }
    }
  }
}

/**
 * Ottiene un valore dal cache
 */
export function getCache<T>(key: string): T | null {
  const now = Date.now();
  
  // Prima prova dalla memoria
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry && memEntry.expiresAt > now) {
    return memEntry.data;
  }
  
  // Se non in memoria, prova sessionStorage
  try {
    const stored = sessionStorage.getItem(`cache_${key}`);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (entry.expiresAt > now) {
        // Ripristina in memoria per accessi futuri
        memoryCache.set(key, entry);
        return entry.data;
      } else {
        // Scaduto - rimuovi
        sessionStorage.removeItem(`cache_${key}`);
      }
    }
  } catch (e) {
    // Errore di parsing o accesso - ignora
  }
  
  // Non trovato o scaduto
  memoryCache.delete(key);
  return null;
}

/**
 * Invalida una entry del cache
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(`cache_${key}`);
  } catch (e) {
    // Ignora errori sessionStorage
  }
}

/**
 * Invalida tutte le entry che matchano un pattern
 */
export function invalidateCachePattern(pattern: string): void {
  // Memoria
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
  
  // sessionStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('cache_') && key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (e) {
    // Ignora errori sessionStorage
  }
}

/**
 * Pulisce tutto il cache
 */
export function clearAllCache(): void {
  memoryCache.clear();
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (e) {
    // Ignora errori sessionStorage
  }
}

/**
 * Restituisce statistiche sul cache
 */
export function getCacheStats(): { memoryEntries: number; persistedEntries: number } {
  let persistedEntries = 0;
  
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('cache_')) {
        persistedEntries++;
      }
    }
  } catch (e) {
    // Ignora errori
  }
  
  return {
    memoryEntries: memoryCache.size,
    persistedEntries,
  };
}

/**
 * Cache keys costanti per l'app
 */
export const CACHE_KEYS = {
  SALES: 'sales_data',
  RETURNS: 'returns_data',
  INVENTORY: 'inventory_data',
  PAYMENT_MAPPINGS: 'payment_mappings',
  DATABASE_STATS: 'database_stats',
} as const;







