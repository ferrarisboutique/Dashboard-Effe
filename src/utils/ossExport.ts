import { OSSVATData, OSSExportFormat } from '../types/oss';
import * as XLSX from 'xlsx';

// Generate OSS export file in CSV or XLSX format
export function generateOSSFile(
  vatData: OSSVATData[],
  period: { start: string; end: string },
  format: 'csv' | 'xlsx' = 'xlsx'
): void {
  // Format period string
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);
  const periodString = `${startDate.toLocaleDateString('it-IT')} - ${endDate.toLocaleDateString('it-IT')}`;

  // Convert to export format
  const exportData: OSSExportFormat[] = vatData.map(data => ({
    period: periodString,
    country: data.country,
    countryName: data.countryName,
    baseAmount: data.baseAmount,
    vatAmount: data.vatAmount,
    transactionCount: data.transactionCount,
    vatRate: data.vatRate
  }));

  if (format === 'csv') {
    // Generate CSV
    const headers = ['Periodo', 'Codice Paese', 'Nome Paese', 'Base Imponibile', 'IVA Dovuta', 'Numero Transazioni', 'Aliquota IVA'];
    const rows = exportData.map(d => [
      d.period,
      d.country,
      d.countryName,
      d.baseAmount.toFixed(2),
      d.vatAmount.toFixed(2),
      d.transactionCount,
      d.vatRate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OSS_${startDate.getFullYear()}_${String(startDate.getMonth() + 1).padStart(2, '0')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  } else {
    // Generate XLSX
    const ws = XLSX.utils.json_to_sheet(exportData.map(d => ({
      'Periodo': d.period,
      'Codice Paese': d.country,
      'Nome Paese': d.countryName,
      'Base Imponibile': d.baseAmount,
      'IVA Dovuta': d.vatAmount,
      'Numero Transazioni': d.transactionCount,
      'Aliquota IVA (%)': d.vatRate
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OSS Data');

    XLSX.writeFile(wb, `OSS_${startDate.getFullYear()}_${String(startDate.getMonth() + 1).padStart(2, '0')}.xlsx`);
  }
}

