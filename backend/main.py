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

app = FastAPI(title="Education Platform API")
settings = get_settings()
security_scheme = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://platforma-edukacyjna-one.vercel.app",
        "https://*.vercel.app",  # Dla preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Education Platform API", "version": "1.0.0"}

@app.post("/api/register", response_model=schemas.RegisterResponse)
async def register(user_data: schemas.RegisterUser, db: Session = Depends(get_db)):
    """
    Rejestracja nowego użytkownika
    1. Sprawdza czy email/username już istnieje
    2. Hashuje hasło
    3. Generuje 6-cyfrowy kod weryfikacyjny
    4. Wysyła email z kodem
    5. Zwraca dane użytkownika
    """
    # Sprawdź czy email już istnieje
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email zajęty")
    
    # Sprawdź czy username już istnieje
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Nazwa użytkownika zajęta")
    
    # Hashuj hasło
    hashed_password = security.hash_password(user_data.password)
    
    # Generuj kod weryfikacyjny (6 cyfr)
    verification_code = security.generate_verification_code()
    code_expires = datetime.utcnow() + timedelta(minutes=15)
    
    # Stwórz użytkownika
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=False,  # Niezweryfikowany
        verification_code=verification_code,
        verification_code_expires=code_expires
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Wyślij email z kodem weryfikacyjnym
    await email_service.send_verification_email(new_user.email, new_user.username, verification_code)
    
    # 🚧 DEV MODE - zwróć kod w response (usuń przed produkcją!)
    return {
        "user": new_user, 
        "message": "Użytkownik zarejestrowany. Sprawdź email.",
        "verification_code": verification_code  # ← TYMCZASOWO!
    }

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
async def login(login_data: schemas.LoginData, db: Session = Depends(get_db)):  # ← POPRAWIONE!
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

@app.post("/api/resend-code")
async def resend_code(resend_data: schemas.ResendCode, db: Session = Depends(get_db)):
    """
    Endpoint do ponownego wysłania kodu weryfikacyjnego
    Używany gdy użytkownik nie otrzymał lub stracił kod
    """
    user = db.query(models.User).filter(models.User.id == resend_data.user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User nie znaleziony")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="Konto już zweryfikowane")
    
    # Generuj nowy kod
    verification_code = security.generate_verification_code()
    code_expires = datetime.utcnow() + timedelta(minutes=15)
    
    user.verification_code = verification_code
    user.verification_code_expires = code_expires
    db.commit()
    
    # Wyślij email
    await email_service.send_verification_email(user.email, user.username, verification_code)
    
    # 🚧 DEV MODE - zwróć kod
    return {
        "message": "Nowy kod wysłany na email",
        "verification_code": verification_code  # ← TYMCZASOWO!
    }

@app.post("/api/check-user")
async def check_user(check_data: schemas.CheckUser, db: Session = Depends(get_db)):
    """
    Sprawdza czy użytkownik istnieje i czy jest zweryfikowany
    Jeśli istnieje ale niezweryfikowany - wysyła nowy kod
    """
    user = db.query(models.User).filter(models.User.email == check_data.email).first()
    
    if not user:
        return {"exists": False, "verified": False}
    
    if user.is_active:
        return {"exists": True, "verified": True}
    
    # User istnieje ale niezweryfikowany - wyślij nowy kod
    verification_code = security.generate_verification_code()
    code_expires = datetime.utcnow() + timedelta(minutes=15)
    
    user.verification_code = verification_code
    user.verification_code_expires = code_expires
    db.commit()
    
    # Wyślij email
    await email_service.send_verification_email(user.email, user.username, verification_code)
    
    return {
        "exists": True, 
        "verified": False, 
        "user_id": user.id,
        "message": "Nowy kod wysłany na email"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)