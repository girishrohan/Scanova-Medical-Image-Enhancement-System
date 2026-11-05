"""
tests/test_metrics.py
──────────────────────
Tests for core/image_metrics.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import math
import numpy as np
import pytest
from core.image_metrics import compute_metrics, metrics_delta


def _gray(size=64, val=None, random=False):
    if random:
        return np.random.randint(0, 255, (size, size), dtype=np.uint8)
    return np.full((size, size), val if val is not None else 128, dtype=np.uint8)


# ── Basic computation ─────────────────────────────────────────────────────────

def test_metrics_returns_object():
    m = compute_metrics(_gray(random=True))
    assert m is not None


def test_mean_correct():
    img = np.array([[100, 200], [100, 200]], dtype=np.uint8)
    m = compute_metrics(img)
    assert abs(m.mean - 150.0) < 0.01


def test_std_zero_for_constant():
    m = compute_metrics(_gray(64, 128))
    assert abs(m.std) < 0.01


def test_std_positive_for_varied():
    m = compute_metrics(_gray(random=True))
    assert m.std > 0


def test_min_max_correct():
    img = np.zeros((32, 32), dtype=np.uint8)
    img[0, 0] = 255
    m = compute_metrics(img)
    assert m.min_val == 0
    assert m.max_val == 255
    assert m.intensity_range == 255


def test_entropy_zero_for_constant():
    """Constant image has entropy 0."""
    m = compute_metrics(_gray(64, 50))
    assert m.entropy == 0.0


def test_entropy_positive_for_varied():
    m = compute_metrics(_gray(random=True))
    assert m.entropy > 0


def test_entropy_max_bounded():
    """Entropy for uint8 cannot exceed 8 bits."""
    m = compute_metrics(_gray(random=True))
    assert m.entropy <= 8.0


def test_laplacian_var_zero_for_constant():
    """Laplacian variance of a constant image should be 0."""
    m = compute_metrics(_gray(64, 100))
    assert m.laplacian_var < 1e-6


def test_laplacian_var_positive_for_edges():
    """Image with strong edges should have high Laplacian variance."""
    img = np.zeros((64, 64), dtype=np.uint8)
    img[:, 32:] = 255            # hard edge at center
    m = compute_metrics(img)
    assert m.laplacian_var > 0


def test_michelson_zero_for_constant():
    m = compute_metrics(_gray(64, 128))
    assert abs(m.michelson) < 1e-6


def test_michelson_one_for_max_contrast():
    img = np.zeros((32, 32), dtype=np.uint8)
    img[0, 0] = 255
    m = compute_metrics(img)
    assert abs(m.michelson - 1.0) < 0.01


def test_num_pixels_correct():
    m = compute_metrics(_gray(64))
    assert m.num_pixels == 64 * 64


def test_channels_gray():
    m = compute_metrics(_gray(64))
    assert m.channels == 1


def test_channels_color():
    img = np.zeros((32, 32, 3), dtype=np.uint8)
    m = compute_metrics(img)
    assert m.channels == 3


def test_shape_stored():
    img = np.zeros((40, 60), dtype=np.uint8)
    m = compute_metrics(img)
    assert m.shape == (40, 60)


def test_none_image_safe():
    """compute_metrics must not crash on None."""
    m = compute_metrics(None)
    assert m is not None


# ── metrics_delta ─────────────────────────────────────────────────────────────

def test_metrics_delta_keys():
    m1 = compute_metrics(_gray(64, 100))
    m2 = compute_metrics(_gray(64, 200))
    d = metrics_delta(m1, m2)
    assert "mean_delta" in d
    assert "std_delta_pct" in d
    assert "entropy_delta_pct" in d
    assert "lap_var_delta_pct" in d
    assert "range_delta" in d


def test_metrics_delta_zero_for_same():
    img = _gray(random=True)
    m = compute_metrics(img)
    d = metrics_delta(m, m)
    assert d["mean_delta"] == 0.0
