import { formatDate, isValidEmail } from '@/lib/utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2025-12-30T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2025-12-30');
    });

    it('should handle single digit month and day', () => {
      const date = new Date('2025-01-05T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2025-01-05');
    });

    it('should handle different years', () => {
      const date = new Date('2024-06-15T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-06-15');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.jp')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
