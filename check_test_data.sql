
-- Check if user exists
SELECT id, phone FROM users WHERE phone = '+918940423231' OR phone = '8940423231';
-- Check for active welcome banner
SELECT id, title, is_welcome_banner, display_orientation FROM banners WHERE is_welcome_banner = true;
-- Check any banners available to promote if needed
SELECT id, title, image_url FROM banners LIMIT 1;

