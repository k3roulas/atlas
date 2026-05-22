import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { pushTestSchema, seedTenant, truncateAll } from '@atlas/db';
import * as stylesService from './styles.service.ts';

describe('map module integration', () => {
  let tenantId: string;

  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
    const tenant = await seedTenant({ name: 'Map Test' });
    tenantId = tenant.id;
  });

  describe('styles', () => {
    describe('createStyle', () => {
      it('creates a style', async () => {
        const created = await stylesService.createStyle(tenantId, 'Custom Dark', {
          version: 8,
          name: 'Custom Dark',
          sources: {},
          layers: [],
        });

        expect(created.name).toBe('Custom Dark');
        expect(created.tenantId).toBe(tenantId);
        expect(created.isDefault).toBe(false);
      });
    });

    describe('getStyles', () => {
      it('returns tenant styles', async () => {
        await stylesService.createStyle(tenantId, 'Style A', { version: 8 });
        await stylesService.createStyle(tenantId, 'Style B', { version: 8 });

        const styles = await stylesService.getStyles(tenantId);

        expect(styles).toHaveLength(2);
        expect(styles.map((s) => s.name).sort()).toEqual(['Style A', 'Style B']);
      });
    });

    describe('getStyleById', () => {
      it('returns style by id', async () => {
        const created = await stylesService.createStyle(tenantId, 'My Style', {
          version: 8,
          layers: [{ id: 'bg', type: 'background' }],
        });

        const found = await stylesService.getStyleById(created.id, tenantId);

        expect(found).not.toBeNull();
        expect(found?.name).toBe('My Style');
        expect((found?.styleJson as { layers: unknown[] }).layers).toHaveLength(1);
      });

      it('returns null for non-existent style', async () => {
        const found = await stylesService.getStyleById(
          '00000000-0000-0000-0000-000000000000',
          tenantId
        );
        expect(found).toBeNull();
      });

      it('returns null for non-default style belonging to another tenant', async () => {
        const otherTenant = await seedTenant({ name: 'Other' });
        const created = await stylesService.createStyle(otherTenant.id, 'Other Style', {
          version: 8,
        });

        const found = await stylesService.getStyleById(created.id, tenantId);
        expect(found).toBeNull();
      });
    });

    describe('deleteStyle', () => {
      it('deletes own style', async () => {
        const created = await stylesService.createStyle(tenantId, 'Delete Me', { version: 8 });

        const deleted = await stylesService.deleteStyle(created.id, tenantId);
        expect(deleted).toBe(true);

        const found = await stylesService.getStyleById(created.id, tenantId);
        expect(found).toBeNull();
      });

      it('returns false for non-existent style', async () => {
        const deleted = await stylesService.deleteStyle(
          '00000000-0000-0000-0000-000000000000',
          tenantId
        );
        expect(deleted).toBe(false);
      });

      it('returns false for style belonging to another tenant', async () => {
        const otherTenant = await seedTenant({ name: 'Other' });
        const created = await stylesService.createStyle(otherTenant.id, 'Other Style', {
          version: 8,
        });

        const deleted = await stylesService.deleteStyle(created.id, tenantId);
        expect(deleted).toBe(false);
      });
    });

    describe('default styles', () => {
      const testUrls = {
        basemapUrl: 'https://tiles.example.com/basemap',
        tilejsonUrl: 'https://tiles.example.com/tilejson.json',
      };

      it('getDefaultLightStyle replaces both source URLs', () => {
        const style = stylesService.getDefaultLightStyle(testUrls);

        const sources = style.sources as Record<string, { url?: string; tiles?: string[] }>;
        expect(sources.atlas.url).toBe('https://tiles.example.com/tilejson.json');
        expect(sources.basemap.tiles).toEqual([
          'https://tiles.example.com/basemap/{z}/{x}/{y}.pbf',
        ]);
      });

      it('getDefaultDarkStyle replaces both source URLs', () => {
        const style = stylesService.getDefaultDarkStyle(testUrls);

        const sources = style.sources as Record<string, { url?: string; tiles?: string[] }>;
        expect(sources.atlas.url).toBe('https://tiles.example.com/tilejson.json');
        expect(sources.basemap.tiles).toEqual([
          'https://tiles.example.com/basemap/{z}/{x}/{y}.pbf',
        ]);
      });

      it('layers reference basemap source', () => {
        const style = stylesService.getDefaultLightStyle(testUrls);
        const layers = style.layers as Array<{ source?: string }>;

        const basemapLayers = layers.filter((l) => l.source === 'basemap');
        expect(basemapLayers.length).toBeGreaterThan(0);
      });
    });
  });
});
