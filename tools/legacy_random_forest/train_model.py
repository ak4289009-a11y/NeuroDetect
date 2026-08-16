# ==============================================================================
# B.Tech Final Year Computer Science & Engineering Project
# NeuroDetect: Brain Tumor Detection & Classification Model Training Script
# 
# Description: Trains a Machine Learning / Deep Feature Classifier for 4-class
# Brain Tumor MRI Detection (Glioma, Meningioma, Pituitary, No Tumor).
# Saves the trained model pipeline to a '.joblib' file for inference.
# ==============================================================================

import os
import time
import numpy as np
import cv2
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Configuration Settings
MODEL_SAVE_PATH = "brain_tumor_model.joblib"
SCALER_SAVE_PATH = "feature_scaler.joblib"
CLASS_NAMES = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
IMAGE_SIZE = (224, 224)

def extract_mri_features(img):
    """
    Extracts numerical statistical and spatial texture features from a 224x224 MRI image.
    Features: Intensity Mean, Std Dev, Variance, Skewness, Gradient Magnitude, Contour Density.
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    gray_resized = cv2.resize(gray, IMAGE_SIZE)

    # 1. First-Order Statistical Features
    mean_val = np.mean(gray_resized)
    std_val = np.std(gray_resized)
    var_val = np.var(gray_resized)
    max_val = np.max(gray_resized)
    min_val = np.min(gray_resized)

    # 2. Gradient & Spatial Features (Sobel Filters)
    grad_x = cv2.Sobel(gray_resized, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray_resized, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(grad_x**2 + grad_y**2)
    mean_grad = np.mean(grad_mag)
    std_grad = np.std(grad_mag)

    # 3. High-Pass Spatial Frequency Content
    laplacian = cv2.Laplacian(gray_resized, cv2.CV_64F)
    laplacian_var = np.var(laplacian)

    # Combine into feature vector
    features = [
        mean_val, std_val, var_val, max_val, min_val,
        mean_grad, std_grad, laplacian_var
    ]
    return np.array(features)

def generate_synthetic_dataset(num_samples_per_class=100):
    """
    Generates synthetic MRI feature data simulating Glioma, Meningioma, Pituitary, and Healthy MRI scans
    to train and demonstrate the joblib model pipeline.
    """
    print("[Dataset] Generating synthetic MRI feature dataset for training...")
    X = []
    y = []

    np.random.seed(42)

    for class_idx, class_name in enumerate(CLASS_NAMES):
        for _ in range(num_samples_per_class):
            if class_name == "Glioma":
                # High contrast variance, elevated Laplacian
                feat = [
                    np.random.normal(85, 10),  # mean
                    np.random.normal(70, 8),   # std
                    np.random.normal(4900, 500),# var
                    255,                       # max
                    0,                         # min
                    np.random.normal(45, 5),   # mean grad
                    np.random.normal(30, 4),   # std grad
                    np.random.normal(850, 90)  # laplacian var
                ]
            elif class_name == "Meningioma":
                # Dense peripheral lesion features
                feat = [
                    np.random.normal(75, 8),
                    np.random.normal(58, 6),
                    np.random.normal(3364, 400),
                    250,
                    0,
                    np.random.normal(38, 4),
                    np.random.normal(25, 3),
                    np.random.normal(650, 70)
                ]
            elif class_name == "Pituitary":
                # Central seller region features
                feat = [
                    np.random.normal(95, 12),
                    np.random.normal(52, 5),
                    np.random.normal(2704, 350),
                    252,
                    0,
                    np.random.normal(32, 4),
                    np.random.normal(22, 3),
                    np.random.normal(550, 60)
                ]
            else: # No Tumor (Healthy)
                # Uniform parenchymal distribution, lower variance
                feat = [
                    np.random.normal(55, 6),
                    np.random.normal(35, 4),
                    np.random.normal(1225, 200),
                    220,
                    0,
                    np.random.normal(18, 3),
                    np.random.normal(12, 2),
                    np.random.normal(250, 30)
                ]

            X.append(feat)
            y.append(class_idx)

    return np.array(X), np.array(y)

def train_and_save_model():
    """
    Trains the Random Forest / SVM Classifier, computes accuracy metrics,
    and exports the trained model to '.joblib'.
    """
    print("\n" + "="*70)
    print("      NEURODETECT - BRAIN TUMOR DETECTION MODEL TRAINING ENGINE")
    print("="*70)
    
    start_time = time.time()

    # 1. Load Dataset
    X, y = generate_synthetic_dataset(num_samples_per_class=150)
    print(f"[Dataset] Total samples generated: {len(X)} across 4 categories.")

    # 2. Train-Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[Split] Training set: {len(X_train)} samples | Testing set: {len(X_test)} samples")

    # 3. Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Model Training (RandomForest Classifier with 100 Trees)
    print("\n[Training] Training Random Forest MRI Classifier Ensemble...")
    classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42
    )
    classifier.fit(X_train_scaled, y_train)

    # 5. Evaluate Performance
    y_pred = classifier.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred) * 100.0

    print("\n" + "-"*70)
    print(f"  MODEL EVALUATION RESULTS (Accuracy: {acc:.2f}%)")
    print("-"*70)
    print("\nClassification Report:\n")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    print("Confusion Matrix:\n")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

    # 6. Save Model to .joblib File
    joblib.dump(classifier, MODEL_SAVE_PATH)
    joblib.dump(scaler, SCALER_SAVE_PATH)
    
    elapsed = time.time() - start_time
    print("\n" + "="*70)
    print(f"[Export SUCCESS] Saved trained model to: '{os.path.abspath(MODEL_SAVE_PATH)}'")
    print(f"[Export SUCCESS] Saved feature scaler to: '{os.path.abspath(SCALER_SAVE_PATH)}'")
    print(f"[Timing] Model training & export completed in {elapsed:.2f} seconds.")
    print("="*70 + "\n")

if __name__ == "__main__":
    train_and_save_model()
