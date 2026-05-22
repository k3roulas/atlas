import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('maxmind', () => {
  const mockGet = vi.fn();
  return {
    default: {
      open: vi.fn().mockResolvedValue({ get: mockGet }),
    },
    __mockGet: mockGet,
  };
});

vi.mock('geo-tz', () => ({
  find: vi.fn(),
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe('geolocation service', () => {
  describe('extractClientIp', () => {
    it('extracts IP from X-Forwarded-For header', async () => {
      const { extractClientIp } = await import('./geolocation.service.ts');
      const c = {
        req: {
          header: (name: string) =>
            name === 'X-Forwarded-For' ? '203.0.113.50, 10.0.0.1' : undefined,
        },
      } as never;
      expect(extractClientIp(c)).toBe('203.0.113.50');
    });

    it('falls back to X-Real-IP', async () => {
      const { extractClientIp } = await import('./geolocation.service.ts');
      const c = {
        req: { header: (name: string) => (name === 'X-Real-IP' ? '198.51.100.1' : undefined) },
      } as never;
      expect(extractClientIp(c)).toBe('198.51.100.1');
    });

    it('returns 127.0.0.1 when no headers present', async () => {
      const { extractClientIp } = await import('./geolocation.service.ts');
      const c = { req: { header: () => undefined } } as never;
      expect(extractClientIp(c)).toBe('127.0.0.1');
    });

    it('strips IPv6-mapped IPv4 prefix', async () => {
      const { extractClientIp } = await import('./geolocation.service.ts');
      const c = {
        req: {
          header: (name: string) => (name === 'X-Forwarded-For' ? '::ffff:192.168.1.1' : undefined),
        },
      } as never;
      expect(extractClientIp(c)).toBe('192.168.1.1');
    });
  });

  describe('lookupIp', () => {
    it('returns geolocation for a valid IP', async () => {
      const maxmind = await import('maxmind');
      const mockGet = (maxmind as unknown as { __mockGet: ReturnType<typeof vi.fn> }).__mockGet;
      mockGet.mockReturnValue({
        city: { names: { en: 'Paris' } },
        country: { names: { en: 'France' }, iso_code: 'FR' },
        location: { latitude: 48.8566, longitude: 2.3522, time_zone: 'Europe/Paris' },
      });

      const { lookupIp } = await import('./geolocation.service.ts');
      const result = await lookupIp('81.2.69.144');

      expect(result).toEqual({
        ip: '81.2.69.144',
        city: 'Paris',
        country: 'France',
        country_code: 'FR',
        location: { lat: 48.8566, lng: 2.3522 },
        timezone: 'Europe/Paris',
      });
    });

    it('returns null fields for private IP', async () => {
      const maxmind = await import('maxmind');
      const mockGet = (maxmind as unknown as { __mockGet: ReturnType<typeof vi.fn> }).__mockGet;
      mockGet.mockReturnValue(null);

      const { lookupIp } = await import('./geolocation.service.ts');
      const result = await lookupIp('127.0.0.1');

      expect(result.ip).toBe('127.0.0.1');
      expect(result.location).toBeNull();
      expect(result.timezone).toBeNull();
    });

    it('throws ApiError when MMDB file is missing', async () => {
      const maxmind = await import('maxmind');
      (maxmind.default.open as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('File not found')
      );

      // Force re-import to get a fresh module with null reader
      vi.resetModules();
      vi.doMock('maxmind', () => ({
        default: { open: vi.fn().mockRejectedValue(new Error('File not found')) },
      }));

      const { lookupIp } = await import('./geolocation.service.ts');
      await expect(lookupIp('1.1.1.1')).rejects.toThrow(
        'IP geolocation database is not configured'
      );
    });
  });

  describe('lookupTimezone', () => {
    it('returns timezone for valid coordinates', async () => {
      const { find } = await import('geo-tz');
      (find as ReturnType<typeof vi.fn>).mockReturnValue(['Europe/Paris']);

      const { lookupTimezone } = await import('./geolocation.service.ts');
      const result = await lookupTimezone(48.8566, 2.3522);

      expect(result.timezone).toBe('Europe/Paris');
      expect(result.location).toEqual({ lat: 48.8566, lng: 2.3522 });
      expect(typeof result.offset_minutes).toBe('number');
    });

    it('throws ApiError when no timezone found', async () => {
      const { find } = await import('geo-tz');
      (find as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const { lookupTimezone } = await import('./geolocation.service.ts');
      await expect(lookupTimezone(0, 0)).rejects.toThrow(
        'No timezone found for the given coordinates'
      );
    });
  });
});
