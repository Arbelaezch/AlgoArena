-- UP migration
-- Create the role enum type
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin', 'moderator');

-- Add the role column with default value
ALTER TABLE users 
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Create index on role for performance
CREATE INDEX idx_users_role ON users(role);