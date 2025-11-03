"""
Database Migration Helper for Learning Path User Scoping
Run this script to apply the user_id migration to learning_path table
"""

import asyncio
from sqlalchemy import text
from app.database import get_db
from app.features.users.models import User


async def run_migration():
    """Apply user_id column to learning_path table"""
    
    print("🔧 Starting Learning Path User ID Migration...")
    
    async for db in get_db():
        try:
            # Check if user_id column already exists
            check_column = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='learning_path' AND column_name='user_id';
            """)
            result = await db.execute(check_column)
            column_exists = result.fetchone() is not None
            
            if column_exists:
                print("✅ user_id column already exists. Skipping migration.")
                return
            
            print("📝 Adding user_id column...")
            
            # Add user_id column
            await db.execute(text("""
                ALTER TABLE learning_path 
                ADD COLUMN user_id INTEGER;
            """))
            
            print("🔗 Adding foreign key constraint...")
            
            # Add foreign key constraint
            await db.execute(text("""
                ALTER TABLE learning_path 
                ADD CONSTRAINT fk_learning_path_user_id 
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
            """))
            
            print("📊 Creating index...")
            
            # Create index
            await db.execute(text("""
                CREATE INDEX idx_learning_path_user_id ON learning_path(user_id);
            """))
            
            print("👤 Migrating existing data...")
            
            # Get first user to assign existing paths
            user_query = text("SELECT id FROM \"user\" ORDER BY id LIMIT 1;")
            user_result = await db.execute(user_query)
            first_user = user_result.fetchone()
            
            if first_user:
                user_id = first_user[0]
                print(f"   Assigning existing paths to user_id={user_id}")
                
                # Update existing records
                await db.execute(
                    text("UPDATE learning_path SET user_id = :user_id WHERE user_id IS NULL;"),
                    {"user_id": user_id}
                )
            else:
                print("⚠️  No users found. Deleting orphaned learning paths...")
                await db.execute(text("DELETE FROM learning_path WHERE user_id IS NULL;"))
            
            print("🔒 Setting NOT NULL constraint...")
            
            # Make user_id NOT NULL
            await db.execute(text("""
                ALTER TABLE learning_path 
                ALTER COLUMN user_id SET NOT NULL;
            """))
            
            # Commit all changes
            await db.commit()
            
            print("✅ Migration completed successfully!")
            print("\n📋 Summary:")
            
            # Get counts
            count_result = await db.execute(text("SELECT COUNT(*) FROM learning_path;"))
            total_paths = count_result.fetchone()[0]
            
            user_count_result = await db.execute(text("""
                SELECT COUNT(DISTINCT user_id) FROM learning_path;
            """))
            unique_users = user_count_result.fetchone()[0]
            
            print(f"   Total Learning Paths: {total_paths}")
            print(f"   Unique Users: {unique_users}")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Migration failed: {e}")
            raise
        finally:
            break  # Only use first db session


if __name__ == "__main__":
    print("=" * 60)
    print("Learning Path User ID Migration")
    print("=" * 60)
    print()
    
    asyncio.run(run_migration())
    
    print()
    print("=" * 60)
    print("Migration process completed")
    print("=" * 60)
