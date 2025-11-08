#don't trust anyone so make sure the annotations are correct

import cv2
import random
from pathlib import Path

def visualize_yolo_annotations(dataset_path, split='train', num_samples=5):
    
    dataset_path = Path(dataset_path)
    split_dir = dataset_path / split
    
    if not split_dir.exists():
        print(f"Directory not found: {split_dir}")
        return

    image_files = list(split_dir.glob("*.jpg"))

    if len(image_files) == 0:
        print(f"No images found in {split_dir}")
        return
    
    images_with_labels = []
    for img_path in image_files:
        txt_path = img_path.with_suffix('.txt')
        if txt_path.exists():
            images_with_labels.append(img_path)
    
    print(f"\nFound {len(images_with_labels)} images with labels in {split} split")
    
    if len(images_with_labels) == 0:
        print("No labeled images found!")
        return
    
    samples = random.sample(images_with_labels, min(num_samples, len(images_with_labels)))
    
    for img_path in samples:
        image = cv2.imread(str(img_path))
        if image is None:
            print(f"Failed to load: {img_path}")
            continue
        
        h, w = image.shape[:2]
        
        txt_path = img_path.with_suffix('.txt')
        with open(txt_path) as f:
            lines = f.readlines()
        
        print(f"\n{img_path.name}")
        
        for i, line in enumerate(lines):
            parts = line.strip().split()
            if len(parts) != 5:
                print(f"  Warning: Invalid annotation line: {line}")
                continue
            
            class_id, x_center, y_center, width, height = map(float, parts)
            
            x_center_px = x_center * w
            y_center_px = y_center * h
            width_px = width * w
            height_px = height * h

            x1 = int(x_center_px - width_px / 2)
            y1 = int(y_center_px - height_px / 2)
            x2 = int(x_center_px + width_px / 2)
            y2 = int(y_center_px + height_px / 2)
            
            # Validate coordinates
            if x1 < 0 or y1 < 0 or x2 > w or y2 > h:
                print(f"Bounding goes out of the image lil bro")
                print(f"x1={x1}, y1={y1}, x2={x2}, y2={y2} (image: {w}x{h})")
            
            if x2 <= x1 or y2 <= y1:
                print("Invalid bounding box lil bro, height/width not positive")

            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(image, (int(x_center_px), int(y_center_px)), 5, (0, 0, 255), -1) #Center point: red
            cv2.circle(image, (x1, y1), 3, (255, 0, 0), -1)  # Top-left: blue
            cv2.circle(image, (x2, y2), 3, (255, 255, 0), -1)  # Bottom-right: cyan
            
            label = f"Card {i+1}"
            cv2.putText(image, label, (x1, y1 - 10),cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        cv2.imshow('YOLO Annotation Verification', image)
        key = cv2.waitKey(0)
        
        if key == 27:  # ESC
            break
    
    cv2.destroyAllWindows()

if __name__ == "__main__":
    print("YOLO Annotation Verification")
    
    visualize_yolo_annotations("pokemon-card-outliner-1", split='train', num_samples=10)