"""
DATABASE CONNECTION - PostgreSQL (Neon)
========================================

Cel: Zarządza połączeniem z bazą danych PostgreSQL

Konfiguracja:
- DATABASE_URL z .env - connection string do Neon
- Pool z connection recycling (rozwiązuje SSL timeout)

Powiązane pliki:
- backend/config.py (pobiera DATABASE_URL)
- backend/models.py (definiuje tabele)
- backend/main.py (używa get_db)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

# Engine z pool_pre_ping (sprawdza połączenie przed użyciem)
# pool_recycle (1800s = 30min) - odnawia połączenie przed timeout
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Sprawdza czy połączenie żyje
    pool_recycle=1800,   # Odnawia połączenie co 30 minut
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Generator sesji bazy danych
    Używany jako Depends() w FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()