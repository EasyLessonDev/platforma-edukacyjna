from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    password_confirm: str = Field(..., min_length=8, max_length=72)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    login: str
    password: str

class VerifyEmail(BaseModel):
    user_id: int
    code: str = Field(..., min_length=6, max_length=6)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ResendCode(BaseModel):
    """Schema dla ponownego wysłania kodu weryfikacyjnego"""
    user_id: int

class CheckUser(BaseModel):
    """Schema do sprawdzania czy user istnieje"""
    email: EmailStr