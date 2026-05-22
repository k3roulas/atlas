import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { pushTestSchema, seedTenant, truncateAll } from '@atlas/db';
import * as storesService from './stores.service.ts';

describe('stores service integration', () => {
  let tenantId: string;

  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
    const tenant = await seedTenant({ name: 'Stores Test' });
    tenantId = tenant.id;
  });

  describe('createStore', () => {
    it('creates a store with geometry', async () => {
      const result = await storesService.createStore(tenantId, {
        name: 'London Store',
        address: '10 Downing St, London',
        lat: 51.5033,
        lng: -0.1276,
      });

      expect(result.name).toBe('London Store');
      expect(result.address).toBe('10 Downing St, London');
      expect(result.location.lat).toBeCloseTo(51.5033, 1);
      expect(result.location.lng).toBeCloseTo(-0.1276, 1);
      expect(result.tenant_id).toBe(tenantId);
    });

    it('creates a store with tags and metadata', async () => {
      const result = await storesService.createStore(tenantId, {
        name: 'Tagged Store',
        address: '1 Test St',
        lat: 51.5,
        lng: -0.1,
        tags: ['cafe', 'wifi'],
        metadata: { rating: 4.5 },
      });

      expect(result.tags).toEqual(['cafe', 'wifi']);
      expect(result.metadata).toEqual({ rating: 4.5 });
    });
  });

  describe('getStoreById', () => {
    it('returns a store by id', async () => {
      const created = await storesService.createStore(tenantId, {
        name: 'Find Me',
        address: '1 Search St',
        lat: 51.5,
        lng: -0.1,
      });

      const found = await storesService.getStoreById(created.id, tenantId);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find Me');
    });

    it('returns null for non-existent store', async () => {
      const found = await storesService.getStoreById(
        '00000000-0000-0000-0000-000000000000',
        tenantId
      );
      expect(found).toBeNull();
    });

    it('returns null for store belonging to another tenant', async () => {
      const created = await storesService.createStore(tenantId, {
        name: 'Tenant A Store',
        address: '1 A St',
        lat: 51.5,
        lng: -0.1,
      });

      const otherTenant = await seedTenant({ name: 'Other' });
      const found = await storesService.getStoreById(created.id, otherTenant.id);
      expect(found).toBeNull();
    });
  });

  describe('updateStore', () => {
    it('updates store name and address', async () => {
      const created = await storesService.createStore(tenantId, {
        name: 'Original',
        address: '1 Old St',
        lat: 51.5,
        lng: -0.1,
      });

      const updated = await storesService.updateStore(created.id, tenantId, {
        name: 'Updated',
        address: '2 New St',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated');
      expect(updated?.address).toBe('2 New St');
    });

    it('returns null for non-existent store', async () => {
      const result = await storesService.updateStore(
        '00000000-0000-0000-0000-000000000000',
        tenantId,
        {
          name: 'Ghost',
        }
      );
      expect(result).toBeNull();
    });
  });

  describe('deleteStore', () => {
    it('deletes an existing store', async () => {
      const created = await storesService.createStore(tenantId, {
        name: 'Delete Me',
        address: '1 Gone St',
        lat: 51.5,
        lng: -0.1,
      });

      const deleted = await storesService.deleteStore(created.id, tenantId);
      expect(deleted).toBe(true);

      const found = await storesService.getStoreById(created.id, tenantId);
      expect(found).toBeNull();
    });

    it('returns false for non-existent store', async () => {
      const deleted = await storesService.deleteStore(
        '00000000-0000-0000-0000-000000000000',
        tenantId
      );
      expect(deleted).toBe(false);
    });
  });

  describe('searchStores', () => {
    it('searches by text query', async () => {
      await storesService.createStore(tenantId, {
        name: 'Camden Coffee',
        address: 'Camden High St',
        lat: 51.539,
        lng: -0.142,
      });
      await storesService.createStore(tenantId, {
        name: 'Soho Tea',
        address: 'Soho Square',
        lat: 51.515,
        lng: -0.132,
      });

      const results = await storesService.searchStores(tenantId, { query: 'Camden' });
      expect(results.data).toHaveLength(1);
      expect(results.data[0].name).toBe('Camden Coffee');
      expect(results.total).toBe(1);
    });

    it('searches by tags', async () => {
      await storesService.createStore(tenantId, {
        name: 'Cafe',
        address: '1 St',
        lat: 51.5,
        lng: -0.1,
        tags: ['cafe', 'wifi'],
      });
      await storesService.createStore(tenantId, {
        name: 'Restaurant',
        address: '2 St',
        lat: 51.5,
        lng: -0.1,
        tags: ['restaurant'],
      });

      const results = await storesService.searchStores(tenantId, { tags: ['cafe'] });
      expect(results.data).toHaveLength(1);
      expect(results.data[0].name).toBe('Cafe');
    });

    it('respects limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await storesService.createStore(tenantId, {
          name: `Store ${i}`,
          address: `${i} Test St`,
          lat: 51.5,
          lng: -0.1,
        });
      }

      const page1 = await storesService.searchStores(tenantId, { limit: 2, offset: 0 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await storesService.searchStores(tenantId, { limit: 2, offset: 2 });
      expect(page2.data).toHaveLength(2);
    });
  });

  describe('autocompleteStores', () => {
    it('returns stores matching prefix', async () => {
      await storesService.createStore(tenantId, {
        name: 'London Bridge Cafe',
        address: '1 Bridge St',
        lat: 51.508,
        lng: -0.0877,
      });
      await storesService.createStore(tenantId, {
        name: 'Camden Market',
        address: 'Camden Lock',
        lat: 51.539,
        lng: -0.142,
      });

      const results = await storesService.autocompleteStores(tenantId, 'London');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('London Bridge Cafe');
    });

    it('returns empty for no matches', async () => {
      const results = await storesService.autocompleteStores(tenantId, 'ZZZ');
      expect(results).toHaveLength(0);
    });
  });

  describe('bulkImport', () => {
    it('bulk imports multiple stores', async () => {
      const stores = Array.from({ length: 10 }, (_, i) => ({
        name: `Bulk Store ${i}`,
        address: `${i} Bulk St`,
        lat: 51.5 + i * 0.001,
        lng: -0.1 + i * 0.001,
        tags: ['bulk'],
      }));

      const result = await storesService.bulkImport(tenantId, stores);
      expect(result.created).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects imports exceeding limit', async () => {
      const stores = Array.from({ length: 1001 }, (_, i) => ({
        name: `Store ${i}`,
        address: `${i} St`,
        lat: 51.5,
        lng: -0.1,
      }));

      await expect(storesService.bulkImport(tenantId, stores)).rejects.toThrow(
        'Maximum 1000 stores per request'
      );
    });
  });
});
