import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import User, PasswordResetOTP
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

def get_token_for_user(email: str) -> str:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None, f"User {email} not found"
        return create_access_token(data={"user_id": user.id, "role": user.role})
    finally:
        db.close()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_rbac_admin_patients_forbidden_for_doctor():
    """Ensure doctor cannot access full admin patient directory (403 Forbidden)."""
    doctor_token = get_token_for_user("dr.smith@neurodetect.ai")
    headers = {"Authorization": f"Bearer {doctor_token}"}
    response = client.get("/api/v1/admin/patients", headers=headers)
    assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"

def test_rbac_admin_patients_allowed_for_admin():
    """Ensure admin can access admin patient directory (200 OK)."""
    admin_token = get_token_for_user("admin@neurodetect.ai")
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/admin/patients", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_doctor_patients_endpoint_scoped_access():
    """Ensure doctor can access /api/v1/doctors/patients and receives their authorized cohort."""
    doctor_token = get_token_for_user("dr.smith@neurodetect.ai")
    headers = {"Authorization": f"Bearer {doctor_token}"}
    response = client.get("/api/v1/doctors/patients", headers=headers)
    assert response.status_code == 200
    patients = response.json()
    assert isinstance(patients, list)
    print(f"Doctor has {len(patients)} authorized patients.")

def test_password_reset_otp_database_persistence_and_single_use():
    """Test full persistent DB lifecycle of PasswordResetOTP."""
    test_email = "amitav.roy@example.com"
    db = SessionLocal()
    try:
        # Clean up any leftover test OTPs for this user
        user = db.query(User).filter(User.email == test_email).first()
        assert user is not None
        db.query(PasswordResetOTP).filter(PasswordResetOTP.email == test_email).delete()
        db.commit()

        # Step 1: Request password reset
        resp = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
        assert resp.status_code == 200

        # Step 2: Query DB directly for persisted OTP
        otp_record = db.query(PasswordResetOTP).filter(PasswordResetOTP.email == test_email).first()
        assert otp_record is not None, "PasswordResetOTP record not persisted to database"
        assert len(otp_record.otp_code) == 6
        assert otp_record.expires_at > datetime.utcnow()
        otp_code = otp_record.otp_code

        # Step 3: Attempt reset with wrong OTP
        wrong_resp = client.post("/api/v1/auth/reset-password", json={
            "email": test_email,
            "reset_code": "000000",
            "new_password": "NewTempPassword@123"
        })
        assert wrong_resp.status_code == 400

        # Step 4: Reset with correct OTP
        good_resp = client.post("/api/v1/auth/reset-password", json={
            "email": test_email,
            "reset_code": otp_code,
            "new_password": "NewTempPassword@123"
        })
        assert good_resp.status_code == 200

        # Step 5: Verify single-use: record must be deleted from DB
        db.expire_all()
        reused_record = db.query(PasswordResetOTP).filter(PasswordResetOTP.email == test_email).first()
        assert reused_record is None, "OTP was not deleted after successful reset"

        # Step 6: Verify second attempt with same OTP fails
        replay_resp = client.post("/api/v1/auth/reset-password", json={
            "email": test_email,
            "reset_code": otp_code,
            "new_password": "AnotherPassword@123"
        })
        assert replay_resp.status_code == 400

        # Step 7: Restore original password
        user.hashed_password = get_password_hash("Patient@123456")
        db.commit()
    finally:
        db.close()
