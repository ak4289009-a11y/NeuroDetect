-- ================================================================================
-- NEURODETECT: BRAIN TUMOR CAD CLINICAL DECISION SUPPORT SYSTEM
-- Clinical Intelligence & Neuro-Radiology Image Analytics Platform
-- Relational Database Schema Definition (Third Normal Form - 3NF)
-- Compatible with SQLite, PostgreSQL, and MySQL / MariaDB
-- ================================================================================

CREATE DATABASE IF NOT EXISTS neurodetect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neurodetect;

-- 1. Users Table (Core Authentication & Role Management)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PATIENT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- 2. Patients Table (Demographics & Medical Profile)
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(50) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    medical_history TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_patient_user (user_id)
) ENGINE=InnoDB;

-- 3. Doctors Table (Specialist Profile & Credential Verification)
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    hospital VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT 'New Delhi',
    location VARCHAR(255) DEFAULT 'New Delhi, India',
    medical_reg_no VARCHAR(100) NOT NULL UNIQUE,
    experience_years INT NOT NULL,
    certificate_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'PENDING',
    is_approved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_doctor_reg_no (medical_reg_no),
    INDEX idx_doctor_status (status)
) ENGINE=InnoDB;

-- 4. Doctor Approvals Table (Admin Governance Audit Trail)
CREATE TABLE IF NOT EXISTS doctor_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    admin_id INT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_approval_doctor (doctor_id)
) ENGINE=InnoDB;

-- 5. MRI Scans Table (Uploaded Cranial Scans)
CREATE TABLE IF NOT EXISTS mri_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    preferred_doctor_id INT,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'AI_COMPLETED',
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    INDEX idx_scan_patient (patient_id),
    INDEX idx_scan_status (status)
) ENGINE=InnoDB;

-- 6. AI Reports Table (DenseNet-121 Inference & Saliency)
CREATE TABLE IF NOT EXISTS ai_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scan_id INT UNIQUE NOT NULL,
    tumor_type VARCHAR(100) NOT NULL,
    confidence FLOAT NOT NULL,
    heatmap_path VARCHAR(500) NOT NULL,
    prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES mri_scans(id) ON DELETE CASCADE,
    INDEX idx_report_tumor (tumor_type)
) ENGINE=InnoDB;

-- 7. Doctor Reviews Table (Clinical Verification & Prescription)
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT UNIQUE NOT NULL,
    doctor_id INT NOT NULL,
    clinical_notes TEXT,
    diagnosis TEXT NOT NULL,
    prescription TEXT,
    suggested_tests TEXT,
    medicines TEXT,
    next_visit_date VARCHAR(100),
    status VARCHAR(50) DEFAULT 'APPROVED',
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES ai_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_review_doctor (doctor_id)
) ENGINE=InnoDB;

-- 8. Appointments Table (Teleconsultation Scheduling)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    reason TEXT,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_appointment_date (appointment_date)
) ENGINE=InnoDB;

-- 9. FAQs Table (Medical & Platform Knowledge Base)
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    is_published BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. Diet Recommendations Table (Pathology-Specific Nutrition)
CREATE TABLE IF NOT EXISTS diets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tumor_type VARCHAR(100) NOT NULL UNIQUE,
    foods_to_eat TEXT NOT NULL,
    foods_to_avoid TEXT NOT NULL,
    water_intake VARCHAR(255) NOT NULL,
    lifestyle_tips TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. Educational Videos Table (Patient Information & Cancer Literacy)
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. Public Contact Messages Table (Feedback & Inquiries)
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_user_id INT,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'UNREAD',
    reply_text TEXT,
    replied_at DATETIME,
    replied_by_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. System Notifications Table (User In-App Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id)
) ENGINE=InnoDB;

-- 14. Security Audit Logs Table (Tamper-Evident Access Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(100),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB;

-- 15. In-App Direct Messages Table (Patient-Doctor Clinical Chat)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_user_id INT NOT NULL,
    receiver_user_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    message_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_msg_participants (sender_user_id, receiver_user_id)
) ENGINE=InnoDB;

-- 16. Registration OTP Verification Table (Email Verification)
CREATE TABLE IF NOT EXISTS registration_otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    otp_code VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reg_otp_email (email)
) ENGINE=InnoDB;

-- 17. Password Reset OTP Table (Secure Recovery Workflow)
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    otp_code VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pwd_otp_email (email)
) ENGINE=InnoDB;
