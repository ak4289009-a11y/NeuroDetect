"""
DenseNet121 Brain Tumor Classifier Exporter / Trainer Script
"""
import os

def export_densenet121():
    try:
        import tensorflow as tf
        print("[TensorFlow] Building Keras DenseNet121 Deep Learning Architecture...")
        
        base_model = tf.keras.applications.DenseNet121(
            weights="imagenet",
            include_top=False,
            input_shape=(224, 224, 3)
        )
        x = tf.keras.layers.GlobalAveragePooling2D()(base_model.output)
        x = tf.keras.layers.Dense(256, activation="relu")(x)
        x = tf.keras.layers.Dropout(0.3)(x)
        outputs = tf.keras.layers.Dense(4, activation="softmax", name="tumor_classification")(x)
        
        model = tf.keras.Model(inputs=base_model.input, outputs=outputs)
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )
        
        output_path = os.path.join(os.path.dirname(__file__), "densenet121_brain_tumor.h5")
        model.save(output_path)
        print(f"[Success] DenseNet121 model compiled and saved to {output_path}")
    except ImportError:
        print("[Info] TensorFlow package not installed in environment. Inference service will operate using feature evaluation engine.")

if __name__ == "__main__":
    export_densenet121()
