// Booster Pack Service - Booster pack management and asset loading
// Handles booster pack access, asset loading, and usage tracking

import { supabase } from '../utils/supabase';
import { 
  BoosterPack, 
  BoosterPackWithOwnership, 
  UserBoosterPack,
  AssetInfo,
  ServiceResponse,
  PaginatedResponse
} from '../types/game';
import { loadCollectionAssets } from '../utils/assetLoader';

export class BoosterPackService {
  /**
   * Get all available booster packs with ownership status
   */
  static async getAvailablePacks(
    options: { includeInactive?: boolean, category?: string } = {}
  ): Promise<ServiceResponse<BoosterPackWithOwnership[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Use the database function to get packs with ownership status
      const { data, error } = await supabase.rpc('get_user_available_packs', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching available packs:', error);
        return { success: false, error: 'Failed to fetch available packs', code: 'DATABASE_ERROR' };
      }

      // Apply filters if needed
      let filteredPacks = data || [];

      if (!options.includeInactive) {
        filteredPacks = filteredPacks.filter(pack => pack.is_active);
      }

      if (options.category) {
        filteredPacks = filteredPacks.filter(pack => pack.category === options.category);
      }

      return { success: true, data: filteredPacks };
    } catch (error) {
      console.error('Unexpected error fetching available packs:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get user's owned booster packs
   */
  static async getUserPacks(): Promise<ServiceResponse<BoosterPack[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      const { data, error } = await supabase
        .from('user_booster_packs')
        .select(`
          booster_pack_id,
          booster_packs!inner(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user packs:', error);
        return { success: false, error: 'Failed to fetch user packs', code: 'DATABASE_ERROR' };
      }

      // Extract booster pack data
      const packs = data.map(item => item.booster_packs);

      return { success: true, data: packs };
    } catch (error) {
      console.error('Unexpected error fetching user packs:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get assets for a specific booster pack
   */
  static async getPackAssets(packId: string): Promise<ServiceResponse<AssetInfo[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Check if user owns this pack
      const { data: ownership, error: ownershipError } = await supabase
        .from('user_booster_packs')
        .select('booster_pack_id')
        .eq('user_id', user.id)
        .eq('booster_pack_id', packId)
        .single();

      if (ownershipError || !ownership) {
        return { success: false, error: 'You do not own this booster pack', code: 'PACK_NOT_OWNED' };
      }

      // Get pack details to find the asset directory
      const { data: pack, error: packError } = await supabase
        .from('booster_packs')
        .select('asset_directory_name')
        .eq('id', packId)
        .single();

      if (packError || !pack) {
        return { success: false, error: 'Booster pack not found', code: 'PACK_NOT_FOUND' };
      }

      // Load assets from the directory using assetLoader
      try {
        const assets = await this.loadAssetsFromDirectory(pack.asset_directory_name);
        return { success: true, data: assets };
      } catch (loadError) {
        console.error('Error loading assets:', loadError);
        return { success: false, error: 'Failed to load assets', code: 'ASSET_LOADING_ERROR' };
      }
    } catch (error) {
      console.error('Unexpected error fetching pack assets:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Track asset usage for analytics
   */
  static async trackAssetUsage(
    boosterPackId: string, 
    assetFilename: string, 
    gameId?: string,
    position?: { x: number, y: number }
  ): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Create a session ID if not provided (for grouping related usage)
      const sessionId = crypto.randomUUID();

      const usageData = {
        user_id: user.id,
        game_id: gameId,
        booster_pack_id: boosterPackId,
        asset_filename: assetFilename,
        session_id: sessionId,
        canvas_position: position ? JSON.stringify(position) : null
      };

      const { error } = await supabase
        .from('asset_usage_tracking')
        .insert(usageData);

      if (error) {
        console.error('Error tracking asset usage:', error);
        // Don't fail the operation for tracking errors, just log them
        console.warn('Failed to track asset usage, continuing operation');
      }

      // Update booster pack usage count
      await supabase.rpc('increment_booster_pack_usage', {
        pack_id: boosterPackId
      }).catch(err => {
        console.warn('Failed to increment booster pack usage count:', err);
      });

      return { success: true };
    } catch (error) {
      console.error('Unexpected error tracking asset usage:', error);
      // Don't fail the operation for tracking errors
      return { success: true };
    }
  }

  /**
   * Unlock a booster pack for a user (free packs only)
   */
  static async unlockFreePack(packId: string): Promise<ServiceResponse<UserBoosterPack>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Check if pack exists and is free
      const { data: pack, error: packError } = await supabase
        .from('booster_packs')
        .select('id, is_premium, price_cents')
        .eq('id', packId)
        .eq('is_active', true)
        .single();

      if (packError || !pack) {
        return { success: false, error: 'Booster pack not found', code: 'PACK_NOT_FOUND' };
      }

      if (pack.is_premium || pack.price_cents > 0) {
        return { success: false, error: 'This pack is not free', code: 'PACK_NOT_FREE' };
      }

      // Check if user already owns this pack
      const { data: existingPack } = await supabase
        .from('user_booster_packs')
        .select('booster_pack_id')
        .eq('user_id', user.id)
        .eq('booster_pack_id', packId)
        .single();

      if (existingPack) {
        return { success: false, error: 'You already own this pack', code: 'PACK_ALREADY_OWNED' };
      }

      // Add pack to user's collection
      const userPackData = {
        user_id: user.id,
        booster_pack_id: packId,
        purchase_method: 'free',
        purchase_price_cents: 0
      };

      const { data, error } = await supabase
        .from('user_booster_packs')
        .insert(userPackData)
        .select()
        .single();

      if (error) {
        console.error('Error unlocking free pack:', error);
        return { success: false, error: 'Failed to unlock pack', code: 'DATABASE_ERROR' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error unlocking free pack:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get asset usage statistics for a user
   */
  static async getUserAssetStats(): Promise<ServiceResponse<{
    total_assets_used: number;
    favorite_pack: { id: string; title: string; usage_count: number } | null;
    favorite_asset: { filename: string; pack_id: string; pack_title: string; usage_count: number } | null;
    usage_by_pack: Array<{ pack_id: string; pack_title: string; usage_count: number }>;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Get total assets used
      const { count: totalAssetsUsed, error: countError } = await supabase
        .from('asset_usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error counting assets used:', countError);
        return { success: false, error: 'Failed to count assets used', code: 'DATABASE_ERROR' };
      }

      // Get usage by pack
      const { data: usageByPack, error: usageError } = await supabase
        .from('asset_usage_tracking')
        .select(`
          booster_pack_id,
          booster_packs!inner(title)
        `)
        .eq('user_id', user.id);

      if (usageError) {
        console.error('Error fetching usage by pack:', usageError);
        return { success: false, error: 'Failed to fetch usage by pack', code: 'DATABASE_ERROR' };
      }

      // Process usage by pack
      const packUsageCounts: Record<string, { pack_id: string; pack_title: string; usage_count: number }> = {};
      
      usageByPack.forEach(usage => {
        const packId = usage.booster_pack_id;
        if (!packUsageCounts[packId]) {
          packUsageCounts[packId] = {
            pack_id: packId,
            pack_title: usage.booster_packs.title,
            usage_count: 0
          };
        }
        packUsageCounts[packId].usage_count++;
      });

      const usageByPackArray = Object.values(packUsageCounts).sort((a, b) => b.usage_count - a.usage_count);
      
      // Get favorite pack
      const favoritePack = usageByPackArray.length > 0 ? usageByPackArray[0] : null;

      // Get favorite asset
      const { data: assetUsage, error: assetError } = await supabase
        .from('asset_usage_tracking')
        .select(`
          asset_filename,
          booster_pack_id,
          booster_packs!inner(title)
        `)
        .eq('user_id', user.id);

      if (assetError) {
        console.error('Error fetching asset usage:', assetError);
        return { success: false, error: 'Failed to fetch asset usage', code: 'DATABASE_ERROR' };
      }

      // Process asset usage
      const assetUsageCounts: Record<string, { 
        filename: string; 
        pack_id: string; 
        pack_title: string; 
        usage_count: number 
      }> = {};
      
      assetUsage.forEach(usage => {
        const key = `${usage.booster_pack_id}:${usage.asset_filename}`;
        if (!assetUsageCounts[key]) {
          assetUsageCounts[key] = {
            filename: usage.asset_filename,
            pack_id: usage.booster_pack_id,
            pack_title: usage.booster_packs.title,
            usage_count: 0
          };
        }
        assetUsageCounts[key].usage_count++;
      });

      const assetUsageArray = Object.values(assetUsageCounts).sort((a, b) => b.usage_count - a.usage_count);
      const favoriteAsset = assetUsageArray.length > 0 ? assetUsageArray[0] : null;

      return { 
        success: true, 
        data: {
          total_assets_used: totalAssetsUsed || 0,
          favorite_pack: favoritePack,
          favorite_asset: favoriteAsset,
          usage_by_pack: usageByPackArray
        }
      };
    } catch (error) {
      console.error('Unexpected error fetching asset stats:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Load assets from a directory using assetLoader
   */
  private static async loadAssetsFromDirectory(directoryName: string): Promise<AssetInfo[]> {
    try {
      // Use the assetLoader utility to load assets from the directory
      const assets = await loadCollectionAssets(directoryName);
      
      // Transform to AssetInfo format
      return assets.map(asset => ({
        filename: asset.fileName,
        path: `${directoryName}/${asset.fileName}`,
        type: asset.format,
        thumbnail: asset.previewUrl,
        dimensions: asset.width && asset.height ? {
          width: asset.width,
          height: asset.height
        } : undefined
      }));
    } catch (error) {
      console.error(`Error loading assets from directory ${directoryName}:`, error);
      throw error;
    }
  }
}