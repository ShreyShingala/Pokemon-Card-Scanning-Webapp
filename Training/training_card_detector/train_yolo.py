#YOLO-based Pokemon Card Detection Training Using Ultralytics YOLOv8

from ultralytics import YOLO
import os
from pathlib import Path

def train_yolo_model():
    model = YOLO('yolov8n.pt')
    
    
    print("\nStarting training...")
    
    results = model.train(
        data='pokemon-card-outliner-1/data.yaml',  # Path to dataset YAML
        epochs=25,                    # Number of training epochs
        imgsz=640,                    # Image size
        batch=8,                      # Batch size (8 cause cpu)
        name='pokemon_detector',      # Name for this training run
        pretrained=True,              # Use pre-trained weights
        optimizer='Adam',             # Optimizer
        lr0=0.01,                     # Initial learning rate
        patience=5,                   # Early stopping patience
        save=True,                    # Save checkpoints
        plots=True,                   # Cool graphs
        device='cpu',                 # Cpu cause we don't use gpu
        verbose=True                  # Tell it to yap
    )
    

    print("TRAINING COMPLETE!")
    
    return model

def create_dataset_yaml(): #create the data.yaml file if it doesn't exist
    yaml_path = Path("pokemon-card-outliner-1/data.yaml")
    
    if yaml_path.exists():
        return
    
    # Create YAML configuration
    yaml_content = f"""# Pokemon Card Detection Dataset
path: {Path('pokemon-card-outliner-1').absolute()}  # dataset root dir
train: train/images  # train images (relative to 'path')
val: valid/images  # val images (relative to 'path')
test: test/images  # test images (optional)

# Classes
names:
  0: pokemon_card
"""

    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

if __name__ == "__main__":
    create_dataset_yaml()
    
    
    model = train_yolo_model()
    print("We're free!")
