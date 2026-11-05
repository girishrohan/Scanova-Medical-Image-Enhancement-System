"""
tests/test_enhancement.py
──────────────────────────
Tests for noise_reduction, contrast_enhancement, edge_enhancement.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from core.noise_reduction import apply_noise_reduction
from core.contrast_enhancement import apply_contrast_enhancement
from core.edge_enhancement import apply_edge_enhancement, sobel_edges, laplacian_edges


def _gray(size=64, val=None):
    if val is not None:
        return np.full((size, size), val, dtype=np.uint8)
    return np.random.randint(0, 255, (size, size), dtype=np.uint8)


def _color(size=64):
    return np.random.randint(0, 255, (size, size, 3), dtype=np.uint8)


# ── Noise Reduction ───────────────────────────────────────────────────────────

def test_median_gray_output_uint8():
    out = apply_noise_reduction(_gray(), method="Median", kernel_size=5)
    assert out.dtype == np.uint8
    assert out.shape == (64, 64)


def test_gaussian_gray_output_uint8():
    out = apply_noise_reduction(_gray(), method="Gaussian", kernel_size=5, sigma=1.5)
    assert out.dtype == np.uint8
    assert out.shape == (64, 64)


def test_median_color():
    img = _color()
    out = apply_noise_reduction(img, method="Median", kernel_size=3)
    assert out.shape == img.shape
    assert out.dtype == np.uint8


def test_median_preserves_constant():
    """Median of a constant image remains constant."""
    img = _gray(64, val=120)
    out = apply_noise_reduction(img, method="Median", kernel_size=5)
    assert np.all(out == 120)


def test_gaussian_preserves_constant():
    img = _gray(64, val=200)
    out = apply_noise_reduction(img, method="Gaussian", kernel_size=5, sigma=1.0)
    # Gaussian might have tiny floating-point rounding at borders; check center
    center = out[10:54, 10:54]
    assert np.all(center == 200)


def test_even_kernel_raises():
    with pytest.raises(ValueError, match="odd"):
        apply_noise_reduction(_gray(), method="Median", kernel_size=4)


def test_unknown_method_raises():
    with pytest.raises(ValueError, match="Unknown"):
        apply_noise_reduction(_gray(), method="Wiener")


def test_none_image_raises():
    with pytest.raises(ValueError):
        apply_noise_reduction(None, method="Median")


def test_input_unchanged_after_noise_reduction():
    """Original array must not be modified in-place."""
    img = _gray()
    original = img.copy()
    apply_noise_reduction(img, method="Median", kernel_size=5)
    assert np.array_equal(img, original)


# ── Contrast Enhancement ──────────────────────────────────────────────────────

def test_clahe_gray_output():
    out = apply_contrast_enhancement(_gray(), method="CLAHE")
    assert out.dtype == np.uint8
    assert out.shape == (64, 64)


def test_clahe_color_output():
    img = _color()
    out = apply_contrast_enhancement(img, method="CLAHE")
    assert out.dtype == np.uint8
    assert out.shape == img.shape


def test_histeq_gray():
    out = apply_contrast_enhancement(_gray(), method="Histogram Equalization")
    assert out.dtype == np.uint8
    assert out.shape == (64, 64)


def test_histeq_color():
    img = _color()
    out = apply_contrast_enhancement(img, method="Histogram Equalization")
    assert out.dtype == np.uint8
    assert out.shape == img.shape


def test_clahe_invalid_clip_raises():
    with pytest.raises(ValueError, match="clip_limit"):
        apply_contrast_enhancement(_gray(), clip_limit=0.1)


def test_clahe_invalid_tile_raises():
    with pytest.raises(ValueError, match="tile_grid"):
        apply_contrast_enhancement(_gray(), tile_grid_size=1)


def test_clahe_unknown_method_raises():
    with pytest.raises(ValueError, match="Unknown"):
        apply_contrast_enhancement(_gray(), method="AutoBrightness")


# ── Edge Enhancement ──────────────────────────────────────────────────────────

def test_unsharp_gray_output():
    out = apply_edge_enhancement(_gray(), strength=1.2, sigma=1.0)
    assert out.dtype == np.uint8
    assert out.shape == (64, 64)


def test_unsharp_color_output():
    img = _color()
    out = apply_edge_enhancement(img, strength=1.0, sigma=1.0)
    assert out.dtype == np.uint8
    assert out.shape == img.shape


def test_unsharp_zero_strength_noop():
    """strength=0 → output identical to input (no sharpening)."""
    img = _gray()
    out = apply_edge_enhancement(img, strength=0.0, sigma=1.0)
    assert np.array_equal(img, out)


def test_unsharp_strength_out_of_range():
    with pytest.raises(ValueError, match="strength"):
        apply_edge_enhancement(_gray(), strength=5.0)


def test_unsharp_clips_to_uint8():
    """Very bright + high sharpening must not overflow beyond 255."""
    img = np.full((64, 64), 240, dtype=np.uint8)
    out = apply_edge_enhancement(img, strength=3.0, sigma=0.5)
    assert int(out.max()) <= 255
    assert int(out.min()) >= 0


def test_sobel_edges_returns_uint8():
    out = sobel_edges(_gray())
    assert out.dtype == np.uint8
    assert out.ndim == 2


def test_laplacian_edges_returns_uint8():
    out = laplacian_edges(_gray())
    assert out.dtype == np.uint8
    assert out.ndim == 2


# ── Pipeline integration smoke test ───────────────────────────────────────────

def test_full_pipeline_smoke():
    """Run the complete pipeline on a synthetic image without errors."""
    from services.image_processing_service import run_pipeline, PipelineSettings
    img = np.random.randint(0, 255, (128, 128), dtype=np.uint8)
    settings = PipelineSettings(
        noise_method="Median", kernel_size=5,
        contrast_method="CLAHE", clahe_clip_limit=2.0, clahe_tile_grid=8,
        sharpen_strength=1.2, sharpen_sigma=1.0,
    )
    result = run_pipeline(img, settings)
    assert result.enhanced is not None
    assert result.enhanced.dtype == np.uint8
    assert result.enhanced.shape == img.shape
    assert result.total_time_ms > 0


def test_pipeline_preserves_original():
    """Original image must be untouched after running the pipeline."""
    img = np.random.randint(0, 255, (64, 64), dtype=np.uint8)
    original_copy = img.copy()
    from services.image_processing_service import run_pipeline
    run_pipeline(img)
    assert np.array_equal(img, original_copy)


def test_pipeline_color_input():
    """Color input runs through the pipeline without errors."""
    img = np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8)
    from services.image_processing_service import run_pipeline
    result = run_pipeline(img)
    assert result.enhanced is not None


def test_pipeline_none_raises():
    from services.image_processing_service import run_pipeline
    with pytest.raises(ValueError):
        run_pipeline(None)
