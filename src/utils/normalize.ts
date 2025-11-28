/**
 * Utility di normalizzazione centralizzate per garantire consistenza
 * nella gestione di SKU, utenti e altri identificatori.
 */

/**
 * Normalizza un SKU per il matching consistente.
 * Rimuove spazi, converte in uppercase e rimuove separatori comuni.
 * 
 * @param sku - SKU da normalizzare
 * @returns SKU normalizzato
 */
export function normalizeSku(sku: string | undefined | null): string {
  if (!sku) return '';
  
  // Convert to string, trim, uppercase
  let normalized = sku.toString().trim().toUpperCase();
  
  // Remove common separators: dash, underscore, dot, slash, space
  normalized = normalized.replace(/[-_\.\/\s]/g, '');
  
  // Remove any other non-alphanumeric characters
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  
  return normalized;
}

/**
 * Normalizza il nome utente per il matching dei canali.
 * 
 * @param user - Nome utente da normalizzare
 * @returns Nome utente normalizzato (lowercase, trimmed)
 */
export function normalizeUser(user: string | undefined | null): string {
  if (!user) return '';
  return user.toString().trim().toLowerCase();
}

/**
 * Normalizza un brand name per confronti consistenti.
 * 
 * @param brand - Brand da normalizzare  
 * @returns Brand normalizzato (trimmed, title case)
 */
export function normalizeBrand(brand: string | undefined | null): string {
  if (!brand) return '';
  return brand.toString().trim();
}

/**
 * Crea una signature unica per una vendita (usata per deduplicazione).
 * 
 * @param sale - Oggetto vendita con i campi necessari
 * @returns Signature unica per la vendita
 */
export function createSaleSignature(sale: {
  date: string;
  sku?: string;
  productId?: string;
  quantity: number;
  amount: number;
  documento?: string;
  numero?: string;
  price?: number;
}): string {
  const sku = sale.sku || sale.productId || '';
  
  // Per vendite ecommerce (con documento/numero), usa signature più specifica
  if (sale.documento && sale.numero) {
    const price = sale.price || (sale.quantity > 0 ? sale.amount / sale.quantity : 0);
    return `${sale.documento}_${sale.numero}_${sale.date}_${sku}_${sale.quantity}_${price}`;
  }
  
  // Per vendite store, usa signature base
  return `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
}

/**
 * Crea una signature unica per un reso (usata per deduplicazione).
 * 
 * @param ret - Oggetto reso con i campi necessari
 * @returns Signature unica per il reso
 */
export function createReturnSignature(ret: {
  date: string;
  sku?: string;
  orderReference?: string;
  quantity: number;
  amount: number;
}): string {
  return `${ret.date}_${ret.orderReference || ret.sku || ''}_${ret.quantity}_${ret.amount}`;
}
