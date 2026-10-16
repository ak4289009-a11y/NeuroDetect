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
    Doctor access allowed IF ANY of the following is true:
      Rule 1: doctor is assigned to the patient's MRI scan (preferred_doctor_id == doctor.id)
      Rule 2: doctor has an appointment with the patient (Appointment.patient_id == patient_id AND Appointment.doctor_id == doctor.id)
      Rule 3: doctor and patient belong to the SAME hospital (doctor.hospital matches patient's associated hospital).

    Rule 5: Admin access is checked separately per endpoint.
    Rule 6: Patient-to-patient privacy is enforced at endpoint level.
    """
    if not doctor or not patient_id:
        return False

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

    # Rule 3: Same Hospital Relationship (supports raw & normalized matching)
    if doctor.hospital:
        doc_hosp = doctor.hospital.strip().lower()
        doc_hosp_norm = normalize_hospital_name(doctor.hospital)
        patient_hospitals = get_patient_hospitals(patient_id, db)
        if doc_hosp in patient_hospitals or doc_hosp_norm in patient_hospitals:
            return True

    # Rule 4: Existing Messaging Relationship (Messages exchanged in DB)
    try:
        from app.models.models import Message
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
    Consolidates assigned scans, appointments, direct messaging, and hospital colleagues.
    Reduces O(N*M) query loops down to targeted indexed queries.
    """
    if not doctor or not doctor.is_approved:
        return set()

    from app.models.models import MRIScan, Appointment, Message, Doctor

    authorized_ids: Set[int] = set()

    # 1. Patients with scans assigned directly to this doctor
    assigned_pat_tuples = db.query(MRIScan.patient_id).filter(MRIScan.preferred_doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in assigned_pat_tuples)

    # 2. Patients with appointments scheduled with this doctor
    appt_pat_tuples = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in appt_pat_tuples)

    # 3. Patients who have exchanged clinical messages with this doctor
    msg_pat_tuples = db.query(Message.patient_id).filter(Message.doctor_id == doctor.id).all()
    authorized_ids.update(p[0] for p in msg_pat_tuples)

    # 4. Same-hospital network relationship
    if doctor.hospital:
        doc_hosp_norm = normalize_hospital_name(doctor.hospital)
        colleagues = db.query(Doctor.id).filter(
            Doctor.hospital.ilike(f"%{doc_hosp_norm}%")
        ).all()
        colleague_ids = [c[0] for c in colleagues]
        if colleague_ids:
            hosp_scans = db.query(MRIScan.patient_id).filter(MRIScan.preferred_doctor_id.in_(colleague_ids)).all()
            authorized_ids.update(p[0] for p in hosp_scans)
            hosp_appts = db.query(Appointment.patient_id).filter(Appointment.doctor_id.in_(colleague_ids)).all()
            authorized_ids.update(p[0] for p in hosp_appts)

    return authorized_ids

def get_authorized_scans(current_user, db: Session):
    """
    High-performance centralized helper returning MRIScan objects authorized for the logged-in user.
    - Admin: All scans.
    - Patient: Scans belonging to patient directly.
    - Doctor: Scans belonging to authorized patient cohort (assigned, appointment, messages, hospital).
    """
    from app.models.models import MRIScan

    if current_user.role == "ADMIN":
        return db.query(MRIScan).order_by(MRIScan.upload_date.desc()).all()

    if current_user.role == "PATIENT":
        patient = current_user.patient_profile
        if not patient:
            return []
        return db.query(MRIScan).filter(MRIScan.patient_id == patient.id).order_by(MRIScan.upload_date.desc()).all()

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            return []
        
        authorized_patient_ids = get_doctor_authorized_patient_ids(doctor, db)
        if not authorized_patient_ids:
            return []

        return db.query(MRIScan).filter(
            MRIScan.patient_id.in_(authorized_patient_ids)
        ).order_by(MRIScan.upload_date.desc()).all()

    return []

def get_authorized_patients(current_user, db: Session):
    """
    High-performance centralized helper returning Patient objects authorized for the logged-in user.
    - Admin: All patients.
    - Doctor: Patients authorized via doctor care cohort.
    """
    from app.models.models import Patient

    if current_user.role == "ADMIN":
        return db.query(Patient).all()

    if current_user.role == "DOCTOR":
        doctor = current_user.doctor_profile
        if not doctor or not doctor.is_approved:
            return []
        
        authorized_patient_ids = get_doctor_authorized_patient_ids(doctor, db)
        if not authorized_patient_ids:
            return []

        return db.query(Patient).filter(Patient.id.in_(authorized_patient_ids)).all()

    return []
