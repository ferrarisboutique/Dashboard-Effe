export function normalizeSku(value?: unknown): string {
  return (value ?? '').toString().trim().toUpperCase();
}

export function parseEuroNumber(input: unknown): number {
  if (typeof input === 'number') return input;
  if (input === undefined || input === null) return 0;
  let s = String(input).trim();
  if (!s) return 0;
  
  // Remove currency symbols and spaces
  s = s.replace(/€/g, '').replace(/\s/g, '');
  
  // Handle different number formats
  if (s.includes('.') && s.includes(',')) {
    // Determine which format: check position of . and ,
    const dotPos = s.lastIndexOf('.');
    const commaPos = s.lastIndexOf(',');
    
    if (dotPos > commaPos) {
      // Format: 1,234.56 (US) - dot is decimal, comma is thousands
      s = s.replace(/,/g, '');
    } else {
      // Format: 1.234,56 (EU) - comma is decimal, dot is thousands
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (s.includes(',')) {
    // Only comma: could be EU decimal (1234,56) or US thousands (1,234)
    // Check if there are digits after comma
    const parts = s.split(',');
    if (parts[1] && parts[1].length <= 2) {
      // Likely decimal: 1234,56 -> 1234.56
      s = s.replace(/,/g, '.');
    } else {
      // Likely thousands: 1,234 -> 1234
      s = s.replace(/,/g, '');
    }
  }
  
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

export function parseDateFlexible(input: unknown): string | null {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'number') {
    const excelDate = new Date((input - 25569) * 86400 * 1000);
    return excelDate.toISOString();
  }
  if (!input) return null;
  const raw = String(input).trim();
  const re = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  const m = raw.match(re);
  if (!m) return null;
  let d = parseInt(m[1]);
  let mo = parseInt(m[2]);
  let y = parseInt(m[3]);
  const hh = m[4] ? parseInt(m[4]) : 0;
  const mm = m[5] ? parseInt(m[5]) : 0;
  const ss = m[6] ? parseInt(m[6]) : 0;
  if (y < 100) y = y <= 30 ? 2000 + y : 1900 + y;
  const dt = new Date(y, mo - 1, d, hh, mm, ss);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.toISOString();
}



