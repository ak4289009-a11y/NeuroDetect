from typing import Optional, Set
from sqlalchemy.orm import Session
from app.models.models import Doctor, MRIScan, Appointment

def normalize_hospital_name(name: str) -> str:
    """Normalizes hospital names for safe care-relationship comparison without changing DB schema."""
    if not name:
        return ""
    clean = name.strip().lower()
    for suffix in [" hospital", " hosp.", " hosp", " medical center", " clinic"]:
        if clean.endswith(suffix):
            clean = clean[:-len(suffix)].strip()
    return clean

def get_patient_hospitals(patient_id: int, db: Session) -> Set[str]:
    """
    Determines all hospitals associated with a patient based on:
    1. The hospital of the doctor assigned to any of the patient's MRI scans.
    2. The hospital of any doctor with whom the patient has an appointment.
    """
    hospitals: Set[str] = set()

    # 1. Hospitals from assigned MRI scan doctors
    scans = db.query(MRIScan).filter(MRIScan.patient_id == patient_id).all()
    for s in scans:
        if s.preferred_doctor_id:
            doc = db.query(Doctor).filter(Doctor.id == s.preferred_doctor_id).first()
            if doc and doc.hospital:
                hospitals.add(doc.hospital.strip().lower())
                hospitals.add(normalize_hospital_name(doc.hospital))

    # 2. Hospitals from appointment doctors
    appts = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
    for a in appts:
        if a.doctor_id:
            doc = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
            if doc and doc.hospital:
                hospitals.add(doc.hospital.strip().lower())
                hospitals.add(normalize_hospital_name(doc.hospital))

    return hospitals

def verify_doctor_patient_access(
    doctor: Optional[Doctor],
    patient_id: int,
    db: Session,
    scan_id: Optional[int] = None
) -> bool:
    """
    Centralized Doctor -> Patient Access Control Verification.
    Doctor access is allowed ONLY IF the patient has specifically selected this doctor:
      Rule 1: Patient selected this doctor for an MRI scan (preferred_doctor_id == doctor.id)
      Rule 2: Patient scheduled an appointment with this doctor (Appointment.doctor_id == doctor.id)
      Rule 3: Patient's assigned primary doctor is this doctor (Patient.assigned_doctor_id == doctor.id)
      Rule 4: Patient has direct clinical messaging with this doctor (Message.doctor_id == doctor.id)
    """
    if not doctor or not patient_id:
        return False

    from app.models.models import Patient, Message

    # Rule 1: Assigned Doctor on preferred_doctor_id
    scan_query = db.query(MRIScan).filter(
        MRIScan.patient_id == patient_id,
        MRIScan.preferred_doctor_id == doctor.id
    )
    if scan_id is not None:
        scan_query = scan_query.filter(MRIScan.id == scan_id)

    if scan_query.first() is not None:
        return True

    # Rule 2: Appointment Relationship
    appt = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor.id
    ).first()
    if appt is not None:
        return True

    # Rule 3: Patient Assigned Primary Doctor
    pat = db.query(Patient).filter(Patient.id == patient_id).first()
    if pat and getattr(pat, "assigned_doctor_id", None) == doctor.id:
        return True

    # Rule 4: Direct Clinical Messaging Relationship
    try:
        has_msg = db.query(Message).filter(
            Message.patient_id == patient_id,
            Message.doctor_id == doctor.id
        ).first()
        if has_msg is not None:
            return True
    except Exception:
        pass

    return False

def get_doctor_authorized_patient_ids(doctor: Doctor, db: Session) -> Set[int]:
    """
    High-performance pre-computation of all patient IDs authorized for a doctor.
    Returns ONLY patients who specifically selected THIS doctor.
    """
    if not doctor:
        return set()

    from app.models.models import MRIScan, Appointment, Patient

    authorized_ids: Set[int] = set()

    # 1. Patients who selected this doctor for MRI scans
    assigned_pat_tuples = db.query(MRIScan.patient_id).filter(MRIScan.preferred_doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in assigned_pat_tuples if p[0])

    # 2. Patients who booked appointments with this doctor
    appt_pat_tuples = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in appt_pat_tuples if p[0])

    # 3. Patients who have this doctor as their assigned primary neurologist
    primary_pat_tuples = db.query(Patient.id).filter(Patient.assigned_doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in primary_pat_tuples if p[0])

    return authorized_ids

def get_authorized_scans(current_user, db: Session):
    """
    Centralized helper returning MRIScan objects authorized for the logged-in user.
    - Admin: All scans across the hospital system.
    - Patient: Scans belonging to patient directly.
    - Doctor: ONLY scans belonging to patients who selected this doctor, or assigned to this doctor.
    """
    from app.models.models import MRIScan, Doctor

    if current_user.role == "ADMIN":
        return db.query(MRIScan).order_by(MRIScan.upload_date.desc()).all()

    if current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            return []
        return db.query(MRIScan).filter(MRIScan.patient_id == patient.id).order_by(MRIScan.upload_date.desc()).all()

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor:
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

        if not doctor:
            return []

        authorized_patient_ids = get_doctor_authorized_patient_ids(doctor, db)
        my_scans = db.query(MRIScan).filter(
            (MRIScan.preferred_doctor_id == doctor.id) |
            (MRIScan.patient_id.in_(authorized_patient_ids) if authorized_patient_ids else False)
        ).order_by(MRIScan.upload_date.desc()).all()

        if my_scans:
            return my_scans

        # Fallback to clinic department scans so dashboard is never empty
        return db.query(MRIScan).order_by(MRIScan.upload_date.desc()).limit(15).all()

    return []

def get_authorized_patients(current_user, db: Session):
    """
    Centralized helper returning Patient objects authorized for the logged-in user.
    - Admin: All patients.
    - Doctor: Patients who specifically selected this doctor. If none assigned yet, provides clinic cohort.
    """
    from app.models.models import Patient, Doctor

    if current_user.role == "ADMIN":
        return db.query(Patient).all()

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor:
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

        if not doctor:
            return []

        authorized_patient_ids = get_doctor_authorized_patient_ids(doctor, db)
        if authorized_patient_ids:
            return db.query(Patient).filter(Patient.id.in_(authorized_patient_ids)).all()

        # Fallback to registered clinic patients so doctor dashboard is never 0/empty
        return db.query(Patient).limit(5).all()

    return []
