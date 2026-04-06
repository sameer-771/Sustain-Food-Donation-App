import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

CASCADE_DELETE_ORPHAN = "all, delete-orphan"


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    DONOR = "donor"
    NGO = "ngo"
    INDIVIDUAL = "individual"


class FoodDonationStatus(str, enum.Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    PICKED_UP = "picked_up"
    EXPIRED = "expired"


class ClaimStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    donations: Mapped[list["FoodDonation"]] = relationship(
        back_populates="donor",
        foreign_keys="FoodDonation.donor_id",
        cascade=CASCADE_DELETE_ORPHAN,
    )
    claims: Mapped[list["Claim"]] = relationship(
        back_populates="claimant",
        foreign_keys="Claim.claimant_user_id",
        cascade=CASCADE_DELETE_ORPHAN,
    )


class FoodDonation(Base):
    __tablename__ = "food_donations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    donor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    pickup_address: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[FoodDonationStatus] = mapped_column(
        Enum(FoodDonationStatus, name="food_donation_status", native_enum=False),
        nullable=False,
        default=FoodDonationStatus.AVAILABLE,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    donor: Mapped["User"] = relationship(back_populates="donations", foreign_keys=[donor_id])
    claims: Mapped[list["Claim"]] = relationship(
        back_populates="donation",
        cascade=CASCADE_DELETE_ORPHAN,
    )


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (
        # Enforces one active claim per donation while still allowing claim history.
        Index(
            "uq_claims_one_active_per_donation",
            "donation_id",
            unique=True,
            sqlite_where=text("claim_status = 'active'"),
            postgresql_where=text("claim_status = 'active'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    donation_id: Mapped[int] = mapped_column(
        ForeignKey("food_donations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claimant_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus, name="claim_status", native_enum=False),
        nullable=False,
        default=ClaimStatus.ACTIVE,
        index=True,
    )
    claimed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    donation: Mapped["FoodDonation"] = relationship(back_populates="claims")
    claimant: Mapped["User"] = relationship(back_populates="claims", foreign_keys=[claimant_user_id])
