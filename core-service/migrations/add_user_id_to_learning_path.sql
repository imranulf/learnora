-- Migration: Add user_id column to learning_path table
-- Date: 2025-11-02
-- Description: Add user_id foreign key to support user-scoped learning paths

-- Add user_id column (nullable initially for existing data)
ALTER TABLE learning_path 
ADD COLUMN user_id INTEGER;

-- Add foreign key constraint
ALTER TABLE learning_path 
ADD CONSTRAINT fk_learning_path_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_learning_path_user_id ON learning_path(user_id);

-- Update existing records to assign to a default user (if needed)
-- Option 1: Set to first user in system
-- UPDATE learning_path SET user_id = (SELECT id FROM "user" ORDER BY id LIMIT 1) WHERE user_id IS NULL;

-- Option 2: Delete orphaned records (if no users exist)
-- DELETE FROM learning_path WHERE user_id IS NULL;

-- Make user_id NOT NULL after migration (uncomment after data migration)
-- ALTER TABLE learning_path ALTER COLUMN user_id SET NOT NULL;
