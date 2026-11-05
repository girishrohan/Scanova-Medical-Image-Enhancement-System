"""
core/preprocessing.py
─────────────────────
Grayscale conversion and basic image normalization utilities.

All functions:
  • Accept a NumPy uint8 array.
  • Return a new NumPy uint8 array.
  • Leave the input array UNCHANGED.
"""

from __future__ import annotations

import numpy as np
import cv2


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Convert a BGR color image to a single-channel grayscale image.
    If the image is already grayscale (2-D), return a copy unchanged.

    Parameters
    ----------
    image : np.ndarray  (uint8)
        HxW  (gray) or HxWx3 (BGR) array.

    Returns
    -------
    np.ndarray  (uint8, HxW)
    """
    if image is None:
        raise ValueError("to_grayscale: received None image.")

    if image.ndim == 2:
        return image.copy()   # already grayscale

    if image.ndim == 3 and image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if image.ndim == 3 and image.shape[2] == 1:
        return image[:, :, 0].copy()

    raise ValueError(
        f"to_grayscale: unexpected image shape {image.shape}. "
        "Expected HxW, HxWx1, or HxWx3."
    )


def is_grayscale(image: np.ndarray) -> bool:
    """Return True when image is already a single-channel (grayscale) array."""
    if image.ndim == 2:
        return True
    if image.ndim == 3 and image.shape[2] == 1:
        return True
    if image.ndim == 3 and image.shape[2] == 3:
        # Check pixel-level: equal R G B channels → effectively grayscale
        b, g, r = image[:, :, 0], image[:, :, 1], image[:, :, 2]
        return np.array_equal(b, g) and np.array_equal(g, r)
    return False


def ensure_uint8(image: np.ndarray) -> np.ndarray:
    """
    Safely convert any numeric array to uint8.
    Values are clipped to [0, 255] rather than wrapped.
    """
    if image.dtype == np.uint8:
        return image.copy()
    return np.clip(image, 0, 255).astype(np.uint8)


def normalize_intensity(image: np.ndarray) -> np.ndarray:
    """
    Stretch pixel intensities to the full [0, 255] range.
    Useful for displaying high-bit-depth images after conversion.
    Returns the image unchanged if all pixels share the same value.
    """
    arr = image.astype(np.float32)
    imin, imax = float(arr.min()), float(arr.max())
    if imax <= imin:
        return ensure_uint8(image)
    arr = (arr - imin) / (imax - imin) * 255.0
    return arr.astype(np.uint8)


def channels(image: np.ndarray) -> int:
    """Return number of color channels (1 for grayscale, 3 for BGR/RGB)."""
    if image.ndim == 2:
        return 1
    return image.shape[2]
