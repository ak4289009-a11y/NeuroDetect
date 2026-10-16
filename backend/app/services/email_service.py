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

_last_email_error = None

def get_last_email_error() -> str:
    global _last_email_error
    return _last_email_error or ""

def set_last_email_error(err: str):
    global _last_email_error
    _last_email_error = err

def send_brevo_smtp_email(to_email: str, subject: str, body_html: str) -> bool:
    """
    Delivers transactional email via Brevo's authenticated SMTP relay (smtp-relay.brevo.com).
    Tries configured port (587), alternative port (2525), and SSL port (465) for maximum cloud hosting resilience.
    """
    smtp_key = (settings.BREVO_SMTP_KEY or settings.BREVO_SMTP_PASSWORD or settings.SMTP_PASSWORD or "").strip()
    smtp_user = (settings.BREVO_SMTP_USER or settings.BREVO_SMTP_LOGIN or settings.SMTP_USER or "").strip()
    sender_email = (settings.BREVO_SENDER_EMAIL or settings.EMAIL_FROM or "neyro390@gmail.com").strip()
    sender_name = (settings.BREVO_SENDER_NAME or "NeuroDetect Medical Portal").strip()
    server_host = (settings.BREVO_SMTP_SERVER or "smtp-relay.brevo.com").strip()

    if not smtp_key or not smtp_user or smtp_key.startswith("xkeysib-your_brevo"):
        print("[Brevo SMTP Error] No valid SMTP credentials found in environment variables.")
        set_last_email_error("No valid Brevo SMTP credentials configured in environment variables.")
        return False
    if not is_valid_email_address(to_email):
        print(f"[Brevo SMTP Error] Invalid recipient email address: '{to_email}'")
        set_last_email_error(f"Invalid recipient email address: '{to_email}'")
        return False

    try:
        import email.utils
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = to_email.strip()
        msg["Reply-To"] = sender_email
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid(domain="smtp-brevo.com")

        # Dual plain-text + HTML format prevents mail servers from classifying as spam
        plain_text = re.sub(r"<[^>]+>", " ", body_html).strip()
        plain_text = re.sub(r"\s+", " ", plain_text)
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        # 1. Try STARTTLS on Port 587 and Port 2525
        for port in [587, 2525]:
            try:
                with smtplib.SMTP(server_host, port, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_key)
                    server.sendmail(sender_email, [to_email.strip()], msg.as_string())
                print(f"[Brevo SMTP Success] Dispatched email to {to_email} via {server_host}:{port} (STARTTLS) | Subject: '{subject}'")
                set_last_email_error("")
                return True
            except Exception as port_exc:
                err_str = str(port_exc)
                print(f"[Brevo SMTP Notice] Attempt on {server_host}:{port} failed: {type(port_exc).__name__} - {port_exc}")
                if "525" in err_str or "Unauthorized IP" in err_str:
                    set_last_email_error("Brevo SMTP rejected connection (525 Unauthorized IP address). Your Brevo account is restricting access to whitelisted IPs. To resolve: Log into Brevo > Settings > Security > Authorized IPs and click 'Deactivate' on IP blocking, or approve the authorization email sent to your registered Brevo email address.")

        # 2. Try SSL on Port 465 (Essential fallback for cloud platforms like Render where 587/2525 can be restricted)
        try:
            with smtplib.SMTP_SSL(server_host, 465, timeout=10) as server:
                server.ehlo()
                server.login(smtp_user, smtp_key)
                server.sendmail(sender_email, [to_email.strip()], msg.as_string())
            print(f"[Brevo SMTP Success] Dispatched email to {to_email} via {server_host}:465 (SSL) | Subject: '{subject}'")
            set_last_email_error("")
            return True
        except Exception as ssl_exc:
            err_str = str(ssl_exc)
            print(f"[Brevo SMTP Notice] Attempt on {server_host}:465 (SSL) failed: {type(ssl_exc).__name__} - {ssl_exc}")
            if "525" in err_str or "Unauthorized IP" in err_str:
                set_last_email_error("Brevo SMTP rejected connection (525 Unauthorized IP address). Your Brevo account is restricting access to whitelisted IPs. To resolve: Log into Brevo > Settings > Security > Authorized IPs and click 'Deactivate' on IP blocking, or approve the authorization email sent to your registered Brevo email address.")

        return False
    except Exception as exc:
        print(f"[Brevo SMTP Error] Dispatch failed to {to_email}: {type(exc).__name__} - {str(exc)}")
        return False

def send_legacy_smtp_email(to_email: str, subject: str, body_html: str) -> bool:
    """Fallback standard SMTP dispatch (e.g. Gmail) when configured."""
    server_host = (settings.SMTP_SERVER or "").strip()
    smtp_user = (settings.SMTP_USER or "").strip()
    smtp_pass = (settings.SMTP_PASSWORD or "").strip()
    sender_email = (settings.EMAIL_FROM or settings.BREVO_SENDER_EMAIL or "neyro390@gmail.com").strip()
    port = int(settings.SMTP_PORT or 587)

    if not server_host or not smtp_user or not smtp_pass or smtp_pass == "mockpassword":
        return False
    if server_host == "smtp-relay.brevo.com":
        return False

    try:
        import email.utils
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.BREVO_SENDER_NAME or 'NeuroDetect Medical Portal'} <{sender_email}>"
        msg["To"] = to_email.strip()
        msg["Reply-To"] = sender_email
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid()

        plain_text = re.sub(r"<[^>]+>", " ", body_html).strip()
        plain_text = re.sub(r"\s+", " ", plain_text)
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        if port == 465:
            with smtplib.SMTP_SSL(server_host, port, timeout=12) as server:
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender_email, [to_email.strip()], msg.as_string())
        else:
            with smtplib.SMTP(server_host, port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender_email, [to_email.strip()], msg.as_string())

        print(f"[SMTP Success] Dispatched fallback email to {to_email} via {server_host}:{port} | Subject: '{subject}'")
        set_last_email_error("")
        return True
    except Exception as exc:
        print(f"[SMTP Error] Failed fallback dispatch to {to_email}: {type(exc).__name__} - {str(exc)}")
        set_last_email_error(f"SMTP error connecting to {server_host}:{port} - {str(exc)}")
        return False

def send_brevo_email(to_email: str, subject: str, body_html: str) -> bool:
    """Unified email dispatcher trying configured SMTP (e.g. Gmail), Brevo API, then Brevo SMTP."""
    global _last_email_error
    _last_email_error = None

    # 1. If standard SMTP server like Gmail is configured (and not Brevo relay), prioritize it
    server_host = (settings.SMTP_SERVER or "").strip()
    if server_host and server_host != "smtp-relay.brevo.com" and settings.SMTP_USER and settings.SMTP_PASSWORD:
        if send_legacy_smtp_email(to_email, subject, body_html):
            return True

    # 2. Try Brevo HTTPS REST API (bypasses any cloud port blocks)
    if send_brevo_api_email(to_email, subject, body_html):
        return True

    # 3. Try Brevo SMTP relay (Ports 587, 2525, 465)
    if send_brevo_smtp_email(to_email, subject, body_html):
        return True

    # 4. Fallback attempt for standard SMTP if not tried yet
    if server_host and server_host == "smtp-relay.brevo.com":
        return False
    return send_legacy_smtp_email(to_email, subject, body_html)

def send_email_notification(to_email: str, subject: str, body_html: str) -> bool:
    """Entrypoint function for all clinical and auth notifications."""
    return send_brevo_email(to_email, subject, body_html)
