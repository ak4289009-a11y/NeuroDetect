import io
import os
import pytest
import numpy as np
import cv2
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import User, Doctor, Patient, Appointment
from app.core.security import create_access_token
from app.services.mri_validator import validate_brain_mri_image

client = TestClient(app)

def get_token_for_user(email: str) -> str:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None, f"User {email} not found"
        return create_access_token(data={"user_id": user.id, "role": user.role})
    finally:
        db.close()

def test_patient_can_book_appointment():
    """FR-15: Test booking appointment with an approved doctor."""
    patient_token = get_token_for_user("amitav.roy@example.com")
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    db = SessionLocal()
    doctor = db.query(Doctor).filter(Doctor.is_approved == True).first()
    db.close()
    assert doctor is not None, "Need at least one approved doctor"

    appt_time = (datetime.utcnow() + timedelta(days=2)).replace(minute=0, second=0, microsecond=0)
    payload = {
        "doctor_id": doctor.id,
        "appointment_date": appt_time.isoformat(),
        "notes": "Regular neurological checkup"
    }

    response = client.post("/api/v1/doctors/appointments/book", json=payload, headers=headers)
    assert response.status_code == 200, f"Booking failed: {response.text}"
    data = response.json()
    assert data["status"] == "SCHEDULED"
    assert data["doctor_id"] == doctor.id

def test_doctor_can_view_appointments():
    """FR-15: Test doctor retrieving caseload appointments."""
    doctor_token = get_token_for_user("dr.smith@neurodetect.ai")
    headers = {"Authorization": f"Bearer {doctor_token}"}

    response = client.get("/api/v1/doctors/appointments/my-appointments", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_patient_cancel_appointment():
    """FR-15: Test patient cancelling their own appointment."""
    patient_token = get_token_for_user("amitav.roy@example.com")
    headers = {"Authorization": f"Bearer {patient_token}"}

    # Retrieve appointments to find one to cancel
    my_appts = client.get("/api/v1/doctors/appointments/my-appointments", headers=headers).json()
    if my_appts:
        appt_id = my_appts[0]["id"]
        response = client.put(f"/api/v1/doctors/appointments/{appt_id}/cancel", headers=headers)
        assert response.status_code == 200
        assert "cancelled" in response.json()["message"].lower()

def test_doctor_can_confirm_and_complete_appointment():
    """Test doctor updating appointment status to CONFIRMED and COMPLETED."""
    patient_token = get_token_for_user("amitav.roy@example.com")
    p_headers = {"Authorization": f"Bearer {patient_token}"}

    db = SessionLocal()
    doctor = db.query(Doctor).filter(Doctor.is_approved == True).first()
    doc_user = db.query(User).filter(User.id == doctor.user_id).first()
    db.close()

    doctor_token = create_access_token(data={"user_id": doc_user.id, "role": "DOCTOR"})
    d_headers = {"Authorization": f"Bearer {doctor_token}"}

    appt_time = (datetime.utcnow() + timedelta(days=5)).replace(minute=0, second=0, microsecond=0)
    payload = {
        "doctor_id": doctor.id,
        "appointment_date": appt_time.isoformat(),
        "notes": "Follow-up MRI review"
    }
    book_res = client.post("/api/v1/doctors/appointments/book", json=payload, headers=p_headers)
    assert book_res.status_code == 200
    appt_id = book_res.json()["id"]

    # Doctor confirms appointment
    confirm_res = client.put(f"/api/v1/doctors/appointments/{appt_id}/status", json={"status": "CONFIRMED"}, headers=d_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # Doctor completes appointment
    complete_res = client.put(f"/api/v1/doctors/appointments/{appt_id}/status", json={"status": "COMPLETED"}, headers=d_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

def test_appointment_booking_auto_heals_unregistered_patient_profile():
    """Test booking appointment auto-heals profile for patient account lacking pre-existing Patient row."""
    import uuid
    db = SessionLocal()
    random_email = f"autoheal_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=random_email,
        hashed_password="hashed_pw_test",
        role="PATIENT",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    token = create_access_token(data={"user_id": user_id, "role": "PATIENT"})
    doctor = db.query(Doctor).filter(Doctor.is_approved == True).first()
    db.close()

    headers = {"Authorization": f"Bearer {token}"}
    appt_time = (datetime.utcnow() + timedelta(days=3)).replace(minute=0, second=0, microsecond=0)
    res = client.post("/api/v1/doctors/appointments/book", json={
        "doctor_id": doctor.id,
        "appointment_date": appt_time.isoformat(),
        "notes": "First-time patient consultation"
    }, headers=headers)

    assert res.status_code == 200, f"Auto-heal booking failed: {res.text}"
    data = res.json()
    assert data["status"] == "SCHEDULED"
    assert data["patient"] is not None
    assert data["doctor"] is not None

import tempfile

def test_mri_upload_valid_image():
    """FR-08: Test valid MRI slice passes validation gate."""
    # Create synthetic axial MRI like image (grayscale with dark border and bright center)
    img = np.zeros((256, 256, 3), dtype=np.uint8)
    cv2.circle(img, (128, 128), 80, (140, 140, 140), -1)
    cv2.circle(img, (128, 128), 45, (190, 190, 190), -1)
    
    # Gaussian blur to simulate realistic parenchyma tissue
    img = cv2.GaussianBlur(img, (7, 7), 2.0)
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        cv2.imwrite(tmp_path, img)
        is_valid, msg = validate_brain_mri_image(tmp_path)
        assert is_valid is True, f"Expected valid MRI, got rejection: {msg}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_mri_quality_gate_rejection():
    """FR-09: Test 10-point quality gate intercepts invalid solid/bright images."""
    # Test case 1: Solid white document / blank screenshot
    white_img = np.full((256, 256, 3), 255, dtype=np.uint8)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        white_path = tmp.name
    try:
        cv2.imwrite(white_path, white_img)
        is_valid, msg = validate_brain_mri_image(white_path)
        assert is_valid is False, "Quality gate should reject pure white non-MRI frame"
    finally:
        if os.path.exists(white_path):
            os.remove(white_path)

    # Test case 2: Undersized image (<80px)
    tiny_img = np.zeros((40, 40, 3), dtype=np.uint8)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tiny_path = tmp.name
    try:
        cv2.imwrite(tiny_path, tiny_img)
        is_valid, msg = validate_brain_mri_image(tiny_path)
        assert is_valid is False, "Quality gate should reject undersized thumbnail"
    finally:
        if os.path.exists(tiny_path):
            os.remove(tiny_path)
