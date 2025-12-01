import { EcommerceUploadRow, ProcessedEcommerceSaleData, ProcessedReturnData, EcommerceUploadResult } from '../types/upload';
import { parseCSV, parseExcel } from './fileParser';

// Helper: parse number with comma as decimal separator (Italian format)
function parseNumber(input: any, fieldLabel: string, rowNumber: number): number | null {
  if (typeof input === 'number') {
    // Already a number, return as is
    return input;
  }
  
  if (input === undefined || input === null) {
    return null;
  }
  
  let s = String(input).trim();
  if (!s || s === '' || s === 'null' || s === 'undefined') {
    return null;
  }
  
  // Remove currency symbols and spaces
  s = s.replace(/€/g, '').replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  
  // Handle negative numbers
  const isNegative = s.startsWith('-');
  if (isNegative) {
    s = s.substring(1);
  }
  
  // Handle Italian number format (comma as decimal separator)
  if (s.includes('.') && s.includes(',')) {
    // Both present: . is thousands separator, , is decimal separator
    // Example: 1.234,56 -> 1234.56
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (s.includes(',')) {
    // Only comma: check if it's decimal or thousands separator
    const parts = s.split(',');
    if (parts.length === 2) {
      // Two parts: check if second part has 1-2 digits (decimal) or more (thousands)
      if (parts[1].length <= 2 && parts[1].length > 0) {
        // Decimal separator (e.g., "120,00" or "120,5")
        s = s.replace(/,/g, '.');
      } else if (parts[1].length === 0) {
        // Just comma at the end, treat as decimal separator (e.g., "120," -> "120")
        s = parts[0];
      } else {
        // Thousands separator (e.g., "1,234")
        s = s.replace(/,/g, '');
      }
    } else if (parts.length > 2) {
      // Multiple commas: thousands separator
      s = s.replace(/,/g, '');
    } else {
      // Single comma, likely decimal separator
      s = s.replace(/,/g, '.');
    }
  }
  
  // Final cleanup: remove any remaining non-numeric characters except decimal point
  s = s.replace(/[^\d.]/g, '');
  
  // Handle empty string after cleanup
  if (!s || s === '') {
    return null;
  }
  
  const n = Number(s);
  if (Number.isNaN(n)) {
    return null;
  }
  
  return isNegative ? -n : n;
}

// Helper: parse date DD/MM/YY or DD/MM/YYYY
function parseDate(dateValue: any, rowNumber: number): string | null {
  if (!dateValue) return null;
  
  let dateString: string;
  
  if (typeof dateValue === 'number') {
    // Excel serial date
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    return excelDate.toISOString();
  } else if (dateValue instanceof Date) {
    return dateValue.toISOString();
  } else {
    dateString = dateValue.toString().trim();
  }
  
  // Format: DD/MM/YY or DD/MM/YYYY
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;
  const match = dateString.match(dateRegex);
  
  if (!match) {
    throw new Error(`Formato data non valido: ${dateString}. Usa DD/MM/YY o DD/MM/YYYY`);
  }
  
  let day = parseInt(match[1]);
  let month = parseInt(match[2]);
  let year = parseInt(match[3]);
  
  // Convert 2-digit year to 4-digit
  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }
  
  // Validate
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    throw new Error(`Data non valida: ${dateString}`);
  }
  
  const parsedDate = new Date(year, month - 1, day);
  if (parsedDate.getFullYear() !== year || 
      parsedDate.getMonth() !== month - 1 || 
      parsedDate.getDate() !== day) {
    throw new Error(`Data non esistente: ${dateString}`);
  }
  
  return parsedDate.toISOString();
}

// Helper: identify if row is a return
function isReturn(documento: string | undefined): boolean {
  if (!documento) return false;
  const doc = documento.toUpperCase().trim();
  return doc === 'RESO' || doc === 'NOTA CRED' || doc === 'NOTA DI CREDITO';
}

// Helper: extract area from supplier/platform or area field
function extractArea(supplierPlatform: string | undefined, area: string | undefined): 'Ferraris' | 'Zuklat' | undefined {
  const value = (supplierPlatform || area || '').toString().trim();
  if (value === 'Ferraris') return 'Ferraris';
  if (value === 'Zuklat') return 'Zuklat';
  return undefined;
}

// Helper: determine channel from payment method and supplier/platform
function determineChannel(
  paymentMethod: string | undefined,
  supplierPlatform: string | undefined,
  paymentMappings?: Record<string, { macroArea: string; channel: string }>
): 'ecommerce' | 'marketplace' {
  // Check payment method mapping first
  if (paymentMethod && paymentMappings?.[paymentMethod]) {
    const mapping = paymentMappings[paymentMethod];
    if (mapping.channel === 'ecommerce' || mapping.channel === 'marketplace') {
      return mapping.channel;
    }
  }
  
  // Check supplier/platform for known marketplaces
  const platform = (supplierPlatform || '').toString().toLowerCase();
  const knownMarketplaces = ['zalando', 'cettire', 'baltini', 'yoox', 'guhada', 'thelist', 'miinto'];
  if (knownMarketplaces.some(m => platform.includes(m))) {
    return 'marketplace';
  }
  
  // Default to ecommerce
  return 'ecommerce';
}

// Helper: group rows by transaction (Documento + Numero + Data)
function groupByTransaction(rows: EcommerceUploadRow[]): Map<string, EcommerceUploadRow[]> {
  const groups = new Map<string, EcommerceUploadRow[]>();
  
  for (const row of rows) {
    const documento = row.Documento || '';
    const numero = row.Numero || '';
    const data = row.Data || '';
    const key = `${documento}_${numero}_${data}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }
  
  return groups;
}

// Helper: create unique key for sale
function createSaleUniqueKey(documento: string, numero: string, data: string, sku: string, qty: number, price: number): string {
  return `${documento}_${numero}_${data}_${sku}_${qty}_${price}`;
}

// Helper: create unique key for return
function createReturnUniqueKey(documento: string, numero: string, data: string, orderReference: string, sku: string, qty: number, price: number): string {
  return `${documento}_${numero}_${data}_${orderReference}_${sku}_${qty}_${price}`;
}

// Main parser function
export function validateAndProcessEcommerceData(
  rawData: any[],
  paymentMappings?: Record<string, { macroArea: string; channel: string }>
): EcommerceUploadResult {
  const errors: string[] = [];
  const processedSales: ProcessedEcommerceSaleData[] = [];
  const processedReturns: ProcessedReturnData[] = [];
  const seenKeys = new Set<string>();
  const duplicates: Array<{ rowNumber: number; documento: string; numero: string; date: string; sku: string; quantity: number; price: number; reason: 'sale' | 'return' }> = [];
  let skippedDuplicates = 0;
  
  const totalRows = rawData.length;
  
  // Group by transaction to handle shipping costs
  const transactionGroups = groupByTransaction(rawData as EcommerceUploadRow[]);
  
  // Process each transaction group
  for (const [transactionKey, rows] of transactionGroups.entries()) {
    if (rows.length === 0) continue;
    
    const firstRow = rows[0];
    const documento = (firstRow.Documento || '').toString().trim();
    const numero = (firstRow.Numero || '').toString().trim();
    
    // Parse date from first row
    let date: string | null = null;
    try {
      date = parseDate(firstRow.Data, 0);
      if (!date) {
        errors.push(`Transazione ${documento} ${numero}: Data mancante o non valida`);
        continue;
      }
    } catch (error) {
      errors.push(`Transazione ${documento} ${numero}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    
    const isReturnDoc = isReturn(documento);
    
    // Extract common fields
    const country = (firstRow.Nazione || firstRow['Nazione'] || '').toString().trim().toUpperCase();
    const supplierPlatform = (firstRow['Supplier/Platform'] || '').toString().trim();
    const areaField = (firstRow.Area || '').toString().trim();
    const area = extractArea(supplierPlatform, areaField);
    
    // Extract payment method
    const paymentMethod = (firstRow['Metodo pagamento'] || firstRow['Metodo paga'] || '').toString().trim();
    
    // Determine channel
    const channel = determineChannel(paymentMethod, supplierPlatform, paymentMappings);
    
    // Extract shipping cost (only for sales, once per transaction)
    let shippingCost: number | undefined = undefined;
    const shippingField = firstRow['Spese trasporto'] || firstRow['Spese traspc'];
    if (!isReturnDoc && shippingField) {
      const shipping = parseNumber(shippingField, 'Spese trasporto', 0);
      if (shipping !== null && shipping > 0) {
        shippingCost = shipping;
      }
    }
    
    // Process each row in the transaction
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 2; // +2 for header and 0-based index
      
      try {
        // Extract SKU (try multiple field names)
        const sku = (row.SKU || row['SKU'] || '').toString().trim();
        if (!sku && !isReturnDoc) {
          errors.push(`Riga ${rowNumber} (${documento} ${numero}): SKU mancante`);
          continue;
        }
        
        // Extract quantity
        const qty = row.Qty || row['Qty'] || row['Quant.'] || 0;
        const quantity = typeof qty === 'number' ? qty : parseNumber(qty, 'Quantità', rowNumber) || 0;
        if (quantity <= 0) {
          errors.push(`Riga ${rowNumber} (${documento} ${numero}): Quantità non valida`);
          continue;
        }
        
        // Extract price (try multiple possible field names)
        // Try all possible column name variations
        const priceField = row['Prezzo articc'] || 
                          row['Prezzo articc'] || 
                          row['Item Amount'] || 
                          row['ItemAmount'] ||
                          row['Prezzo'] ||
                          row['Price'] ||
                          row['Prezzo unitario'] ||
                          row['PrezzoUnitario'] ||
                          row['Prezzo Articc'] ||
                          row['PREZZO ARTICC'] ||
                          row['Prezzo Articolo'] ||
                          // Try to find any field containing "prezzo" or "price" (case insensitive)
                          Object.keys(row).find(key => 
                            key.toLowerCase().includes('prezzo') || 
                            key.toLowerCase().includes('price')
                          ) ? row[Object.keys(row).find(key => 
                            key.toLowerCase().includes('prezzo') || 
                            key.toLowerCase().includes('price')
                          )!] : undefined;
        
        // Debug: log the field value if parsing fails
        const priceParsed = parseNumber(priceField, 'Prezzo', rowNumber);
        
        // For returns: accept negative prices (they are return shipping deductions)
        // For sales: reject prices <= 0
        if (priceParsed === null) {
          const fieldValue = priceField !== undefined ? `"${priceField}"` : 'campo non trovato';
          const availableFields = Object.keys(row).join(', ');
          errors.push(`Riga ${rowNumber} (${documento} ${numero}): Prezzo non valido. Valore: ${fieldValue}. Campi disponibili: ${availableFields}`);
          continue;
        }
        
        // For sales, price must be positive
        if (!isReturnDoc && priceParsed <= 0) {
          const fieldValue = priceField !== undefined ? `"${priceField}"` : 'campo non trovato';
          const availableFields = Object.keys(row).join(', ');
          errors.push(`Riga ${rowNumber} (${documento} ${numero}): Prezzo non valido per vendita (deve essere > 0). Valore: ${fieldValue}. Campi disponibili: ${availableFields}`);
          continue;
        }
        
        // For returns with negative price (return shipping deduction), treat as deduction
        // For returns with positive price (returned item), treat as negative amount
        const price = Math.abs(priceParsed); // Store absolute value
        const isReturnShippingDeduction = isReturnDoc && priceParsed < 0;
        
        // Calculate amount
        let amount = quantity * price;
        if (isReturnDoc) {
          if (isReturnShippingDeduction) {
            // Trattenuta (prezzo negativo input): è un importo POSITIVO che riduce il reso
            // Es: articolo reso €120, trattenuta -€10 → totale reso = €110
            // L'articolo reso sarà -120, la trattenuta sarà +10, totale = -110 ✓
            amount = +amount; // Positive - reduces the return amount
          } else {
            // Articolo reso (prezzo positivo): è un importo negativo (rimborso)
            amount = -amount; // Negative - the actual return/refund
          }
        }
        
        // Add shipping cost only to first row of sales transaction
        if (!isReturnDoc && shippingCost && rowIndex === 0) {
          amount += shippingCost;
        }
        
        // Extract tax rate
        const taxRateField = row['Aliquota per'] || row['Tax Rate'];
        const taxRate = taxRateField ? (typeof taxRateField === 'number' ? taxRateField : parseNumber(taxRateField, 'Aliquota', rowNumber)) : undefined;
        
        // Extract order reference (for returns)
        const orderReference = (row['Order/Reference Number'] || '').toString().trim();
        
        // Create unique key
        const uniqueKey = isReturnDoc
          ? createReturnUniqueKey(documento, numero, date, orderReference || sku, sku || (row['Item Description'] || '').toString(), quantity, price)
          : createSaleUniqueKey(documento, numero, date, sku, quantity, price);
        
        // Check for duplicates
        if (seenKeys.has(uniqueKey)) {
          skippedDuplicates++;
          duplicates.push({
            rowNumber,
            documento,
            numero,
            date,
            sku: sku || (row['Item Description'] || '').toString(),
            quantity,
            price,
            reason: isReturnDoc ? 'return' : 'sale'
          });
          continue;
        }
        seenKeys.add(uniqueKey);
        
        // Handle "Spese di reso" as separate return line
        const itemDescription = (row['Item Description'] || row.Articolo || '').toString().trim();
        if (isReturnDoc && itemDescription.toLowerCase().includes('spese di reso')) {
          // This is a return shipping cost line
          const returnShipping = parseNumber(priceField, 'Spese di reso', rowNumber);
          if (returnShipping !== null) {
            processedReturns.push({
              date,
              country,
              area,
              channel,
              sku: undefined, // No SKU for shipping costs
              quantity: 1,
              price: -Math.abs(returnShipping),
              amount: -Math.abs(returnShipping),
              paymentMethod,
              orderReference,
              returnShippingCost: -Math.abs(returnShipping),
              taxRate,
              reason: documento
            });
          }
          continue;
        }
        
        // Create processed data
        if (isReturnDoc) {
          processedReturns.push({
            date,
            country,
            area,
            channel,
            sku: sku || undefined,
            quantity,
            // Per trattenute (isReturnShippingDeduction): prezzo positivo (riduce il reso)
            // Per articoli resi: prezzo negativo (è un rimborso)
            price: isReturnShippingDeduction ? price : -price,
            amount,
            paymentMethod,
            orderReference,
            // If original price was negative, it's a return shipping deduction (stored as positive)
            returnShippingCost: isReturnShippingDeduction ? price : undefined,
            taxRate,
            reason: documento
          });
        } else {
          processedSales.push({
            date,
            user: 'ecommerce', // Default user for ecommerce
            channel,
            sku,
            quantity,
            price,
            amount,
            paymentMethod: paymentMethod || undefined,
            area,
            country: country || undefined,
            orderReference: orderReference || undefined,
            shippingCost: rowIndex === 0 ? shippingCost : undefined, // Only first row
            taxRate,
            documento: documento || undefined,
            numero: numero || undefined
          });
        }
        
      } catch (error) {
        errors.push(`Riga ${rowNumber} (${documento} ${numero}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  return {
    success: errors.length === 0,
    sales: processedSales,
    returns: processedReturns,
    errors: errors.length > 0 ? errors : undefined,
    totalRows,
    validSalesRows: processedSales.length,
    validReturnsRows: processedReturns.length,
    skippedDuplicates,
    duplicates: duplicates.length > 0 ? duplicates : undefined
  };
}

// Main file parser
export async function parseEcommerceFile(
  file: File,
  paymentMappings?: Record<string, { macroArea: string; channel: string }>
): Promise<EcommerceUploadResult> {
  try {
    let rawData: any[];
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      // Use existing CSV parser
      rawData = await parseCSV(text);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      // Use existing Excel parser
      rawData = await parseExcel(file);
    } else {
      return {
        success: false,
        errors: ['Formato file non supportato. Usa CSV o XLSX.'],
        totalRows: 0,
        validSalesRows: 0,
        validReturnsRows: 0,
        skippedDuplicates: 0,
        duplicates: undefined
      };
    }
    
    if (rawData.length === 0) {
      return {
        success: false,
        errors: ['Il file è vuoto o non contiene dati validi.'],
        totalRows: 0,
        validSalesRows: 0,
        validReturnsRows: 0,
        skippedDuplicates: 0,
        duplicates: undefined
      };
    }
    
    return validateAndProcessEcommerceData(rawData, paymentMappings);
  } catch (error) {
    return {
      success: false,
      errors: [`Errore nel processing del file: ${error}`],
      totalRows: 0,
      validSalesRows: 0,
      validReturnsRows: 0,
      skippedDuplicates: 0,
      duplicates: undefined
    };
  }
}

