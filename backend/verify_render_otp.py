#!/usr/bin/env python3
"""
NeuroDetect - Render & Local OTP Dispatch Diagnostic Tool
Usage:
    python verify_render_otp.py [recipient_email]

This script tests:
1. Environment variables (BREVO_SMTP_KEY, SMTP_PASSWORD, BREVO_SMTP_USER, etc.)
2. Database connectivity (SQLite or PostgreSQL)
3. Direct SMTP connectivity to Brevo relay on Ports 587, 2525, and 465 (SSL)
4. End-to-end OTP dispatch with live delivery verification
"""

import sys
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def main():
    target_email = sys.argv[1].strip() if len(sys.argv) > 1 else "kumarrayshubham2005@gmail.com"
    
    print("=" * 65)
    print("  NEURODETECT - RENDER & LOCAL OTP DIAGNOSTIC SUITE")
    print("=" * 65)
    
    # 1. Environment Variable Audit
    print("\n[1/4] AUDITING ENVIRONMENT CONFIGURATION:")
    smtp_key = (settings.BREVO_SMTP_KEY or settings.BREVO_SMTP_PASSWORD or settings.SMTP_PASSWORD or "").strip()
    smtp_user = (settings.BREVO_SMTP_USER or settings.BREVO_SMTP_LOGIN or settings.SMTP_USER or "").strip()
    sender_email = (settings.BREVO_SENDER_EMAIL or settings.EMAIL_FROM or "neyro390@gmail.com").strip()
    server_host = (settings.BREVO_SMTP_SERVER or settings.SMTP_SERVER or "smtp-relay.brevo.com").strip()
    
    print(f"  • Server Host   : {server_host}")
    print(f"  • SMTP User     : {smtp_user if smtp_user else 'MISSING (Set BREVO_SMTP_USER)'}")
    print(f"  • Sender Email  : {sender_email}")
    masked_key = (smtp_key[:8] + "..." + smtp_key[-6:]) if len(smtp_key) > 14 else ("SET" if smtp_key else "MISSING")
    print(f"  • SMTP Key      : {masked_key}")
    
    if not smtp_key:
        print("\n  [CRITICAL ERROR] No SMTP Key found! In Render Environment Variables, set:")
        print("    BREVO_SMTP_KEY = xsmtpsib-...")
        print("    or SMTP_PASSWORD = xsmtpsib-...")
        return False
        
    if not smtp_user:
        print("\n  [CRITICAL ERROR] No SMTP User found! In Render Environment Variables, set:")
        print("    BREVO_SMTP_USER = bdb1f8001@smtp-brevo.com")
        return False

    # 2. Database Connectivity Test
    print("\n[2/4] AUDITING DATABASE CONNECTIVITY:")
    try:
        from app.core.database import SessionLocal, engine
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print(f"  • Database Connection: SUCCESS ({engine.url.drivername})")
    except Exception as db_err:
        print(f"  • Database Connection: FAILED ({db_err})")

    # 3. Port Connectivity Probe
    print("\n[3/4] PROBING OUTBOUND SMTP RELAY PORTS FROM CURRENT HOST:")
    active_port = None
    ssl_mode = False
    
    # Test 587 (STARTTLS)
    try:
        s587 = smtplib.SMTP(server_host, 587, timeout=8)
        s587.ehlo()
        s587.starttls()
        s587.ehlo()
        s587.login(smtp_user, smtp_key)
        s587.quit()
        print("  • Port 587 (STARTTLS) : REACHABLE & AUTHENTICATED")
        active_port = 587
    except Exception as e:
        print(f"  • Port 587 (STARTTLS) : BLOCKED/TIMED OUT ({type(e).__name__})")

    # Test 2525 (Alternative STARTTLS)
    try:
        s2525 = smtplib.SMTP(server_host, 2525, timeout=8)
        s2525.ehlo()
        s2525.starttls()
        s2525.ehlo()
        s2525.login(smtp_user, smtp_key)
        s2525.quit()
        print("  • Port 2525 (STARTTLS): REACHABLE & AUTHENTICATED")
        if not active_port:
            active_port = 2525
    except Exception as e:
        print(f"  • Port 2525 (STARTTLS): BLOCKED/TIMED OUT ({type(e).__name__})")

    # Test 465 (SMTPS SSL)
    try:
        s465 = smtplib.SMTP_SSL(server_host, 465, timeout=8)
        s465.ehlo()
        s465.login(smtp_user, smtp_key)
        s465.quit()
        print("  • Port 465 (SSL SMTPS): REACHABLE & AUTHENTICATED")
        if not active_port:
            active_port = 465
            ssl_mode = True
    except Exception as e:
        print(f"  • Port 465 (SSL SMTPS): BLOCKED/TIMED OUT ({type(e).__name__})")

    if not active_port:
        print("\n  [CRITICAL ERROR] All outbound SMTP ports (587, 2525, 465) appear blocked by host firewall.")
        return False

    # 4. End-to-End Live Dispatch Test
    print(f"\n[4/4] SENDING LIVE TEST OTP EMAIL TO: {target_email}")
    import random
    test_otp = "".join(random.choices("0123456789", k=6))
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"NeuroDetect Live OTP Test - Code: {test_otp}"
    msg["From"] = f"NeuroDetect Security Desk <{sender_email}>"
    msg["To"] = target_email
    
    html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">NeuroDetect Live Verification Test</h2>
      <p>This is a live diagnostic verification email sent from your NeuroDetect backend.</p>
      <p style="font-size: 22px; font-weight: bold; color: #2563eb;">OTP: <span style="background: #e0e7ff; padding: 4px 12px; border-radius: 4px;">{test_otp}</span></p>
      <p style="font-size: 12px; color: #64748b;">Relayed via Brevo ({server_host})</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    
    try:
        if ssl_mode:
            with smtplib.SMTP_SSL(server_host, 465, timeout=12) as server:
                server.ehlo()
                server.login(smtp_user, smtp_key)
                server.sendmail(sender_email, [target_email], msg.as_string())
        else:
            with smtplib.SMTP(server_host, active_port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_key)
                server.sendmail(sender_email, [target_email], msg.as_string())
                
        print(f"  [SUCCESS] Real verification email delivered to {target_email}!")
        print(f"  [SUCCESS] Code dispatched: {test_otp}")
        print("\n" + "=" * 65)
        print("  DIAGNOSIS: OTP DELIVERY IS WORKING 100%!")
        print("=" * 65)
        return True
    except Exception as send_err:
        print(f"  [DISPATCH FAILED] {send_err}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
