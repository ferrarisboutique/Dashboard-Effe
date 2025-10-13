import { describe, it, expect } from 'vitest';
import { getSeasonCode } from '../analytics';

describe('analytics utils', () => {
  describe('getSeasonCode', () => {
    it('should return correct season codes', () => {
      expect(getSeasonCode('2024-01-15')).toBe('SS2024');
      expect(getSeasonCode('2024-06-15')).toBe('SS2024');
      expect(getSeasonCode('2024-07-15')).toBe('FW2024');
      expect(getSeasonCode('2024-12-15')).toBe('FW2024');
    });
  });
});

