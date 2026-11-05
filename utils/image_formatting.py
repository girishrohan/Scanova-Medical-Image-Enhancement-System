"""
utils/image_formatting.py
──────────────────────────
Display-oriented helpers for Scanova.
"""

from __future__ import annotations
import numpy as np


def human_file_size(n_bytes: int) -> str:
    """Format a byte count as a human-readable string."""
    if n_bytes < 1024:
        return f"{n_bytes} B"
    if n_bytes < 1024 ** 2:
        return f"{n_bytes / 1024:.1f} KB"
    return f"{n_bytes / 1024 / 1024:.2f} MB"


def format_shape(image: np.ndarray) -> str:
    if image is None:
        return "—"
    if image.ndim == 2:
        h, w = image.shape
        return f"{w} × {h} px (Grayscale)"
    h, w, c = image.shape
    label = "Color (BGR)" if c == 3 else f"{c}-channel"
    return f"{w} × {h} px ({label})"


def format_dtype(image: np.ndarray) -> str:
    return str(image.dtype) if image is not None else "—"


def channels_str(image: np.ndarray) -> str:
    if image is None:
        return "—"
    return "1 (Grayscale)" if image.ndim == 2 else f"{image.shape[2]} (Color)"
