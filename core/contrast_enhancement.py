"""
core/contrast_enhancement.py
─────────────────────────────
Contrast enhancement for medical images.

Methods
───────
  • CLAHE  – Contrast Limited Adaptive Histogram Equalization (recommended for
             medical imaging; avoids over-amplification of noise).
  • HistEq – Global Histogram Equalization (simpler; for comparison/education).

Grayscale images: applied directly.
Color images:     applied to the luminance channel only (YCrCb L-channel)
                  so hue and saturation are not distorted.
"""

from __future__ import annotations

import cv2
import numpy as np


# ─── Public API ───────────────────────────────────────────────────────────────

def apply_contrast_enhancement(
    image: np.ndarray,
    method: str = "CLAHE",
    clip_limit: float = 2.0,
    tile_grid_size: int = 8,
) -> np.ndarray:
    """
    Enhance image contrast.

    Parameters
    ----------
    image         : np.ndarray (uint8, HxW or HxWx3 BGR)
    method        : "CLAHE" | "Histogram Equalization"
    clip_limit    : CLAHE clip limit (noise amplification threshold). [0.5, 10.0]
    tile_grid_size: CLAHE tile grid n×n.                             [2, 32]

    Returns
    -------
    np.ndarray (uint8) – contrast-enhanced image, same shape as input.
    """
    _validate(image, method, clip_limit, tile_grid_size)

    is_color = image.ndim == 3 and image.shape[2] == 3

    if method == "CLAHE":
        return _apply_clahe(image, is_color, clip_limit, tile_grid_size)
    if method == "Histogram Equalization":
        return _apply_histeq(image, is_color)
    raise ValueError(f"Unknown method '{method}'.")


# ─── Implementations ──────────────────────────────────────────────────────────

def _apply_clahe(
    image: np.ndarray,
    is_color: bool,
    clip_limit: float,
    tile_grid_size: int,
) -> np.ndarray:
    """
    CLAHE — Contrast Limited Adaptive Histogram Equalization.

    Divides the image into small non-overlapping tiles and applies histogram
    equalization per tile, then bilinearly interpolates boundaries.
    A clip limit prevents runaway noise amplification.

    Reference: Zuiderveld (1994). Contrast Limited Adaptive Histogram Equalization.
    """
    clahe = cv2.createCLAHE(
        clipLimit=clip_limit,
        tileGridSize=(tile_grid_size, tile_grid_size),
    )

    if not is_color:
        return clahe.apply(image)

    # Color image: work in YCrCb; enhance only the Y (luma) channel.
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)


def _apply_histeq(image: np.ndarray, is_color: bool) -> np.ndarray:
    """
    Global Histogram Equalization.

    Redistributes pixel intensities so that the output histogram is
    approximately uniform (flat). Simple but may amplify noise in smooth areas.
    """
    if not is_color:
        return cv2.equalizeHist(image)

    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)


# ─── Validation ───────────────────────────────────────────────────────────────

def _validate(image, method, clip_limit, tile_grid_size):
    if image is None:
        raise ValueError("Contrast enhancement received None image.")
    if image.dtype != np.uint8:
        raise ValueError(f"Expected uint8, got {image.dtype}.")
    if method not in ("CLAHE", "Histogram Equalization"):
        raise ValueError(
            f"Unknown method '{method}'. "
            "Choose 'CLAHE' or 'Histogram Equalization'."
        )
    if not (0.5 <= clip_limit <= 10.0):
        raise ValueError(
            f"clip_limit {clip_limit} out of range [0.5, 10.0]."
        )
    if not (2 <= tile_grid_size <= 32):
        raise ValueError(
            f"tile_grid_size {tile_grid_size} out of range [2, 32]."
        )
