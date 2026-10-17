from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.core.authorization import verify_doctor_patient_access, get_doctor_authorized_patient_ids
from app.api.auth import require_role
from app.models.models import (
    User, Doctor, Patient, Message, Notification, AuditLog, MRIScan, Appointment
)
from app.schemas.schemas import ChatMessageSend, ChatMessageOut, ChatConversationOut

router = APIRouter(prefix="/messages", tags=["Clinical Messaging"])

def validate_conversation_access(current_user: User, partner_user_id: int, db: Session):
    """
    Validates sender, recipient, conversation membership, and active relationships:
    - Patient -> Selected Doctor (or active care appointment): allowed.
    - Patient -> Administrator (support conversation): allowed.
    - Selected Doctor -> Patient (active authorization only): allowed.
    - Doctor -> Administrator (admin conversation): allowed.
    - Administrator replies return to the exact support/admin conversation.
    - Revoked/former relationships or unrelated users are strictly rejected with 403 Forbidden.
    Returns: (doctor_obj, patient_obj)
    """
    if current_user.id == partner_user_id:
        raise HTTPException(status_code=400, detail="Cannot initiate a messaging conversation with yourself.")

    partner_user = db.query(User).filter(User.id == partner_user_id).first()
    if not partner_user:
        raise HTTPException(status_code=404, detail="Conversation recipient not found.")

    if current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")

        if partner_user.role == "ADMIN":
            # Patient <-> Admin Support Conversation
            return None, patient

        elif partner_user.role == "DOCTOR":
            doctor = partner_user.doctor_profile
            if not doctor or not doctor.is_approved:
                raise HTTPException(status_code=400, detail="Target doctor account is not active or approved.")

            # Validate active care relationship
            if not verify_doctor_patient_access(doctor, patient.id, db):
                raise HTTPException(
                    status_code=403,
                    detail="Messaging denied: You can only message your selected doctor or an active care provider."
                )
            return doctor, patient

        else:
            raise HTTPException(status_code=403, detail="Patients can only message their selected doctor or administrator support.")

    elif current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            raise HTTPException(status_code=403, detail="Doctor account is not approved for clinical messaging.")

        if partner_user.role == "ADMIN":
            # Doctor <-> Admin Conversation
            return doctor, None

        elif partner_user.role == "PATIENT":
            patient = partner_user.patient_profile
            if not patient:
                raise HTTPException(status_code=400, detail="Target user is not a registered patient.")

            # Doctor can ONLY message patient if relationship remains actively authorized
            if not verify_doctor_patient_access(doctor, patient.id, db):
                raise HTTPException(
                    status_code=403,
                    detail="Messaging denied: Doctor does not have an active authorized clinical relationship with this patient."
                )
            return doctor, patient

        else:
            raise HTTPException(status_code=403, detail="Doctors can only message authorized patients or administrator support.")

    elif current_user.role == "ADMIN":
        if partner_user.role == "PATIENT":
            patient = partner_user.patient_profile
            return None, patient

        elif partner_user.role == "DOCTOR":
            doctor = partner_user.doctor_profile
            return doctor, None

        elif partner_user.role == "ADMIN":
            return None, None

        else:
            raise HTTPException(status_code=403, detail="Unauthorized conversation recipient.")

    else:
        raise HTTPException(status_code=403, detail="Unauthorized role for messaging.")

@router.get("/conversations", response_model=List[ChatConversationOut])
def get_conversations(
    current_user: User = Depends(require_role(["DOCTOR", "PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves all authorized conversations for the logged-in user.
    - Patient: Selected doctor, active appointment doctors, and support admin.
    - Doctor: Only actively authorized patients, and administrator support.
    - Admin: Direct support conversations where admin is a participant.
    """
    conversations = []

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            return []

        # Authorized patients ONLY
        auth_patient_ids = get_doctor_authorized_patient_ids(doctor, db)
        auth_patients = db.query(Patient).filter(Patient.id.in_(auth_patient_ids)).all() if auth_patient_ids else []

        seen_user_ids = set()
        for p in auth_patients:
            if not p.user_id or p.user_id in seen_user_ids:
                continue
            seen_user_ids.add(p.user_id)

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

            snippet = last_msg.message_text if last_msg else "No messages yet. Click to start consultation."
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

        # Include Admin Support conversation if exists
        admin_user = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if admin_user and admin_user.id not in seen_user_ids:
            last_admin_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == admin_user.id),
                    and_(Message.sender_user_id == admin_user.id, Message.receiver_user_id == current_user.id)
                )
            ).order_by(Message.created_at.desc()).first()

            if last_admin_msg:
                admin_unread = db.query(Message).filter(
                    Message.sender_user_id == admin_user.id,
                    Message.receiver_user_id == current_user.id,
                    Message.is_read == False
                ).count()
                conversations.append(ChatConversationOut(
                    partner_user_id=admin_user.id,
                    partner_name="Hospital Administration",
                    partner_role="ADMIN",
                    partner_info="Hospital Operations & Support",
                    last_message=last_admin_msg.message_text,
                    last_message_time=last_admin_msg.created_at,
                    unread_count=admin_unread
                ))

    elif current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            return []

        seen_doctor_ids = set()

        # 1. Primary selected doctor
        if patient.assigned_doctor_id:
            sel_doc = db.query(Doctor).filter(Doctor.id == patient.assigned_doctor_id, Doctor.is_approved == True).first()
            if sel_doc and sel_doc.user_id:
                seen_doctor_ids.add(sel_doc.user_id)
                last_msg = db.query(Message).filter(
                    or_(
                        and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == sel_doc.user_id),
                        and_(Message.sender_user_id == sel_doc.user_id, Message.receiver_user_id == current_user.id)
                    )
                ).order_by(Message.created_at.desc()).first()

                unread_cnt = db.query(Message).filter(
                    Message.sender_user_id == sel_doc.user_id,
                    Message.receiver_user_id == current_user.id,
                    Message.is_read == False
                ).count()

                conversations.append(ChatConversationOut(
                    partner_user_id=sel_doc.user_id,
                    partner_name=f"Dr. {sel_doc.name}",
                    partner_role="DOCTOR",
                    partner_info=f"Selected Doctor • {sel_doc.specialization}, {sel_doc.hospital}",
                    last_message=last_msg.message_text if last_msg else "Selected primary doctor. Click to message.",
                    last_message_time=last_msg.created_at if last_msg else datetime.utcnow(),
                    unread_count=unread_cnt
                ))

        # 2. Doctors with active appointments
        active_appts = db.query(Appointment).filter(
            Appointment.patient_id == patient.id,
            Appointment.status.in_(["SCHEDULED", "CONFIRMED"])
        ).all()
        for a in active_appts:
            doc = a.doctor
            if doc and doc.user_id and doc.user_id not in seen_doctor_ids:
                seen_doctor_ids.add(doc.user_id)
                last_msg = db.query(Message).filter(
                    or_(
                        and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == doc.user_id),
                        and_(Message.sender_user_id == doc.user_id, Message.receiver_user_id == current_user.id)
                    )
                ).order_by(Message.created_at.desc()).first()

                unread_cnt = db.query(Message).filter(
                    Message.sender_user_id == doc.user_id,
                    Message.receiver_user_id == current_user.id,
                    Message.is_read == False
                ).count()

                conversations.append(ChatConversationOut(
                    partner_user_id=doc.user_id,
                    partner_name=f"Dr. {doc.name}",
                    partner_role="DOCTOR",
                    partner_info=f"Scheduled Consultation • {doc.specialization}, {doc.hospital}",
                    last_message=last_msg.message_text if last_msg else "Upcoming appointment consultation.",
                    last_message_time=last_msg.created_at if last_msg else datetime.utcnow(),
                    unread_count=unread_cnt
                ))

        # 3. Hospital Admin Support Conversation
        admin_user = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if admin_user:
            last_admin_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_user_id == current_user.id, Message.receiver_user_id == admin_user.id),
                    and_(Message.sender_user_id == admin_user.id, Message.receiver_user_id == current_user.id)
                )
            ).order_by(Message.created_at.desc()).first()

            admin_unread = db.query(Message).filter(
                Message.sender_user_id == admin_user.id,
                Message.receiver_user_id == current_user.id,
                Message.is_read == False
            ).count()

            conversations.append(ChatConversationOut(
                partner_user_id=admin_user.id,
                partner_name="Hospital Administration",
                partner_role="ADMIN",
                partner_info="Hospital Operations & Patient Support",
                last_message=last_admin_msg.message_text if last_admin_msg else "Click to contact hospital administration.",
                last_message_time=last_admin_msg.created_at if last_admin_msg else datetime(1970, 1, 1),
                unread_count=admin_unread
            ))

    elif current_user.role == "ADMIN":
        # Admin conversations are direct chats between Admin and other users
        admin_msgs = db.query(Message).filter(
            or_(Message.sender_user_id == current_user.id, Message.receiver_user_id == current_user.id)
        ).order_by(Message.created_at.desc()).all()

        seen_partners = set()
        for m in admin_msgs:
            partner_id = m.receiver_user_id if m.sender_user_id == current_user.id else m.sender_user_id
            if partner_id in seen_partners:
                continue
            seen_partners.add(partner_id)

            partner = db.query(User).filter(User.id == partner_id).first()
            if not partner:
                continue

            unread_cnt = db.query(Message).filter(
                Message.sender_user_id == partner.id,
                Message.receiver_user_id == current_user.id,
                Message.is_read == False
            ).count()

            p_name = partner.email
            p_info = partner.role
            if partner.role == "PATIENT" and partner.patient_profile:
                p_name = partner.patient_profile.name
                p_info = f"Patient #{partner.patient_profile.id}"
            elif partner.role == "DOCTOR" and partner.doctor_profile:
                p_name = f"Dr. {partner.doctor_profile.name}"
                p_info = f"{partner.doctor_profile.specialization}, {partner.doctor_profile.hospital}"

            conversations.append(ChatConversationOut(
                partner_user_id=partner.id,
                partner_name=p_name,
                partner_role=partner.role,
                partner_info=p_info,
                last_message=m.message_text,
                last_message_time=m.created_at,
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
    Retrieves chat message history between current_user and partner_user_id.
    Strictly enforces authorization:
    - Verifies current active relationship on every request.
    - Prevents former doctors, unrelated doctors, and unauthorized users from accessing conversations.
    - Marks unread messages as read.
    """
    # Strict validation of conversation access
    validate_conversation_access(current_user, partner_user_id, db)

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

    # Fetch ONLY messages exchanged directly between current_user and partner_user_id
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
    Sends a secure clinical message to an authorized recipient.
    Validates sender, recipient, and current relationship before persisting message.
    """
    text = (msg_in.message_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text content cannot be empty.")

    doctor, patient = validate_conversation_access(current_user, msg_in.receiver_user_id, db)

    new_msg = Message(
        sender_user_id=current_user.id,
        receiver_user_id=msg_in.receiver_user_id,
        patient_id=patient.id if patient else None,
        doctor_id=doctor.id if doctor else None,
        message_text=text,
        created_at=datetime.utcnow(),
        is_read=False
    )
    db.add(new_msg)

    # In-app notification for recipient
    if current_user.role == "PATIENT":
        notif_title = "Support Inquiry" if not doctor else "New Message from Patient"
        sender_label = patient.name if patient else current_user.email
    elif current_user.role == "DOCTOR":
        notif_title = "Clinical Message from Doctor" if patient else "Administrative Notice"
        sender_label = f"Dr. {doctor.name}" if doctor else current_user.email
    else:
        notif_title = "Support Message from Administration"
        sender_label = "Hospital Administration"

    notif = Notification(
        user_id=msg_in.receiver_user_id,
        title=notif_title,
        message=f"{sender_label}: {text[:120]}{'...' if len(text) > 120 else ''}"
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
