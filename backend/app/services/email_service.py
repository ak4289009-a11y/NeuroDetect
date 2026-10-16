import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from app.core.config import settings

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def is_valid_email_address(email: str) -> bool:
    """Validates basic RFC email address structure and presence of a domain."""
    if not email or not isinstance(email, str):
        return False
    clean = email.strip()
    return bool(EMAIL_REGEX.match(clean))

def send_brevo_api_email(to_email: str, subject: str, body_html: str) -> bool:
    """
    Delivers a transactional email using the official Brevo (Sendinblue) v3 REST API.
    Uses BREVO_API_KEY, BREVO_SENDER_EMAIL, and BREVO_SENDER_NAME from environment.
    Never prints or logs secret credentials or sensitive token payloads.
    """
    if not settings.BREVO_API_KEY or settings.BREVO_API_KEY.startswith("xkeysib-your_brevo_api_key"):
        return False
    if not is_valid_email_address(settings.BREVO_SENDER_EMAIL):
        print(f"[Brevo API Error] Invalid BREVO_SENDER_EMAIL domain configuration: '{settings.BREVO_SENDER_EMAIL}'.")
        return False
    if not is_valid_email_address(to_email):
        print(f"[Brevo API Error] Invalid recipient email address: '{to_email}'.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }
    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME or "NeuroDetect Security Desk",
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email.strip()}],
        "subject": subject,
        "htmlContent": body_html,
    }
    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code in (200, 201, 202):
                print(f"[Brevo API Success] Dispatched transactional email to {to_email} | Subject: '{subject}'")
                return True
            else:
                try:
                    err_data = response.json()
                    err_msg = err_data.get("message", response.text)
                except Exception:
                    err_msg = response.text
                print(f"[Brevo API Error] HTTP {response.status_code} from Brevo: {err_msg}")
                return False
    except Exception as exc:
        print(f"[Brevo API Network Error] Failed dispatch to {to_email}: {type(exc).__name__} - {str(exc)}")
        return False

def send_brevo_smtp_email(to_email: str, subject: str, body_html: str) -> bool:
    """
    Delivers transactional email via Brevo's authenticated SMTP relay (smtp-relay.brevo.com).
    Tries configured port (default 587) and automatically fails over to alternative port 2525.
    """
    smtp_key = settings.BREVO_SMTP_KEY or settings.BREVO_SMTP_PASSWORD or settings.SMTP_PASSWORD
    smtp_user = settings.BREVO_SMTP_USER or settings.BREVO_SMTP_LOGIN or settings.SMTP_USER
    sender_email = settings.BREVO_SENDER_EMAIL or settings.EMAIL_FROM or "neyro390@gmail.com"
    if not smtp_key or not smtp_user or smtp_key.startswith("xkeysib-your_brevo"):
        return False
    if not is_valid_email_address(to_email):
        print(f"[Brevo SMTP Error] Invalid recipient email: '{to_email}'")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.BREVO_SENDER_NAME} <{sender_email}>"
        msg["To"] = to_email
        html_part = MIMEText(body_html, "html")
        msg.attach(html_part)
        server_host = settings.BREVO_SMTP_SERVER or settings.SMTP_SERVER or "smtp-relay.brevo.com"
        configured_port = int(settings.BREVO_SMTP_PORT or settings.SMTP_PORT or 587)
        ports_to_try = [configured_port]
        if 2525 not in ports_to_try:
            ports_to_try.append(2525)

        for port in ports_to_try:
            try:
                with smtplib.SMTP(server_host, port, timeout=12) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_key)
                    server.sendmail(sender_email, [to_email], msg.as_string())
                print(f"[Brevo SMTP Success] Dispatched email to {to_email} via {server_host}:{port} | Subject: '{subject}'")
                return True
            except Exception as port_exc:
                print(f"[Brevo SMTP Notice] Attempt on {server_host}:{port} failed: {type(port_exc).__name__} - {port_exc}")
                if port == ports_to_try[-1]:
                    raise port_exc
        return False
    except Exception as exc:
        print(f"[Brevo SMTP Error] Dispatch failed to {to_email}: {type(exc).__name__} - {str(exc)}")
        return False

def send_legacy_smtp_email(to_email: str, subject: str, body_html: str) -> bool:
    """Fallback standard SMTP dispatch (e.g. Gmail) when configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_PASSWORD == "mockpassword":
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        html_part = MIMEText(body_html, "html")
        msg.attach(html_part)
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        print(f"[SMTP Success] Dispatched fallback email to {to_email} | Subject: '{subject}'")
        return True
    except Exception as exc:
        print(f"[SMTP Error] Failed fallback dispatch to {to_email}: {type(exc).__name__} - {str(exc)}")
        return False

def send_brevo_email(to_email: str, subject: str, body_html: str) -> bool:
    """Unified email dispatcher trying Brevo API, Brevo SMTP, then Legacy SMTP."""
    if send_brevo_api_email(to_email, subject, body_html):
        return True
    if send_brevo_smtp_email(to_email, subject, body_html):
        return True
    return send_legacy_smtp_email(to_email, subject, body_html)

def send_email_notification(to_email: str, subject: str, body_html: str) -> bool:
    """Entrypoint function for all clinical and auth notifications."""
    return send_brevo_email(to_email, subject, body_html)
