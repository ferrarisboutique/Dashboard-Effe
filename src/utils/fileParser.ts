import * as XLSX from 'xlsx';
import { StoreUploadRow, ProcessedSaleData, UploadResult, USER_STORE_MAPPING } from '../types/upload';
import { ProcessedInventoryData, InventoryUploadResult } from '../types/inventory';

export function parseCSV(fileContent: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      // Simple CSV parser - in production you might want to use papaparse
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

export function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsArrayBuffer(file);
  });
}

export function validateAndProcessSalesData(rawData: any[]): UploadResult {
  const errors: string[] = [];
  const processedData: ProcessedSaleData[] = [];
  const totalRows = rawData.length;

  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
    
    try {
      // Validate required fields
      if (!row.Data) {
        errors.push(`Riga ${rowNumber}: Campo 'Data' mancante`);
        return;
      }
      
      if (!row.Utente) {
        errors.push(`Riga ${rowNumber}: Campo 'Utente' mancante`);
        return;
      }
      
      if (!row.SKU) {
        errors.push(`Riga ${rowNumber}: Campo 'SKU' mancante`);
        return;
      }
      
      if (!row['Quant.'] && row['Quant.'] !== 0) {
        errors.push(`Riga ${rowNumber}: Campo 'Quant.' mancante`);
        return;
      }
      
      if (!row.Prezzo && row.Prezzo !== 0) {
        errors.push(`Riga ${rowNumber}: Campo 'Prezzo' mancante`);
        return;
      }

      // Validate and parse data
      const user = row.Utente.toLowerCase().trim();
      const channel = USER_STORE_MAPPING[user];
      
      if (!channel) {
        errors.push(`Riga ${rowNumber}: Utente '${row.Utente}' non riconosciuto. Utenti validi: ${Object.keys(USER_STORE_MAPPING).join(', ')}`);
        return;
      }

      // Parse date (only accept dd/mm/aa or dd/mm/aaaa format)
      let date: string;
      try {
        const dateValue = row.Data;
        let dateString: string;
        
        if (typeof dateValue === 'number') {
          // Excel serial date - convert to dd/mm/yyyy format first
          const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
          const day = excelDate.getDate().toString().padStart(2, '0');
          const month = (excelDate.getMonth() + 1).toString().padStart(2, '0');
          const year = excelDate.getFullYear();
          dateString = `${day}/${month}/${year}`;
        } else {
          dateString = dateValue.toString().trim();
        }

        // Validate format: dd/mm/aa or dd/mm/aaaa
        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;
        const match = dateString.match(dateRegex);
        
        if (!match) {
          throw new Error(`Formato data non valido. Usa dd/mm/aa o dd/mm/aaaa`);
        }

        let day = parseInt(match[1]);
        let month = parseInt(match[2]);
        let year = parseInt(match[3]);

        // Convert 2-digit year to 4-digit year
        if (year < 100) {
          // Assume years 00-30 are 2000-2030, years 31-99 are 1931-1999
          year = year <= 30 ? 2000 + year : 1900 + year;
        }

        // Validate day and month ranges
        if (day < 1 || day > 31) {
          throw new Error('Giorno non valido (1-31)');
        }
        if (month < 1 || month > 12) {
          throw new Error('Mese non valido (1-12)');
        }
        if (year < 1900 || year > 2100) {
          throw new Error('Anno non valido (1900-2100)');
        }

        // Create date object and validate it's a real date
        const parsedDate = new Date(year, month - 1, day);
        if (parsedDate.getFullYear() !== year || 
            parsedDate.getMonth() !== month - 1 || 
            parsedDate.getDate() !== day) {
          throw new Error('Data non esistente');
        }

        // Convert to ISO format for storage
        date = parsedDate.toISOString().split('T')[0];
      } catch (error) {
        errors.push(`Riga ${rowNumber}: ${error.message}. Formato richiesto: dd/mm/aa o dd/mm/aaaa (es: 15/12/24 o 15/12/2024)`);
        return;
      }

      // Parse quantity
      const quantity = Number(row['Quant.']);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Riga ${rowNumber}: Quantità non valida: '${row['Quant.']}'`);
        return;
      }

      // Parse price
      const price = Number(row.Prezzo);
      if (isNaN(price) || price <= 0) {
        errors.push(`Riga ${rowNumber}: Prezzo non valido: '${row.Prezzo}'`);
        return;
      }

      // Calculate total amount
      const amount = quantity * price;

      processedData.push({
        date,
        user: row.Utente,
        channel,
        sku: row.SKU.toString(),
        quantity,
        price,
        amount
      });

    } catch (error) {
      errors.push(`Riga ${rowNumber}: Errore di processing: ${error}`);
    }
  });

  return {
    success: errors.length === 0,
    data: processedData,
    errors,
    totalRows,
    validRows: processedData.length
  };
}

export function validateAndProcessInventoryData(rawData: any[]): InventoryUploadResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const processedData: ProcessedInventoryData[] = [];
  const totalRows = rawData.length;
  const seenSkus = new Set<string>();

  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
    
    try {
      // Validate required fields - SKU e Brand sono obbligatori
      if (!row.SKU || row.SKU.toString().trim() === '') {
        errors.push(`Riga ${rowNumber}: Campo 'SKU' mancante`);
        return; // Salta questa riga ma continua con le altre
      }
      
      if (!row.Brand || row.Brand.toString().trim() === '') {
        errors.push(`Riga ${rowNumber}: Campo 'Brand' mancante`);
        return; // Salta questa riga ma continua con le altre
      }
      
      if (!row['Prezzo di acquisto'] && row['Prezzo di acquisto'] !== 0) {
        errors.push(`Riga ${rowNumber}: Campo 'Prezzo di acquisto' mancante`);
        return; // Salta questa riga ma continua con le altre
      }

      // Get SKU value (ID will be generated automatically)
      const sku = row.SKU.toString().trim();
      
      // Check for unique SKU ONLY within the file (database duplicates are handled by server)
      if (seenSkus.has(sku)) {
        warnings.push(`Riga ${rowNumber}: SKU '${sku}' duplicato nel file - verrà utilizzata solo la prima occorrenza`);
        return; // Salta questa riga ma continua con le altre
      }
      seenSkus.add(sku);

      // Parse purchase price
      const purchasePrice = Number(row['Prezzo di acquisto']);
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        errors.push(`Riga ${rowNumber}: Prezzo di acquisto non valido: '${row['Prezzo di acquisto']}'`);
        return; // Salta questa riga ma continua con le altre
      }

      // Parse sell price (opzionale - può essere vuoto o 0)
      let sellPrice = 0;
      if (row['Prezzo di vendita'] !== undefined && row['Prezzo di vendita'] !== null && row['Prezzo di vendita'] !== '') {
        sellPrice = Number(row['Prezzo di vendita']);
        if (isNaN(sellPrice) || sellPrice < 0) {
          errors.push(`Riga ${rowNumber}: Prezzo di vendita non valido: '${row['Prezzo di vendita']}'`);
          return; // Salta questa riga ma continua con le altre
        }
      } else {
        warnings.push(`Riga ${rowNumber}: Prezzo di vendita non specificato - sarà impostato a €0,00`);
      }

      // Aggiungi il prodotto valido alla lista
      processedData.push({
        sku: row.SKU.toString().trim(),
        category: row.Categoria ? row.Categoria.toString().trim() : '',
        brand: row.Brand.toString().trim(),
        purchasePrice,
        sellPrice,
        collection: row.Collezione ? row.Collezione.toString().trim() : ''
      });

    } catch (error) {
      errors.push(`Riga ${rowNumber}: Errore di processing: ${error}`);
      // Continua con la riga successiva invece di fermarsi
    }
  });

  // Cambia la logica di successo: successo se almeno alcuni prodotti sono stati processati
  const hasValidData = processedData.length > 0;
  const allErrors = [...errors, ...warnings];

  return {
    success: hasValidData,
    message: hasValidData 
      ? `${processedData.length} prodotti processati con successo di ${totalRows} righe totali${allErrors.length > 0 ? ` (${allErrors.length} avvisi/errori)` : ''}`
      : `Nessun prodotto valido trovato nel file`,
    processedCount: processedData.length,
    processedData: processedData,
    errors: allErrors
  };
}

export async function processUploadedFile(file: File): Promise<UploadResult> {
  try {
    let rawData: any[];
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      rawData = await parseCSV(text);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      rawData = await parseExcel(file);
    } else {
      return {
        success: false,
        errors: ['Formato file non supportato. Usa CSV o XLSX.'],
        totalRows: 0,
        validRows: 0
      };
    }

    if (rawData.length === 0) {
      return {
        success: false,
        errors: ['Il file è vuoto o non contiene dati validi.'],
        totalRows: 0,
        validRows: 0
      };
    }

    return validateAndProcessSalesData(rawData);
  } catch (error) {
    return {
      success: false,
      errors: [`Errore nel processing del file: ${error}`],
      totalRows: 0,
      validRows: 0
    };
  }
}

export async function processInventoryFile(file: File): Promise<InventoryUploadResult & { data?: ProcessedInventoryData[] }> {
  try {
    let rawData: any[];
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      rawData = await parseCSV(text);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      rawData = await parseExcel(file);
    } else {
      return {
        success: false,
        message: 'Formato file non supportato. Usa CSV o XLSX.',
        errors: ['Formato file non supportato. Usa CSV o XLSX.']
      };
    }

    if (rawData.length === 0) {
      return {
        success: false,
        message: 'Il file è vuoto o non contiene dati validi.',
        errors: ['Il file è vuoto o non contiene dati validi.']
      };
    }

    const result = validateAndProcessInventoryData(rawData);
    return {
      ...result,
      data: result.success && result.processedCount > 0 ? result.processedData : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: `Errore nel processing del file: ${error}`,
      errors: [`Errore nel processing del file: ${error}`]
    };
  }
}