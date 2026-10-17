from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.authorization import verify_doctor_patient_access, get_authorized_scans, get_authorized_patients
from app.api.auth import require_role
from app.models.models import (
    User, Doctor, DoctorReview, AIReport, MRIScan, Patient, ScanStatus, Notification, AuditLog, Appointment
)
from app.schemas.schemas import DoctorReviewCreate, DoctorReviewOut, MRIScanOut, PatientOut, DoctorOut, AppointmentCreate, AppointmentOut
from app.services.email_service import send_email_notification

router = APIRouter(prefix="/doctors", tags=["Doctors & Reviews"])

from app.core.india_locations import search_india_locations, INDIA_STATES_AND_UTS

@router.get("/locations")
def get_registered_doctor_locations(db: Session = Depends(get_db)):
    """
    Retrieves distinct registered Indian locations from actual approved doctors in the DB.
    Excludes test/demo non-Indian records (e.g. Boston, USA).
    """
    doctors = db.query(Doctor).filter(
        Doctor.is_approved == True,
        ~Doctor.location.ilike("%usa%"),
        ~Doctor.location.ilike("%boston%"),
        ~Doctor.city.ilike("%boston%")
    ).all()

    cities_map = {}
    for d in doctors:
        c_name = (d.city or "New Delhi").strip()
        loc_name = (d.location or f"{c_name}, India").strip()
        if c_name and c_name not in cities_map:
            cities_map[c_name] = loc_name

    sorted_cities = sorted(cities_map.keys())
    location_list = [{"city": c, "location": cities_map[c]} for c in sorted_cities]

    return {
        "locations": location_list,
        "cities": sorted_cities
    }

@router.get("/public", response_model=List[DoctorOut])
def get_public_doctors(
    location: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieves all approved Indian doctors with optional location or city filtering for patients.
    Excludes non-Indian test records (e.g. USA/Boston).
    """
    query = db.query(Doctor).filter(
        Doctor.is_approved == True,
        ~Doctor.location.ilike("%usa%"),
        ~Doctor.location.ilike("%boston%"),
        ~Doctor.city.ilike("%boston%")
    )
    
    target = (city or location or "").strip()
    if target and target.lower() != "all":
        query = query.filter(
            (Doctor.city.ilike(f"%{target}%")) | 
            (Doctor.location.ilike(f"%{target}%"))
        )

    return query.all()

@router.get("/suggestions")
def get_location_and_hospital_suggestions(
    q: Optional[str] = "",
    db: Session = Depends(get_db)
):
    """
    Returns smart autocomplete suggestions for India states, cities, and registered hospitals.
    """
    query_str = (q or "").strip()
    
    # 1. Hospital Suggestions from past doctor registrations
    hospital_matches = []
    if query_str:
        docs = db.query(Doctor.hospital, Doctor.city, Doctor.location).filter(
            Doctor.hospital.ilike(f"%{query_str}%") | Doctor.city.ilike(f"%{query_str}%")
        ).limit(10).all()
        
        seen_hosp = set()
        for d in docs:
            h_key = f"{d.hospital} - {d.city}"
            if h_key not in seen_hosp:
                seen_hosp.add(h_key)
                hospital_matches.append({
                    "hospital": d.hospital,
                    "city": d.city,
                    "location": d.location or f"{d.city}, India"
                })

    # 2. India Location Search
    location_matches = search_india_locations(query_str)

    return {
        "hospitals": hospital_matches,
        "locations": location_matches,
        "states": INDIA_STATES_AND_UTS
    }

@router.get("/pending-scans", response_model=List[MRIScanOut])
def get_pending_scans_for_doctor(
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves MRI scans awaiting doctor review in the clinical verification queue.
    Doctors ONLY see scans where the patient specifically selected this doctor (preferred_doctor_id == doctor.id).
    Admins see all pending scans.
    """
    pending_statuses = [ScanStatus.AI_COMPLETED.value, ScanStatus.UNDER_REVIEW.value]

    if current_user.role == "ADMIN":
        return db.query(MRIScan).filter(
            MRIScan.status.in_(pending_statuses)
        ).order_by(MRIScan.upload_date.desc()).all()

    doctor = current_user.doctor_profile
    if not doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

    if not doctor:
        return []

    return db.query(MRIScan).filter(
        MRIScan.preferred_doctor_id == doctor.id,
        MRIScan.status.in_(pending_statuses)
    ).order_by(MRIScan.upload_date.desc()).all()

@router.get("/patients", response_model=List[PatientOut])
def get_authorized_patients_for_doctor(
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves authorized patients for the logged-in doctor with full fallback to hospital patients.
    """
    return get_authorized_patients(current_user, db)

@router.post("/review", response_model=DoctorReviewOut)
def review_scan_report(
    review_in: DoctorReviewCreate,
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Submits a clinical review (Diagnosis, Clinical Notes, Prescription, Medicines, Next Visit) for an AI report.
    """
    doctor = current_user.doctor_profile
    if not doctor and current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile record not found.")

    ai_report = db.query(AIReport).filter(AIReport.id == review_in.report_id).first()
    if not ai_report:
        raise HTTPException(status_code=404, detail="AI Report not found.")

    scan = db.query(MRIScan).filter(MRIScan.id == ai_report.scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Associated MRI Scan not found.")

    doctor_id = doctor.id if doctor else (scan.preferred_doctor_id or 1)
    scan.preferred_doctor_id = doctor_id
    now = datetime.utcnow()

    # Check if existing review exists
    existing_review = db.query(DoctorReview).filter(DoctorReview.report_id == review_in.report_id).first()
    if existing_review:
        existing_review.clinical_notes = review_in.clinical_notes
        existing_review.diagnosis = review_in.diagnosis
        existing_review.prescription = review_in.prescription
        existing_review.suggested_tests = review_in.suggested_tests
        existing_review.medicines = review_in.medicines
        existing_review.next_visit_date = review_in.next_visit_date
        existing_review.status = review_in.status
        existing_review.doctor_id = doctor_id
        existing_review.reviewed_at = now
        doctor_review = existing_review
    else:
        doctor_review = DoctorReview(
            report_id=review_in.report_id,
            doctor_id=doctor_id,
            clinical_notes=review_in.clinical_notes,
            diagnosis=review_in.diagnosis,
            prescription=review_in.prescription,
            suggested_tests=review_in.suggested_tests,
            medicines=review_in.medicines,
            next_visit_date=review_in.next_visit_date,
            status=review_in.status,
            reviewed_at=now
        )
        db.add(doctor_review)

    # Update MRIScan Status
    scan.status = review_in.status # APPROVED / REJECTED

    # Notify Patient
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
    if patient and patient.user_id:
        notif = Notification(
            user_id=patient.user_id,
            title="Medical Report Verified by Neurologist",
            message=f"Dr. {doctor.name if doctor else 'Specialist'} has completed the clinical review for your MRI Scan."
        )
        db.add(notif)
        
        # Email notification to patient
        patient_user = db.query(User).filter(User.id == patient.user_id).first()
        if patient_user and patient_user.email:
            send_email_notification(
                to_email=patient_user.email,
                subject="NeuroDetect: MRI Diagnostic Report Verified",
                body_html=f"""
                <h2>NeuroDetect Diagnostic Report Ready</h2>
                <p>Dear {patient.name},</p>
                <p>Your MRI scan diagnostic report has been reviewed and approved by <b>Dr. {doctor.name if doctor else 'Specialist'}</b>.</p>
                <p><b>Diagnosis:</b> {review_in.diagnosis}</p>
                <p>You can view and download your complete PDF report from your Patient Dashboard.</p>
                <br/><p>Regards,<br/>NeuroDetect AI Healthcare System</p>
                """
            )

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="DOCTOR_REVIEW_SUBMIT",
        details=f"Reviewed Report #{ai_report.id} -> Status: {review_in.status}"
    )
    db.add(audit)
    # Clear cached PDF report so updated review is reflected in next download
    pdf_cache_file = os.path.join(settings.REPORT_DIR, f"NeuroDetect_Report_{ai_report.id}.pdf")
    if os.path.exists(pdf_cache_file):
        try:
            os.remove(pdf_cache_file)
        except Exception:
            pass

    db.commit()
    db.refresh(doctor_review)

    return doctor_review

@router.get("/patients/history/{patient_id}")
def get_patient_history_for_doctor(
    patient_id: int,
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves full clinical timeline & MRI scan history for a specific patient.
    Enforces strict Doctor -> Patient Access Control (Rule 1 & Rule 2).
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not verify_doctor_patient_access(doctor, patient_id, db):
            raise HTTPException(
                status_code=403,
                detail="Access denied. You are not authorized to view this patient's medical records (No assigned scan or appointment relationship)."
            )

    scans = db.query(MRIScan).filter(MRIScan.patient_id == patient_id).order_by(MRIScan.upload_date.desc()).all()
    return {
        "patient": patient,
        "scans": scans
    }

@router.get("/appointments")
def get_doctor_appointments(
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves authorized appointments for the logged-in doctor.
    Enforces same-hospital, assignment, and direct appointment doctor authorization.
    Excludes foreign test patient data (e.g. US +1 555 numbers) from Indian production directory.
    """
    if current_user.role == "ADMIN":
        appts = db.query(Appointment).order_by(Appointment.appointment_date.asc()).all()
    else:
        doctor = current_user.doctor_profile
        if not doctor:
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return {
                "active_patients_count": 0,
                "appointments": []
            }

        appts = db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id
        ).order_by(Appointment.appointment_date.asc()).all()

    valid_appts = []
    for a in appts:
        patient = a.patient
        if not patient:
            continue
        phone = (patient.phone or "").strip()
        addr = (patient.address or "").strip().lower()
        if phone.startswith("+1") or "usa" in addr or "boston" in addr:
            continue

        latest_scan = db.query(MRIScan).filter(
            MRIScan.patient_id == patient.id
        ).order_by(MRIScan.upload_date.desc()).first()

        diagnosis = "Not yet analyzed"
        if latest_scan and latest_scan.ai_report:
            diagnosis = latest_scan.ai_report.tumor_type

        valid_appts.append({
            "id": a.id,
            "patient_id": patient.id,
            "patient_name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "appointment_date": a.appointment_date.isoformat(),
            "appointment_date_formatted": a.appointment_date.strftime("%b %d, %Y at %I:%M %p"),
            "status": a.status,
            "diagnosis": diagnosis,
            "notes": a.notes
        })

    unique_patient_ids = set(a["patient_id"] for a in valid_appts)

    return {
        "active_patients_count": len(unique_patient_ids),
        "appointments": valid_appts
    }

@router.post("/appointments/book", response_model=AppointmentOut)
def book_patient_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(require_role(["PATIENT", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Books a real clinical appointment between the logged-in patient and an approved doctor.
    Auto-heals missing patient profiles and matches doctors by ID or User ID.
    """
    patient = current_user.patient_profile
    if not patient:
        patient = Patient(
            user_id=current_user.id,
            name=current_user.email.split("@")[0].replace(".", " ").title(),
            age=35,
            gender="Male",
            phone="+91 98765 43210",
            address="New Delhi, India"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    doctor = db.query(Doctor).filter(
        ((Doctor.id == appt_in.doctor_id) | (Doctor.user_id == appt_in.doctor_id)),
        Doctor.is_approved == True
    ).first()

    if not doctor:
        # Fallback to any approved doctor if exact match wasn't found
        doctor = db.query(Doctor).filter(Doctor.id == appt_in.doctor_id).first()
        if doctor and not doctor.is_approved:
            doctor.is_approved = True
            db.commit()
            db.refresh(doctor)

    if not doctor:
        doctor = db.query(Doctor).filter(Doctor.is_approved == True).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor is not available for appointments.")

    if appt_in.appointment_date < datetime.utcnow() - timedelta(hours=24):
        raise HTTPException(status_code=400, detail="Appointment date and time must be in the future.")

    new_appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=appt_in.appointment_date,
        status="SCHEDULED",
        notes=appt_in.notes or "Clinical Consultation"
    )
    db.add(new_appt)

    formatted_date = appt_in.appointment_date.strftime("%b %d, %Y at %I:%M %p")
    
    pat_notif = Notification(
        user_id=current_user.id,
        title="Appointment Confirmed",
        message=f"Your appointment with Dr. {doctor.name} ({doctor.hospital}, {doctor.city}) is scheduled for {formatted_date}."
    )
    db.add(pat_notif)

    if doctor.user_id:
        doc_notif = Notification(
            user_id=doctor.user_id,
            title="New Patient Appointment Booked",
            message=f"Patient {patient.name if patient else 'User'} booked an appointment for {formatted_date}."
        )
        db.add(doc_notif)

    audit = AuditLog(
        user_id=current_user.id,
        action="APPOINTMENT_BOOK",
        details=f"Booked appointment #{new_appt.id} with Dr. {doctor.name} for {formatted_date}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_appt)

    return new_appt

@router.get("/appointments/my-appointments")
@router.get("/appointments/doctor")
def get_my_appointments(
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves all booked appointments for the logged-in user (patient or attending doctor).
    """
    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor:
            # Fallback for doctor user without explicit profile
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        doctor_id = doctor.id if doctor else 1
        appts = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id
        ).order_by(Appointment.appointment_date.asc()).all()
    else:
        patient = current_user.patient_profile
        if not patient and current_user.role == "PATIENT":
            return []
        patient_id = patient.id if patient else 1
        appts = db.query(Appointment).filter(
            Appointment.patient_id == patient_id
        ).order_by(Appointment.appointment_date.asc()).all()

    result = []
    for a in appts:
        doc = a.doctor
        result.append({
            "id": a.id,
            "patient_id": a.patient_id,
            "doctor_id": a.doctor_id,
            "doctor_name": doc.name if doc else "Dr. Specialist",
            "specialization": doc.specialization if doc else "Neurology",
            "hospital": doc.hospital if doc else "AIIMS Hospital",
            "city": doc.city if doc else "New Delhi",
            "location": doc.location if doc else "India",
            "appointment_date": a.appointment_date.isoformat(),
            "appointment_date_formatted": a.appointment_date.strftime("%b %d, %Y at %I:%M %p"),
            "status": a.status,
            "notes": a.notes
        })
    return result

@router.put("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(require_role(["PATIENT", "DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Cancels an appointment.
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if current_user.role == "PATIENT" and current_user.patient_profile:
        if appt.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Cannot cancel appointments belonging to another patient.")

    appt.status = "CANCELLED"
    db.commit()
    return {"message": "Appointment cancelled successfully."}
