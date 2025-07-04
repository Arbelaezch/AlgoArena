-- Migration: Add profile fields to users table
-- File: migrations/YYYY-MM-DD-add-user-profile-fields.sql

-- Add new profile fields to users table
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20),
ADD COLUMN location VARCHAR(255),
ADD COLUMN bio TEXT,
ADD COLUMN avatar VARCHAR(500);

-- Update field constants comment for documentation
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.location IS 'User location (city, state, country)';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.avatar IS 'URL/path to user avatar image';