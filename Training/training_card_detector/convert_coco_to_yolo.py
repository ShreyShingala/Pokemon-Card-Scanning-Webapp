#Convert COCO format annotations to YOLO format
#YOLO format: <class_id> <x_center> <y_center> <width> <height> (all normalized 0-1)

import json
from pathlib import Path

def convert_coco_to_yolo(dataset_path):
    
    dataset_path = Path(dataset_path)
    
    for split in ['train', 'valid', 'test']:
        split_dir = dataset_path / split
        if not split_dir.exists():
            print(f"Directory not found {split_dir}")
            continue
            
        coco_file = split_dir / '_annotations.coco.json'
        if not coco_file.exists():
            print(f"{split} no COCO annotations found")
            continue
                
        with open(coco_file) as f:
            coco_data = json.load(f)
        
        images = {}
        for img in coco_data['images']:
            images[img['id']] = {
                'filename': img['file_name'],
                'width': img['width'],
                'height': img['height']
            }

        annotations_by_image = {}
        for ann in coco_data['annotations']:
            img_id = ann['image_id']
            if img_id not in annotations_by_image:
                annotations_by_image[img_id] = []
            annotations_by_image[img_id].append(ann)
        
        converted_count = 0
        for img_id, img_info in images.items():
            if img_id not in annotations_by_image:
                print(f"  Warning: No annotations for {img_info['filename']}")
                continue
            
            txt_filename = Path(img_info['filename']).stem + '.txt'
            txt_path = split_dir / txt_filename
            
            yolo_lines = []
            for ann in annotations_by_image[img_id]:
                x, y, w, h = ann['bbox']
                img_w, img_h = img_info['width'], img_info['height']
                
                # Convert to YOLO format: [x_center, y_center, width, height] (normalized)
                x_center = (x + w / 2) / img_w
                y_center = (y + h / 2) / img_h
                width_norm = w / img_w
                height_norm = h / img_h
                
                # Class ID (0 for pokemon_card)
                class_id = ann['category_id'] - 1 
                
                yolo_line = f"{class_id} {x_center:.6f} {y_center:.6f} {width_norm:.6f} {height_norm:.6f}"
                yolo_lines.append(yolo_line)
            
            # Write to file
            with open(txt_path, 'w') as f:
                f.write('\n'.join(yolo_lines))
            
            converted_count += 1

if __name__ == "__main__":
    dataset_path = "pokemon-card-outliner-1"
    convert_coco_to_yolo(dataset_path)
    print("Conversion complete!")
 
