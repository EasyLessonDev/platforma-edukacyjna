import resend
from core.config import settings

# Ustaw klucz API
resend.api_key = settings.RESEND_API_KEY


class EmailService:
    """Serwis do wysyłania emaili przez Resend"""
    
    @staticmethod
    def send_verification_code(email: str, code: str, user_name: str = None):
        """
        Wysyła kod weryfikacyjny na email użytkownika
        
        Args:
            email: Email odbiorcy
            code: 6-cyfrowy kod weryfikacyjny
            user_name: Imię użytkownika (opcjonalne)
        
        Returns:
            dict: Status wysyłki
        """
        
        # Przygotuj treść HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .code-box {{
                    background-color: #f3f4f6;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 30px 0;
                }}
                .code {{
                    font-size: 36px;
                    font-weight: bold;
                    color: #4f46e5;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                }}
                .footer {{
                    margin-top: 30px;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }}
                .warning {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 12px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Weryfikacja Email</h1>
                </div>
                
                <p>Cześć{' ' + user_name if user_name else ''}! 👋</p>
                
                <p>Dziękujemy za rejestrację w naszej platformie edukacyjnej. 
                Aby dokończyć proces rejestracji, użyj poniższego kodu weryfikacyjnego:</p>
                
                <div class="code-box">
                    <div class="code">{code}</div>
                </div>
                
                <div class="warning">
                    ⏱️ <strong>Kod jest ważny przez 15 minut.</strong>
                </div>
                
                <p>Jeśli nie rejestrowałeś się w naszym serwisie, zignoruj tę wiadomość.</p>
                
                <div class="footer">
                    <p>Pozdrawiamy,<br>
                    <strong>Zespół Platformy Edukacyjnej</strong></p>
                    
                    <p style="font-size: 12px; color: #9ca3af;">
                    Ta wiadomość została wysłana automatycznie. Proszę nie odpowiadaj na ten email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Wersja tekstowa (fallback)
        text_content = f"""
        Weryfikacja Email
        
        Cześć{' ' + user_name if user_name else ''}!
        
        Twój kod weryfikacyjny: {code}
        
        Kod jest ważny przez 15 minut.
        
        Jeśli nie rejestrowałeś się w naszym serwisie, zignoruj tę wiadomość.
        
        Pozdrawiamy,
        Zespół Platformy Edukacyjnej
        """
        
        try:
            # Wyślij email przez Resend
            params = {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [email],
                "subject": "Kod weryfikacyjny - Platforma Edukacyjna",
                "html": html_content,
                "text": text_content,
            }
            
            response = resend.Emails.send(params)
            
            print(f"✅ Email wysłany do {email}, ID: {response.get('id')}")
            
            return {
                "success": True,
                "message_id": response.get("id"),
                "email": email
            }
            
        except Exception as e:
            print(f"❌ Błąd wysyłania emaila do {email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "email": email
            }
    
    @staticmethod
    def send_password_reset(email: str, reset_link: str, user_name: str = None):
        """Wysyła link do resetu hasła"""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body>
            <h2>🔑 Reset hasła</h2>
            <p>Cześć{' ' + user_name if user_name else ''}!</p>
            <p>Otrzymaliśmy prośbę o zresetowanie hasła. Kliknij poniższy link:</p>
            <p><a href="{reset_link}" style="padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">Zresetuj hasło</a></p>
            <p>Link jest ważny przez 1 godzinę.</p>
            <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
        </body>
        </html>
        """
        
        try:
            params = {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [email],
                "subject": "Reset hasła - Platforma Edukacyjna",
                "html": html_content,
            }
            
            response = resend.Emails.send(params)
            return {"success": True, "message_id": response.get("id")}
            
        except Exception as e:
            print(f"❌ Błąd: {str(e)}")
            return {"success": False, "error": str(e)}