import io
import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import User, Doctor, Patient, MRIScan, AIReport, DoctorReview, Appointment, Message, AuditLog, ScanStatus
from app.core.security import create_access_token, get_password_hash

client = TestClient(app)

def create_or_get_user(email: str, role: str, name: str, is_approved_doctor: bool = True):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=get_password_hash("TestPass123!"),
                role=role,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if role == "PATIENT":
            pat = db.query(Patient).filter(Patient.user_id == user.id).first()
            if not pat:
                pat = Patient(
                    user_id=user.id,
                    name=name,
                    age=32,
                    gender="Female",
                    phone="+91 9876500001",
                    address="Connaught Place, New Delhi"
                )
                db.add(pat)
                db.commit()
                db.refresh(pat)
        elif role == "DOCTOR":
            doc = db.query(Doctor).filter(Doctor.user_id == user.id).first()
            if not doc:
                import uuid
                doc = Doctor(
                    user_id=user.id,
                    name=name,
                    specialization="Neurology",
                    hospital="AIIMS New Delhi",
                    city="New Delhi",
                    location="New Delhi, India",
                    medical_reg_no=f"REG-{uuid.uuid4().hex[:6].upper()}",
                    experience_years=10,
                    status="APPROVED" if is_approved_doctor else "PENDING",
                    is_approved=is_approved_doctor
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
            else:
                doc.is_approved = is_approved_doctor
                db.commit()

        token = create_access_token(data={"user_id": user.id, "role": user.role})
        return user, token
    finally:
        db.close()


def test_1_patient_can_select_approved_doctor():
    """
    Test 1:
    - Patient can view approved doctors directory.
    - Patient explicitly selects an approved doctor.
    - Relationship is persisted in the database.
    - Patient can fetch their selected doctor.
    - Selecting an unapproved or non-existent doctor is rejected.
    """
    patient_user, patient_token = create_or_get_user("test_pat_1@neurodetect.ai", "PATIENT", "Priya Sharma")
    doc1_user, doc1_token = create_or_get_user("test_doc_1@neurodetect.ai", "DOCTOR", "Dr. Rajesh Gupta", is_approved_doctor=True)
    unapproved_user, _ = create_or_get_user("test_doc_unapp@neurodetect.ai", "DOCTOR", "Dr. Unapproved", is_approved_doctor=False)

    p_headers = {"Authorization": f"Bearer {patient_token}"}

    db = SessionLocal()
    doc1 = db.query(Doctor).filter(Doctor.user_id == doc1_user.id).first()
    unapproved_doc = db.query(Doctor).filter(Doctor.user_id == unapproved_user.id).first()
    db.close()

    # 1. Selecting unapproved doctor must fail
    res_unapp = client.post("/api/v1/doctors/select", json={"doctor_id": unapproved_doc.id}, headers=p_headers)
    assert res_unapp.status_code in [400, 404]

    # 2. Selecting approved doctor succeeds
    res_select = client.post("/api/v1/doctors/select", json={"doctor_id": doc1.id}, headers=p_headers)
    assert res_select.status_code == 200
    data = res_select.json()
    assert data["assigned_doctor"]["id"] == doc1.id

    # 3. Verify in database
    db = SessionLocal()
    pat_record = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
    assert pat_record.assigned_doctor_id == doc1.id
    db.close()

    # 4. GET /doctors/selected returns Doctor 1
    res_get = client.get("/api/v1/doctors/selected", headers=p_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == doc1.id


def test_2_only_selected_doctor_can_access_authorized_clinical_data():
    """
    Test 2:
    - Only the selected doctor can view the patient's personal details, MRI scans, AI reports, and clinical history.
    """
    patient_user, patient_token = create_or_get_user("test_pat_2@neurodetect.ai", "PATIENT", "Sunil Verma")
    doc1_user, doc1_token = create_or_get_user("test_doc_sel2@neurodetect.ai", "DOCTOR", "Dr. Amit Roy", is_approved_doctor=True)

    p_headers = {"Authorization": f"Bearer {patient_token}"}
    d1_headers = {"Authorization": f"Bearer {doc1_token}"}

    db = SessionLocal()
    doc1 = db.query(Doctor).filter(Doctor.user_id == doc1_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
    patient.assigned_doctor_id = doc1.id
    db.commit()

    # Create scan and AI report for patient
    scan = MRIScan(
        patient_id=patient.id,
        preferred_doctor_id=doc1.id,
        original_filename="test_scan_2.jpg",
        file_path="/uploads/mri/test_scan_2.jpg",
        status=ScanStatus.AI_COMPLETED.value
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    ai_report = AIReport(
        scan_id=scan.id,
        tumor_type="Meningioma",
        confidence=95.5,
        heatmap_path="/uploads/heatmaps/test_scan_2.png"
    )
    db.add(ai_report)
    db.commit()
    db.refresh(ai_report)
    scan_id = scan.id
    patient_id = patient.id
    report_id = ai_report.id
    db.close()

    # Selected doctor can access patient history
    res_hist = client.get(f"/api/v1/doctors/patients/history/{patient_id}", headers=d1_headers)
    assert res_hist.status_code == 200
    assert res_hist.json()["patient"]["id"] == patient_id

    # Selected doctor can access scan details
    res_scan = client.get(f"/api/v1/scans/{scan_id}", headers=d1_headers)
    assert res_scan.status_code == 200
    assert res_scan.json()["id"] == scan_id

    # Selected doctor can submit clinical review
    res_rev = client.post(
        "/api/v1/doctors/review",
        json={
            "report_id": report_id,
            "clinical_notes": "Slight mass effect observed.",
            "diagnosis": "Meningioma Grade I",
            "prescription": "Symptom management",
            "suggested_tests": "MRI with contrast in 6 months",
            "medicines": "None currently",
            "next_visit_date": "6 Months",
            "status": "APPROVED"
        },
        headers=d1_headers
    )
    assert res_rev.status_code == 200


def test_3_other_doctors_cannot_access_private_information():
    """
    Test 3:
    - Other doctors (not selected by the patient) are blocked from accessing patient private details,
      MRI scans, AI diagnostic results, reports, and history.
    """
    patient_user, patient_token = create_or_get_user("test_pat_3@neurodetect.ai", "PATIENT", "Kavita Sen")
    doc_sel_user, _ = create_or_get_user("test_doc_sel3@neurodetect.ai", "DOCTOR", "Dr. Selected Neurologist", is_approved_doctor=True)
    doc_other_user, doc_other_token = create_or_get_user("test_doc_other3@neurodetect.ai", "DOCTOR", "Dr. Other Doctor", is_approved_doctor=True)

    other_headers = {"Authorization": f"Bearer {doc_other_token}"}

    db = SessionLocal()
    doc_sel = db.query(Doctor).filter(Doctor.user_id == doc_sel_user.id).first()
    doc_other = db.query(Doctor).filter(Doctor.user_id == doc_other_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
    patient.assigned_doctor_id = doc_sel.id

    scan = MRIScan(
        patient_id=patient.id,
        preferred_doctor_id=doc_sel.id,
        original_filename="confidential_scan.jpg",
        file_path="/uploads/mri/confidential_scan.jpg",
        status=ScanStatus.AI_COMPLETED.value
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    ai_report = AIReport(
        scan_id=scan.id,
        tumor_type="Glioma",
        confidence=92.0,
        heatmap_path="/uploads/heatmaps/confidential.png"
    )
    db.add(ai_report)
    db.commit()
    db.refresh(ai_report)
    scan_id = scan.id
    patient_id = patient.id
    report_id = ai_report.id
    db.close()

    # 1. Unrelated doctor blocked from patient history
    res_hist = client.get(f"/api/v1/doctors/patients/history/{patient_id}", headers=other_headers)
    assert res_hist.status_code == 403, f"Expected 403, got {res_hist.status_code}"

    # 2. Unrelated doctor blocked from patient scan
    res_scan = client.get(f"/api/v1/scans/{scan_id}", headers=other_headers)
    assert res_scan.status_code == 403, f"Expected 403, got {res_scan.status_code}"

    # 3. Unrelated doctor blocked from reviewing scan
    res_rev = client.post(
        "/api/v1/doctors/review",
        json={
            "report_id": report_id,
            "clinical_notes": "Unauthorized attempt",
            "diagnosis": "Glioma",
            "prescription": "None",
            "suggested_tests": "None",
            "medicines": "None",
            "next_visit_date": "None",
            "status": "APPROVED"
        },
        headers=other_headers
    )
    assert res_rev.status_code == 403, f"Expected 403, got {res_rev.status_code}"

    # 4. Patient is not visible in unrelated doctor's patient list
    res_pats = client.get("/api/v1/doctors/patients", headers=other_headers)
    assert res_pats.status_code == 200
    pat_ids = [p["id"] for p in res_pats.json()]
    assert patient_id not in pat_ids


def test_4_changing_doctors_revokes_former_doctor_access():
    """
    Test 4:
    - Changing doctor immediately revokes former doctor's access to new requests.
    - Grants access to the newly selected doctor.
    - Preserves historical records and audit logs.
    """
    patient_user, patient_token = create_or_get_user("test_pat_4@neurodetect.ai", "PATIENT", "Deepak Chopra")
    doc_old_user, doc_old_token = create_or_get_user("test_doc_old4@neurodetect.ai", "DOCTOR", "Dr. Old Doctor", is_approved_doctor=True)
    doc_new_user, doc_new_token = create_or_get_user("test_doc_new4@neurodetect.ai", "DOCTOR", "Dr. New Doctor", is_approved_doctor=True)

    p_headers = {"Authorization": f"Bearer {patient_token}"}
    old_headers = {"Authorization": f"Bearer {doc_old_token}"}
    new_headers = {"Authorization": f"Bearer {doc_new_token}"}

    db = SessionLocal()
    doc_old = db.query(Doctor).filter(Doctor.user_id == doc_old_user.id).first()
    doc_new = db.query(Doctor).filter(Doctor.user_id == doc_new_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
    patient_id = patient.id
    doc_old_id = doc_old.id
    doc_new_id = doc_new.id

    # Initially select Doctor Old
    patient.assigned_doctor_id = doc_old_id
    db.commit()
    db.close()

    # Verify old doctor initially had access
    res_init = client.get(f"/api/v1/doctors/patients/history/{patient_id}", headers=old_headers)
    assert res_init.status_code == 200

    # Patient changes doctor to Doctor New
    res_change = client.post("/api/v1/doctors/select", json={"doctor_id": doc_new_id}, headers=p_headers)
    assert res_change.status_code == 200
    assert res_change.json()["assigned_doctor"]["id"] == doc_new_id

    # 1. Former doctor access is now REVOKED (403)
    res_old_revoked = client.get(f"/api/v1/doctors/patients/history/{patient_id}", headers=old_headers)
    assert res_old_revoked.status_code == 403, f"Expected 403 for former doctor, got {res_old_revoked.status_code}"

    # 2. New doctor has access (200)
    res_new_granted = client.get(f"/api/v1/doctors/patients/history/{patient_id}", headers=new_headers)
    assert res_new_granted.status_code == 200

    # 3. Patient is removed from former doctor's caseload
    res_old_caseload = client.get("/api/v1/doctors/patients", headers=old_headers)
    assert res_old_caseload.status_code == 200
    old_caseload_ids = [p["id"] for p in res_old_caseload.json()]
    assert patient_id not in old_caseload_ids

    # 4. Audit trail preserved
    db = SessionLocal()
    audit_entry = db.query(AuditLog).filter(
        AuditLog.user_id == patient_user.id,
        AuditLog.action == "PATIENT_CHANGE_DOCTOR"
    ).first()
    assert audit_entry is not None
    db.close()


def test_5_messages_reach_intended_recipient_and_conversations_isolated():
    """
    Test 5:
    - Patient -> Selected Doctor delivers message to exact doctor.
    - Selected Doctor -> Patient allows reply.
    - Patient -> Admin creates separate support conversation.
    - Doctor -> Admin creates separate admin conversation.
    - Admin replies route back to correct conversations.
    """
    patient_user, patient_token = create_or_get_user("test_pat_5@neurodetect.ai", "PATIENT", "Meera Nair")
    doc_user, doc_token = create_or_get_user("test_doc_5@neurodetect.ai", "DOCTOR", "Dr. Meera Doctor", is_approved_doctor=True)
    admin_user, admin_token = create_or_get_user("test_admin_5@neurodetect.ai", "ADMIN", "System Admin")

    p_headers = {"Authorization": f"Bearer {patient_token}"}
    d_headers = {"Authorization": f"Bearer {doc_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    doc = db.query(Doctor).filter(Doctor.user_id == doc_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()
    patient.assigned_doctor_id = doc.id
    db.commit()
    db.close()

    # 1. Patient -> Selected Doctor
    res_p2d = client.post("/api/v1/messages/send", json={
        "receiver_user_id": doc_user.id,
        "message_text": "Hello Dr. Meera, reviewing my MRI scan."
    }, headers=p_headers)
    assert res_p2d.status_code == 200
    assert res_p2d.json()["receiver_user_id"] == doc_user.id

    # 2. Selected Doctor -> Patient
    res_d2p = client.post("/api/v1/messages/send", json={
        "receiver_user_id": patient_user.id,
        "message_text": "Hello Meera, I am reviewing your scans now."
    }, headers=d_headers)
    assert res_d2p.status_code == 200
    assert res_d2p.json()["receiver_user_id"] == patient_user.id

    # 3. Patient -> Admin Support
    res_p2a = client.post("/api/v1/messages/send", json={
        "receiver_user_id": admin_user.id,
        "message_text": "Need billing and portal support assistance."
    }, headers=p_headers)
    assert res_p2a.status_code == 200
    assert res_p2a.json()["receiver_user_id"] == admin_user.id

    # 4. Doctor -> Admin
    res_d2a = client.post("/api/v1/messages/send", json={
        "receiver_user_id": admin_user.id,
        "message_text": "License renewal inquiry for department."
    }, headers=d_headers)
    assert res_d2a.status_code == 200
    assert res_d2a.json()["receiver_user_id"] == admin_user.id

    # 5. Admin replies to Patient (returns to patient support conversation)
    res_a2p = client.post("/api/v1/messages/send", json={
        "receiver_user_id": patient_user.id,
        "message_text": "Support ticket received. We are investigating."
    }, headers=a_headers)
    assert res_a2p.status_code == 200

    # 6. Verify conversations remain separate:
    # Patient <-> Doctor conversation contains ONLY p2d and d2p messages
    res_conv_pd = client.get(f"/api/v1/messages/conversation/{doc_user.id}", headers=p_headers)
    assert res_conv_pd.status_code == 200
    pd_texts = [m["message_text"] for m in res_conv_pd.json()]
    assert "Hello Dr. Meera, reviewing my MRI scan." in pd_texts
    assert "Hello Meera, I am reviewing your scans now." in pd_texts
    assert "Need billing and portal support assistance." not in pd_texts

    # Patient <-> Admin conversation contains ONLY support messages
    res_conv_pa = client.get(f"/api/v1/messages/conversation/{admin_user.id}", headers=p_headers)
    assert res_conv_pa.status_code == 200
    pa_texts = [m["message_text"] for m in res_conv_pa.json()]
    assert "Need billing and portal support assistance." in pa_texts
    assert "Support ticket received. We are investigating." in pa_texts
    assert "Hello Dr. Meera, reviewing my MRI scan." not in pa_texts


def test_6_unauthorized_conversation_access_prevented():
    """
    Test 6:
    - Former doctors cannot access old conversations or send new messages to former patients.
    - Unrelated doctors cannot access conversations of patients who haven't selected them.
    - Unauthorized parties cannot snoop on conversations.
    """
    patient_user, patient_token = create_or_get_user("test_pat_6@neurodetect.ai", "PATIENT", "Alok Nath")
    former_doc_user, former_doc_token = create_or_get_user("test_doc_former6@neurodetect.ai", "DOCTOR", "Dr. Former Doctor", is_approved_doctor=True)
    unrelated_doc_user, unrelated_doc_token = create_or_get_user("test_doc_unrelated6@neurodetect.ai", "DOCTOR", "Dr. Unrelated Doctor", is_approved_doctor=True)

    p_headers = {"Authorization": f"Bearer {patient_token}"}
    former_headers = {"Authorization": f"Bearer {former_doc_token}"}
    unrelated_headers = {"Authorization": f"Bearer {unrelated_doc_token}"}

    db = SessionLocal()
    former_doc = db.query(Doctor).filter(Doctor.user_id == former_doc_user.id).first()
    unrelated_doc = db.query(Doctor).filter(Doctor.user_id == unrelated_doc_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == patient_user.id).first()

    # Patient initially has Former Doctor selected
    patient.assigned_doctor_id = former_doc.id
    db.commit()
    db.close()

    # Initial message sent while relationship was active
    res_m1 = client.post("/api/v1/messages/send", json={
        "receiver_user_id": former_doc_user.id,
        "message_text": "Confidential medical inquiry from past."
    }, headers=p_headers)
    assert res_m1.status_code == 200

    # Now Patient deselects Former Doctor (or changes doctor)
    res_desel = client.post("/api/v1/doctors/select", json={"doctor_id": None}, headers=p_headers)
    assert res_desel.status_code == 200

    # 1. Former doctor attempts to access conversation -> 403 Forbidden
    res_f_access = client.get(f"/api/v1/messages/conversation/{patient_user.id}", headers=former_headers)
    assert res_f_access.status_code == 403, f"Expected 403, got {res_f_access.status_code}"

    # 2. Former doctor attempts to send new message to former patient -> 403 Forbidden
    res_f_send = client.post("/api/v1/messages/send", json={
        "receiver_user_id": patient_user.id,
        "message_text": "New unsolicited message from former doctor."
    }, headers=former_headers)
    assert res_f_send.status_code == 403, f"Expected 403, got {res_f_send.status_code}"

    # 3. Unrelated doctor attempts to access conversation -> 403 Forbidden
    res_u_access = client.get(f"/api/v1/messages/conversation/{patient_user.id}", headers=unrelated_headers)
    assert res_u_access.status_code == 403, f"Expected 403, got {res_u_access.status_code}"

    # 4. Unrelated doctor attempts to send message to patient -> 403 Forbidden
    res_u_send = client.post("/api/v1/messages/send", json={
        "receiver_user_id": patient_user.id,
        "message_text": "Unsolicited message from unrelated doctor."
    }, headers=unrelated_headers)
    assert res_u_send.status_code == 403, f"Expected 403, got {res_u_send.status_code}"

    # 5. Patient cannot send message to an unselected / unrelated doctor -> 403 Forbidden
    res_p_send_unrelated = client.post("/api/v1/messages/send", json={
        "receiver_user_id": unrelated_doc_user.id,
        "message_text": "Attempting to contact doctor without selection."
    }, headers=p_headers)
    assert res_p_send_unrelated.status_code == 403, f"Expected 403, got {res_p_send_unrelated.status_code}"
