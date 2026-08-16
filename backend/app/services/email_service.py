import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_email_notification(to_email: str, subject: str, body_html: str) -> bool:
    """
    Sends email notification via SMTP (Gmail).
    Returns True if successfully dispatched to SMTP host, False if credentials/connection failed.
    Never prints password or confidential tokens.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_PASSWORD == "mockpassword":
        print(f"[SMTP Notice] SMTP_PASSWORD is not configured in backend/.env. Email dispatch to {to_email} skipped.")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = to_email

        html_part = MIMEText(body_html, 'html')
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())

        print(f"[SMTP Email Success] Dispatched email to {to_email} | Subject: '{subject}'")
        return True
    except Exception as e:
        print(f"[SMTP Email Error] Failed to send email to {to_email}: {type(e).__name__} - {str(e)}")
        return False
