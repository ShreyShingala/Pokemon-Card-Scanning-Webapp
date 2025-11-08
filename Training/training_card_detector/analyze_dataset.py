import json
from pathlib import Path
import numpy as np

def analyze_dataset(): #see what type of bounding boxes are in dataset
    
    annotations_file = Path("../pokemon-card-detection-1/train/_annotations.coco.json")
    
    if not annotations_file.exists():
        print(f"Annotations file not found: {annotations_file}")
        return
    
    with open(annotations_file) as f:
        data = json.load(f)
    
    print("DATASET ANALYSIS")
    
    total_images = len(data['images'])
    total_annotations = len(data['annotations'])
    
    print(f"\nTotal images: {total_images}")
    print(f"Total annotations: {total_annotations}")
    
    # Analyze bounding boxes
    full_image_count = 0
    partial_image_count = 0
    bbox_sizes = []
    
    for ann in data['annotations']:
        # Find corresponding image
        image_info = next((img for img in data['images'] if img['id'] == ann['image_id']), None)
        if not image_info:
            continue
        
        w = image_info['width']
        h = image_info['height']
        
        # Get bbox
        x, y, width, height = ann['bbox']
        
        # Normalize
        x1, y1 = x/w, y/h
        x2, y2 = (x + width)/w, (y + height)/h
        
        # Calculate coverage
        coverage = (x2 - x1) * (y2 - y1)
        bbox_sizes.append(coverage)
        
        # Check if it's a full image bbox (>95% coverage)
        if coverage > 0.95:
            full_image_count += 1
        else:
            partial_image_count += 1
    
    print(f"\nBounding Box Distribution:")
    print(f"Full-image bboxes (>95% coverage): {full_image_count} ({full_image_count/total_annotations*100:.1f}%)")
    print(f"Partial-image bboxes: {partial_image_count} ({partial_image_count/total_annotations*100:.1f}%)")
    
    print(f"\nBBox Coverage Statistics:")
    print(f"Mean coverage: {np.mean(bbox_sizes)*100:.1f}%")
    print(f"Median coverage: {np.median(bbox_sizes)*100:.1f}%")
    print(f"Min coverage: {np.min(bbox_sizes)*100:.1f}%")
    print(f"Max coverage: {np.max(bbox_sizes)*100:.1f}%")
    
    # Show some examples
    print("SAMPLE ANNOTATIONS:")
    
    for i, ann in enumerate(data['annotations'][:5]):
        image_info = next((img for img in data['images'] if img['id'] == ann['image_id']), None)
        if not image_info:
            continue
        
        w = image_info['width']
        h = image_info['height']
        x, y, width, height = ann['bbox']
        
        coverage = (width/w) * (height/h)
        
        print(f"\nImage: {image_info['file_name']}")
        print(f"Size: {w}x{h}")
        print(f"BBox (pixels): x={x:.0f}, y={y:.0f}, w={width:.0f}, h={height:.0f}")
        print(f"Coverage: {coverage*100:.1f}%")
        print(f"Type: {'Full-image (pre-cropped)' if coverage > 0.95 else 'Partial (card in scene)'}")
    
if __name__ == "__main__":
    analyze_dataset()
