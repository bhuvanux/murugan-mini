-- Make image_url nullable in notifications table
-- This allows notifications to be created without images

ALTER TABLE notifications 
ALTER COLUMN image_url DROP NOT NULL;
