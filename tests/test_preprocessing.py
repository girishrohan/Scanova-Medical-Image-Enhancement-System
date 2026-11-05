"""
tests/test_preprocessing.py
────────────────────────────
Tests for core/preprocessing.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from core.preprocessing import (
    to_grayscale, is_grayscale, ensure_uint8, normalize_intensity, channels
)


# ── to_grayscale ──────────────────────────────────────────────────────────────

def test_grayscale_from_color():
    """BGR color image converts to 2D grayscale."""
    bgr = np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8)
    gray = to_grayscale(bgr)
    assert gray.ndim == 2
    assert gray.dtype == np.uint8
    assert gray.shape == (64, 64)


def test_grayscale_from_gray_noop():
    """Already-grayscale image is returned as a copy, unchanged."""
    gray_in = np.full((50, 50), 100, dtype=np.uint8)
    gray_out = to_grayscale(gray_in)
    assert np.array_equal(gray_in, gray_out)


def test_grayscale_preserves_original():
    """Input array is not modified by to_grayscale."""
    bgr = np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8)
    original = bgr.copy()
    to_grayscale(bgr)
    assert np.array_equal(bgr, original)


def test_grayscale_none_raises():
    with pytest.raises((ValueError, AttributeError)):
        to_grayscale(None)


def test_grayscale_single_channel():
    """HxWx1 array is handled without error."""
    img = np.full((32, 32, 1), 80, dtype=np.uint8)
    out = to_grayscale(img)
    assert out.ndim == 2


# ── is_grayscale ──────────────────────────────────────────────────────────────

def test_is_grayscale_2d():
    assert is_grayscale(np.zeros((64, 64), dtype=np.uint8))


def test_is_grayscale_3ch_equal():
    """All-equal channels counted as grayscale."""
    b = np.full((32, 32), 100, dtype=np.uint8)
    img = np.stack([b, b, b], axis=-1)
    assert is_grayscale(img)


def test_not_grayscale_3ch_different():
    img = np.zeros((32, 32, 3), dtype=np.uint8)
    img[:, :, 0] = 100
    img[:, :, 1] = 150
    assert not is_grayscale(img)


# ── ensure_uint8 ──────────────────────────────────────────────────────────────

def test_ensure_uint8_clips_negative():
    arr = np.array([-10, 100, 300], dtype=np.float32)
    out = ensure_uint8(arr)
    assert out[0] == 0
    assert out[1] == 100
    assert out[2] == 255
    assert out.dtype == np.uint8


def test_ensure_uint8_passthrough():
    arr = np.full((32, 32), 128, dtype=np.uint8)
    out = ensure_uint8(arr)
    assert out.dtype == np.uint8
    assert np.array_equal(arr, out)


# ── normalize_intensity ────────────────────────────────────────────────────────

def test_normalize_stretches_range():
    arr = np.array([[50, 100], [150, 200]], dtype=np.uint8)
    out = normalize_intensity(arr)
    assert int(out.min()) == 0
    assert int(out.max()) == 255


def test_normalize_constant_image():
    """Constant image should not crash and returns uint8."""
    arr = np.full((32, 32), 128, dtype=np.uint8)
    out = normalize_intensity(arr)
    assert out.dtype == np.uint8


# ── channels ─────────────────────────────────────────────────────────────────

def test_channels_gray():
    assert channels(np.zeros((32, 32), dtype=np.uint8)) == 1


def test_channels_color():
    assert channels(np.zeros((32, 32, 3), dtype=np.uint8)) == 3
