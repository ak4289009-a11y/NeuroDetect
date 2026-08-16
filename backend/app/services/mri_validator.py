import os
import cv2
import numpy as np
from PIL import Image

def validate_brain_mri_image(image_path: str) -> tuple:
    """
    Input Quality & Type Gate: Validates if an uploaded image exhibits visual characteristics
    consistent with a human brain MRI scan before running DenseNet121 inference.
    
    Checks performed:
    1. File Decoding & Readability Check
    2. Resolution & Aspect Ratio Boundaries
    3. Grayscale / Monochromatic Color Variance (Rejects RGB color photos, cars, animals, cartoons)
    4. Dark Border Background Profile (Rejects documents, bright photos, white-background screenshots)
    5. Central Brain Anatomical Mass & Contrast Distribution (Rejects blank/corrupt/flat images)

    Returns (is_valid: bool, user_friendly_error_message: str).
    """
    user_error = "Invalid MRI image. Please upload a valid human brain MRI scan."

    # 1. File Decoding Check
    try:
        with Image.open(image_path) as img:
            img.verify()
    except Exception:
        return False, user_error

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return False, user_error

    h, w, _ = img_bgr.shape
    if h < 80 or w < 80:
        return False, user_error

    aspect_ratio = float(w) / float(h)
    if aspect_ratio < 0.4 or aspect_ratio > 2.5:
        return False, user_error

    # 2. Monochromatic / Near-Grayscale Check (Color photos, animals, landscapes have distinct R, G, B channels)
    b, g, r = cv2.split(img_bgr)
    rg_diff = np.mean(np.abs(r.astype(np.float32) - g.astype(np.float32)))
    gb_diff = np.mean(np.abs(g.astype(np.float32) - b.astype(np.float32)))
    rb_diff = np.mean(np.abs(r.astype(np.float32) - b.astype(np.float32)))
    max_color_diff = max(rg_diff, gb_diff, rb_diff)

    if max_color_diff > 12.0:  # Photographic RGB color threshold
        return False, user_error

    # Convert to grayscale for structural inspection
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # 3. Variance & Contrast Check (Rejects blank, solid, or flat noise images)
    gray_std = np.std(gray)
    gray_min, gray_max = np.min(gray), np.max(gray)
    if gray_std < 12.0 or (gray_max - gray_min) < 35:
        return False, user_error

    # 4. Outer Border Background Inspection (MRIs are enclosed in dark background matrix)
    top_border = np.mean(gray[:max(1, int(h * 0.05)), :])
    bottom_border = np.mean(gray[min(h - 1, int(h * 0.95)):, :])
    left_border = np.mean(gray[:, :max(1, int(w * 0.05))])
    right_border = np.mean(gray[:, min(w - 1, int(w * 0.95)):])
    avg_border_intensity = np.mean([top_border, bottom_border, left_border, right_border])

    if avg_border_intensity > 130.0:  # Documents, white-background photos, screenshots
        return False, user_error

    # 5. Centered Brain Anatomical Mass Presence Check
    cy_start, cy_end = int(h * 0.25), int(h * 0.75)
    cx_start, cx_end = int(w * 0.25), int(w * 0.75)
    center_roi = gray[cy_start:cy_end, cx_start:cx_end]
    center_mean = np.mean(center_roi)

    if center_mean < 15.0:  # Empty center
        return False, user_error

    return True, "Valid Human Brain MRI"
