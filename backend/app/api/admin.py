from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.auth import require_role
from app.models.models import (
    User, Doctor, Patient, DoctorApproval, DoctorStatus, MRIScan, AIReport, AuditLog, Notification
)
from app.schemas.schemas import DoctorOut, PatientOut, DoctorApprovalAction, AuditLogOut, UserOut
from app.services.email_service import send_email_notification

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

@router.get("/doctors/pending", response_model=List[DoctorOut])
def get_pending_doctors(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieves all doctor registration requests pending Admin verification."""
    return db.query(Doctor).filter(Doctor.status == DoctorStatus.PENDING.value).all()

@router.post("/doctors/{doctor_id}/approval")
def approve_or_reject_doctor(
    doctor_id: int,
    action: DoctorApprovalAction,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to Approve, Reject, or Suspend a Doctor's account.
    Enforces separation of duties (blocks self-approval) and requires a rejection reason.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor record not found.")

    # Prevent Self-Approval
    if doctor.user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Self-approval is strictly prohibited. An administrator cannot approve their own doctor profile."
        )

    status_val = action.status.upper()
    if status_val not in [DoctorStatus.APPROVED.value, DoctorStatus.REJECTED.value, DoctorStatus.SUSPENDED.value]:
        raise HTTPException(status_code=400, detail="Invalid approval status action.")

    if status_val == DoctorStatus.REJECTED.value and not (action.notes and action.notes.strip()):
        raise HTTPException(
            status_code=400,
            detail="A rejection reason must be provided by the administrator when rejecting a doctor account."
        )

    doctor.status = status_val
    doctor.is_approved = (status_val == DoctorStatus.APPROVED.value)

    # Log DoctorApproval audit step
    approval = DoctorApproval(
        doctor_id=doctor.id,
        admin_id=current_user.id,
        status=status_val,
        notes=action.notes or f"Manual action by Admin ID {current_user.id}"
    )
    db.add(approval)

    # Notify doctor
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
    if doctor_user:
        notif = Notification(
            user_id=doctor_user.id,
            title=f"Doctor Account Status: {status_val}",
            message=f"Your account status has been updated to {status_val} by Admin."
        )
        db.add(notif)
        
        send_email_notification(
            to_email=doctor_user.email,
            subject=f"NeuroDetect: Account Status Updated ({status_val})",
            body_html=f"""
            <h2>Account Status Update</h2>
            <p>Dear Dr. {doctor.name},</p>
            <p>Your NeuroDetect Doctor account status has been set to: <b>{status_val}</b>.</p>
            <p>Notes/Reason: {action.notes or 'None'}</p>
            """
        )

    audit = AuditLog(
        user_id=current_user.id,
        action="DOCTOR_MANUAL_APPROVE" if status_val == DoctorStatus.APPROVED.value else "DOCTOR_MANUAL_REJECT",
        details=f"Admin #{current_user.id} set Doctor #{doctor_id} status to {status_val}. Reason/Notes: {action.notes or 'N/A'}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Doctor status updated successfully to {status_val}."}

@router.put("/doctors/{doctor_id}/approve")
def manual_approve_doctor(
    doctor_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Explicit endpoint for Admin Manual Doctor Approval."""
    action = DoctorApprovalAction(status=DoctorStatus.APPROVED.value, notes="Manual verification confirmed by Administrator")
    return approve_or_reject_doctor(doctor_id=doctor_id, action=action, current_user=current_user, db=db)

@router.put("/doctors/{doctor_id}/reject")
def manual_reject_doctor(
    doctor_id: int,
    reason: str,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Explicit endpoint for Admin Manual Doctor Rejection requiring a reason."""
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="A rejection reason must be provided by the administrator when rejecting a doctor account.")
    action = DoctorApprovalAction(status=DoctorStatus.REJECTED.value, notes=reason.strip())
    return approve_or_reject_doctor(doctor_id=doctor_id, action=action, current_user=current_user, db=db)

@router.get("/doctors", response_model=List[DoctorOut])
def get_all_doctors(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all doctors."""
    return db.query(Doctor).all()

@router.put("/doctors/{doctor_id}/reset-password")
def reset_doctor_password(
    doctor_id: int,
    new_password: str,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to reset a doctor's password."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    user = db.query(User).filter(User.id == doctor.user_id).first()
    if user:
        user.hashed_password = get_password_hash(new_password)
        db.commit()
    return {"message": f"Password for Dr. {doctor.name} reset successfully."}

@router.delete("/doctors/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to remove doctor account."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    user = db.query(User).filter(User.id == doctor.user_id).first()
    db.delete(doctor)
    if user:
        db.delete(user)
    db.commit()
    return {"message": "Doctor account removed."}

@router.get("/patients", response_model=List[PatientOut])
def get_all_patients(
    current_user: User = Depends(require_role(["ADMIN", "DOCTOR"])),
    db: Session = Depends(get_db)
):
    """Lists all registered patients."""
    return db.query(Patient).all()

@router.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete a patient record."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    user = db.query(User).filter(User.id == patient.user_id).first()
    db.delete(patient)
    if user:
        db.delete(user)
    db.commit()
    return {"message": "Patient account deleted."}

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieves system audit logs."""
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
