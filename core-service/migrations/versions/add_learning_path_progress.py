"""
Add learning_path_progress table

Revision ID: add_learning_path_progress
Create Date: 2025-11-03 19:21:42
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers
revision = 'add_learning_path_progress'
down_revision = None  # Set this to the previous migration ID if you have migrations
depends_on = None


def upgrade():
    """Create learning_path_progress table"""
    op.create_table(
        'learning_path_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=50), nullable=False),
        sa.Column('concept_name', sa.String(length=255), nullable=False),
        sa.Column('mastery_level', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='not_started'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_interaction_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_time_spent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content_count', sa.Integer(), nullable=False, server_default='0'),
        
        # Primary key
        sa.PrimaryKeyConstraint('id'),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.ForeignKeyConstraint(['thread_id'], ['learning_path.conversation_thread_id']),
        
        # Unique constraint
        sa.UniqueConstraint('user_id', 'thread_id', 'concept_name', name='uix_user_thread_concept')
    )
    
    # Create indexes
    op.create_index('idx_learning_path_progress_user', 'learning_path_progress', ['user_id'])
    op.create_index('idx_learning_path_progress_thread', 'learning_path_progress', ['thread_id'])
    op.create_index('idx_learning_path_progress_status', 'learning_path_progress', ['status'])


def downgrade():
    """Drop learning_path_progress table"""
    op.drop_index('idx_learning_path_progress_status', 'learning_path_progress')
    op.drop_index('idx_learning_path_progress_thread', 'learning_path_progress')
    op.drop_index('idx_learning_path_progress_user', 'learning_path_progress')
    op.drop_table('learning_path_progress')
