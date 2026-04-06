from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    role: Literal["donor", "receiver"]


class UserCreate(UserBase):
    password: str = Field(min_length=4)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: str
