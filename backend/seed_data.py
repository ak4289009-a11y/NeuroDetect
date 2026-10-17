import os
import cv2
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.models import (
    User, Patient, Doctor, DoctorStatus, DoctorApproval, MRIScan, AIReport,
    DoctorReview, FAQ, Diet, Video, UserRole, ScanStatus, Message, Notification, AuditLog, Appointment
)

def create_sample_mri_images():
    """Populates authentic clinical axial brain MRI scans and Grad-CAM heatmaps for demonstration."""
    import shutil
    os.makedirs(settings.MRI_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.HEATMAP_DIR, exist_ok=True)

    static_assets_dir = os.path.join(settings.BASE_DIR, "app", "static", "clinical_mri_assets")

    sample_images = [
        ("mri_sample_glioma.png", "heatmap_sample_glioma.png"),
        ("mri_sample_meningioma.png", "heatmap_sample_meningioma.png"),
        ("mri_sample_pituitary.png", "heatmap_sample_pituitary.png"),
        ("mri_sample_notumor.png", "heatmap_sample_notumor.png"),
    ]

    for mri_file, heatmap_file in sample_images:
        mri_path = os.path.join(settings.MRI_UPLOAD_DIR, mri_file)
        heatmap_path = os.path.join(settings.HEATMAP_DIR, heatmap_file)

        src_mri = os.path.join(static_assets_dir, mri_file)
        src_heatmap = os.path.join(static_assets_dir, heatmap_file)

        # Ensure high-resolution real clinical images are preserved
        if os.path.exists(src_mri) and (not os.path.exists(mri_path) or os.path.getsize(mri_path) < 50000):
            shutil.copy2(src_mri, mri_path)

        if os.path.exists(src_heatmap) and (not os.path.exists(heatmap_path) or os.path.getsize(heatmap_path) < 50000):
            shutil.copy2(src_heatmap, heatmap_path)


def seed_database():
    Base.metadata.create_all(bind=engine)
    create_sample_mri_images()
    db = SessionLocal()

    try:
        # Auto-approve all doctors in database to activate clinical dashboards
        db.query(Doctor).update({Doctor.is_approved: True, Doctor.status: DoctorStatus.APPROVED.value})
        db.commit()

        print("[Seeding] Populating database with Clean Realistic Demo Dataset (10 Doctors, 10 Patients, 50 Historical Scans)...")

        # 1. ADMIN USER
        admin_email = "admin@neurodetect.ai"
        admin_user = db.query(User).filter(func.lower(User.email) == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("Admin@123456"),
                role=UserRole.ADMIN.value,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        else:
            admin_user.hashed_password = get_password_hash("Admin@123456")
            admin_user.is_active = True
            db.commit()

        # Auto-reconcile distinct identities for dr.rajesh and dr.smith
        u_rajesh = db.query(User).filter(func.lower(User.email) == "dr.rajesh@neurodetect.ai").first()
        u_smith = db.query(User).filter(func.lower(User.email) == "dr.smith@neurodetect.ai").first()
        u_robert = db.query(User).filter(func.lower(User.email) == "dr.robert@neurodetect.ai").first()

        # If u_robert exists, delete it to free up its registration number MED-MGH-12345
        if u_robert:
            if u_robert.doctor_profile:
                db.delete(u_robert.doctor_profile)
            db.delete(u_robert)
            db.commit()

        # If u_rajesh currently has Doctor Robert Smith (from prior merge) and u_smith is missing:
        if u_rajesh and not u_smith and u_rajesh.doctor_profile and "Robert" in (u_rajesh.doctor_profile.name or ""):
            u_rajesh.email = "dr.smith@neurodetect.ai"
            u_rajesh.doctor_profile.medical_reg_no = "MED-MGH-12345"
            db.commit()
            u_smith = u_rajesh
            u_rajesh = None

        if u_smith and u_smith.doctor_profile:
            u_smith.doctor_profile.name = "Dr. Robert Smith"
            u_smith.doctor_profile.specialization = "Director of Neurology"
            u_smith.doctor_profile.hospital = "Massachusetts General Hospital"
            u_smith.doctor_profile.city = "Boston"
            u_smith.doctor_profile.location = "Boston, MA, USA"
            u_smith.doctor_profile.medical_reg_no = "MED-MGH-12345"
            db.commit()

        # 2. DOCTORS BY INDIA-WIDE LOCATION
        doctors_data = [
            ("dr.rajesh@neurodetect.ai", "Doctor@123456", "Dr. Rajesh Kumar", "Senior Neuro-Oncologist", "AIIMS Medical Center", "New Delhi", "New Delhi, Delhi, India", "MED-AIIMS-99201", 14, True),
            ("dr.smith@neurodetect.ai", "Doctor@123456", "Dr. Robert Smith", "Director of Neurology", "Massachusetts General Hospital", "Boston", "Boston, MA, USA", "MED-MGH-12345", 20, True),
            ("dr.thorne@neurodetect.ai", "Doctor@123456", "Dr. Sunita Patel", "Chief Neuroradiologist", "Apollo Hospital", "Mumbai", "Mumbai, MH, India", "MED-APOLLO-77123", 16, True),
            ("dr.vikram@neurodetect.ai", "Doctor@123456", "Dr. Vikram Rao", "Consultant Neurosurgeon", "Manipal Hospital", "Bangalore", "Bangalore, KA, India", "MED-MANIPAL-44321", 12, True),
            ("dr.ananya@neurodetect.ai", "Doctor@123456", "Dr. Ananya Sharma", "Neuro-radiology Specialist", "SMS Hospital", "Jaipur", "Jaipur, RJ, India", "MED-SMS-88901", 10, True),
            ("dr.bose@neurodetect.ai", "Doctor@123456", "Dr. Subhash Bose", "Director of Neurology", "SSKM Hospital", "Kolkata", "Kolkata, WB, India", "MED-SSKM-10203", 18, True),
            ("dr.sinha@neurodetect.ai", "Doctor@123456", "Dr. Rakesh Sinha", "Senior Neuroradiologist", "PMCH", "Patna", "Patna, Bihar, India", "MED-PMCH-50401", 15, True),
            ("dr.meenakshi@neurodetect.ai", "Doctor@123456", "Dr. Meenakshi Sundaram", "Chief Neuro-Oncologist", "Apollo Hospitals", "Chennai", "Chennai, TN, India", "MED-CHEN-99881", 17, True),
            ("dr.deshmukh@neurodetect.ai", "Doctor@123456", "Dr. Sanjay Deshmukh", "Neurological Specialist", "KEM Hospital", "Pune", "Pune, MH, India", "MED-KEM-33211", 11, True),
            ("dr.baruah@neurodetect.ai", "Doctor@123456", "Dr. Pranab Baruah", "Consultant Neuroradiologist", "GNRC Hospital", "Guwahati", "Guwahati, Assam, India", "MED-GNRC-77441", 13, True),
            ("dr.dash@neurodetect.ai", "Doctor@123456", "Dr. Alok Dash", "Neuro-Oncology Director", "AMRI Hospital", "Bhubaneswar", "Bhubaneswar, Odisha, India", "MED-AMRI-55112", 19, True),
            ("dr.sneha@neurodetect.ai", "Doctor@123456", "Dr. Sneha Verma", "Consultant Neuroradiologist", "Fortis Hospital", "Noida", "Noida, UP, India", "MED-FORTIS-88712", 8, True),
            ("dr.alok@neurodetect.ai", "Doctor@123456", "Dr. Alok Nath", "Neurosurgeon", "Max Healthcare", "Gurgaon", "Gurgaon, HR, India", "MED-MAX-99124", 9, True)
        ]

        created_doctors = []
        for doc_tuple in doctors_data:
            email, pwd, name, spec, hosp, city, loc, reg, exp, is_appr = doc_tuple
            clean_d = email.strip().lower()
            d_user = db.query(User).filter(func.lower(User.email) == clean_d).first()
            if not d_user:
                d_user = User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    role=UserRole.DOCTOR.value,
                    is_active=True
                )
                db.add(d_user)
                db.commit()
                db.refresh(d_user)

                doc = Doctor(
                    user_id=d_user.id,
                    name=name,
                    specialization=spec,
                    hospital=hosp,
                    city=city,
                    location=loc,
                    medical_reg_no=reg,
                    experience_years=exp,
                    status=DoctorStatus.APPROVED.value if is_appr else DoctorStatus.PENDING.value,
                    is_approved=is_appr
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                created_doctors.append(doc)
            else:
                d_user.hashed_password = get_password_hash(pwd)
                d_user.is_active = True
                if d_user.doctor_profile:
                    d_user.doctor_profile.name = name
                    d_user.doctor_profile.specialization = spec
                    d_user.doctor_profile.hospital = hosp
                    d_user.doctor_profile.city = city
                    d_user.doctor_profile.location = loc
                    d_user.doctor_profile.medical_reg_no = reg
                    d_user.doctor_profile.experience_years = exp
                    d_user.doctor_profile.status = DoctorStatus.APPROVED.value if is_appr else DoctorStatus.PENDING.value
                    d_user.doctor_profile.is_approved = is_appr
                db.commit()
                created_doctors.append(d_user.doctor_profile)

        # 3. PATIENTS (10 Demo Indian Patients + 1 US Test Patient)
        patients_data = [
            ("kumarrayshubham2005@gmail.com", "Patient@123456", "Shubham Kumar", 24, "Male", "+91 98765 43210", "New Delhi, Delhi, India"),
            ("patient@neurodetect.ai", "Patient@123456", "Ramesh Kumar", 45, "Male", "+91 98765 43210", "Sector 14, MG Road, New Delhi, Delhi"),
            ("priya.s@example.com", "Patient@123456", "Priya Sharma", 36, "Female", "+91 98123 45678", "Civil Lines, Jaipur, Rajasthan"),
            ("vance.a@example.com", "Patient@123456", "Alexander Vance", 52, "Male", "+1 (555) 456-7890", "450 Mission St, San Francisco, CA, USA"),
            ("amitav.roy@example.com", "Patient@123456", "Amitav Roy", 48, "Male", "+91 98301 11223", "Salt Lake Sector V, Kolkata, West Bengal"),
            ("sunita.b@example.com", "Patient@123456", "Sunita Banerjee", 42, "Female", "+91 94340 55667", "GT Road, Asansol, West Bengal"),
            ("rajesh.prasad@example.com", "Patient@123456", "Rajesh Prasad", 50, "Male", "+91 93341 88990", "Boring Road, Patna, Bihar"),
            ("deepak.v@example.com", "Patient@123456", "Deepak Verma", 39, "Male", "+91 99312 44556", "AP Colony, Gaya, Bihar"),
            ("kavita.k@example.com", "Patient@123456", "Kavita Kulkarni", 34, "Female", "+91 98220 33445", "Kothrud, Pune, Maharashtra"),
            ("biren.das@example.com", "Patient@123456", "Biren Das", 56, "Male", "+91 98640 12345", "GS Road, Guwahati, Assam"),
            ("archana.m@example.com", "Patient@123456", "Archana Mohanty", 41, "Female", "+91 94370 67890", "Saheed Nagar, Bhubaneswar, Odisha"),
            ("suresh.m@example.com", "Patient@123456", "Suresh Menon", 53, "Male", "+91 98400 99887", "Anna Nagar, Chennai, Tamil Nadu")
        ]

        patients_list = []
        for email, pwd, name, age, gender, phone, addr in patients_data:
            clean_e = email.strip().lower()
            p_user = db.query(User).filter(func.lower(User.email) == clean_e).first()
            if not p_user:
                p_user = User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    role=UserRole.PATIENT.value,
                    is_active=True
                )
                db.add(p_user)
                db.commit()
                db.refresh(p_user)

                pat = Patient(
                    user_id=p_user.id,
                    name=name,
                    age=age,
                    gender=gender,
                    phone=phone,
                    address=addr
                )
                db.add(pat)
                db.commit()
                db.refresh(pat)
                patients_list.append(pat)
            else:
                if clean_e in ["kumarrayshubham2005@gmail.com", "patient@neurodetect.ai"]:
                    p_user.hashed_password = get_password_hash(pwd)
                    p_user.is_active = True
                    db.commit()
                patients_list.append(p_user.patient_profile)

        # 4. MRI SCANS & AI REPORTS GENERATION (At least 5 Historical Scans per Patient)
        tumor_types = ["Glioma", "Meningioma", "Pituitary", "No Tumor"]
        # 4. PATIENT-DOCTOR SELECTION MAPPING & SCAN GENERATION
        doc_map = {d.name: d for d in created_doctors if d}
        dr_rajesh = doc_map.get("Dr. Rajesh Kumar") or created_doctors[0]
        dr_smith = doc_map.get("Dr. Robert Smith") or (created_doctors[1] if len(created_doctors) > 1 else dr_rajesh)
        dr_vikram = doc_map.get("Dr. Vikram Rao") or dr_rajesh
        dr_ananya = doc_map.get("Dr. Ananya Sharma") or dr_smith
        dr_sneha = doc_map.get("Dr. Sneha Verma") or dr_rajesh

        # Dedicated Patient -> Selected Doctor dictionary
        patient_doctor_rules = {
            "patient@neurodetect.ai": dr_rajesh,
            "amitav.roy@example.com": dr_rajesh,
            "rajesh.prasad@example.com": dr_rajesh,
            "ak4289009@gmail.com": dr_rajesh,
            "priya.s@example.com": dr_smith,
            "vance.a@example.com": dr_smith,
            "sunita.b@example.com": dr_smith,
            "deepak.v@example.com": dr_vikram,
            "kavita.k@example.com": dr_vikram,
            "biren.das@example.com": dr_ananya,
            "archana.m@example.com": dr_ananya,
            "suresh.m@example.com": dr_sneha,
            "kumarrayshubham2005@gmail.com": dr_sneha,
            "testuser99@example.com": dr_sneha
        }

        tumor_types = ["Glioma", "Meningioma", "Pituitary", "No Tumor"]
        all_db_patients = db.query(Patient).all()
        now = datetime.utcnow()
        for pat_idx, pat in enumerate(all_db_patients):
            # Resolve selected doctor for this patient
            p_email = pat.user.email.strip().lower() if pat.user else ""
            selected_doc = patient_doctor_rules.get(p_email, created_doctors[pat_idx % len(created_doctors)])
            
            # Persist assigned primary neurologist on the Patient record
            pat.assigned_doctor_id = selected_doc.id
            db.commit()

            # Ensure all existing scans for this patient are linked to the selected doctor
            existing_patient_scans = db.query(MRIScan).filter(MRIScan.patient_id == pat.id).all()
            for s in existing_patient_scans:
                s.preferred_doctor_id = selected_doc.id
            db.commit()

            # Generate historical scans up to 5 if needed
            existing_scans_count = len(existing_patient_scans)
            if existing_scans_count < 5:
                needed = 5 - existing_scans_count
                for s_i in range(needed):
                    days_ago = (4 - s_i) * 30 + (pat_idx % 5) * 2
                    scan_date = now - timedelta(days=days_ago)
                    t_type = tumor_types[(pat_idx + s_i) % len(tumor_types)]
                    
                    mri_rel_path = f"/uploads/mri/mri_sample_{t_type.lower().replace(' ', '')}.png"
                    heatmap_rel_path = f"/uploads/heatmaps/heatmap_sample_{t_type.lower().replace(' ', '')}.png"

                    status = ScanStatus.APPROVED.value if s_i < 3 else (ScanStatus.AI_COMPLETED.value if s_i == 3 else ScanStatus.UNDER_REVIEW.value)

                    scan = MRIScan(
                        patient_id=pat.id,
                        preferred_doctor_id=selected_doc.id,
                        original_filename=f"Brain_MRI_Scan_PT{pat.id}_S{s_i+1}.png",
                        file_path=mri_rel_path,
                        upload_date=scan_date,
                        status=status
                    )
                    db.add(scan)
                    db.commit()
                    db.refresh(scan)

                    conf = round(88.0 + (pat_idx * 1.3 + s_i * 2.1) % 11.5, 2)
                    ai_rep = AIReport(
                        scan_id=scan.id,
                        tumor_type=t_type,
                        confidence=conf,
                        heatmap_path=heatmap_rel_path,
                        prediction_date=scan_date
                    )
                    db.add(ai_rep)
                    db.commit()
                    db.refresh(ai_rep)

                    if status == ScanStatus.APPROVED.value:
                        doc_rev = DoctorReview(
                            report_id=ai_rep.id,
                            doctor_id=selected_doc.id,
                            clinical_notes=f"Clinical verification completed for {pat.name}. Scan findings indicate {t_type}.",
                            diagnosis=f"Verified {t_type}",
                            prescription="Follow recommended treatment plan and diet.",
                            suggested_tests="Follow-up MRI in 3 months",
                            medicines="As prescribed by attending neurologist",
                            next_visit_date="In 3 Months",
                            status="APPROVED",
                            reviewed_at=scan_date + timedelta(hours=4)
                        )
                        db.add(doc_rev)
                        db.commit()

        # Update appointments to match each patient's selected doctor
        all_appts = db.query(Appointment).all()
        for appt in all_appts:
            if appt.patient and appt.patient.assigned_doctor_id:
                appt.doctor_id = appt.patient.assigned_doctor_id
        db.commit()

        # 5. DIET PLANS
        diets_data = [
            {
                "tumor_type": "Glioma",
                "foods_to_eat": "• Antioxidant-rich berries\n• Omega-3 fatty acids (Walnuts, Flaxseeds)\n• Leafy green vegetables (Spinach, Kale)",
                "foods_to_avoid": "• Refined sugars & processed meats\n• Artificial sweeteners & sodas",
                "water_intake": "3.0 Liters daily",
                "lifestyle_tips": "Get 8 hours of sleep, avoid stress, and take prescribed anti-seizure medications."
            },
            {
                "tumor_type": "Meningioma",
                "foods_to_eat": "• High-fiber whole grains\n• Plant-based proteins (Lentils, Tofu)\n• Vitamin D fortified foods",
                "foods_to_avoid": "• High sodium processed snacks\n• Alcohol & caffeinated energy drinks",
                "water_intake": "2.5 - 3.0 Liters daily",
                "lifestyle_tips": "Engage in light walking and deep breathing exercises."
            },
            {
                "tumor_type": "Pituitary",
                "foods_to_eat": "• Hormone-balancing healthy fats\n• Zinc-rich seeds (Pumpkin, Sesame)\n• Lean poultry",
                "foods_to_avoid": "• High glycemic index sweets\n• Excessive caffeine",
                "water_intake": "2.5 Liters daily",
                "lifestyle_tips": "Maintain strict sleep hygiene and monitor blood pressure."
            },
            {
                "tumor_type": "No Tumor",
                "foods_to_eat": "• Balanced Mediterranean Diet\n• Fresh colorful vegetables & fruits\n• Lean proteins",
                "foods_to_avoid": "• Excess junk food\n• Tobacco and heavy alcohol",
                "water_intake": "2.5 Liters daily",
                "lifestyle_tips": "Maintain regular exercise (30 mins daily) and routine annual brain checkups."
            }
        ]

        for d in diets_data:
            if not db.query(Diet).filter(Diet.tumor_type == d["tumor_type"]).first():
                db.add(Diet(**d))

        # 6. EDUCATIONAL VIDEOS
        videos_data = [
            {"title": "Understanding Brain MRI Contrast Agents", "description": "Learn about T1, T2, and FLAIR weighted MRI contrast scans.", "category": "MRI Guide", "thumbnail_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=60", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
            {"title": "Glioma vs Meningioma: Medical Guidance", "description": "Comprehensive explanation by neuro-oncologists.", "category": "Brain Tumor", "thumbnail_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=60", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
            {"title": "Nutrition & Ketogenic Diet Support", "description": "Dietary guidelines for brain health.", "category": "Nutrition", "thumbnail_url": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=60", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ"}
        ]

        for v in videos_data:
            if not db.query(Video).filter(Video.title == v["title"]).first():
                db.add(Video(**v))

        db.commit()
        print(f"[Seeding] Complete! Seeded {len(created_doctors)} Doctors, {len(patients_list)} Patients, and {db.query(MRIScan).count()} MRI Scans.")

    except Exception as e:
        db.rollback()
        print(f"[Seeding Error] Failed to seed database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
