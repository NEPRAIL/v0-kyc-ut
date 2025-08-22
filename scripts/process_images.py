import os
from PIL import Image
import json

def process_product_images():
    """
    Process product images for both listing (thumbnail) and product detail views
    """
    
    # Define image sizes
    THUMBNAIL_SIZE = (120, 120)  # For product listings
    DETAIL_SIZE = (300, 300)     # For product detail pages
    
    # Input and output directories
    input_dir = "public/product-images/original"
    thumbnail_dir = "public/product-images/thumbnails"
    detail_dir = "public/product-images/detail"
    
    # Create directories if they don't exist
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(thumbnail_dir, exist_ok=True)
    os.makedirs(detail_dir, exist_ok=True)
    
    # Process all images in the original directory
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.svg', '.webp')):
            input_path = os.path.join(input_dir, filename)
            
            # Generate base name without extension
            base_name = os.path.splitext(filename)[0]
            
            try:
                # Open and process image
                with Image.open(input_path) as img:
                    # Convert to RGB if necessary
                    if img.mode in ('RGBA', 'LA', 'P'):
                        img = img.convert('RGB')
                    
                    # Create thumbnail
                    thumbnail = img.copy()
                    thumbnail.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                    thumbnail_path = os.path.join(thumbnail_dir, f"{base_name}.png")
                    thumbnail.save(thumbnail_path, "PNG", optimize=True)
                    
                    # Create detail image
                    detail = img.copy()
                    detail.thumbnail(DETAIL_SIZE, Image.Resampling.LANCZOS)
                    detail_path = os.path.join(detail_dir, f"{base_name}.png")
                    detail.save(detail_path, "PNG", optimize=True)
                    
                    print(f"✅ Processed: {filename}")
                    
            except Exception as e:
                print(f"❌ Error processing {filename}: {e}")
    
    print("\n🎉 Image processing complete!")
    print(f"📁 Thumbnails: {thumbnail_dir}")
    print(f"📁 Detail images: {detail_dir}")

if __name__ == "__main__":
    process_product_images()
