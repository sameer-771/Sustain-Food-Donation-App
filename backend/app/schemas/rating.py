from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    listingId: str
    userId: str | None = None
    rating: int = Field(ge=1, le=5)
    feedback: str | None = None
    timestamp: str
