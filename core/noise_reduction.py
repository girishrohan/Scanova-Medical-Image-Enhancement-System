"""
core/noise_reduction.py
───────────────────────
Spatial filtering for noise suppression in medical images.

Provided filters
────────────────
  • Median  – best for salt-and-pepper / impulse noise (common in radiography).
  • Gaussian – best for Gaussian / electronic noise (common in MRI).

All functions:
  • Accept a NumPy uint8 array (gray or BGR).
  • Return a new NumPy uint8 array of the same shape.
  • Never modify the input array.
"""

from __future__ import annotations

import cv2
import numpy as np


# ─── Public API ───────────────────────────────────────────────────────────────

def apply_noise_reduction(
    image: np.ndarray,
    method: str = "Median",
    kernel_size: int = 5,
    sigma: float = 1.0,
) -> np.ndarray:
    """
    Dispatch to the requested noise-reduction filter.

    Parameters
    ----------
    image       : np.ndarray (uint8)
    method      : "Median" | "Gaussian"
    kernel_size : Odd integer 3–21.
    sigma       : Gaussian standard deviation (only used when method="Gaussian").

    Returns
    -------
    np.ndarray (uint8) – filtered image.
    """
    _validate(image, method, kernel_size, sigma)

    if method == "Median":
        return _median_filter(image, kernel_size)
    if method == "Gaussian":
        return _gaussian_filter(image, kernel_size, sigma)

    raise ValueError(f"Unknown noise-reduction method '{method}'.")


# ─── Filter implementations ───────────────────────────────────────────────────

def _median_filter(image: np.ndarray, ksize: int) -> np.ndarray:
    """
    Median filter.

    Replaces each pixel with the median intensity of its k×k neighbourhood.
    Highly effective at removing salt-and-pepper noise while preserving edges.

    Complexity: O(k² · H · W · log k)  for a naïve implementation;
    OpenCV uses an optimised O(k · H · W) algorithm.
    """
    return cv2.medianBlur(image, ksize)


def _gaussian_filter(image: np.ndarray, ksize: int, sigma: float) -> np.ndarray:
    """
    Gaussian blur.

    Convolves the image with a Gaussian kernel G(x,y) = exp(-(x²+y²)/(2σ²)).
    Attenuates high-frequency noise while slightly blurring edges.

    ksize must be odd; sigma controls the spread of the kernel.
    """
    return cv2.GaussianBlur(image, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)


# ─── Validation ───────────────────────────────────────────────────────────────

def _validate(image: np.ndarray, method: str, ksize: int, sigma: float) -> None:
    if image is None:
        raise ValueError("Noise reduction received None image.")
    if image.dtype != np.uint8:
        raise ValueError(
            f"Expected uint8 image, got {image.dtype}. "
            "Call ensure_uint8() before noise reduction."
        )
    if method not in ("Median", "Gaussian"):
        raise ValueError(f"Unknown method '{method}'. Choose 'Median' or 'Gaussian'.")
    if ksize % 2 == 0 or ksize < 1:
        raise ValueError(
            f"kernel_size must be a positive odd integer, got {ksize}."
        )
    if not (1 <= ksize <= 51):
        raise ValueError(f"kernel_size {ksize} is outside the safe range [1, 51].")
    if sigma <= 0:
        raise ValueError(f"Gaussian sigma must be positive, got {sigma}.")
