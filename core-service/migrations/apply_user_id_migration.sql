-- Migration: Add user_id column to learning_path table
-- SQLite compatible version

-- Add user_id column (nullable initially for existing data)
ALTER TABLE learning_path ADD COLUMN user_id INTEGER;

-- Create index for better query performance
CREATE INDEX idx_learning_path_user_id ON learning_path(user_id);

-- Update existing records to assign to first user in system
UPDATE learning_path SET user_id = (SELECT id FROM "user" ORDER BY id LIMIT 1) WHERE user_id IS NULL;
