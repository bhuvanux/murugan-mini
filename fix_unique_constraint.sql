-- ==========================================================
-- CRITICAL FIX: DROP UNIQUE CONSTRAINT BLOCKING UPLOADS
-- ==========================================================

-- The error "duplicate key value violates unique constraint" is causing uploads to fail.
-- This constraint prevents logging "Admin Uploaded" event if it happened recently.
-- We must remove this constraint to allow the upload to proceed.

ALTER TABLE analytics_tracking 
DROP CONSTRAINT IF EXISTS analytics_tracking_module_name_item_id_event_type_ip_address_key;

-- Also ensure the check constraint is gone
ALTER TABLE analytics_tracking 
DROP CONSTRAINT IF EXISTS analytics_tracking_module_name_check;

-- Verify if constraints are gone
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'analytics_tracking'::regclass;
