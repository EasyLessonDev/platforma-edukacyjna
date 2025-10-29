from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

import models
import schemas
import security
import email_service
from database import engine, get_db
from config import get_settings

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Education Platform API")
settings = get_settings()
security_scheme = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Education Platform API", "version": "1.0.0"}

@app.post("/api/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    if user_data.password != user_data.password_confirm:
        raise HTTPException(status_code=400, detail="Hasła nie są identyczne")
    
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username zajęty")
    
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email zajęty")
    
    verification_code = security.generate_verification_code()
    code_expires = datetime.utcnow() + timedelta(minutes=15)
    
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=security.get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_active=False,
        verification_code=verification_code,
        verification_code_expires=code_expires
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    await email_service.send_verification_email(new_user.email, new_user.username, verification_code)
    
    return {"user": new_user, "message": "Kod wysłany na email"}

@app.post("/api/verify-email")
async def verify_email(verify_data: schemas.VerifyEmail, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == verify_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nie znaleziony")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="Już zweryfikowane")
    
    if datetime.utcnow() > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Kod wygasł")
    
    if user.verification_code != verify_data.code:
        raise HTTPException(status_code=400, detail="Zły kod")
    
    user.is_active = True
    user.verification_code = None
    db.commit()
    
    access_token = security.create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/api/login")
async def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.username == login_data.login) | (models.User.email == login_data.login)
    ).first()
    
    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Błędny login lub hasło")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto niezweryfikowane")
    
    access_token = security.create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)