import { describe, it, expect } from 'vitest';
import { normalizeSku, parseEuroNumber, parseDateFlexible } from '../normalize';

describe('normalize utils', () => {
  describe('normalizeSku', () => {
    it('should normalize SKU to uppercase', () => {
      expect(normalizeSku('abc123')).toBe('ABC123');
      expect(normalizeSku('  def456  ')).toBe('DEF456');
      expect(normalizeSku('')).toBe('');
      expect(normalizeSku(undefined)).toBe('');
      expect(normalizeSku(null)).toBe('');
    });
  });

  describe('parseEuroNumber', () => {
    it('should parse euro numbers correctly', () => {
      expect(parseEuroNumber('123.45')).toBe(123.45);
      expect(parseEuroNumber('1,234.56')).toBe(1234.56);
      expect(parseEuroNumber('1.234,56')).toBe(1234.56);
      expect(parseEuroNumber('€123.45')).toBe(123.45);
      expect(parseEuroNumber('€ 1,234.56')).toBe(1234.56);
      expect(parseEuroNumber(123.45)).toBe(123.45);
      expect(parseEuroNumber('')).toBe(0);
      expect(parseEuroNumber('invalid')).toBe(0);
    });
  });

  describe('parseDateFlexible', () => {
    it('should parse various date formats', () => {
      expect(parseDateFlexible('15/12/2024')).toBeTruthy();
      expect(parseDateFlexible('15/12/24')).toBeTruthy();
      expect(parseDateFlexible('15/12/2024 14:30')).toBeTruthy();
      expect(parseDateFlexible('15/12/2024 14:30:45')).toBeTruthy();
      expect(parseDateFlexible('invalid')).toBeNull();
      expect(parseDateFlexible('')).toBeNull();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-12-15T14:30:00Z');
      expect(parseDateFlexible(date)).toBe(date.toISOString());
    });

    it('should handle Excel serial dates', () => {
      const result = parseDateFlexible(45658); // Excel serial date
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
