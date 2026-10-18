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
    Doctor access is allowed ONLY IF an active authorized relationship exists:
      Rule 1: Patient has explicitly selected this doctor (Patient.assigned_doctor_id == doctor.id)
      Rule 2: Active scheduled or confirmed appointment with this doctor
      Rule 3: Specific or active pending MRI scan explicitly assigned to this doctor
    Note: Past messaging or past deselected relationships do NOT grant persistent access.
    """
    if not doctor or not patient_id:
        return False

    from app.models.models import Patient, MRIScan, Appointment

    # Rule 1: Patient explicitly selected this doctor
    pat = db.query(Patient).filter(Patient.id == patient_id).first()
    if pat and pat.assigned_doctor_id == doctor.id:
        return True

    # Rule 2: Active scheduled or confirmed appointment
    active_appt = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor.id,
        Appointment.status.in_(["SCHEDULED", "CONFIRMED"])
    ).first()
    if active_appt is not None:
        return True

    # Rule 3: Specific scan assigned to doctor, or active pending scan awaiting review
    if scan_id is not None:
        scan = db.query(MRIScan).filter(
            MRIScan.id == scan_id,
            MRIScan.patient_id == patient_id,
            MRIScan.preferred_doctor_id == doctor.id
        ).first()
        if scan is not None:
            return True
    else:
        pending_scan = db.query(MRIScan).filter(
            MRIScan.patient_id == patient_id,
            MRIScan.preferred_doctor_id == doctor.id,
            MRIScan.status.in_(["AI_COMPLETED", "UNDER_REVIEW"])
        ).first()
        if pending_scan is not None:
            return True

    return False

def get_doctor_authorized_patient_ids(doctor: Doctor, db: Session) -> Set[int]:
    """
    High-performance pre-computation of all patient IDs actively authorized for a doctor.
    Returns ONLY patients who currently have an active relationship with THIS doctor:
    1. Patient explicitly selected this doctor (Patient.assigned_doctor_id == doctor.id)
    2. Active scheduled appointment (Appointment.status in ['SCHEDULED', 'CONFIRMED'])
    3. Active pending scan directed to this doctor (MRIScan.status in ['AI_COMPLETED', 'UNDER_REVIEW'])
    """
    if not doctor:
        return set()

    from app.models.models import MRIScan, Appointment, Patient

    authorized_ids: Set[int] = set()

    # 1. Patients who have this doctor as their explicitly assigned primary doctor
    primary_pat_tuples = db.query(Patient.id).filter(
        (Patient.assigned_doctor_id == doctor.id) | (Patient.assigned_doctor_id == doctor.user_id)
    ).all()
    authorized_ids.update(p[0] for p in primary_pat_tuples if p[0])

    # 2. Patients who have active scheduled appointments with this doctor
    appt_pat_tuples = db.query(Appointment.patient_id).filter(
        (Appointment.doctor_id == doctor.id) | (Appointment.doctor_id == doctor.user_id),
        Appointment.status.in_(["SCHEDULED", "CONFIRMED"])
    ).all()
    authorized_ids.update(p[0] for p in appt_pat_tuples if p[0])

    # 3. Patients who have active pending scans assigned to this doctor
    scan_pat_tuples = db.query(MRIScan.patient_id).filter(
        (MRIScan.preferred_doctor_id == doctor.id) | (MRIScan.preferred_doctor_id == doctor.user_id),
        MRIScan.status.in_(["AI_COMPLETED", "UNDER_REVIEW"])
    ).all()
    authorized_ids.update(p[0] for p in scan_pat_tuples if p[0])

    return authorized_ids

def get_authorized_scans(current_user, db: Session):
    """
    Centralized helper returning MRIScan objects authorized for the logged-in user.
    - Admin: All scans across the hospital system.
    - Patient: Scans belonging to patient directly.
    - Doctor: ONLY scans belonging to patients who actively selected this doctor.
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
        if not authorized_patient_ids:
            return []

        return db.query(MRIScan).filter(
            MRIScan.patient_id.in_(authorized_patient_ids),
            (MRIScan.preferred_doctor_id == doctor.id) | (MRIScan.preferred_doctor_id.is_(None))
        ).order_by(MRIScan.upload_date.desc()).all()

    return []

def get_authorized_patients(current_user, db: Session):
    """
    Centralized helper returning Patient objects authorized for the logged-in user.
    - Admin: All patients.
    - Doctor: ONLY patients who specifically selected this doctor or have active care.
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
        if not authorized_patient_ids:
            return []

        return db.query(Patient).filter(Patient.id.in_(authorized_patient_ids)).all()

    return []
