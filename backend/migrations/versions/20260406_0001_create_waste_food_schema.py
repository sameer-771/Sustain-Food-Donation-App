"""create waste food management schema

Revision ID: 20260406_0001
Revises:
Create Date: 2026-04-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260406_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum("donor", "ngo", "individual", name="user_role", native_enum=False)
food_donation_status_enum = sa.Enum(
    "available",
    "claimed",
    "picked_up",
    "expired",
    name="food_donation_status",
    native_enum=False,
)
claim_status_enum = sa.Enum(
    "active",
    "cancelled",
    "completed",
    name="claim_status",
    native_enum=False,
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "food_donations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("donor_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("pickup_address", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", food_donation_status_enum, nullable=False, server_default="available"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["donor_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_food_donations_donor_id", "food_donations", ["donor_id"], unique=False)
    op.create_index("ix_food_donations_status", "food_donations", ["status"], unique=False)

    op.create_table(
        "claims",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("donation_id", sa.Integer(), nullable=False),
        sa.Column("claimant_user_id", sa.Integer(), nullable=False),
        sa.Column("claim_status", claim_status_enum, nullable=False, server_default="active"),
        sa.Column("claimed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["donation_id"], ["food_donations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["claimant_user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_claims_donation_id", "claims", ["donation_id"], unique=False)
    op.create_index("ix_claims_claimant_user_id", "claims", ["claimant_user_id"], unique=False)
    op.create_index("ix_claims_claim_status", "claims", ["claim_status"], unique=False)

    # Only one ACTIVE claim can exist for a donation at any time.
    op.create_index(
        "uq_claims_one_active_per_donation",
        "claims",
        ["donation_id"],
        unique=True,
        sqlite_where=sa.text("claim_status = 'active'"),
        postgresql_where=sa.text("claim_status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index("uq_claims_one_active_per_donation", table_name="claims")
    op.drop_index("ix_claims_claim_status", table_name="claims")
    op.drop_index("ix_claims_claimant_user_id", table_name="claims")
    op.drop_index("ix_claims_donation_id", table_name="claims")
    op.drop_table("claims")

    op.drop_index("ix_food_donations_status", table_name="food_donations")
    op.drop_index("ix_food_donations_donor_id", table_name="food_donations")
    op.drop_table("food_donations")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
