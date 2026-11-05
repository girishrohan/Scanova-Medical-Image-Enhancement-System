"""
core/image_metrics.py
─────────────────────
Image quality indicators for before/after comparison.

Metrics computed
────────────────
  • Mean intensity
  • Standard deviation of intensity  (measure of global contrast)
  • Intensity range  [min, max]
  • Shannon entropy  (measure of information density)
  • Variance of Laplacian  (perceptual sharpness proxy)
  • Michelson contrast  ((Imax − Imin) / (Imax + Imin))

⚠  LIMITATIONS documented below each metric.
   These indicators describe pixel statistics. They do NOT measure
   diagnostic quality or clinical utility of the image.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class ImageMetrics:
    """Container for all computed image quality indicators."""
    mean:          float = 0.0
    std:           float = 0.0
    min_val:       int   = 0
    max_val:       int   = 255
    intensity_range: int = 255
    entropy:       float = 0.0
    laplacian_var: float = 0.0
    michelson:     float = 0.0
    num_pixels:    int   = 0
    channels:      int   = 1
    dtype:         str   = "uint8"
    shape:         tuple = ()


def compute_metrics(image: np.ndarray) -> ImageMetrics:
    """
    Compute all image quality indicators from a uint8 NumPy array.

    Parameters
    ----------
    image : np.ndarray (uint8, HxW or HxWx3)

    Returns
    -------
    ImageMetrics  – always returns a valid object even for edge-case images.
    """
    if image is None:
        return ImageMetrics()

    # Ensure uint8
    img = image.astype(np.uint8)

    # Work on a grayscale version for scalar metrics
    if img.ndim == 3 and img.shape[2] == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img if img.ndim == 2 else img[:, :, 0]

    flat = gray.flatten().astype(np.float64)

    mn    = float(gray.min())
    mx    = float(gray.max())
    mean  = float(np.mean(flat))
    std   = float(np.std(flat))
    rng   = int(mx - mn)

    # Shannon Entropy: H = −Σ p_i · log2(p_i)
    entropy = _shannon_entropy(gray)

    # Variance of Laplacian (sharpness proxy)
    # High value → sharp edges; Low value → blurry.
    # ⚠ Sensitive to noise; a very noisy image may score high.
    lap_var = _laplacian_variance(gray)

    # Michelson contrast: (Imax − Imin) / (Imax + Imin)
    # Ranges 0 (flat) → 1 (maximum contrast).
    # ⚠ Sensitive to single saturated pixels; not robust to outliers.
    michelson = (mx - mn) / (mx + mn) if (mx + mn) > 0 else 0.0

    return ImageMetrics(
        mean=mean,
        std=std,
        min_val=int(mn),
        max_val=int(mx),
        intensity_range=rng,
        entropy=entropy,
        laplacian_var=lap_var,
        michelson=michelson,
        num_pixels=int(gray.size),
        channels=1 if img.ndim == 2 else img.shape[2],
        dtype=str(image.dtype),
        shape=tuple(image.shape),
    )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _shannon_entropy(gray: np.ndarray) -> float:
    """
    Shannon entropy of pixel intensities.
    H = −Σ_{i=0}^{255} p_i · log2(p_i)   (p_i = 0 terms omitted)

    Range: 0 (single intensity) → 8 (perfectly uniform distribution for uint8).
    ⚠ Higher entropy ≠ better medical image. JPEG artifacts can raise entropy.
    """
    hist, _ = np.histogram(gray, bins=256, range=(0, 255))
    hist = hist[hist > 0].astype(np.float64)
    total = float(gray.size)
    probs = hist / total
    return float(-np.sum(probs * np.log2(probs)))


def _laplacian_variance(gray: np.ndarray) -> float:
    """
    Variance of the Laplacian – commonly used focus / sharpness measure.

    ⚠ Does NOT guarantee perceptual sharpness. Noisy images score high.
    ⚠ Cannot be used to compare images from different scenes or modalities.
    """
    try:
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        return float(lap.var())
    except Exception:
        return 0.0


def metrics_delta(before: ImageMetrics, after: ImageMetrics) -> dict:
    """Return a dict of percentage changes between two metric sets."""
    def pct(a, b):
        if a == 0:
            return 0.0
        return (b - a) / abs(a) * 100.0

    return {
        "mean_delta":       round(after.mean - before.mean, 2),
        "std_delta_pct":    round(pct(before.std,         after.std),         1),
        "entropy_delta_pct":round(pct(before.entropy,     after.entropy),     1),
        "lap_var_delta_pct":round(pct(before.laplacian_var, after.laplacian_var), 1),
        "range_delta":      after.intensity_range - before.intensity_range,
    }
