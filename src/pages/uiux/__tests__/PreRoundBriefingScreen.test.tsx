import { describe, it, expect, vi } from 'vitest';
import { BoosterPackService } from '../../../services/BoosterPackService';
import { BoosterPackWithOwnership } from '../../../types/game';

// Mock the service
vi.mock('../../../services/BoosterPackService');

describe('PreRoundBriefingScreen Booster Pack Logic', () => {
  const mockBoosterPacks: BoosterPackWithOwnership[] = [
    {
      id: 'pack-1',
      title: 'Free Pack',
      description: 'A free pack for everyone',
      is_premium: false,
      is_owned: false,
      asset_directory_name: 'free-pack',
      cover_image_url: '',
      price_cents: 0,
      category: 'free',
      is_active: true,
      sort_order: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      asset_count: 10,
      download_count: 100,
      usage_count: 50,
      unlocked_at: undefined
    },
    {
      id: 'pack-2',
      title: 'Premium Pack (Owned)',
      description: 'A premium pack that user owns',
      is_premium: true,
      is_owned: true,
      asset_directory_name: 'premium-pack',
      cover_image_url: '',
      price_cents: 299,
      category: 'premium',
      is_active: true,
      sort_order: 2,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      asset_count: 20,
      download_count: 50,
      usage_count: 25,
      unlocked_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'pack-3',
      title: 'Premium Pack (Not Owned)',
      description: 'A premium pack that user does not own',
      is_premium: true,
      is_owned: false,
      asset_directory_name: 'premium-pack-locked',
      cover_image_url: '',
      price_cents: 499,
      category: 'premium',
      is_active: true,
      sort_order: 3,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      asset_count: 30,
      download_count: 25,
      usage_count: 10,
      unlocked_at: undefined
    }
  ];

  it('should filter booster packs correctly', () => {
    // Test the filtering logic that should be applied in the component
    const allPacks = mockBoosterPacks;

    // Filter to only show packs the user owns
    // ALL packs (both free and premium) must be explicitly owned
    const accessiblePacks = allPacks.filter(pack => {
      // User has access only if they own the pack
      return pack.is_owned;
    });

    expect(accessiblePacks).toHaveLength(1);
    expect(accessiblePacks.find(p => p.id === 'pack-1')).toBeUndefined(); // Free pack but not owned
    expect(accessiblePacks.find(p => p.id === 'pack-2')).toBeDefined(); // Owned premium pack
    expect(accessiblePacks.find(p => p.id === 'pack-3')).toBeUndefined(); // Unowned premium pack
  });

  it('should handle service response correctly', async () => {
    // Mock successful response
    vi.mocked(BoosterPackService.getAvailablePacks).mockResolvedValue({
      success: true,
      data: mockBoosterPacks
    });

    const result = await BoosterPackService.getAvailablePacks();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.error).toBeUndefined();
  });

  it('should handle service error correctly', async () => {
    // Mock error response
    vi.mocked(BoosterPackService.getAvailablePacks).mockResolvedValue({
      success: false,
      error: 'Failed to load packs'
    });

    const result = await BoosterPackService.getAvailablePacks();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load packs');
    expect(result.data).toBeUndefined();
  });

  it('should identify pack types correctly', () => {
    const freePack = mockBoosterPacks.find(p => p.id === 'pack-1')!;
    const ownedPremiumPack = mockBoosterPacks.find(p => p.id === 'pack-2')!;
    const unownedPremiumPack = mockBoosterPacks.find(p => p.id === 'pack-3')!;

    // Free pack should NOT be accessible unless owned
    expect(freePack.is_owned).toBe(false);

    // Owned premium pack should be accessible
    expect(ownedPremiumPack.is_owned).toBe(true);

    // Unowned premium pack should not be accessible
    expect(unownedPremiumPack.is_owned).toBe(false);
  });

  it('should handle empty pack list', () => {
    const emptyPacks: BoosterPackWithOwnership[] = [];
    const accessiblePacks = emptyPacks.filter(pack => pack.is_owned);

    expect(accessiblePacks).toHaveLength(0);
  });
});
