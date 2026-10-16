from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"

class DoctorStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class ScanStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    AI_COMPLETED = "AI_COMPLETED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PATIENT.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(50), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    scans = relationship("MRIScan", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=False)
    hospital = Column(String(255), nullable=False)
    city = Column(String(100), default="New Delhi")
    location = Column(String(255), default="New Delhi, India")
    medical_reg_no = Column(String(100), unique=True, nullable=False)
    experience_years = Column(Integer, nullable=False)
    certificate_url = Column(String(500), nullable=True)
    status = Column(String(50), default=DoctorStatus.PENDING.value)
    is_approved = Column(Boolean, default=False)

    user = relationship("User", back_populates="doctor_profile")
    reviews = relationship("DoctorReview", back_populates="doctor")
    approvals = relationship("DoctorApproval", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor")

class DoctorApproval(Base):
    __tablename__ = "doctor_approvals"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), nullable=False, default=DoctorStatus.PENDING.value)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="approvals")

class MRIScan(Base):
    __tablename__ = "mri_scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    preferred_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default=ScanStatus.AI_COMPLETED.value)

    patient = relationship("Patient", back_populates="scans")
    preferred_doctor = relationship("Doctor")
    ai_report = relationship("AIReport", back_populates="scan", uselist=False, cascade="all, delete-orphan")

class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("mri_scans.id"), unique=True, nullable=False)
    tumor_type = Column(String(100), nullable=False) # Glioma, Meningioma, Pituitary, No Tumor
    confidence = Column(Float, nullable=False)
    heatmap_path = Column(String(500), nullable=False)
    prediction_date = Column(DateTime, default=datetime.utcnow)

    scan = relationship("MRIScan", back_populates="ai_report")
    doctor_review = relationship("DoctorReview", back_populates="report", uselist=False, cascade="all, delete-orphan")

class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("ai_reports.id"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    clinical_notes = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=False)
    prescription = Column(Text, nullable=True)
    suggested_tests = Column(Text, nullable=True)
    medicines = Column(Text, nullable=True)
    next_visit_date = Column(String(100), nullable=True)
    status = Column(String(50), default=ScanStatus.APPROVED.value)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("AIReport", back_populates="doctor_review")
    doctor = relationship("Doctor", back_populates="reviews")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="SCHEDULED") # SCHEDULED, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(100), default="General")
    is_published = Column(Boolean, default=True)

class Diet(Base):
    __tablename__ = "diets"

    id = Column(Integer, primary_key=True, index=True)
    tumor_type = Column(String(100), nullable=False, unique=True) # Glioma, Meningioma, Pituitary, No Tumor
    foods_to_eat = Column(Text, nullable=False)
    foods_to_avoid = Column(Text, nullable=False)
    water_intake = Column(String(255), nullable=False)
    lifestyle_tips = Column(Text, nullable=False)

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)
    video_url = Column(String(500), nullable=False)

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    patient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # set when sent from dashboard
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="UNREAD")  # UNREAD, READ, REPLIED, ARCHIVED
    reply_text = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    replied_by_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)

    sender = relationship("User", foreign_keys=[sender_user_id])
    receiver = relationship("User", foreign_keys=[receiver_user_id])
    patient = relationship("Patient")
    doctor = relationship("Doctor")

class RegistrationOTP(Base):
    __tablename__ = "registration_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    otp_code = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    otp_code = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
