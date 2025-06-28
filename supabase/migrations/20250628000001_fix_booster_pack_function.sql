-- Fix get_user_available_packs function to return correct column names and all required fields

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_available_packs(UUID);

-- Recreate the function with correct column names and all required fields
CREATE OR REPLACE FUNCTION get_user_available_packs(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  is_premium BOOLEAN,
  asset_directory_name TEXT,
  cover_image_url TEXT,
  price_cents INTEGER,
  category TEXT,
  is_active BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  asset_count INTEGER,
  download_count INTEGER,
  usage_count INTEGER,
  is_owned BOOLEAN,
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.description,
    bp.is_premium,
    bp.asset_directory_name,
    bp.cover_image_url,
    bp.price_cents,
    bp.category,
    bp.is_active,
    bp.sort_order,
    bp.created_at,
    bp.updated_at,
    bp.asset_count,
    bp.download_count,
    bp.usage_count,
    (ubp.user_id IS NOT NULL) as is_owned,
    ubp.unlocked_at
  FROM booster_packs bp
  LEFT JOIN user_booster_packs ubp ON bp.id = ubp.booster_pack_id AND ubp.user_id = user_uuid
  WHERE bp.is_active = true
  ORDER BY bp.sort_order, bp.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_available_packs(UUID) TO authenticated;
