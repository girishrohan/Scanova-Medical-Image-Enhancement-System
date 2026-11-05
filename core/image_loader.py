"""
core/image_loader.py
────────────────────
Multi-format image loader for Scanova.

Supported formats:
  • PNG, JPG, JPEG, BMP  – via Pillow + OpenCV
  • DICOM (.dcm)         – via pydicom (with windowing, slope/intercept,
                           MONOCHROME1/2 inversion, 16-bit handling)

Returns:
  LoadResult  – a dataclass carrying the NumPy image array (uint8),
                metadata, and a flag indicating DICOM origin.
"""

from __future__ import annotations

import io
import logging
import time
from dataclasses import dataclass, field
from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    MAX_IMAGE_DIMENSION,
    MIN_IMAGE_DIMENSION,
)

logger = logging.getLogger(__name__)

# ─── Result dataclass ─────────────────────────────────────────────────────────

@dataclass
class LoadResult:
    """Immutable snapshot of a successfully loaded image."""
    image: np.ndarray           # uint8, HxW (gray) or HxWx3 (BGR)
    filename: str = ""
    file_size_bytes: int = 0
    is_dicom: bool = False
    original_dtype: str = "uint8"
    original_bit_depth: int = 8
    load_time_ms: float = 0.0
    metadata: dict = field(default_factory=dict)

    @property
    def height(self) -> int:
        return self.image.shape[0]

    @property
    def width(self) -> int:
        return self.image.shape[1]

    @property
    def channels(self) -> int:
        return 1 if self.image.ndim == 2 else self.image.shape[2]

    @property
    def shape_str(self) -> str:
        if self.channels == 1:
            return f"{self.height} × {self.width} (Grayscale)"
        return f"{self.height} × {self.width} × {self.channels} (Color)"


# ─── Public API ───────────────────────────────────────────────────────────────

def load_image(file_bytes: bytes, filename: str) -> LoadResult:
    """
    Load an image from raw bytes, auto-detecting format.

    Parameters
    ----------
    file_bytes : bytes
        Raw content of the uploaded file.
    filename : str
        Original filename (used to detect DICOM by extension and fallback).

    Returns
    -------
    LoadResult

    Raises
    ------
    ValueError
        On unsupported format, corrupt data, or out-of-range dimensions.
    """
    t0 = time.perf_counter()
    file_size = len(file_bytes)

    _validate_file_size(file_size)
    ext = _get_extension(filename)
    _validate_extension(ext)

    if ext == "dcm":
        result = _load_dicom(file_bytes, filename, file_size)
    else:
        result = _load_raster(file_bytes, filename, file_size)

    elapsed_ms = (time.perf_counter() - t0) * 1000
    result.load_time_ms = elapsed_ms

    _validate_dimensions(result.image)
    return result


# ─── Private helpers ──────────────────────────────────────────────────────────

def _validate_file_size(size: int) -> None:
    mb = size / (1024 * 1024)
    if size == 0:
        raise ValueError("Uploaded file is empty.")
    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File size {mb:.1f} MB exceeds the {MAX_FILE_SIZE_BYTES // (1024*1024)} MB limit."
        )


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _validate_extension(ext: str) -> None:
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported format '.{ext}'. "
            f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}."
        )


def _validate_dimensions(image: np.ndarray) -> None:
    h, w = image.shape[:2]
    if h < MIN_IMAGE_DIMENSION or w < MIN_IMAGE_DIMENSION:
        raise ValueError(
            f"Image too small ({w}×{h}). "
            f"Minimum size is {MIN_IMAGE_DIMENSION}×{MIN_IMAGE_DIMENSION}."
        )
    if h > MAX_IMAGE_DIMENSION or w > MAX_IMAGE_DIMENSION:
        raise ValueError(
            f"Image too large ({w}×{h}). "
            f"Maximum dimension is {MAX_IMAGE_DIMENSION} pixels."
        )


def _load_raster(file_bytes: bytes, filename: str, file_size: int) -> LoadResult:
    """Load PNG / JPG / BMP using Pillow then convert to NumPy / OpenCV format."""
    try:
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img.verify()          # detect corruption early
        pil_img = Image.open(io.BytesIO(file_bytes))  # re-open after verify()
    except Exception as exc:
        raise ValueError(f"Cannot decode image '{filename}': {exc}") from exc

    orig_mode = pil_img.mode
    orig_dtype = "uint8"

    if pil_img.mode == "I":         # 32-bit int grayscale (e.g. some TIFFs)
        arr = np.array(pil_img, dtype=np.float32)
        arr = _normalize_to_uint8(arr)
        orig_dtype = "int32"
    elif pil_img.mode == "I;16":    # 16-bit grayscale
        arr = np.array(pil_img, dtype=np.uint16)
        arr = _normalize_to_uint8(arr.astype(np.float32))
        orig_dtype = "uint16"
    elif pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")
        arr = np.array(pil_img)
        arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    elif pil_img.mode == "L":       # 8-bit grayscale
        arr = np.array(pil_img)
    elif pil_img.mode in ("RGB", "P"):
        pil_img = pil_img.convert("RGB")
        arr = np.array(pil_img)
        arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    elif pil_img.mode == "CMYK":
        pil_img = pil_img.convert("RGB")
        arr = np.array(pil_img)
        arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    else:
        # Generic fallback: convert to RGB then BGR
        pil_img = pil_img.convert("RGB")
        arr = np.array(pil_img)
        arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    return LoadResult(
        image=arr,
        filename=filename,
        file_size_bytes=file_size,
        is_dicom=False,
        original_dtype=orig_dtype,
        original_bit_depth=8 if orig_dtype == "uint8" else 16,
        metadata={"pil_mode": orig_mode},
    )


def _load_dicom(file_bytes: bytes, filename: str, file_size: int) -> LoadResult:
    """Load a DICOM file using pydicom with proper Hounsfield handling."""
    try:
        import pydicom
        from pydicom.errors import InvalidDicomError
    except ImportError:
        raise ValueError(
            "pydicom is not installed. Install it with: pip install pydicom"
        )

    try:
        ds = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
    except Exception as exc:
        raise ValueError(f"Cannot read DICOM file '{filename}': {exc}") from exc

    try:
        pixel_data = ds.pixel_array
    except Exception as exc:
        raise ValueError(
            f"Cannot extract pixel data from '{filename}'. "
            f"DICOM may be compressed or missing pixel data: {exc}"
        ) from exc

    # Record original dtype
    orig_dtype = str(pixel_data.dtype)
    orig_bit_depth = int(getattr(ds, "BitsStored", pixel_data.dtype.itemsize * 8))

    # Apply rescale slope / intercept (Hounsfield Units for CT)
    pixel_float = pixel_data.astype(np.float64)
    slope = float(getattr(ds, "RescaleSlope", 1.0))
    intercept = float(getattr(ds, "RescaleIntercept", 0.0))
    pixel_float = pixel_float * slope + intercept

    # Windowing: use dataset Window Center / Width when available
    wc = _get_dicom_attribute(ds, "WindowCenter")
    ww = _get_dicom_attribute(ds, "WindowWidth")
    if wc is not None and ww is not None:
        wc = float(wc) if not isinstance(wc, (list, pydicom.multival.MultiValue)) else float(wc[0])
        ww = float(ww) if not isinstance(ww, (list, pydicom.multival.MultiValue)) else float(ww[0])
        lo = wc - ww / 2
        hi = wc + ww / 2
        pixel_float = np.clip(pixel_float, lo, hi)
        pixel_float = (pixel_float - lo) / (hi - lo) * 255.0
    else:
        # Auto scale to 0-255
        pmin, pmax = pixel_float.min(), pixel_float.max()
        if pmax > pmin:
            pixel_float = (pixel_float - pmin) / (pmax - pmin) * 255.0
        else:
            pixel_float = np.zeros_like(pixel_float)

    arr = np.clip(pixel_float, 0, 255).astype(np.uint8)

    # MONOCHROME1: high values = dark (inverted); MONOCHROME2: high values = bright
    photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2").strip()
    if photometric == "MONOCHROME1":
        arr = 255 - arr

    # Handle multi-frame (take first frame for single display)
    if arr.ndim == 3 and arr.shape[0] > 1:
        arr = arr[0]    # first frame

    # Collect useful (non-PHI) metadata
    meta = {
        "Modality":      getattr(ds, "Modality", "Unknown"),
        "PhotometricInterpretation": photometric,
        "BitsStored":    orig_bit_depth,
        "Rows":          getattr(ds, "Rows", arr.shape[0]),
        "Columns":       getattr(ds, "Columns", arr.shape[1] if arr.ndim > 1 else 1),
    }

    return LoadResult(
        image=arr,
        filename=filename,
        file_size_bytes=file_size,
        is_dicom=True,
        original_dtype=orig_dtype,
        original_bit_depth=orig_bit_depth,
        metadata=meta,
    )


def _normalize_to_uint8(arr: np.ndarray) -> np.ndarray:
    pmin, pmax = arr.min(), arr.max()
    if pmax > pmin:
        arr = (arr - pmin) / (pmax - pmin) * 255.0
    else:
        arr = np.zeros_like(arr)
    return arr.astype(np.uint8)


def _get_dicom_attribute(ds, attr: str):
    try:
        return getattr(ds, attr)
    except AttributeError:
        return None
