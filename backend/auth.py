"""
Authentication module for FinanceFlow
Handles user registration, login, and JWT token management
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import os
import jwt

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str
    plan_type: str = "free_trial"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class AuthManager:
    def __init__(self, db):
        self.db = db
        self.secret = os.environ.get('JWT_SECRET', 'default_secret_change_me')
        self.algorithm = "HS256"
        self.token_expiry_hours = 24 * 7  # 7 days
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(password) == password_hash
    
    def create_token(self, user_id: str, email: str) -> str:
        """Create JWT token"""
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=self.token_expiry_hours),
            "iat": datetime.now(timezone.utc)
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def decode_token(self, token: str) -> Optional[dict]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def register(self, user_data: UserCreate) -> dict:
        """Register a new user"""
        # Check if email already exists
        existing = await self.db.users.find_one({"email": user_data.email})
        if existing:
            raise ValueError("Email já cadastrado")
        
        # Create user
        user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=self.hash_password(user_data.password)
        )
        
        # Save to database
        doc = user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await self.db.users.insert_one(doc)
        
        # Create token
        token = self.create_token(user.id, user.email)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "plan_type": user.plan_type
            }
        }
    
    async def login(self, login_data: UserLogin) -> dict:
        """Authenticate user and return token"""
        user_doc = await self.db.users.find_one({"email": login_data.email})
        
        if not user_doc:
            raise ValueError("Email ou senha incorretos")
        
        if not self.verify_password(login_data.password, user_doc['password_hash']):
            raise ValueError("Email ou senha incorretos")
        
        if not user_doc.get('is_active', True):
            raise ValueError("Conta desativada")
        
        # Create token
        token = self.create_token(user_doc['id'], user_doc['email'])
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_doc['id'],
                "email": user_doc['email'],
                "name": user_doc['name'],
                "plan_type": user_doc.get('plan_type', 'free_trial')
            }
        }
    
    async def get_current_user(self, token: str) -> Optional[dict]:
        """Get user from token"""
        payload = self.decode_token(token)
        if not payload:
            return None
        
        user_doc = await self.db.users.find_one({"id": payload['user_id']}, {"_id": 0, "password_hash": 0})
        return user_doc
    
    async def update_user_plan(self, user_id: str, plan_type: str):
        """Update user's plan type"""
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {"plan_type": plan_type}}
        )
