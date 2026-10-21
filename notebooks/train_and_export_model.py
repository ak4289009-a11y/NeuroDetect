"""
NeuroDetect - Model Training & Artifact Export Script
Derived from 'brain-tumer.ipynb' for clinical production deployment.

This script trains the DenseNet-121 Brain Tumor Classifier and exports both:
  1. HDF5 format (.h5) -> 'densenet121_brain_tumor.h5'
  2. Keras v3 Native Zip format (.keras) -> 'densenet121_brain_tumor.keras'

Dataset: Brain Tumor MRI Dataset (4 Classes: Glioma, Meningioma, No Tumor, Pituitary)
Architecture: DenseNet-121 (Pre-trained on ImageNet) + Custom Clinical Classification Head
"""

import os
import shutil
import numpy as np
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# Configuration
DATA_DIR = os.getenv("DATA_DIR", "/kaggle/input/brain-tumor-mri-data/brain-tumor-mri-dataset")
SPLIT_BASE_DIR = os.getenv("SPLIT_BASE_DIR", "./split_data")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./model_artifacts")
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 100
LEARNING_RATE = 0.0001
CLASSES = ['pituitary', 'notumor', 'meningioma', 'glioma']


def prepare_dataset_splits(data_path, split_base):
    """Splits dataset into 70% Train, 15% Validation, and 15% Test."""
    if not os.path.exists(data_path):
        print(f"[Warning] Data directory '{data_path}' not found.")
        print("Please set DATA_DIR environment variable to the path containing class folders.")
        return False

    split_dirs = ['train', 'test', 'valid']
    for s in split_dirs:
        for c in CLASSES:
            os.makedirs(os.path.join(split_base, s, c), exist_ok=True)

    print(f"Splitting data from '{data_path}' into '{split_base}'...")
    for category in CLASSES:
        cat_path = os.path.join(data_path, category)
        if not os.path.exists(cat_path):
            continue
        images = [f for f in os.listdir(cat_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        train_imgs, test_imgs = train_test_split(images, test_size=0.30, random_state=42)
        valid_imgs, test_imgs = train_test_split(test_imgs, test_size=0.50, random_state=42)
        
        for img in train_imgs:
            shutil.copy(os.path.join(cat_path, img), os.path.join(split_base, 'train', category, img))
        for img in valid_imgs:
            shutil.copy(os.path.join(cat_path, img), os.path.join(split_base, 'valid', category, img))
        for img in test_imgs:
            shutil.copy(os.path.join(cat_path, img), os.path.join(split_base, 'test', category, img))

    print("Data successfully partitioned into train (70%), validation (15%), and test (15%) sets.")
    return True


def build_model(num_classes=4):
    """Constructs the DenseNet-121 transfer learning architecture matching brain-tumer.ipynb."""
    base_model = DenseNet121(weights='imagenet', include_top=False, input_shape=(*IMAGE_SIZE, 3))
    base_model.trainable = False  # Freeze pre-trained feature extractor

    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),
        Dense(256, activation='relu'),
        Dropout(0.5),
        Dense(num_classes, activation='softmax')
    ], name="DenseNet121_Brain_Tumor_Classifier")

    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Dataset Check
    has_data = prepare_dataset_splits(DATA_DIR, SPLIT_BASE_DIR)
    if not has_data and not os.path.exists(os.path.join(SPLIT_BASE_DIR, 'train')):
        print("Cannot proceed with training without dataset. Exiting.")
        return

    # 2. Data Generators (identical to notebook cell 14)
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True
    )
    valid_datagen = ImageDataGenerator(rescale=1./255)
    test_datagen = ImageDataGenerator(rescale=1./255)

    train_gen = train_datagen.flow_from_directory(
        os.path.join(SPLIT_BASE_DIR, 'train'),
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )
    val_gen = valid_datagen.flow_from_directory(
        os.path.join(SPLIT_BASE_DIR, 'valid'),
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )
    test_gen = test_datagen.flow_from_directory(
        os.path.join(SPLIT_BASE_DIR, 'test'),
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )

    # 3. Model Construction
    model = build_model(num_classes=train_gen.num_classes)
    model.summary()

    # 4. Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=os.path.join(OUTPUT_DIR, 'best_checkpoint.h5'),
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )
    ]

    # 5. Training Loop
    print("\nStarting DenseNet-121 training...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    # 6. Evaluation on Unseen Test Partition
    print("\nEvaluating on Test Set...")
    test_loss, test_acc = model.evaluate(test_gen)
    print(f"==========================================")
    print(f"Final Test Loss:     {test_loss:.4f}")
    print(f"Final Test Accuracy: {test_acc * 100:.2f}%")
    print(f"==========================================")

    # 7. Model Artifact Export (.h5 and .keras)
    h5_export_path = os.path.join(OUTPUT_DIR, "densenet121_brain_tumor.h5")
    keras_export_path = os.path.join(OUTPUT_DIR, "densenet121_brain_tumor.keras")

    print(f"\nExporting model to HDF5 format: {h5_export_path}...")
    model.save(h5_export_path)

    print(f"Exporting model to Keras v3 format: {keras_export_path}...")
    model.save(keras_export_path)

    print("\nExport completed successfully!")
    print(f"Artifact 1: {h5_export_path} ({os.path.getsize(h5_export_path) / (1024*1024):.2f} MB)")
    print(f"Artifact 2: {keras_export_path} ({os.path.getsize(keras_export_path) / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    main()
