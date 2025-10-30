"""
System logowania dla aplikacji
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logging(log_level: str = "INFO"):
    """
    Konfiguruje logi dla aplikacji
    - Konsola: kolorowe logi
    - Plik: logs/app.log (wszystko)
    - Plik: logs/error.log (tylko błędy)
    """
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    root_logger.handlers.clear()
    
    # === KONSOLA ===
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # === PLIK: app.log (wszystko) ===
    log_path = Path("logs")
    log_path.mkdir(exist_ok=True)
    
    file_handler = RotatingFileHandler(
        filename=log_path / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # === PLIK: error.log (tylko błędy) ===
    error_handler = RotatingFileHandler(
        filename=log_path / "error.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    root_logger.addHandler(error_handler)
    
    # Info o uruchomieniu
    logger = logging.getLogger(__name__)
    logger.info("✅ System logowania zainicjalizowany")

def get_logger(name: str) -> logging.Logger:
    """Pobiera logger dla modułu"""
    return logging.getLogger(name)