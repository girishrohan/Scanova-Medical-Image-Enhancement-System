"""
tests/test_image_loading.py
────────────────────────────
Tests for core/image_loader.py
"""

import io
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from PIL import Image

from core.image_loader import load_image, LoadResult


# ── Helpers ───────────────────────────────────────────────────────────────────

def _png_bytes(width=64, height=64, mode="L", val=128) -> bytes:
    """Create a synthetic PNG image as bytes."""
    arr = np.full((height, width), val, dtype=np.uint8)
    if mode == "RGB":
        arr = np.stack([arr, arr, arr], axis=-1)
    img = Image.fromarray(arr.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _jpg_bytes(width=64, height=64) -> bytes:
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ── Tests: valid formats ──────────────────────────────────────────────────────

def test_load_grayscale_png():
    """Grayscale PNG loads as 2D uint8 array."""
    raw = _png_bytes(64, 64, mode="L")
    result = load_image(raw, "test.png")
    assert isinstance(result, LoadResult)
    assert result.image.dtype == np.uint8
    assert result.image.ndim == 2
    assert result.width == 64
    assert result.height == 64
    assert result.channels == 1


def test_load_color_png():
    """RGB PNG loads as HxWx3 uint8 BGR array."""
    raw = _png_bytes(80, 60, mode="RGB")
    result = load_image(raw, "color.png")
    assert result.image.ndim == 3
    assert result.image.shape[2] == 3
    assert result.image.dtype == np.uint8
    assert result.channels == 3


def test_load_jpeg():
    """JPEG image loads without errors."""
    raw = _jpg_bytes(100, 80)
    result = load_image(raw, "scan.jpg")
    assert result.image.dtype == np.uint8
    assert result.image.ndim == 3


def test_load_jpeg_uppercase_extension():
    """Extension check is case-insensitive."""
    raw = _jpg_bytes()
    result = load_image(raw, "Scan.JPG")
    assert result.image is not None


def test_load_png_bmp():
    """BMP loads correctly."""
    arr = np.full((50, 50), 200, dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="BMP")
    result = load_image(buf.getvalue(), "test.bmp")
    assert result.image.dtype == np.uint8


def test_filename_stored():
    """LoadResult.filename matches the provided name."""
    raw = _png_bytes()
    result = load_image(raw, "mri_scan.png")
    assert result.filename == "mri_scan.png"


def test_file_size_stored():
    """LoadResult.file_size_bytes is positive."""
    raw = _png_bytes()
    result = load_image(raw, "x.png")
    assert result.file_size_bytes == len(raw)


def test_load_time_measured():
    """Load time is recorded and positive."""
    raw = _png_bytes()
    result = load_image(raw, "t.png")
    assert result.load_time_ms >= 0


# ── Tests: invalid / corrupt inputs ──────────────────────────────────────────

def test_empty_file_rejected():
    """Empty file raises ValueError."""
    with pytest.raises(ValueError, match="empty"):
        load_image(b"", "empty.png")


def test_unsupported_extension_rejected():
    """Unsupported extension raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported"):
        load_image(b"\x89PNG\r\n", "scan.tif")


def test_corrupt_bytes_rejected():
    """Random bytes with .png extension raise ValueError."""
    with pytest.raises(ValueError):
        load_image(b"\x00\x01\x02\x03\xFFgarbage", "bad.png")


def test_file_too_large_rejected():
    """Files exceeding the size limit raise ValueError."""
    # Simulate 31 MB of data
    big = b"\x00" * (31 * 1024 * 1024)
    with pytest.raises(ValueError, match="exceeds"):
        load_image(big, "huge.png")


# ── Tests: dimension validation ───────────────────────────────────────────────

def test_tiny_image_rejected():
    """Images below MIN_IMAGE_DIMENSION are rejected."""
    arr = np.zeros((4, 4), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    with pytest.raises(ValueError, match="too small"):
        load_image(buf.getvalue(), "tiny.png")
