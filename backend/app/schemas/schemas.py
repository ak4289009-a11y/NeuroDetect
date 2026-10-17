from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str

class UserLogin(UserBase):
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str

class RegisterOTPRequest(BaseModel):
    email: EmailStr
    role: Optional[str] = "PATIENT"

# Patient Profile Schemas
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    address: Optional[str] = None
    medical_history: Optional[str] = None

class PatientRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str
    phone: str
    address: Optional[str] = None
    medical_history: Optional[str] = None
    otp_code: Optional[str] = None

class PatientOut(BaseModel):
    id: int
    user_id: int
    assigned_doctor_id: Optional[int] = None
    name: str
    age: int
    gender: str
    phone: str
    address: Optional[str] = None
    medical_history: Optional[str] = None

    class Config:
        from_attributes = True

# Doctor Profile Schemas
class DoctorCreate(BaseModel):
    name: str
    specialization: str
    hospital: str
    city: Optional[str] = "New Delhi"
    location: Optional[str] = "New Delhi, India"
    medical_reg_no: str
    experience_years: int

class DoctorOut(BaseModel):
    id: int
    user_id: int
    name: str
    specialization: str
    hospital: str
    city: Optional[str] = "New Delhi"
    location: Optional[str] = "New Delhi, India"
    medical_reg_no: str
    experience_years: int
    certificate_url: Optional[str] = None
    status: str
    is_approved: bool

    class Config:
        from_attributes = True

class UserOut(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    patient_profile: Optional[PatientOut] = None
    doctor_profile: Optional[DoctorOut] = None

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    name: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

class DoctorApprovalAction(BaseModel):
    status: str # APPROVED, REJECTED, SUSPENDED
    notes: Optional[str] = None

# Doctor Review Schemas
class DoctorReviewCreate(BaseModel):
    report_id: int
    clinical_notes: Optional[str] = None
    diagnosis: str
    prescription: Optional[str] = None
    suggested_tests: Optional[str] = None
    medicines: Optional[str] = None
    next_visit_date: Optional[str] = None
    status: str = "APPROVED"

class DoctorReviewOut(BaseModel):
    id: int
    report_id: int
    doctor_id: int
    clinical_notes: Optional[str] = None
    diagnosis: str
    prescription: Optional[str] = None
    suggested_tests: Optional[str] = None
    medicines: Optional[str] = None
    next_visit_date: Optional[str] = None
    status: str
    reviewed_at: Optional[datetime] = None
    doctor: Optional[DoctorOut] = None

    class Config:
        from_attributes = True

# AI Report & MRI Scan Schemas
class AIReportOut(BaseModel):
    id: int
    scan_id: int
    tumor_type: str
    confidence: float
    heatmap_path: str
    prediction_date: datetime
    doctor_review: Optional[DoctorReviewOut] = None

    class Config:
        from_attributes = True

class MRIScanOut(BaseModel):
    id: int
    patient_id: int
    preferred_doctor_id: Optional[int] = None
    original_filename: str
    file_path: str
    upload_date: datetime
    status: str
    ai_report: Optional[AIReportOut] = None
    preferred_doctor: Optional[DoctorOut] = None
    patient: Optional[PatientOut] = None

    class Config:
        from_attributes = True

# Content & CMS Schemas
class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str = "General"
    is_published: bool = True

class FAQOut(BaseModel):
    id: int
    question: str
    answer: str
    category: str
    is_published: bool

    class Config:
        from_attributes = True

class DietCreate(BaseModel):
    tumor_type: str
    foods_to_eat: str
    foods_to_avoid: str
    water_intake: str
    lifestyle_tips: str

class DietOut(BaseModel):
    id: int
    tumor_type: str
    foods_to_eat: str
    foods_to_avoid: str
    water_intake: str
    lifestyle_tips: str

    class Config:
        from_attributes = True

class VideoCreate(BaseModel):
    title: str
    description: str
    category: str
    thumbnail_url: str
    video_url: str

class VideoOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    thumbnail_url: str
    video_url: str

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    sender_name: str
    sender_email: EmailStr
    subject: str
    message: str
    patient_user_id: Optional[int] = None

class MessageReply(BaseModel):
    reply_text: str

class MessageOut(BaseModel):
    id: int
    patient_user_id: Optional[int] = None
    sender_name: str
    sender_email: str
    subject: str
    message: str
    status: str
    reply_text: Optional[str] = None
    replied_at: Optional[datetime] = None
    replied_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    details: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatMessageSend(BaseModel):
    receiver_user_id: int
    message_text: str

class ChatMessageOut(BaseModel):
    id: int
    sender_user_id: int
    receiver_user_id: int
    patient_id: int
    doctor_id: int
    message_text: str
    created_at: datetime
    read_at: Optional[datetime] = None
    is_read: bool

    class Config:
        from_attributes = True

class ChatConversationOut(BaseModel):
    partner_user_id: int
    partner_name: str
    partner_role: str
    partner_info: str
    last_message: str
    last_message_time: datetime
    unread_count: int

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    notes: Optional[str] = "Clinical Consultation"

class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    status: str
    notes: Optional[str] = None
    doctor: Optional[DoctorOut] = None
    patient: Optional[PatientOut] = None

    class Config:
        from_attributes = True
