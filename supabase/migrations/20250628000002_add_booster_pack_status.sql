-- Add status column to booster_packs table
-- This provides an alternative to the existing is_active boolean column
-- with more explicit 'active'/'inactive' string values

-- Add the status column with default value
ALTER TABLE booster_packs 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing records to set status based on is_active
UPDATE booster_packs 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  WHEN is_active = false THEN 'inactive'
  ELSE 'active'
END;

-- Create index for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_booster_packs_status ON booster_packs(status, sort_order);

-- Add trigger to keep status and is_active in sync
CREATE OR REPLACE FUNCTION sync_booster_pack_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is updated, sync is_active
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.is_active = (NEW.status = 'active');
  END IF;
  
  -- If is_active is updated, sync status
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    NEW.status = CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync status and is_active
CREATE TRIGGER trigger_sync_booster_pack_status
  BEFORE UPDATE ON booster_packs
  FOR EACH ROW
  EXECUTE FUNCTION sync_booster_pack_status();

-- Update the get_user_available_packs function to include status column
DROP FUNCTION IF EXISTS get_user_available_packs(UUID);

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
  status TEXT,
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
    bp.status,
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
