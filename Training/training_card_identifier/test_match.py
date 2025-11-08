#!/usr/bin/env python3
# Test script for card matching system

import sys
import os
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

# Force CPU before any torch imports
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'

import torch
torch.set_default_device('cpu')

from find_card_match import find_best_match

if __name__ == "__main__":
    # Test with captured card
    image_path = '../../Image_detection/images/captured_card_3.jpeg'
    
    print("Testing card matching system...")
    
    result = find_best_match(image_path, top_k=5, show_image=False)
    
    print('\n' + '='*60)
    print('TEST RESULT:')
    print('='*60)
    print(f'Best Match: {result["best_match"]}')
    print(f'Confidence: {result["confidence"]}')
    print(f'Similarity Score: {result["similarity"]:.4f}')
    print('='*60)
    
    print("\nTop 5 matches:")
    for i, match in enumerate(result['top_matches'], 1):
        print(f"{i}. {match['card_name']} - {match['similarity']:.4f} ({match['confidence']})")
