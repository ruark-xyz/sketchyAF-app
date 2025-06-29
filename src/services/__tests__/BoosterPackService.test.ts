import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BoosterPackService } from '../BoosterPackService';

describe('BoosterPackService', () => {
  describe('getAllPacks', () => {
    it('should return all booster packs without requiring authentication', async () => {
      const response = await BoosterPackService.getAllPacks();
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data && response.data.length > 0) {
        const pack = response.data[0];
        expect(pack).toHaveProperty('id');
        expect(pack).toHaveProperty('title');
        expect(pack).toHaveProperty('description');
        expect(pack).toHaveProperty('is_premium');
        expect(pack).toHaveProperty('price_cents');
        expect(pack).toHaveProperty('is_owned');
        
        // For public access, is_owned should be false since no user is authenticated
        expect(pack.is_owned).toBe(false);
      }
    });

    it('should filter inactive packs when includeInactive is false', async () => {
      const response = await BoosterPackService.getAllPacks({ includeInactive: false });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      
      if (response.data) {
        // All returned packs should be active
        response.data.forEach(pack => {
          expect(pack.is_active).toBe(true);
        });
      }
    });

    it('should filter by category when specified', async () => {
      const response = await BoosterPackService.getAllPacks({ category: 'memes' });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      
      if (response.data) {
        // All returned packs should have the specified category
        response.data.forEach(pack => {
          expect(pack.category).toBe('memes');
        });
      }
    });
  });

  describe('getAvailablePacks', () => {
    it('should return packs with ownership status when authenticated', async () => {
      const response = await BoosterPackService.getAvailablePacks();

      // Should succeed (test environment may have authenticated user)
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      if (response.data && response.data.length > 0) {
        const pack = response.data[0];
        expect(pack).toHaveProperty('is_owned');
        // is_owned can be true or false depending on test user state
        expect(typeof pack.is_owned).toBe('boolean');
      }
    });
  });
});
