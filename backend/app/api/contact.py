from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import require_role
from app.models.models import ContactMessage, User
from app.schemas.schemas import MessageCreate, MessageOut, MessageReply

router = APIRouter(prefix="/contact", tags=["Contact Messages"])


@router.post("/", response_model=MessageOut)
def submit_contact_message(
    msg_in: MessageCreate,
    db: Session = Depends(get_db)
):
    """Submits a contact form message. patient_user_id is set when sent from patient dashboard."""
    msg = ContactMessage(**msg_in.model_dump())
    db.add(msg)
    db.commit()
    db.refresh(msg)
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
    """Admin sends an in-app reply to a contact message."""
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    
    msg.reply_text = reply.reply_text
    msg.replied_at = datetime.utcnow()
    msg.replied_by_name = "NeuroDetect Admin"
    msg.status = "REPLIED"
    db.commit()
    db.refresh(msg)
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
