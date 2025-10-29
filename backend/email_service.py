"""
EMAIL SERVICE - Wysyłanie emaili przez Resend
=============================================

Cel: Wysyła emaile weryfikacyjne z 6-cyfrowym kodem

Funkcje:
- send_verification_email() - wysyła kod weryfikacyjny na email użytkownika

Konfiguracja:
- RESEND_API_KEY w .env - klucz API z resend.com
- FROM_EMAIL w .env - adres nadawcy (onboarding@resend.dev dla testów)

Ważne:
- Dla onboarding@resend.dev możesz wysyłać TYLKO na swój zweryfikowany email
- Dla własnej domeny możesz wysyłać wszędzie
- Kod HTML jest responsywny i ładny

Powiązane pliki:
- backend/config.py (pobiera ustawienia z .env)
- backend/main.py (wywołuje send_verification_email)
"""

import resend
from config import get_settings

settings = get_settings()
resend.api_key = settings.resend_api_key

async def send_verification_email(email: str, username: str, code: str) -> bool:
    """
    Wysyła email weryfikacyjny z 6-cyfrowym kodem
    
    Args:
        email: adres email odbiorcy
        username: nazwa użytkownika (do personalizacji)
        code: 6-cyfrowy kod weryfikacyjny
    
    Returns:
        True jeśli wysłano, False jeśli błąd
    """
    try:
        params = {
            "from": settings.from_email,
            "to": [email],
            "subject": "Weryfikacja konta - Platforma Edukacyjna",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .code-box {{ background: white; border: 2px dashed #667eea; padding: 20px;
                                text-align: center; font-size: 32px; font-weight: bold;
                                color: #667eea; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎓 Platforma Edukacyjna</h1>
                        <p>Witaj, {username}!</p>
                    </div>
                    <div class="content">
                        <p>Dziękujemy za rejestrację!</p>
                        <p>Użyj poniższego kodu weryfikacyjnego:</p>
                        <div class="code-box">{code}</div>
                        <p><strong>Kod jest ważny przez 15 minut.</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2025 Platforma Edukacyjna</p>
                    </div>
                </div>
            </body>
            </html>
            """
        }
        
        # DEBUGOWANIE - wypisz co wysyłasz
        print(f"📧 Próba wysłania emaila do: {email}")
        print(f"🔑 Kod weryfikacyjny: {code}")
        print(f"📤 From: {settings.from_email}")
        
        # Wyślij email
        response = resend.Emails.send(params)
        
        print(f"✅ Email wysłany pomyślnie! Response: {response}")
        return True
        
    except Exception as e:
        print(f"❌ BŁĄD wysyłania emaila: {e}")
        print(f"❌ Typ błędu: {type(e).__name__}")
        return False