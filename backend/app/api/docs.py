from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response, HTMLResponse

router = APIRouter(prefix="/project-docs", tags=["Project Documentation Specs"])

DOCUMENTATION_DATABASE = {
    "densenet121": {
        "title": "DenseNet121 Deep Learning Model Specification",
        "subtitle": "High-Precision Transfer Learning Architecture for 4-Class Brain Tumor Diagnosis",
        "category": "Deep Learning & Model Architecture",
        "author": "NeuroDetect Clinical AI Research Group",
        "version": "v1.4 - Clinical Release 2026",
        "metrics": [
            {"label": "Model Accuracy", "value": "95.8%", "color": "#2563eb"},
            {"label": "Input Tensor", "value": "224 × 224 × 3", "color": "#7c3aed"},
            {"label": "Layer Depth", "value": "121 Layers", "color": "#059669"},
            {"label": "Inference Latency", "value": "< 45 ms", "color": "#db2777"}
        ],
        "humanized_summary": "Why DenseNet121? Traditional deep neural networks struggle with gradient degradation as depth increases. DenseNet121 solves this by connecting every layer directly to all subsequent layers. This ensures maximum feature reuse, reduces required parameters, and delivers exceptionally high accuracy when classifying Glioma, Meningioma, Pituitary, and Healthy MRI scans.",
        "diagram_svg": '''
        <div class="diagram-box">
            <div class="diagram-title">DenseNet121 Feature Extraction & Classification Pipeline</div>
            <div class="pipeline-flow">
                <div class="pipe-node blue">
                    <strong>MRI Input</strong>
                    <span>224×224×3 RGB</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node purple">
                    <strong>Conv2D & Pool</strong>
                    <span>7x7 Conv, stride 2</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node green">
                    <strong>4 Dense Blocks</strong>
                    <span>Direct Layer Links</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node amber">
                    <strong>GAP Layer</strong>
                    <span>1024-D Vector</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node red">
                    <strong>Softmax Head</strong>
                    <span>4-Class Diagnosis</span>
                </div>
            </div>
        </div>
        ''',
        "sections": [
            {
                "heading": "1. Executive Summary & Core Rationale",
                "content": "DenseNet121 (Densely Connected Convolutional Networks) connects each layer to every other layer in a feed-forward fashion. Traditional 121-layer networks with L layers have L connections, whereas DenseNet121 has L(L+1)/2 direct connections. This maximizes information flow between layers, mitigates the vanishing-gradient problem, and encourages feature reuse throughout the network."
            },
            {
                "heading": "2. Input Layer Normalization & Preprocessing",
                "content": "Input Tensor Dimensions: (224, 224, 3) representing RGB axial brain MRI slice images. Pixel intensities are normalized from [0, 255] to floating-point range [0.0, 1.0]. Standard Mean (0.485, 0.456, 0.406) and Standard Deviation (0.229, 0.224, 0.225) scaling is applied to match ImageNet feature space."
            },
            {
                "heading": "3. Dense Blocks & Feature Reuse Architecture",
                "content": "Consists of 4 Dense Blocks with Transition Layers (1x1 Conv + 2x2 Average Pooling). Growth rate k=32. Global Average Pooling (GAP) reduces spatial dimensions to a 1024-dimensional feature vector, replacing parameter-heavy fully connected layers to prevent overfitting."
            },
            {
                "heading": "4. Classification Head & Loss Optimization",
                "content": "Dense(256, activation='relu') -> Dropout(0.3) -> Dense(4, activation='softmax'). Evaluated using Categorical Cross-Entropy Loss and Adam Optimizer (Learning Rate = 1e-4). Achieves ~95.8% classification accuracy across Glioma, Meningioma, Pituitary, and Healthy Brain Scans."
            }
        ]
    },
    "gradcam": {
        "title": "Grad-CAM Spatial Explainability Heatmap Specification",
        "subtitle": "Visualizing Neural Network Decision Regions on Brain MRI Scans",
        "category": "Explainable AI (XAI) & Computer Vision",
        "author": "NeuroDetect Clinical AI Research Group",
        "version": "v1.4 - Clinical Release 2026",
        "metrics": [
            {"label": "Explainability", "value": "Grad-CAM XAI", "color": "#2563eb"},
            {"label": "Target Layer", "value": "Conv_5_block", "color": "#7c3aed"},
            {"label": "Gradient Filter", "value": "Sobel Fusion", "color": "#059669"},
            {"label": "Color Mapping", "value": "Jet & Viridis", "color": "#db2777"}
        ],
        "humanized_summary": "Why Explainable AI matters in Medicine? Doctors cannot trust a 'black box' AI model. Grad-CAM acts as an optical magnifying glass for neural networks: it highlights the exact pixels, edges, and spatial regions that influenced the model's diagnosis, allowing neurologists to instantly verify whether the AI focused on real tumor tissue or imaging artifacts.",
        "diagram_svg": '''
        <div class="diagram-box">
            <div class="diagram-title">Grad-CAM Gradient Propagation & Heatmap Overlay Workflow</div>
            <div class="pipeline-flow">
                <div class="pipe-node blue">
                    <strong>Last Conv Layer</strong>
                    <span>Feature Maps A^k</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node purple">
                    <strong>Gradients ∂Y^c/∂A^k</strong>
                    <span>Backprop Concept</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node green">
                    <strong>GAP Weights α_k</strong>
                    <span>Spatial Pooling</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node amber">
                    <strong>Sobel Matrix G</strong>
                    <span>Edge Magnitudes</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node red">
                    <strong>Alpha Overlay</strong>
                    <span>45% Jet / Viridis</span>
                </div>
            </div>
        </div>
        ''',
        "sections": [
            {
                "heading": "1. Theoretical Background & XAI Imperative",
                "content": "Gradient-weighted Class Activation Mapping (Grad-CAM) uses the gradients of any target concept flowing into the final convolutional layer to produce a coarse localization map highlighting the important regions in the image for predicting the concept."
            },
            {
                "heading": "2. Mathematical Formulation & Weighting",
                "content": "Weights alpha_k^c are calculated by taking the partial derivative of score Y^c for class c with respect to feature maps A^k of the last conv layer, global-average-pooled over spatial dimensions (i, j). Heatmap L_Grad-CAM = ReLU(sum_k alpha_k^c * A^k)."
            },
            {
                "heading": "3. Hybrid Sobel Gradient Feature Fusion",
                "content": "To enhance spatial precision for clinical presentation, Sobolev gradient matrices G_x and G_y are computed over intensity variations. Combined magnitude G = sqrt(G_x^2 + G_y^2) is blended with the neural activation map to highlight anatomical brain tissue structures."
            },
            {
                "heading": "4. Color Mapping & Visual Alpha Transparency",
                "content": "For tumor predictions (Glioma, Meningioma, Pituitary), the raw heatmap is mapped using COLORMAP_JET and overlaid at 45% alpha transparency over the original gray scan. For healthy scans, COLORMAP_VIRIDIS is applied at 20% alpha transparency."
            }
        ]
    },
    "doctor-validation": {
        "title": "Two-Tier Doctor Validation Workflow Specification",
        "subtitle": "Human-in-the-Loop Clinical Verification Protocol for Patient Safety",
        "category": "Healthcare Clinical Workflows",
        "author": "NeuroDetect Clinical AI Research Group",
        "version": "v1.4 - Clinical Release 2026",
        "metrics": [
            {"label": "Workflow Model", "value": "Human-in-Loop", "color": "#2563eb"},
            {"label": "Routing", "value": "By City / Location", "color": "#7c3aed"},
            {"label": "Prescription", "value": "Rx & Dosage", "color": "#059669"},
            {"label": "Audit Security", "value": "RBAC Logs", "color": "#db2777"}
        ],
        "humanized_summary": "Patient Safety First: AI is an assistant, not a replacement for a doctor. NeuroDetect strictly enforces a Two-Tier Verification model. No patient receives a final diagnosis or treatment plan until a certified neurologist reviews the MRI scan, inspects the Grad-CAM heatmap, and attaches their signed clinical notes.",
        "diagram_svg": '''
        <div class="diagram-box">
            <div class="diagram-title">Two-Tier Clinical Verification Protocol</div>
            <div class="pipeline-flow">
                <div class="pipe-node blue">
                    <strong>Patient Upload</strong>
                    <span>Select Doctor/City</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node purple">
                    <strong>AI Analysis</strong>
                    <span>DenseNet121 Inference</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node green">
                    <strong>Doctor Queue</strong>
                    <span>Specialist Workstation</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node amber">
                    <strong>Clinical Notes & Rx</strong>
                    <span>Diagnosis Verification</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node red">
                    <strong>Signed Report</strong>
                    <span>PDF Issued & Emailed</span>
                </div>
            </div>
        </div>
        ''',
        "sections": [
            {
                "heading": "1. Clinical Verification Rationale",
                "content": "AI predictions serve as decision-support tools rather than autonomous diagnostic authorities. NeuroDetect enforces a Human-in-the-Loop (HITL) model requiring certified neurologists to inspect AI heatmaps and confirm diagnoses before treatment recommendations are published."
            },
            {
                "heading": "2. Neurologist Queue & Location Routing",
                "content": "When a patient uploads an MRI scan, the system sets status to 'AI_COMPLETED'. If a patient selects a preferred doctor based on location (e.g. New Delhi, Mumbai, Bangalore, Jaipur, Boston), the scan is routed directly to that specialist's Pending Review Workstation."
            },
            {
                "heading": "3. Clinical Workstation Interface & Notes",
                "content": "The doctor workstation presents side-by-side comparisons of the original MRI and Grad-CAM heatmap. The neurologist enters: Clinical Diagnosis, Clinical Notes, Prescription & Medicines (e.g. Temozolomide, Dexamethasone), Suggested Follow-up Tests, and Next Visit Date."
            },
            {
                "heading": "4. Indelible Audit Trail & Patient Alerts",
                "content": "Upon submission, status updates to 'APPROVED'. An automated notification and email are dispatched to the patient, and an indelible audit log entry is written recording doctor ID, report ID, timestamp, and review status."
            }
        ]
    },
    "report-engine": {
        "title": "ReportLab Medical PDF Generation Engine Specification",
        "subtitle": "Automated Dynamic Healthcare Document Generator Architecture",
        "category": "Backend Systems & Document Engineering",
        "author": "NeuroDetect Clinical AI Research Group",
        "version": "v1.4 - Clinical Release 2026",
        "metrics": [
            {"label": "PDF Engine", "value": "ReportLab Platypus", "color": "#2563eb"},
            {"label": "Resolution", "value": "High-Res Embed", "color": "#7c3aed"},
            {"label": "Security", "value": "JWT Bearer Stream", "color": "#059669"},
            {"label": "Format", "value": "Vector PDF", "color": "#db2777"}
        ],
        "humanized_summary": "Seamless Medical Records: Medical reports must be crisp, legible, and tamper-proof. Our ReportLab generator dynamically converts complex database entries, high-resolution original MRI scans, and Grad-CAM heatmaps into professional vector PDF documents downloadable with secure JWT authentication.",
        "diagram_svg": '''
        <div class="diagram-box">
            <div class="diagram-title">ReportLab Dynamic PDF Document Pipeline</div>
            <div class="pipeline-flow">
                <div class="pipe-node blue">
                    <strong>Scan & Review DB</strong>
                    <span>SQL Data Store</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node purple">
                    <strong>Path Translator</strong>
                    <span>Web → Absolute File</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node green">
                    <strong>ReportLab Engine</strong>
                    <span>Platypus Flowables</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node amber">
                    <strong>JWT Security</strong>
                    <span>Blob Auth Stream</span>
                </div>
                <div class="pipe-arrow">➔</div>
                <div class="pipe-node red">
                    <strong>PDF Document</strong>
                    <span>High-Res Download</span>
                </div>
            </div>
        </div>
        ''',
        "sections": [
            {
                "heading": "1. Document Generator Architecture",
                "content": "Built using Python ReportLab Platypus (Page Layout and Typography Using Scripts). Generates standardized Letter-sized vector medical reports with dynamic table layout algorithms, color-coded diagnostic headers, and exact pixel boundaries."
            },
            {
                "heading": "2. Image Embedding & Absolute Path Resolution",
                "content": "Translates relative web assets (/uploads/mri/...) to absolute local filesystem paths. Resizes and embeds both original axial MRI scans and Grad-CAM heatmaps side-by-side inside ReportLab flowable tables at 200x180 resolution."
            },
            {
                "heading": "3. Security & Authenticated Blob Downloads",
                "content": "PDFs are generated on demand and served via authenticated FastAPI endpoints (/reports/{id}/pdf). Downloads use Axios binary blob fetching with Bearer JWT Authorization headers, preventing unauthenticated URL scraping."
            },
            {
                "heading": "4. Legal & Medical Compliance Notice",
                "content": "Includes mandatory healthcare disclaimers, unique report tracking numbers (#ND-xxxxx), patient demographics, attending doctor registration numbers, and digital timestamps."
            }
        ]
    }
}

@router.get("/view/{doc_key}", response_class=HTMLResponse)
def view_document_html(doc_key: str):
    """Renders a visual, humanized, stunning academic document web page."""
    key = doc_key.lower()
    if key not in DOCUMENTATION_DATABASE:
        raise HTTPException(status_code=404, detail="Document specification not found.")
    
    doc = DOCUMENTATION_DATABASE[key]

    metrics_html = "".join([
        f'''
        <div class="metric-chip" style="border-top: 3px solid {m['color']};">
            <div class="metric-value" style="color: {m['color']};">{m['value']}</div>
            <div class="metric-label">{m['label']}</div>
        </div>
        ''' for m in doc.get('metrics', [])
    ])

    sections_html = "".join([
        f'''
        <div class="section-card">
            <h2>{sec['heading']}</h2>
            <p>{sec['content']}</p>
        </div>
        ''' for sec in doc['sections']
    ])

    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{doc['title']} - NeuroDetect Specs</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", sans-serif;
            background-color: #f1f5f9;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }}
        .hero-banner {{
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%);
            color: #ffffff;
            padding: 45px 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }}
        .hero-banner .badge {{
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            color: #93c5fd;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 5px 14px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 14px;
        }}
        .hero-banner h1 {{
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
        }}
        .hero-banner .subtitle {{
            font-size: 15px;
            color: #cbd5e1;
            max-width: 650px;
            margin: 0 auto 15px auto;
            font-weight: 400;
        }}
        .hero-banner .meta {{
            font-size: 12px;
            color: #94a3b8;
            font-family: monospace;
        }}

        .main-content {{
            max-width: 900px;
            margin: -30px auto 50px auto;
            padding: 0 20px;
        }}

        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }}
        .metric-chip {{
            background: #ffffff;
            border-radius: 10px;
            padding: 18px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }}
        .metric-value {{
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 4px;
        }}
        .metric-label {{
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
        }}

        .human-box {{
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }}
        .human-box h3 {{
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #1e40af;
            display: flex;
            items-center: center;
            gap: 6px;
        }}
        .human-box p {{
            margin: 0;
            font-size: 13px;
            color: #1e3a8a;
            line-height: 1.6;
        }}

        .diagram-box {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 25px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }}
        .diagram-title {{
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 18px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .pipeline-flow {{
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }}
        .pipe-node {{
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px 16px;
            text-align: center;
            min-width: 130px;
            border: 1px solid #cbd5e1;
        }}
        .pipe-node strong {{
            display: block;
            font-size: 12px;
            color: #0f172a;
        }}
        .pipe-node span {{
            font-size: 10px;
            color: #64748b;
        }}
        .pipe-node.blue {{ border-left: 3px solid #2563eb; }}
        .pipe-node.purple {{ border-left: 3px solid #7c3aed; }}
        .pipe-node.green {{ border-left: 3px solid #059669; }}
        .pipe-node.amber {{ border-left: 3px solid #d97706; }}
        .pipe-node.red {{ border-left: 3px solid #dc2626; }}
        .pipe-arrow {{
            color: #94a3b8;
            font-weight: 800;
            font-size: 16px;
        }}

        .section-card {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }}
        .section-card h2 {{
            font-size: 16px;
            color: #2563eb;
            margin: 0 0 12px 0;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
        }}
        .section-card p {{
            font-size: 13px;
            line-height: 1.7;
            color: #334155;
            margin: 0;
            white-space: pre-line;
        }}

        .action-footer {{
            margin-top: 35px;
            padding-top: 20px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #64748b;
        }}
        .btn-action {{
            background: #2563eb;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            transition: transform 0.15s ease, background 0.15s ease;
        }}
        .btn-action:hover {{
            background: #1d4ed8;
            transform: translateY(-1px);
        }}

        @media print {{
            .hero-banner {{ background: #0f172a !important; -webkit-print-color-adjust: exact; }}
            .btn-action {{ display: none; }}
        }}
    </style>
</head>
<body>

    <div class="hero-banner">
        <span class="badge">{doc['category']}</span>
        <h1>{doc['title']}</h1>
        <p class="subtitle">{doc['subtitle']}</p>
        <div class="meta">Author: {doc['author']} • Version: {doc['version']}</div>
    </div>

    <div class="main-content">
        
        <!-- Key Metrics Cards -->
        <div class="metrics-grid">
            {metrics_html}
        </div>

        <!-- Humanized Summary Callout Box -->
        <div class="human-box">
            <h3>💡 Key Executive Summary & Clinical Impact</h3>
            <p>{doc.get('humanized_summary', '')}</p>
        </div>

        <!-- Visual Architectural Diagram -->
        {doc.get('diagram_svg', '')}

        <!-- Numbered Technical Sections -->
        {sections_html}

        <!-- Footer Actions -->
        <div class="action-footer">
            <span>© 2026 NeuroDetect Clinical AI Systems • Medical Decision Support Research Group</span>
            <button class="btn-action" onclick="window.print()">🖨️ Print / Export PDF Paper</button>
        </div>

    </div>

</body>
</html>'''
    return HTMLResponse(content=html_content)

@router.get("/{doc_key}")
def get_document_spec(doc_key: str):
    """Retrieves full technical specification for a given documentation module."""
    key = doc_key.lower()
    if key not in DOCUMENTATION_DATABASE:
        raise HTTPException(status_code=404, detail="Document specification not found.")
    return DOCUMENTATION_DATABASE[key]

@router.get("/")
def list_all_documents():
    """Lists all available technical documentation specs."""
    return [
        {
            "key": k,
            "title": v["title"],
            "subtitle": v["subtitle"],
            "category": v["category"]
        }
        for k, v in DOCUMENTATION_DATABASE.items()
    ]
