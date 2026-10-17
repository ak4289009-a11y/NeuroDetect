import os
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.authorization import verify_doctor_patient_access, get_authorized_scans
from app.api.auth import require_role
from app.models.models import User, MRIScan, AIReport, ScanStatus, Notification, AuditLog, Doctor, DoctorReview, Appointment
from app.services.ai_model import ai_classifier
from app.services.email_service import send_email_notification
from app.services.mri_validator import validate_brain_mri_image
from app.services.supabase_storage import supabase_storage
from app.schemas.schemas import MRIScanOut

router = APIRouter(prefix="/scans", tags=["MRI Scans"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

def enforce_patient_scan_retention(patient_id: int, db: Session, max_retention: int = 5):
    """
    Safely enforces the 5-scan retention policy for a specific patient:
    - Retains ONLY the 5 most recent MRI scans & AI reports (sorted by upload_date DESC).
    - Safely deletes older scans, AI reports, doctor reviews, and local physical files.
    - Prevents orphaned records.
    """
    scans = db.query(MRIScan).filter(
        MRIScan.patient_id == patient_id
    ).order_by(MRIScan.upload_date.desc()).all()

    if len(scans) > max_retention:
        obsolete_scans = scans[max_retention:]
        for s in obsolete_scans:
            if s.ai_report:
                db.query(DoctorReview).filter(DoctorReview.report_id == s.ai_report.id).delete(synchronize_session=False)
                if s.ai_report.heatmap_path:
                    abs_h_path = os.path.join(settings.BASE_DIR, s.ai_report.heatmap_path.lstrip("/"))
                    if os.path.exists(abs_h_path) and "sample" not in abs_h_path:
                        try:
                            os.remove(abs_h_path)
                        except Exception:
                            pass
                db.delete(s.ai_report)

            if s.file_path and not s.file_path.startswith("PAT-"):
                abs_mri_path = os.path.join(settings.BASE_DIR, s.file_path.lstrip("/"))
                if os.path.exists(abs_mri_path) and "sample" not in abs_mri_path:
                    try:
                        os.remove(abs_mri_path)
                    except Exception:
                        pass

            db.delete(s)

        db.commit()

@router.get("/all", response_model=List[MRIScanOut])
def get_all_scans(
    current_user: User = Depends(require_role(["ADMIN", "DOCTOR"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves all clinical MRI scans for doctors and administrators.
    """
    return db.query(MRIScan).order_by(MRIScan.upload_date.desc()).all()

@router.get("/patient", response_model=List[MRIScanOut])
def get_patient_scans(
    current_user: User = Depends(require_role(["PATIENT"])),
    db: Session = Depends(get_db)
):
    """Retrieves all MRI scans for the logged-in patient."""
    patient = current_user.patient_profile
    if not patient:
        return []
    scans = db.query(MRIScan).filter(MRIScan.patient_id == patient.id).order_by(MRIScan.upload_date.desc()).all()
    return scans

@router.post("/upload", response_model=MRIScanOut)
async def upload_and_predict_mri(
    file: UploadFile = File(...),
    preferred_doctor_id: Optional[int] = Form(None),
    current_user: User = Depends(require_role(["PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    1. Validates MRI Image (JPG, PNG, JPEG).
    2. Resizes to 224x224 and preprocesses.
    3. Runs DenseNet121 Deep Learning Model for 4-class classification.
    4. Generates Grad-CAM visual explainability heatmap.
    5. Auto-assigns doctor, generates automated diagnostic findings, and notifies specific doctor.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS or (file.content_type and not file.content_type.startswith("image/")):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format or MIME type '{file.content_type}'. Allowed formats: JPG, PNG, JPEG."
        )

    # Validate file size (15MB limit)
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 15MB.")

    patient = current_user.patient_profile
    if not patient and current_user.role == "PATIENT":
        raise HTTPException(status_code=404, detail="Patient profile record not found.")

    patient_id = patient.id if patient else 1

    unique_id = uuid.uuid4().hex[:8]
    sanitized_filename = f"mri_pt{patient_id}_{unique_id}{ext}"
    mri_file_path = os.path.join(settings.MRI_UPLOAD_DIR, sanitized_filename)

    try:
        with open(mri_file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # 5. Dedicated Input Quality & Type Validation Gate BEFORE AI prediction or DB record creation
    is_valid, validation_msg = validate_brain_mri_image(mri_file_path)
    if not is_valid:
        if os.path.exists(mri_file_path):
            os.remove(mri_file_path)
        raise HTTPException(
            status_code=400,
            detail=validation_msg
        )

    try:
        tumor_type, confidence, heatmap_url = ai_classifier.predict(mri_file_path, sanitized_filename)
    except Exception as e:
        if os.path.exists(mri_file_path):
            os.remove(mri_file_path)
        raise HTTPException(status_code=422, detail=f"Image processing failed: {str(e)}")

    # Auto-assign an approved doctor if none explicitly selected by patient
    if not preferred_doctor_id:
        assigned_doc = db.query(Doctor).filter(Doctor.is_approved == True).first()
        if assigned_doc:
            preferred_doctor_id = assigned_doc.id

    mri_scan = MRIScan(
        patient_id=patient_id,
        preferred_doctor_id=preferred_doctor_id,
        original_filename=file.filename,
        file_path=f"/uploads/mri/{sanitized_filename}",
        upload_date=datetime.utcnow(),
        status=ScanStatus.AI_COMPLETED.value
    )
    db.add(mri_scan)
    db.commit()
    db.refresh(mri_scan)

    # Upload to private Supabase Storage bucket 'NeuroDetect Org' (Path: PAT-{patient_id}/MRI-{scan_id}.{ext})
    storage_path, access_url = supabase_storage.upload_mri_scan(
        patient_id=patient_id,
        scan_id=mri_scan.id,
        local_file_path=mri_file_path,
        file_extension=ext
    )
    if supabase_storage.is_configured and access_url and access_url.startswith("http"):
        mri_scan.file_path = storage_path
    else:
        mri_scan.file_path = f"/uploads/mri/{sanitized_filename}"
    db.commit()
    db.refresh(mri_scan)

    ai_report = AIReport(
        scan_id=mri_scan.id,
        tumor_type=tumor_type,
        confidence=confidence,
        heatmap_path=heatmap_url,
        prediction_date=datetime.utcnow()
    )
    db.add(ai_report)
    db.commit()
    db.refresh(ai_report)

    # Automated Clinical Review Guidance Generation
    assigned_doctor = db.query(Doctor).filter(Doctor.id == preferred_doctor_id).first() if preferred_doctor_id else None
    doc_id = assigned_doctor.id if assigned_doctor else 1

    if tumor_type != "No Tumor":
        initial_diag = f"AI Classification: {tumor_type} lesion detected ({confidence}% confidence)."
        initial_notes = f"Spatial neural activations confirm focal anomaly matching {tumor_type} characteristics."
        initial_rx = f"Recommended immediate consultation for {tumor_type} therapeutic protocol."
        initial_tests = "Contrast-enhanced MRI, Complete Blood Count (CBC)"
        initial_meds = "Symptomatic relief & clinical evaluation"
    else:
        initial_diag = "Normal Brain MRI Study (No Tumor Detected)."
        initial_notes = "No abnormal tissue mass or focal lesion observed in spatial feature maps."
        initial_rx = "Routine health monitoring and wellness maintenance."
        initial_tests = "Annual Medical Evaluation"
        initial_meds = "None"

    initial_review = DoctorReview(
        report_id=ai_report.id,
        doctor_id=doc_id,
        clinical_notes=initial_notes,
        diagnosis=initial_diag,
        prescription=initial_rx,
        suggested_tests=initial_tests,
        medicines=initial_meds,
        next_visit_date="In 3 Weeks",
        status=ScanStatus.APPROVED.value
    )
    db.add(initial_review)

    notif = Notification(
        user_id=current_user.id,
        title="MRI Scan Analyzed",
        message=f"DenseNet121 AI inference complete: Classification '{tumor_type}' ({confidence}% confidence)."
    )
    db.add(notif)

    # Notify ONLY the specific assigned doctor
    if assigned_doctor and assigned_doctor.user_id:
        doc_notif = Notification(
            user_id=assigned_doctor.user_id,
            title="New Patient Scan Assigned",
            message=f"Patient #{patient_id} has assigned scan #{mri_scan.id} to you for review."
        )
        db.add(doc_notif)

    audit = AuditLog(
        user_id=current_user.id,
        action="MRI_UPLOAD_PREDICT",
        details=f"Uploaded {file.filename} -> Predicted {tumor_type} ({confidence}%)"
    )
    db.add(audit)
    db.commit()
    db.refresh(mri_scan)

    # Automatically enforce 5-report retention policy for this patient
    enforce_patient_scan_retention(patient_id, db, max_retention=5)

    return mri_scan

@router.get("/{scan_id}", response_model=MRIScanOut)
def get_scan_by_id(
    scan_id: int,
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves single MRI scan details by ID.
    Enforces strict access control:
    - Patient: can only access their own scan.
    - Doctor: can only access scans for which they are assigned OR have an appointment relationship.
    - Admin: can access all scans.
    """
    scan = db.query(MRIScan).filter(MRIScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="MRI Scan not found.")

    if current_user.role == "PATIENT":
        patient_profile = current_user.patient_profile
        if not patient_profile or scan.patient_id != patient_profile.id:
            raise HTTPException(status_code=403, detail="Access denied. You can only access your own MRI scans.")
    elif current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not verify_doctor_patient_access(doctor, scan.patient_id, db, scan_id=scan.id):
            raise HTTPException(
                status_code=403,
                detail="Access denied. You are not authorized to view this MRI scan."
            )

    return scan
