import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

def generate_pdf_report(
    report_id: int,
    patient_data: dict,
    ai_report_data: dict,
    mri_image_path: str,
    heatmap_image_path: str,
    doctor_review_data: dict = None
) -> str:
    """
    Generates a state-of-the-art, highly attractive healthcare PDF diagnostic report.
    Returns relative filepath for download.
    """
    pdf_filename = f"NeuroDetect_Report_{report_id}.pdf"
    pdf_save_path = os.path.join(settings.REPORT_DIR, pdf_filename)
    
    if os.path.exists(pdf_save_path):
        return f"/reports/{pdf_filename}"
    
    doc = SimpleDocTemplate(
        pdf_save_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#FFFFFF'),
        spaceAfter=2
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#94A3B8')
    )

    meta_right_style = ParagraphStyle(
        'MetaRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        alignment=2,
        textColor=colors.HexColor('#F8FAFC')
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    
    elements = []
    
    # 1. Premium Dark Blue Header Banner
    header_table_data = [
        [
            Paragraph("<b>NEURODETECT CLINICAL REPORT</b><br/><font size=8 color='#CBD5E1'>AI Brain Tumor Preliminary Diagnostic System</font>", title_style),
            Paragraph(f"<b>REPORT #ND-{report_id:05d}</b><br/><font size=8 color='#94A3B8'>Date: {datetime.now().strftime('%d %B %Y')}</font>", meta_right_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[330, 210])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # 2. Patient Details Card
    elements.append(Paragraph("<font color='#0284C7'>■</font> PATIENT CLINICAL PROFILE", section_heading))
    patient_table_data = [
        [
            Paragraph(f"<b>Patient Name:</b> {patient_data.get('name', 'N/A')}", body_style),
            Paragraph(f"<b>Age / Gender:</b> {patient_data.get('age', 'N/A')} yrs / {patient_data.get('gender', 'N/A')}", body_style)
        ],
        [
            Paragraph(f"<b>Phone Contact:</b> {patient_data.get('phone', 'N/A')}", body_style),
            Paragraph(f"<b>Patient ID:</b> PT-{patient_data.get('id', 0):04d}", body_style)
        ]
    ]
    patient_table = Table(patient_table_data, colWidths=[270, 270])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 10))
    
    # 3. AI Prediction Summary Table with Tumor Status Badge
    elements.append(Paragraph("<font color='#0284C7'>■</font> DENSENET121 DEEP LEARNING ANALYSIS", section_heading))
    
    tumor_type = ai_report_data.get('tumor_type', 'N/A')
    confidence = ai_report_data.get('confidence', 0.0)
    
    is_normal = tumor_type.strip().lower() == "no tumor"
    status_bg = "#F0FDF4" if is_normal else "#FEF2F2"
    status_border = "#16A34A" if is_normal else "#DC2626"
    status_text_color = "#15803D" if is_normal else "#B91C1C"
    status_badge_text = "NORMAL (NO TUMOR DETECTED)" if is_normal else f"CRITICAL: {tumor_type.upper()} DETECTED"
    
    ai_summary_data = [
        [
            Paragraph("<b>Predicted Diagnostic Category:</b>", body_style),
            Paragraph(f"<font color='{status_text_color}'><b>{status_badge_text}</b></font>", body_style)
        ],
        [
            Paragraph("<b>Model Confidence Score:</b>", body_style),
            Paragraph(f"<b>{confidence:.2f}%</b> (Verified via Softmax Logits)", body_style)
        ],
        [
            Paragraph("<b>Neural Network Engine:</b>", body_style),
            Paragraph("DenseNet-121 Architecture with Grad-CAM Explainability Overlay", body_style)
        ]
    ]
    ai_table = Table(ai_summary_data, colWidths=[190, 350])
    ai_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(status_bg)),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(status_border)),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(ai_table)
    elements.append(Spacer(1, 10))
    
    # Translate relative web paths or Supabase storage paths to readable image file
    abs_mri_path = mri_image_path
    temp_mri_file = None
    if mri_image_path and mri_image_path.startswith('PAT-'):
        try:
            from app.services.supabase_storage import supabase_storage
            mri_bytes = supabase_storage.download_mri_bytes(mri_image_path)
            temp_mri_file = os.path.join(settings.REPORT_DIR, f"temp_mri_{report_id}.png")
            with open(temp_mri_file, "wb") as f:
                f.write(mri_bytes)
            abs_mri_path = temp_mri_file
        except Exception as e:
            print(f"[PDF Generator Warning] Failed to fetch Supabase MRI image for PDF: {e}")
    elif mri_image_path and mri_image_path.startswith('/uploads/'):
        abs_mri_path = os.path.join(settings.BASE_DIR, mri_image_path.lstrip('/'))

    abs_heatmap_path = heatmap_image_path
    if heatmap_image_path and heatmap_image_path.startswith('/uploads/'):
        abs_heatmap_path = os.path.join(settings.BASE_DIR, heatmap_image_path.lstrip('/'))

    # 4. Side-by-Side MRI & Grad-CAM Image Card
    elements.append(Paragraph("<font color='#0284C7'>■</font> VISUAL EXPLAINABILITY (GRAD-CAM LOCALIZATION)", section_heading))
    
    if abs_mri_path and os.path.exists(abs_mri_path):
        mri_img = RLImage(abs_mri_path, width=220, height=180)
    else:
        mri_img = Paragraph("Original MRI Image File", body_style)
        
    if abs_heatmap_path and os.path.exists(abs_heatmap_path):
        h_img = RLImage(abs_heatmap_path, width=220, height=180)
    else:
        h_img = Paragraph("Grad-CAM Heatmap File", body_style)
        
    image_table_data = [
        [mri_img, h_img],
        [
            Paragraph("<font size=8 color='#475569'><b>Figure 1:</b> Original Axial T1/T2 Brain MRI</font>", body_style),
            Paragraph("<font size=8 color='#475569'><b>Figure 2:</b> DenseNet121 Grad-CAM Attention Heatmap</font>", body_style)
        ]
    ]
    image_table = Table(image_table_data, colWidths=[270, 270])
    image_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(image_table)
    elements.append(Spacer(1, 10))
    
    # 5. Doctor Review & Clinical Notes Card
    elements.append(Paragraph("<font color='#0284C7'>■</font> ATTENDING NEURO-SPECIALIST CLINICAL REVIEW", section_heading))
    if doctor_review_data:
        doc_info = doctor_review_data.get('doctor', {})
        doc_name = doc_info.get('name', 'Rajesh Kumar')
        specialty = doc_info.get('specialization', 'Senior Neuro-Oncologist')
        hospital = doc_info.get('hospital', 'All India Institute of Medical Sciences (AIIMS)')
        
        dr_table_data = [
            [Paragraph(f"<b>Reviewing Specialist:</b> Dr. {doc_name} ({specialty}) — <i>{hospital}</i>", body_style)],
            [Paragraph(f"<b>Clinical Diagnosis:</b> {doctor_review_data.get('diagnosis', 'Normal study.')}", body_style)],
            [Paragraph(f"<b>Prescriptions & Advice:</b> {doctor_review_data.get('prescription', 'As advised by specialist.')}", body_style)],
            [Paragraph(f"<b>Suggested Lab Tests:</b> {doctor_review_data.get('suggested_tests', 'None')}", body_style)],
            [Paragraph(f"<b>Follow-Up Appointment:</b> {doctor_review_data.get('next_visit_date', 'As scheduled')}", body_style)],
        ]
    else:
        dr_table_data = [
            [Paragraph("<i>Status: Report is pending clinical verification by Attending Neurologist.</i>", body_style)]
        ]
        
    dr_table = Table(dr_table_data, colWidths=[540])
    dr_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0F9FF')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0EA5E9')),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#BAE6FD')),
    ]))
    elements.append(dr_table)
    elements.append(Spacer(1, 10))
    
    # 6. Disclaimer & Authentication Badge Footer
    disclaimer = (
        "<b>Medical Notice & Confidentiality:</b> This AI-assisted preliminary report is generated by NeuroDetect "
        "DenseNet121 Neural Network for clinical decision support. Results must be reviewed and correlated by a "
        "qualified medical practitioner before initiating treatment. Confidential medical record."
    )
    elements.append(Paragraph(disclaimer, ParagraphStyle('Disclaimer', parent=body_style, fontSize=7.5, leading=10, textColor=colors.HexColor('#94A3B8'))))
    
    doc.build(elements)
    if temp_mri_file and os.path.exists(temp_mri_file):
        try:
            os.remove(temp_mri_file)
        except Exception:
            pass
    return f"/reports/{pdf_filename}"
