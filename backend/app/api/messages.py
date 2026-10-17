from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.core.authorization import verify_doctor_patient_access
from app.api.auth import require_role
from app.models.models import (
    User, Doctor, Patient, Message, Notification, AuditLog, MRIScan
)
from app.schemas.schemas import ChatMessageSend, ChatMessageOut, ChatConversationOut

router = APIRouter(prefix="/messages", tags=["Clinical Messaging"])

def get_doctor_patient_pair(current_user: User, receiver_user_id: int, db: Session):
    """
    Verifies that current_user and receiver_user_id have an authorized Doctor-Patient relationship
    using verify_doctor_patient_access. Returns (doctor_obj, patient_obj).
    If unauthorized, raises HTTPException(403).
    """
    receiver_user = db.query(User).filter(User.id == receiver_user_id).first()
    if not receiver_user:
        raise HTTPException(status_code=404, detail="Target message recipient not found.")

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            raise HTTPException(status_code=403, detail="Doctor account is not approved for clinical messaging.")
        patient = receiver_user.patient_profile
        if not patient:
            raise HTTPException(status_code=400, detail="Target user is not a registered patient.")
        
        # Doctor authorized if assigned scan, appointment, same hospital, OR existing message from patient
        has_msg = db.query(Message).filter(Message.patient_id == patient.id, Message.doctor_id == doctor.id).first()
        if not has_msg and not verify_doctor_patient_access(doctor, patient.id, db):
            raise HTTPException(
                status_code=403,
                detail="Messaging denied: Doctor does not have an authorized clinical relationship with this patient."
            )
        return doctor, patient

    elif current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        doctor = receiver_user.doctor_profile
        if not doctor or not doctor.is_approved:
            raise HTTPException(status_code=400, detail="Target doctor account is not active or approved.")

        # Patient authorized ONLY if clinical relationship exists (assigned scan, appointment, hospital, or existing msg)
        has_msg = db.query(Message).filter(Message.patient_id == patient.id, Message.doctor_id == doctor.id).first()
        if not has_msg and not verify_doctor_patient_access(doctor, patient.id, db):
            raise HTTPException(
                status_code=403,
                detail="Messaging denied: Direct messaging with this doctor is unlocked after an appointment is confirmed or report is approved."
            )
        return doctor, patient

    elif current_user.role == "ADMIN":
        doctor = receiver_user.doctor_profile or current_user.doctor_profile
        patient = receiver_user.patient_profile or current_user.patient_profile
        if not doctor or not patient:
            raise HTTPException(status_code=400, detail="Admin messaging requires valid doctor and patient records.")
        return doctor, patient

    else:
        raise HTTPException(status_code=403, detail="Unauthorized user role for messaging.")

@router.get("/conversations", response_model=List[ChatConversationOut])
def get_conversations(
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves all authorized conversations for the logged-in user with latest message snippet and unread count.
    """
    conversations = []

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            return []
        
        # Get all patients authorized for this doctor
        all_patients = db.query(Patient).all()
        msg_patient_ids = set(
            m.patient_id for m in db.query(Message).filter(Message.doctor_id == doctor.id).all()
        )
        auth_patients = [
            p for p in all_patients 
            if p.id in msg_patient_ids or verify_doctor_patient_access(doctor, p.id, db)
        ]

        seen_patient_ids = set()
        for p in auth_patients:
            if not p.user_id or p.user_id in seen_patient_ids:
                continue
            seen_patient_ids.add(p.user_id)
            last_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == p.user_id),
                    and_(Message.sender_user_id == p.user_id, Message.receiver_user_id == current_user.id)
                )
            ).order_by(Message.created_at.desc()).first()

            unread_cnt = db.query(Message).filter(
                Message.sender_user_id == p.user_id,
                Message.receiver_user_id == current_user.id,
                Message.is_read == False
            ).count()

            snippet = last_msg.message_text if last_msg else "No messages yet. Click to start conversation."
            msg_time = last_msg.created_at if last_msg else datetime(1970, 1, 1)

            conversations.append(ChatConversationOut(
                partner_user_id=p.user_id,
                partner_name=p.name,
                partner_role="PATIENT",
                partner_info=f"PT-{p.id} • {p.age} yrs • {p.gender}",
                last_message=snippet,
                last_message_time=msg_time,
                unread_count=unread_cnt
            ))

    elif current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            return []

        all_doctors = db.query(Doctor).filter(Doctor.is_approved == True).all()
        msg_doctor_ids = set(
            m.doctor_id for m in db.query(Message).filter(Message.patient_id == patient.id).all()
        )
        auth_doctors = [
            d for d in all_doctors 
            if d.id in msg_doctor_ids or verify_doctor_patient_access(d, patient.id, db)
        ]

        seen_doctor_ids = set()
        seen_doctor_names = set()
        for d in auth_doctors:
            if not d.user_id or d.user_id in seen_doctor_ids:
                continue
            norm_name = (d.name or "").strip().lower()
            if norm_name and norm_name in seen_doctor_names:
                continue
            seen_doctor_ids.add(d.user_id)
            if norm_name:
                seen_doctor_names.add(norm_name)

            last_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == d.user_id),
                    and_(Message.sender_user_id == d.user_id, Message.receiver_user_id == current_user.id)
                )
            ).order_by(Message.created_at.desc()).first()

            unread_cnt = db.query(Message).filter(
                Message.sender_user_id == d.user_id,
                Message.receiver_user_id == current_user.id,
                Message.is_read == False
            ).count()

            snippet = last_msg.message_text if last_msg else "No messages yet. Click to send message."
            msg_time = last_msg.created_at if last_msg else datetime(1970, 1, 1)

            conversations.append(ChatConversationOut(
                partner_user_id=d.user_id,
                partner_name=d.name,
                partner_role="DOCTOR",
                partner_info=f"{d.specialization}, {d.hospital} ({d.city})",
                last_message=snippet,
                last_message_time=msg_time,
                unread_count=unread_cnt
            ))

    conversations.sort(key=lambda c: c.last_message_time, reverse=True)
    return conversations

@router.get("/conversation/{partner_user_id}", response_model=List[ChatMessageOut])
def get_conversation_history(
    partner_user_id: int,
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves full chat message history between current_user and partner_user_id.
    Enforces authorization and automatically marks received unread messages as read.
    """
    doctor, patient = get_doctor_patient_pair(current_user, partner_user_id, db)

    # Automatically mark unread messages received from partner as read
    unread_messages = db.query(Message).filter(
        Message.sender_user_id == partner_user_id,
        Message.receiver_user_id == current_user.id,
        Message.is_read == False
    ).all()

    now = datetime.utcnow()
    for msg in unread_messages:
        msg.is_read = True
        msg.read_at = now
    if unread_messages:
        db.commit()

    # Fetch all messages in conversation sorted oldest first
    history = db.query(Message).filter(
        or_(
            and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == partner_user_id),
            and_(Message.sender_user_id == partner_user_id, Message.receiver_user_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()

    return history

@router.post("/send", response_model=ChatMessageOut)
def send_message(
    msg_in: ChatMessageSend,
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Sends a secure clinical message to an authorized doctor or patient.
    Strictly verifies doctor-patient authorization before saving message.
    """
    text = (msg_in.message_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text content cannot be empty.")

    doctor, patient = get_doctor_patient_pair(current_user, msg_in.receiver_user_id, db)

    new_msg = Message(
        sender_user_id=current_user.id,
        receiver_user_id=msg_in.receiver_user_id,
        patient_id=patient.id,
        doctor_id=doctor.id,
        message_text=text,
        created_at=datetime.utcnow(),
        is_read=False
    )
    db.add(new_msg)

    # In-app notification for recipient
    notif_title = "New Message from Doctor" if current_user.role == "DOCTOR" else "New Patient Consultation Message"
    notif_msg = f"You have a new secure clinical message from {current_user.email}."
    notif = Notification(
        user_id=msg_in.receiver_user_id,
        title=notif_title,
        message=notif_msg
    )
    db.add(notif)
    db.commit()
    db.refresh(new_msg)

    return new_msg

@router.get("/unread-count")
def get_unread_messages_count(
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Returns total count of unread messages for the logged-in user."""
    count = db.query(Message).filter(
        Message.receiver_user_id == current_user.id,
        Message.is_read == False
    ).count()
    return {"unread_count": count}

@router.patch("/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Explicit endpoint to mark a specific message as read."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    if msg.receiver_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot mark messages belonging to another user as read.")

    msg.is_read = True
    msg.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Message marked as read."}
