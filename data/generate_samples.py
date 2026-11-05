"""
Generate synthetic demonstration medical images for Scanova.
Run once to create the sample_images directory.
Uses only NumPy — no real patient data.
"""

import os
import sys
import numpy as np

# Add parent dir so config can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_images")
os.makedirs(OUT_DIR, exist_ok=True)


def save_png(arr: np.ndarray, name: str):
    Image.fromarray(arr.astype(np.uint8)).save(os.path.join(OUT_DIR, name))
    print(f"  [OK] {name}")


def generate_chest_xray(size=400) -> np.ndarray:
    """Synthetic chest X-ray-like grayscale image."""
    rng = np.random.default_rng(42)
    img = np.full((size, size), 30, dtype=np.float32)

    # Ribcage arcs
    cx, cy = size // 2, size // 2
    for r in range(80, 160, 18):
        for angle in np.linspace(-0.8, 0.8, 200):
            x = int(cx + r * np.cos(angle))
            y = int(cy - r * np.sin(angle) * 1.5)
            if 0 <= x < size and 0 <= y < size:
                img[y, x] = 200

    # Lung fields (ellipses)
    for cx_off, bright in [(-70, 60), (70, 60)]:
        for dy in range(-80, 81):
            for dx in range(-45, 46):
                ex = dx / 45.0
                ey = dy / 80.0
                if ex ** 2 + ey ** 2 <= 1.0:
                    img[cy + dy, cx + cx_off + dx] = max(img[cy + dy, cx + cx_off + dx], bright)

    # Spine
    for dy in range(-150, 151):
        for dx in range(-8, 9):
            yy = cy + dy
            if 0 <= yy < size:
                img[yy, cx + dx] = max(img[yy, cx + dx], 220)

    # Heart shadow (left)
    for dy in range(-30, 60):
        for dx in range(-50, 20):
            if dx ** 2 / 50.0 ** 2 + dy ** 2 / 90.0 ** 2 <= 1.0:
                img[cy + dy, cx - 30 + dx] = max(img[cy + dy, cx - 30 + dx], 160)

    img += rng.normal(0, 8, img.shape).astype(np.float32)
    img = np.clip(img, 0, 255)
    return img.astype(np.uint8)


def generate_brain_mri(size=400) -> np.ndarray:
    """Synthetic brain MRI-like axial slice."""
    rng = np.random.default_rng(17)
    img = np.zeros((size, size), dtype=np.float32)
    cy, cx = size // 2, size // 2

    # Skull (bright ring)
    for dy in range(-size//2, size//2):
        for dx in range(-size//2, size//2):
            r = np.sqrt(dx**2 + dy**2)
            if 140 < r < 160:
                img[cy + dy, cx + dx] = 220

    # White matter
    for dy in range(-120, 121):
        for dx in range(-120, 121):
            if dx**2 + dy**2 <= 120**2:
                img[cy + dy, cx + dx] = 130

    # Gray matter ring
    for dy in range(-120, 121):
        for dx in range(-120, 121):
            r = np.sqrt(dx**2 + dy**2)
            if 95 < r <= 120:
                img[cy + dy, cx + dx] = 100

    # Ventricles (dark)
    for dy in range(-25, 26):
        for dx in range(-40, 41):
            if dx**2 / 40.0**2 + dy**2 / 25.0**2 <= 1.0:
                img[cy + dy, cx + dx] = 20

    # Corpus callosum
    for dy in range(-6, 7):
        for dx in range(-50, 51):
            if abs(dy) < 5:
                img[cy + dy, cx + dx] = 180

    img += rng.normal(0, 10, img.shape).astype(np.float32)
    img = np.clip(img, 0, 255)
    return img.astype(np.uint8)


def generate_knee_ct(size=400) -> np.ndarray:
    """Synthetic knee CT-like grayscale image."""
    rng = np.random.default_rng(99)
    img = np.zeros((size, size), dtype=np.float32)
    cy, cx = size // 2, size // 2

    # Femur (top bone)
    for dy in range(-140, -40):
        for dx in range(-55, 56):
            if abs(dx) < 55 and abs(dx) > 25:
                img[cy + dy, cx + dx] = 255
            elif abs(dx) <= 25:
                img[cy + dy, cx + dx] = 80

    # Femoral condyles
    for off in [-35, 35]:
        for dy in range(-50, 0):
            for dx in range(-30, 31):
                if dx**2 + dy**2 < 30**2:
                    img[cy + dy, cx + off + dx] = 255

    # Tibia (bottom bone)
    for dy in range(30, 160):
        for dx in range(-60, 61):
            if abs(dx) > 20:
                img[cy + dy, cx + dx] = 255
            else:
                img[cy + dy, cx + dx] = 60

    # Joint space
    for dy in range(0, 30):
        for dx in range(-60, 61):
            img[cy + dy, cx + dx] = 30

    img += rng.normal(0, 6, img.shape).astype(np.float32)
    img = np.clip(img, 0, 255)
    return img.astype(np.uint8)


if __name__ == "__main__":
    print("Generating synthetic demonstration images...")
    save_png(generate_chest_xray(), "chest_xray_demo.png")
    save_png(generate_brain_mri(),  "brain_mri_demo.png")
    save_png(generate_knee_ct(),    "knee_ct_demo.png")
    print("Done.")
