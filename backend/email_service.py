import resend
from config import get_settings

settings = get_settings()
resend.api_key = settings.resend_api_key

async def send_verification_email(email: str, username: str, code: str) -> bool:
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
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False