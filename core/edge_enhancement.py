"""
core/edge_enhancement.py
─────────────────────────
Edge detail enhancement and optional edge visualisation.

Methods
───────
  • Unsharp Masking  – sharpens by adding a scaled high-frequency residual.
  • Sobel visualiser – optional educational edge-detection overlay.
  • Laplacian overlay – optional second-order edge visualiser.

Unsharp masking formula:
    I_sharp = clip(I + α · (I – GaussBlur(I, σ)))

All functions:
  • Accept a NumPy uint8 array.
  • Return a new NumPy uint8 array.
  • Leave the input unchanged.
"""

from __future__ import annotations

import cv2
import numpy as np


# ─── Public API ───────────────────────────────────────────────────────────────

def apply_edge_enhancement(
    image: np.ndarray,
    strength: float = 1.2,
    sigma: float = 1.0,
) -> np.ndarray:
    """
    Unsharp masking edge enhancement.

    Parameters
    ----------
    image    : np.ndarray (uint8)
    strength : α in [0.0, 3.0].  0 → no change;  > 1 → stronger sharpening.
    sigma    : Gaussian blur σ for the mask.

    Returns
    -------
    np.ndarray (uint8) – sharpened image.
    """
    _validate_sharpen(image, strength, sigma)
    return _unsharp_mask(image, strength, sigma)


def sobel_edges(image: np.ndarray) -> np.ndarray:
    """
    Compute magnitude of Sobel gradient (educational visualisation only).
    Always returns a grayscale uint8 image.
    """
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.sqrt(gx ** 2 + gy ** 2)
    mag = np.clip(mag / mag.max() * 255, 0, 255).astype(np.uint8)
    return mag


def laplacian_edges(image: np.ndarray) -> np.ndarray:
    """
    Compute absolute Laplacian (educational visualisation only).
    Returns a grayscale uint8 image.
    """
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    lap = np.abs(lap)
    if lap.max() > 0:
        lap = lap / lap.max() * 255
    return lap.astype(np.uint8)


# ─── Implementation ───────────────────────────────────────────────────────────

def _unsharp_mask(image: np.ndarray, alpha: float, sigma: float) -> np.ndarray:
    """
    Unsharp masking:
        blurred  = GaussianBlur(image, sigma)
        residual = image − blurred          (high-frequency detail)
        output   = image + α · residual
               = image + α · (image − blurred)
               = (1 + α) · image − α · blurred

    Clipped to [0, 255] to avoid uint8 overflow.
    """
    ksize = _sigma_to_ksize(sigma)
    if image.ndim == 3:
        blurred = cv2.GaussianBlur(image, (ksize, ksize), sigma)
    else:
        blurred = cv2.GaussianBlur(image, (ksize, ksize), sigma)

    # Work in float to avoid overflow
    img_f    = image.astype(np.float32)
    blur_f   = blurred.astype(np.float32)
    sharp_f  = img_f + alpha * (img_f - blur_f)
    return np.clip(sharp_f, 0, 255).astype(np.uint8)


def _sigma_to_ksize(sigma: float) -> int:
    """Compute an appropriate odd kernel size from σ (OpenCV convention)."""
    ksize = int(6 * sigma + 1)
    if ksize % 2 == 0:
        ksize += 1
    return max(3, ksize)


# ─── Validation ───────────────────────────────────────────────────────────────

def _validate_sharpen(image, strength, sigma):
    if image is None:
        raise ValueError("Edge enhancement received None image.")
    if image.dtype != np.uint8:
        raise ValueError(f"Expected uint8, got {image.dtype}.")
    if not (0.0 <= strength <= 3.0):
        raise ValueError(
            f"strength {strength} out of range [0.0, 3.0]."
        )
    if sigma <= 0:
        raise ValueError(f"sigma must be positive, got {sigma}.")
