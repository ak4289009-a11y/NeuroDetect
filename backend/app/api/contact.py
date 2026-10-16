from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import require_role
from app.models.models import ContactMessage, User
from app.schemas.schemas import MessageCreate, MessageOut, MessageReply

router = APIRouter(prefix="/contact", tags=["Contact Messages"])


from app.core.config import settings
from app.services.email_service import send_email_notification

@router.post("/", response_model=MessageOut)
def submit_contact_message(
    msg_in: MessageCreate,
    db: Session = Depends(get_db)
):
    """Submits a contact form message and dispatches email notification to NeuroDetect inquiry desk."""
    msg = ContactMessage(**msg_in.model_dump())
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Dispatch email notification to official NeuroDetect email inbox
    recipient_email = (
        getattr(settings, "NEURODETECT_CONTACT_EMAIL", None)
        or settings.EMAIL_FROM
        or settings.BREVO_SENDER_EMAIL
        or "neyro390@gmail.com"
    ).strip()

    subject_text = (msg_in.subject or "General Inquiry").strip()
    received_time = datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC")

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New NeuroDetect Inquiry</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="background: #1e3a8a; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">NeuroDetect Clinical & Technical Support Desk</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #bfdbfe;">New Direct Message Received from Web Portal</p>
        </div>
        <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 130px;"><strong>Sender Name:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{msg_in.sender_name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;"><strong>Sender Email:</strong></td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="mailto:{msg_in.sender_email}" style="color: #2563eb; text-decoration: none;">{msg_in.sender_email}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">{subject_text}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;"><strong>Received At:</strong></td>
              <td style="padding: 6px 0; color: #64748b;">{received_time}</td>
            </tr>
          </table>

          <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: bold; color: #1e293b; font-size: 13px; margin-bottom: 8px;">Message Content:</p>
            <p style="margin: 0; color: #334155; white-space: pre-wrap;">{msg_in.message}</p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            This inquiry was submitted via the NeuroDetect Web Portal Contact Form. You can reply directly to <a href="mailto:{msg_in.sender_email}" style="color: #2563eb;">{msg_in.sender_email}</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        sent = send_email_notification(
            to_email=recipient_email,
            subject=f"[NeuroDetect Inquiry] {subject_text} - From {msg_in.sender_name}",
            body_html=body_html
        )
        if sent:
            print(f"[Contact Email] Successfully forwarded message from {msg_in.sender_email} to NeuroDetect ({recipient_email})")
        else:
            print(f"[Contact Email Notice] Could not dispatch email to {recipient_email}. Message is safely persisted in database.")
    except Exception as exc:
        print(f"[Contact Email Error] Failed to deliver inquiry to {recipient_email}: {exc}")

    # Send auto-acknowledgment receipt to the sender
    try:
        ack_html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Thank you for contacting NeuroDetect</h2>
            <p>Dear {msg_in.sender_name},</p>
            <p>We have successfully received your inquiry regarding <strong>"{subject_text}"</strong>.</p>
            <p>Our clinical review team and technical support desk will examine your message and respond to you as soon as possible.</p>
            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569; margin: 16px 0;">
              <strong>Your Inquiry Summary:</strong><br/>
              <em>"{msg_in.message[:250]}{'...' if len(msg_in.message) > 250 else ''}"</em>
            </div>
            <p style="font-size: 13px; color: #64748b;">Best regards,<br/><strong>NeuroDetect Medical Assistance Team</strong></p>
          </div>
        </body>
        </html>
        """
        send_email_notification(
            to_email=msg_in.sender_email,
            subject=f"We have received your message: {subject_text} - NeuroDetect Support",
            body_html=ack_html
        )
    except Exception as ack_exc:
        print(f"[Contact Email Ack Error] {ack_exc}")

    return msg


@router.get("/inbox", response_model=List[MessageOut])
def get_contact_inbox(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to view all received contact messages."""
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@router.post("/inbox/{message_id}/reply", response_model=MessageOut)
def reply_to_message(
    message_id: int,
    reply: MessageReply,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin sends an in-app reply to a contact message and emails the sender."""
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    
    msg.reply_text = reply.reply_text
    msg.replied_at = datetime.utcnow()
    msg.replied_by_name = "NeuroDetect Admin"
    msg.status = "REPLIED"
    db.commit()
    db.refresh(msg)

    if msg.sender_email:
        try:
            reply_html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px;">
              <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">Reply from NeuroDetect Clinical Support Desk</h2>
                <p>Dear {msg.sender_name},</p>
                <p>In response to your inquiry regarding <strong>"{msg.subject or 'General Inquiry'}"</strong>:</p>
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #1e293b;">
                  {reply.reply_text}
                </div>
                <p style="font-size: 13px; color: #64748b;">Best regards,<br/><strong>NeuroDetect Medical Assistance Team</strong></p>
              </div>
            </body>
            </html>
            """
            send_email_notification(
                to_email=msg.sender_email,
                subject=f"Re: {msg.subject or 'Your NeuroDetect Inquiry'}",
                body_html=reply_html
            )
        except Exception as exc:
            print(f"[Contact Reply Email Error] {exc}")

    return msg


from sqlalchemy import func, or_

@router.get("/my-messages", response_model=List[MessageOut])
def get_my_messages(
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR"])),
    db: Session = Depends(get_db)
):
    """Patient & Doctor endpoint to see their own submitted messages and admin replies."""
    clean_email = (current_user.email or "").strip().lower()
    return (
        db.query(ContactMessage)
        .filter(
            or_(
                ContactMessage.patient_user_id == current_user.id,
                func.lower(ContactMessage.sender_email) == clean_email
            )
        )
        .order_by(ContactMessage.created_at.desc())
        .all()
    )


@router.put("/inbox/{message_id}/status")
def update_message_status(
    message_id: int,
    status: str,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to mark message status (UNREAD, READ, REPLIED, ARCHIVED)."""
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    msg.status = status
    db.commit()
    return {"message": f"Message status updated to {status}."}
