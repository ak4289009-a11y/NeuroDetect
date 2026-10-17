import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.authorization import verify_doctor_patient_access
from app.api.auth import require_role
from app.models.models import User, AIReport, MRIScan, Patient, DoctorReview, Doctor
from app.services.pdf_generator import generate_pdf_report
from app.services.email_service import send_email_notification

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{report_id}/pdf")
def download_pdf_report(
    report_id: int,
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Generates and downloads the PDF report for a given AI Report ID."""
    ai_report = db.query(AIReport).filter(AIReport.id == report_id).first()
    if not ai_report:
        raise HTTPException(status_code=404, detail="AI Report not found.")

    scan = ai_report.scan
    patient = scan.patient if scan else None
    doctor_review = ai_report.doctor_review

    # Strict Ownership & Doctor-Patient Relationship Verification
    if current_user.role == "PATIENT":
        patient_profile = current_user.patient_profile
        if not patient_profile or (patient and patient.id != patient_profile.id):
            raise HTTPException(status_code=403, detail="Access denied. You can only access your own diagnostic reports.")
    elif current_user.role == "DOCTOR":
        doctor_profile = current_user.doctor_profile
        if scan and not verify_doctor_patient_access(doctor_profile, scan.patient_id, db, scan_id=scan.id):
            raise HTTPException(status_code=403, detail="Access denied. You are not authorized to access reports for this patient.")
    
    patient_dict = {
        "id": patient.id if patient else 0,
        "name": patient.name if patient else "Demo Patient",
        "age": patient.age if patient else None,
        "gender": patient.gender if patient else "Not Specified",
        "phone": patient.phone if patient else "N/A",
        "medical_history": patient.medical_history if patient else None
    }

    ai_dict = {
        "tumor_type": ai_report.tumor_type,
        "confidence": ai_report.confidence,
        "prediction_date": ai_report.prediction_date.strftime("%Y-%m-%d %H:%M:%S")
    }

    mri_abs_path = os.path.join(settings.BASE_DIR, scan.file_path.lstrip("/")) if scan else None
    heatmap_abs_path = os.path.join(settings.BASE_DIR, ai_report.heatmap_path.lstrip("/")) if ai_report else None

    review_dict = None
    if doctor_review and str(doctor_review.status).upper() == "APPROVED":
        doctor = db.query(Doctor).filter(Doctor.id == doctor_review.doctor_id).first()
        review_dict = {
            "status": doctor_review.status,
            "diagnosis": doctor_review.diagnosis,
            "clinical_notes": doctor_review.clinical_notes,
            "prescription": doctor_review.prescription,
            "suggested_tests": doctor_review.suggested_tests,
            "medicines": doctor_review.medicines,
            "next_visit_date": doctor_review.next_visit_date,
            "reviewed_at": doctor_review.reviewed_at.strftime("%d %B %Y, %I:%M %p") if doctor_review.reviewed_at else None,
            "doctor": {
                "name": doctor.name if doctor else "Attending Specialist",
                "specialization": doctor.specialization if doctor else "Neurology",
                "hospital": doctor.hospital if doctor else None,
                "medical_reg_no": doctor.medical_reg_no if doctor else None
            }
        }

    pdf_rel_path = generate_pdf_report(
        report_id=report_id,
        patient_data=patient_dict,
        ai_report_data=ai_dict,
        mri_image_path=mri_abs_path,
        heatmap_image_path=heatmap_abs_path,
        doctor_review_data=review_dict
    )

    pdf_full_path = os.path.join(settings.BASE_DIR, pdf_rel_path.lstrip("/"))
    return FileResponse(
        pdf_full_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_full_path)
    )

@router.post("/{report_id}/email")
def email_pdf_report(
    report_id: int,
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Emails the PDF diagnostic report to the patient's registered email address."""
    ai_report = db.query(AIReport).filter(AIReport.id == report_id).first()
    if not ai_report:
        raise HTTPException(status_code=404, detail="AI Report not found.")

    scan = db.query(MRIScan).filter(MRIScan.id == ai_report.scan_id).first()
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first() if scan else None

    # Strict Ownership & Doctor-Patient Relationship Verification
    if current_user.role == "PATIENT":
        patient_profile = current_user.patient_profile
        if not patient_profile or (patient and patient.id != patient_profile.id):
            raise HTTPException(status_code=403, detail="Access denied. You can only access your own diagnostic reports.")
    elif current_user.role == "DOCTOR":
        doctor_profile = current_user.doctor_profile
        if scan and not verify_doctor_patient_access(doctor_profile, scan.patient_id, db, scan_id=scan.id):
            raise HTTPException(status_code=403, detail="Access denied. You are not authorized to access reports for this patient.")

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    patient_user = db.query(User).filter(User.id == patient.user_id).first()
    if not patient_user or not patient_user.email:
        raise HTTPException(status_code=400, detail="Patient email address not available.")

    success = send_email_notification(
        to_email=patient_user.email,
        subject=f"NeuroDetect: AI-Assisted Brain MRI Classification Report #{report_id} (DEMO - NOT FOR CLINICAL USE)",
        body_html=f"""
        <h2>NeuroDetect — AI-Assisted Brain MRI Classification Report</h2>
        <p><b>DEMO — NOT FOR CLINICAL USE • For Research & Demonstration Only</b></p>
        <p>Dear {patient.name},</p>
        <p>Your AI-assisted brain MRI screening report (#ND-REP-{report_id:05d}) has been compiled and is available in your clinical portal.</p>
        <div style="background:#f8fafc; border-left:4px solid #2563eb; padding:12px; margin:16px 0;">
          <p style="margin:4px 0;"><b>Model-predicted class:</b> {ai_report.tumor_type}</p>
          <p style="margin:4px 0;"><b>Model confidence:</b> {ai_report.confidence}%</p>
          <p style="margin:8px 0 4px; color:#dc2626; font-size:12px;"><b>Clinical Notice:</b> This output reflects model statistical classification based on image features. It is not a confirmed medical diagnosis or necessarily an {ai_report.confidence}% probability of disease. Specialist validation is required prior to any clinical decision.</p>
        </div>
        <p>Best regards,<br/>NeuroDetect AI Research & Clinical Portal Desk</p>
        """
    )

    return {"message": f"Diagnostic report email sent successfully to {patient_user.email}."}
