import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from app.core.config import settings


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically stamp running headers, footers, page numbers,
    and mandatory regulatory 'DEMO - NOT FOR CLINICAL USE' labels on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()

        # Running Top Header: DEMO - NOT FOR CLINICAL USE
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#DC2626"))  # Warning Red
        self.drawString(36, 762, "DEMO - NOT FOR CLINICAL USE")

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(612 - 36, 762, "NeuroDetect AI Research & Screening Platform")

        # Top divider line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 756, 612 - 36, 756)

        # Running Bottom Footer
        self.line(36, 32, 612 - 36, 32)

        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#DC2626"))
        self.drawString(36, 21, "DEMO - NOT FOR CLINICAL USE")

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(185, 21, "For research and screening evaluation only | Specialist validation required")
        self.drawRightString(612 - 36, 21, f"Page {self._pageNumber} of {page_count}")

        self.restoreState()


def generate_pdf_report(
    report_id: int,
    patient_data: dict,
    ai_report_data: dict,
    mri_image_path: str,
    heatmap_image_path: str,
    doctor_review_data: dict = None
) -> str:
    """
    Generates a compliant, transparent AI-Assisted Brain MRI Classification Report.
    Ensures strict adherence to medical AI disclosure standards:
    - Labeled 'DEMO - NOT FOR CLINICAL USE' on every page.
    - Title: 'NeuroDetect - AI-Assisted Brain MRI Classification Report'
    - Identifies output as 'Model-predicted class: X; model confidence: Y%'
    - Strictly avoids unverified accreditations, unconfirmed anatomical claims, and automated prescriptions.
    - Restricts doctor identity and signatures to authentic recorded clinician reviews.
    """
    pdf_filename = f"NeuroDetect_Report_{report_id}.pdf"
    pdf_save_path = os.path.join(settings.REPORT_DIR, pdf_filename)

    if os.path.exists(pdf_save_path):
        try:
            os.remove(pdf_save_path)
        except Exception:
            pass

    doc = SimpleDocTemplate(
        pdf_save_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Typography Styles
    demo_pill_style = ParagraphStyle(
        'DemoPill',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#DC2626')
    )

    hosp_title_style = ParagraphStyle(
        'HospTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0F172A')
    )

    hosp_right_style = ParagraphStyle(
        'HospRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        alignment=2,
        textColor=colors.HexColor('#334155')
    )

    report_tag_style = ParagraphStyle(
        'ReportTag',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=1,
        textColor=colors.HexColor('#FFFFFF')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0F2942'),
        spaceBefore=5,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#1E293B')
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=body_style,
        fontName='Helvetica',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#64748B')
    )

    elements = []

    raw_tumor_type = ai_report_data.get('tumor_type', 'No Tumor')
    confidence = float(ai_report_data.get('confidence', 95.0))

    # Determine whether a genuine clinician review has been authorized
    has_authorized_review = bool(
        doctor_review_data and
        str(doctor_review_data.get('status', '')).upper() == 'APPROVED'
    )
    doc_info = (doctor_review_data or {}).get('doctor', {}) if has_authorized_review else {}

    # Patient & Study Records
    pat_id = patient_data.get('id', 1)
    pat_name = patient_data.get('name', 'Demo Patient')
    pat_age = patient_data.get('age')
    pat_age_str = f"{pat_age} Yrs" if pat_age else "Not specified"
    pat_gender = patient_data.get('gender', 'Not specified')
    pat_phone = patient_data.get('phone', 'Not provided')
    pat_history = patient_data.get('medical_history') or "None provided in study records."

    # =========================================================================
    # PAGE 1: ADMINISTRATIVE METADATA, STUDY DETAILS & MODEL SCREENING OUTPUT
    # =========================================================================

    # 1. Prominent Demo Warning Banner Flowable
    demo_banner_data = [[
        Paragraph(
            "<b>DEMO - NOT FOR CLINICAL USE | ARTIFICIAL INTELLIGENCE RESEARCH SCREENING PROTOTYPE</b>",
            demo_pill_style
        )
    ]]
    demo_banner_table = Table(demo_banner_data, colWidths=[540])
    demo_banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#F87171')),
        ('PADDING', (0,0), (-1,-1), 3),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(demo_banner_table)
    elements.append(Spacer(1, 4))

    # 2. Institutional Research Platform Header (Removed fake NABH/NABL/AIIMS claims)
    header_data = [
        [
            Paragraph(
                "<b>NEURODETECT COMPUTATIONAL NEURO-IMAGING PLATFORM</b><br/>"
                "<font size=7 color='#0284C7'>DEPARTMENT OF MACHINE INTELLIGENCE & RADIOMICS RESEARCH</font><br/>"
                "<font size=6.5 color='#64748B'>Academic & Research Screening System | DenseNet-121 Architecture | Software Build v1.0.4</font>",
                hosp_title_style
            ),
            Paragraph(
                f"<b>REPORT ID: ND-REP-{report_id:05d}</b><br/>"
                f"<b>Generation Date:</b> {datetime.now().strftime('%d %B %Y')}<br/>"
                "<b>Classification Engine:</b> PyTorch / DenseNet-121<br/>"
                "<b>Web:</b> https://neurodetect-clinical-portal-pzfp.onrender.com",
                hosp_right_style
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[355, 185])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=4))

    # 3. Report Title Bar (Updated to required compliant title)
    banner_data = [[
        Paragraph("<b>NeuroDetect - AI-Assisted Brain MRI Classification Report</b>", report_tag_style)
    ]]
    banner_table = Table(banner_data, colWidths=[540])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 4))

    # 4. Patient Demographics & Study Records Grid
    if has_authorized_review:
        status_html = "<font color='#0284C7'><b>CLINICIAN REVIEW RECORDED</b></font>"
    else:
        status_html = "<font color='#D97706'><b>AI-generated screening output - pending clinician review.</b></font>"

    patient_grid = [
        [
            Paragraph(f"<b>Patient Name:</b> {pat_name}", body_style),
            Paragraph(f"<b>UHID / Patient ID:</b> PT-{pat_id:04d}", body_style),
            Paragraph(f"<b>Age / Sex:</b> {pat_age_str} / {pat_gender}", body_style)
        ],
        [
            Paragraph(f"<b>Contact:</b> {pat_phone}", body_style),
            Paragraph(f"<b>Study Date:</b> {datetime.now().strftime('%d-%b-%Y')}", body_style),
            Paragraph(f"<b>Modality:</b> 2D Cranial MRI Image", body_style)
        ],
        [
            Paragraph(f"<b>Scanner / Sequence:</b> Unspecified in metadata", body_style),
            Paragraph(f"<b>Dataset Mode:</b> Demonstration Record", body_style),
            Paragraph(f"<b>Report Status:</b> {status_html}", body_style)
        ]
    ]
    pat_table = Table(patient_grid, colWidths=[180, 175, 185])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#CBD5E1')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(pat_table)
    elements.append(Spacer(1, 4))

    # 5. Clinical Indication & Confirmed Study Details
    elements.append(Paragraph("<b>CLINICAL HISTORY & STUDY SPECIFICATIONS:</b>", section_heading))
    study_info_text = (
        f"<b>| Patient Clinical History / Presenting Symptoms:</b> {pat_history}<br/>"
        "<b>| Imaging Input:</b> Single cross-sectional digital MRI slice uploaded for algorithmic multi-class classification. "
        "Original scanner manufacturer, magnetic field strength (Tesla), and acquisition pulse sequences (e.g. T1, T2, FLAIR) "
        "are not encoded in image metadata."
    )
    elements.append(Paragraph(study_info_text, body_style))
    elements.append(Spacer(1, 3))

    # 6. Algorithmic Model Findings & Limitations (Removed fabricated edema, midline shift, dural tail, etc.)
    elements.append(Paragraph("<b>SECTION A: COMPUTATIONAL MODEL ANALYSIS & OBSERVATIONS:</b>", section_heading))
    findings_narrative = (
        "<b>1. Deep Neural Network Processing:</b> The submitted 2D cranial MRI slice was processed by the NeuroDetect "
        "DenseNet-121 deep convolutional neural network. The model extracts hierarchical spatial feature representations "
        "across learned convolutional layers to evaluate probability distributions across four classification categories "
        "(Glioma, Meningioma, Pituitary, and No Tumor).<br/><br/>"
        "<b>2. Methodological Scope & Quantitative Limitations:</b> The neural network evaluates statistical pixel patterns "
        "within the provided 2D slice. <i>The model does not measure structural edema volume, mass effect, ventricular compression, "
        "or anatomical midline displacement (~mm).</i> A classification score alone cannot establish these findings, nor can it "
        "confirm histological tumor grade, cellular infiltration, or multi-sequence contrast dynamics. Detailed anatomical "
        "findings require comprehensive review by a qualified radiologist using full volumetric multi-sequence acquisitions.<br/><br/>"
    )

    if has_authorized_review and doctor_review_data.get('clinical_notes'):
        findings_narrative += (
            f"<b>3. Recorded Clinician Observations:</b> {doctor_review_data.get('clinical_notes')}"
        )
    else:
        findings_narrative += (
            "<b>3. Clinician Observations:</b> No clinician review notes have been recorded for this study. "
            "Specialist radiological evaluation is pending."
        )

    findings_box = Table([[Paragraph(findings_narrative, body_style)]], colWidths=[540])
    findings_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFFFF')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(findings_box)
    elements.append(Spacer(1, 4))

    # 7. Model Prediction & Screening Output Box (Compliant naming & mandatory caveats)
    elements.append(Paragraph("<b>MODEL PREDICTION & SCREENING OUTPUT:</b>", section_heading))
    is_normal = "no tumor" in raw_tumor_type.lower()
    imp_bg = "#F0FDF4" if is_normal else "#FEF2F2"
    imp_border = "#16A34A" if is_normal else "#DC2626"

    model_output_text = (
        f"<b>Model-predicted class: {raw_tumor_type}; model confidence: {confidence:.1f}%.</b><br/>"
        "<font size=7.5 color='#475569'>"
        "<b>Important Clinical Caveat:</b> This is an AI-generated screening output based on algorithmic pattern classification. "
        "It is <u>not a confirmed medical diagnosis</u>, nor does the confidence score represent a validated clinical probability of disease. "
        "Specialist validation by a qualified clinician is pending and required prior to any clinical management or intervention."
        "</font>"
    )
    imp_table = Table([[Paragraph(model_output_text, body_style)]], colWidths=[540])
    imp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(imp_bg)),
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor(imp_border)),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(imp_table)
    elements.append(Spacer(1, 4))

    # Page 1 Footer Transition Note
    p1_note = Paragraph(
        f"<font size=6.5 color='#64748B'>NeuroDetect Report #ND-REP-{report_id:05d} | Page 1 of 2 | "
        "DEMO - NOT FOR CLINICAL USE | Turn to Page 2 for Visual Plate, Visualization of Model Attention & Clinician Section.</font>",
        ParagraphStyle('P1Note', parent=styles['Normal'], alignment=1)
    )
    elements.append(p1_note)

    # Clean Page Break to Page 2
    elements.append(PageBreak())

    # =========================================================================
    # PAGE 2: VISUAL PLATE, GRAD-CAM ATTENTION, CLINICIAN REVIEW & DISCLAIMERS
    # =========================================================================

    # Running header flowable on Page 2
    p2_header_data = [
        [
            Paragraph(f"<b>NEURODETECT SCREENING REPORT</b> | Subject: <b>{pat_name}</b> (PT-{pat_id:04d})", body_style),
            Paragraph(f"Report #ND-REP-{report_id:05d} | <b>DEMO - NOT FOR CLINICAL USE</b>", hosp_right_style)
        ]
    ]
    p2_header = Table(p2_header_data, colWidths=[360, 180])
    p2_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(p2_header)
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#CBD5E1'), spaceBefore=2, spaceAfter=4))

    # Resolve scan file path
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
            print(f"[PDF Generator Warning] Supabase storage download: {e}")
    elif mri_image_path and mri_image_path.startswith('/uploads/'):
        abs_mri_path = os.path.join(settings.BASE_DIR, mri_image_path.lstrip('/'))

    abs_heatmap_path = heatmap_image_path
    if heatmap_image_path and heatmap_image_path.startswith('/uploads/'):
        abs_heatmap_path = os.path.join(settings.BASE_DIR, heatmap_image_path.lstrip('/'))

    # Visual Plate (Figures 1 & 2)
    elements.append(Paragraph("<b>SECTION B: RADIOGRAPHIC PLATE & VISUALIZATION OF MODEL ATTENTION:</b>", section_heading))

    img_w, img_h = 185, 145
    if abs_mri_path and os.path.exists(abs_mri_path):
        mri_img = RLImage(abs_mri_path, width=img_w, height=img_h)
    else:
        mri_img = Paragraph("<i>[Original MRI Scan Slice Unavailable]</i>", body_style)

    if abs_heatmap_path and os.path.exists(abs_heatmap_path):
        h_img = RLImage(abs_heatmap_path, width=img_w, height=img_h)
    else:
        h_img = Paragraph("<i>[Grad-CAM Attention Map Unavailable]</i>", body_style)

    image_table_data = [
        [mri_img, h_img],
        [
            Paragraph("<font size=7 color='#334155'><b>Figure 1:</b> Submitted Cranial MRI Slice</font>", body_style),
            Paragraph("<font size=7 color='#334155'><b>Figure 2:</b> DenseNet-121 Grad-CAM Attention Heatmap</font>", body_style)
        ]
    ]
    image_table = Table(image_table_data, colWidths=[270, 270])
    image_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(image_table)
    elements.append(Spacer(1, 3))

    # Accurate Description of Grad-CAM (Removed fake "strong concordance" claims)
    gradcam_desc = (
        "<b>Visualization of Model Attention (Grad-CAM):</b> Figure 2 illustrates spatial regions of the image that contributed "
        "most significantly to the neural network's activation score for the predicted class. <i>This algorithmic interpretability "
        "overlay represents computational feature attribution and does not constitute clinical validation or an anatomical tumor margin delineation.</i>"
    )
    elements.append(Paragraph(gradcam_desc, body_style))
    elements.append(Spacer(1, 4))

    # Section C: Attending Clinician's Review & Treatment Orders (Only with genuine clinician authorization)
    elements.append(Paragraph("<b>SECTION C: ATTENDING CLINICIAN REVIEW & TREATMENT ORDERS:</b>", section_heading))

    if has_authorized_review:
        clean_doc_name = doc_info.get('name', 'Attending Clinician').replace('Dr.', '').replace('Dr ', '').strip()
        doc_specialty = doc_info.get('specialization', 'Neurology / Neuro-Oncology')
        doc_hosp = doc_info.get('hospital', 'Authorized Medical Center')
        doc_reg = doc_info.get('medical_reg_no', 'On File')
        reviewed_at_str = doctor_review_data.get('reviewed_at') or datetime.now().strftime('%d %B %Y, %I:%M %p')

        clin_diag = doctor_review_data.get('diagnosis') or "Clinician review recorded in portal."
        clin_notes = doctor_review_data.get('clinical_notes') or "Clinical correlation completed."
        clin_presc = doctor_review_data.get('prescription') or "No medications prescribed."
        clin_tests = doctor_review_data.get('suggested_tests') or "As advised during clinical consultation."
        clin_next = doctor_review_data.get('next_visit_date') or "As scheduled with clinician."

        dr_table_data = [
            [Paragraph(f"<b>Reviewing Clinician:</b> Dr. {clean_doc_name} ({doc_specialty}) - {doc_hosp}", body_style)],
            [Paragraph(f"<b>Clinician Registration:</b> Medical Reg. No: {doc_reg}", body_style)],
            [Paragraph(f"<b>Clinical Diagnosis & Assessment:</b> {clin_diag}", body_style)],
            [Paragraph(f"<b>Prescriptions & Dosage:</b> {clin_presc}", body_style)],
            [Paragraph(f"<b>Suggested Lab & Confirmatory Tests:</b> {clin_tests}", body_style)],
            [Paragraph(f"<b>Follow-Up Consultation:</b> {clin_next} (Reviewed: {reviewed_at_str})", body_style)],
        ]
        dr_table = Table(dr_table_data, colWidths=[540])
        dr_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
            ('PADDING', (0,0), (-1,-1), 3.5),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#16A34A')),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#BBF7D0')),
        ]))
        elements.append(dr_table)
        elements.append(Spacer(1, 4))

        sig_left = (
            "<b>Clinician Review Recorded By:</b><br/>"
            f"<b>Dr. {clean_doc_name}</b><br/>"
            f"<font size=7 color='#475569'>{doc_specialty} | {doc_hosp}<br/>"
            f"Registration No: {doc_reg}<br/>"
            f"Recorded in NeuroDetect Portal: {reviewed_at_str}</font>"
        )
        sig_right_content = [
            Paragraph("<b><font color='#16A34A' size=8>CLINICIAN REVIEW RECORDED</font></b>", ParagraphStyle('BadgeH', alignment=1)),
            Paragraph(f"<font size=6.5 color='#475569'>Status: Clinician Approved<br/>Record ID: ND-REP-{report_id:05d}<br/><b>DEMO - NOT FOR CLINICAL USE</b></font>", ParagraphStyle('BadgeB', alignment=1, leading=8.5))
        ]
        sig_right_box = Table([[sig_right_content]], colWidths=[205])
        sig_right_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#16A34A')),
            ('PADDING', (0,0), (-1,-1), 3),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
    else:
        # Strict removal of fabricated doctor identity, registration numbers, and automated drug prescriptions
        dr_table_data = [
            [Paragraph("<b>Reviewing Clinician:</b> <i>Unassigned / Pending Clinical Review</i>", body_style)],
            [Paragraph("<b>Clinical Diagnosis & Assessment:</b> <i>Pending specialist evaluation. Preliminary AI classification requires formal clinical correlation.</i>", body_style)],
            [Paragraph("<b>Prescriptions & Dosage:</b> <i>[Section reserved exclusively for treating clinician - No automated prescriptions generated]</i>", body_style)],
            [Paragraph("<b>Recommended Next Step:</b> <i>Consultation with a qualified neurologist or neuro-radiologist is recommended for comprehensive evaluation.</i>", body_style)],
        ]
        dr_table = Table(dr_table_data, colWidths=[540])
        dr_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0,0), (-1,-1), 3.5),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#CBD5E1')),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(dr_table)
        elements.append(Spacer(1, 4))

        sig_left = (
            "<b>Clinician Authorization Status:</b><br/>"
            "<font color='#DC2626'><b>UNREVIEWED - NO CLINICIAN SIGNATURE ATTACHED</b></font><br/>"
            "<font size=7 color='#475569'>This report contains computer-generated screening predictions only.<br/>"
            "It has not been reviewed, authorized, or signed by a medical doctor.<br/>"
            "No electronic clinician signature or authorization stamp is applied.</font>"
        )
        sig_right_content = [
            Paragraph("<b><font color='#DC2626' size=8>AI SCREENING OUTPUT</font></b>", ParagraphStyle('BadgeH2', alignment=1)),
            Paragraph(f"<font size=6.5 color='#475569'>Pending Clinician Review<br/>Software Run ID: ND-AI-{report_id:05d}<br/><b>DEMO - NOT FOR CLINICAL USE</b></font>", ParagraphStyle('BadgeB2', alignment=1, leading=8.5))
        ]
        sig_right_box = Table([[sig_right_content]], colWidths=[205])
        sig_right_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#DC2626')),
            ('PADDING', (0,0), (-1,-1), 3),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))

    sig_table = Table([
        [
            Paragraph(sig_left, body_style),
            sig_right_box
        ]
    ], colWidths=[330, 210])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 3))

    # 8. Regulatory Notice & Research Disclaimer (Truthful compliance disclosure)
    disclaimer = (
        "<b>REGULATORY NOTICE & RESEARCH DISCLAIMER:</b> This document is an automated screening output generated by the "
        "NeuroDetect AI demonstration platform. Every page of this document is designated 'DEMO - NOT FOR CLINICAL USE.' "
        "The model classification results and Grad-CAM attention visualizations are intended strictly for computational research, "
        "algorithm demonstration, and educational evaluation. They do not constitute a medical diagnosis, medical advice, "
        "treatment order, prescription, or clinical radiological interpretation. Clinical diagnosis and treatment must be "
        "performed solely by licensed healthcare professionals based on complete clinical workup."
    )
    elements.append(Paragraph(disclaimer, disclaimer_style))

    # Build Document with NumberedCanvas to guarantee 'DEMO - NOT FOR CLINICAL USE' on every page
    doc.build(elements, canvasmaker=NumberedCanvas)

    if temp_mri_file and os.path.exists(temp_mri_file):
        try:
            os.remove(temp_mri_file)
        except Exception:
            pass

    return f"/reports/{pdf_filename}"
