/**
 * CSRF対策機能のテスト
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// モック設定
const mockGetIronSession = jest.fn() as jest.MockedFunction<typeof import('iron-session').getIronSession>;
const mockCookies = jest.fn() as jest.MockedFunction<typeof import('next/headers').cookies>;

jest.mock('iron-session', () => ({
  getIronSession: mockGetIronSession,
}));

jest.mock('next/headers', () => ({
  cookies: mockCookies,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-token'),
}));

// テスト対象のインポート
import {
  generateCsrfToken,
  verifyCsrfToken,
  resetCsrfToken,
  getCsrfTokenFromHeaders,
  requiresCsrfProtection,
} from '@/lib/csrf';

describe('CSRF Protection', () => {
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      csrfToken: undefined,
      save: jest.fn(),
    };

    mockGetIronSession.mockResolvedValue(mockSession);
    mockCookies.mockResolvedValue({});
    jest.clearAllMocks();
  });

  describe('generateCsrfToken', () => {
    it('should generate and save a new CSRF token', async () => {
      const token = await generateCsrfToken();

      expect(token).toBe('mocked-uuid-token');
      expect(mockSession.csrfToken).toBe('mocked-uuid-token');
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });

    it('should return existing token if already present', async () => {
      mockSession.csrfToken = 'existing-token';

      const token = await generateCsrfToken();

      expect(token).toBe('existing-token');
      expect(mockSession.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyCsrfToken', () => {
    it('should return true for valid token', async () => {
      mockSession.csrfToken = 'valid-token';

      const result = await verifyCsrfToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockSession.csrfToken = 'valid-token';

      const result = await verifyCsrfToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should return false when token is null', async () => {
      mockSession.csrfToken = 'valid-token';

      const result = await verifyCsrfToken(null);

      expect(result).toBe(false);
    });

    it('should return false when token is undefined', async () => {
      mockSession.csrfToken = 'valid-token';

      const result = await verifyCsrfToken(undefined);

      expect(result).toBe(false);
    });

    it('should return false when session has no token', async () => {
      mockSession.csrfToken = undefined;

      const result = await verifyCsrfToken('any-token');

      expect(result).toBe(false);
    });
  });

  describe('resetCsrfToken', () => {
    it('should reset CSRF token', async () => {
      mockSession.csrfToken = 'existing-token';

      await resetCsrfToken();

      expect(mockSession.csrfToken).toBeUndefined();
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCsrfTokenFromHeaders', () => {
    it('should extract CSRF token from headers', () => {
      const headers = new Headers();
      headers.set('x-csrf-token', 'test-token');

      const token = getCsrfTokenFromHeaders(headers);

      expect(token).toBe('test-token');
    });

    it('should return null when header is not present', () => {
      const headers = new Headers();

      const token = getCsrfTokenFromHeaders(headers);

      expect(token).toBeNull();
    });

    it('should be case-insensitive', () => {
      const headers = new Headers();
      headers.set('X-CSRF-Token', 'test-token');

      const token = getCsrfTokenFromHeaders(headers);

      expect(token).toBe('test-token');
    });
  });

  describe('requiresCsrfProtection', () => {
    it('should return false for GET method', () => {
      expect(requiresCsrfProtection('GET')).toBe(false);
    });

    it('should return false for HEAD method', () => {
      expect(requiresCsrfProtection('HEAD')).toBe(false);
    });

    it('should return false for OPTIONS method', () => {
      expect(requiresCsrfProtection('OPTIONS')).toBe(false);
    });

    it('should return true for POST method', () => {
      expect(requiresCsrfProtection('POST')).toBe(true);
    });

    it('should return true for PUT method', () => {
      expect(requiresCsrfProtection('PUT')).toBe(true);
    });

    it('should return true for DELETE method', () => {
      expect(requiresCsrfProtection('DELETE')).toBe(true);
    });

    it('should return true for PATCH method', () => {
      expect(requiresCsrfProtection('PATCH')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(requiresCsrfProtection('get')).toBe(false);
      expect(requiresCsrfProtection('post')).toBe(true);
    });
  });
});
