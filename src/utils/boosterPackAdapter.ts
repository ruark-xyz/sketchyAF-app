// Booster Pack UI Adapter
// Transforms database BoosterPack records to UI-friendly format

import { BoosterPack, BoosterPackWithOwnership } from '../types/game';
import { LegacyBoosterPack, BoosterPackBadge } from '../types/index';

/**
 * Transform a database BoosterPack to UI-friendly format
 */
export function transformBoosterPackForUI(pack: BoosterPack | BoosterPackWithOwnership): LegacyBoosterPack & { 
  isOwned?: boolean; 
  unlockedAt?: string;
  realPriceCents?: number;
  isPremium?: boolean;
  assetCount?: number;
  usageCount?: number;
  downloadCount?: number;
} {
  const isOwned = 'is_owned' in pack ? pack.is_owned : undefined;
  const unlockedAt = 'unlocked_at' in pack ? pack.unlocked_at : undefined;

  // Generate badges based on pack properties
  const badges: BoosterPackBadge[] = [];
  
  if (pack.is_premium) {
    badges.push({ text: 'Premium', type: 'subscriber-perk' });
  }
  
  // Add "New" badge for packs created in the last 30 days
  const createdDate = new Date(pack.created_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (createdDate > thirtyDaysAgo) {
    badges.push({ text: 'New', type: 'new' });
  }

  // Determine price display
  let priceDisplay: string;
  let packType: 'free' | 'paid' | 'premium';
  
  if (pack.price_cents === 0) {
    priceDisplay = 'Free';
    packType = 'free';
  } else if (pack.is_premium) {
    priceDisplay = 'Premium';
    packType = 'premium';
  } else {
    priceDisplay = `$${(pack.price_cents / 100).toFixed(2)}`;
    packType = 'paid';
  }

  return {
    id: pack.id,
    name: pack.title,
    description: pack.description || '',
    price: priceDisplay,
    type: packType,
    items: [], // Will be populated when assets are loaded
    image: pack.cover_image_url || '/images/default-pack-cover.jpg',
    badges: badges.length > 0 ? badges : undefined,
    isPartnerCurated: false, // TODO: Add partner support later
    partnerInfo: undefined,
    
    // Additional properties for enhanced functionality
    isOwned,
    unlockedAt,
    realPriceCents: pack.price_cents,
    isPremium: pack.is_premium,
    assetCount: pack.asset_count,
    usageCount: pack.usage_count,
    downloadCount: pack.download_count,
  };
}

/**
 * Get formatted price display for a booster pack
 */
export function getPackPriceDisplay(pack: BoosterPack): string {
  if (pack.price_cents === 0) {
    return 'Free';
  } else if (pack.is_premium) {
    return 'Premium';
  } else {
    return `$${(pack.price_cents / 100).toFixed(2)}`;
  }
}

/**
 * Get pack type for UI styling
 */
export function getPackType(pack: BoosterPack): 'free' | 'paid' | 'premium' {
  if (pack.price_cents === 0) {
    return 'free';
  } else if (pack.is_premium) {
    return 'premium';
  } else {
    return 'paid';
  }
}

/**
 * Check if a pack can be unlocked for free
 */
export function canUnlockForFree(pack: BoosterPack): boolean {
  return pack.price_cents === 0 && !pack.is_premium;
}

/**
 * Get display image URL with fallback
 */
export function getPackImageUrl(pack: BoosterPack): string {
  return pack.cover_image_url || '/images/default-pack-cover.jpg';
}
