"""
services/image_processing_service.py
──────────────────────────────────────
Orchestrates the complete Scanova enhancement pipeline.

Pipeline stages (run internally; UI sees only the summary)
──────────────────────────────────────────────────────────
  1. Acquisition & Validation
  2. Grayscale Conversion (if appropriate)
  3. Noise Reduction     (Median | Gaussian)
  4. Contrast Enhancement (CLAHE | Histogram Equalization)
  5. Edge Enhancement    (Unsharp Masking)
  6. Final Output Assembly

Returns a PipelineResult dataclass.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from core.preprocessing import to_grayscale, is_grayscale, ensure_uint8
from core.noise_reduction import apply_noise_reduction
from core.contrast_enhancement import apply_contrast_enhancement
from core.edge_enhancement import apply_edge_enhancement
from core.image_metrics import compute_metrics, metrics_delta, ImageMetrics
from config import DEFAULT_SETTINGS


@dataclass
class PipelineSettings:
    """User-supplied processing parameters (with sensible defaults)."""
    noise_method:     str   = DEFAULT_SETTINGS["noise_method"]
    kernel_size:      int   = DEFAULT_SETTINGS["kernel_size"]
    gaussian_sigma:   float = DEFAULT_SETTINGS["gaussian_sigma"]
    contrast_method:  str   = DEFAULT_SETTINGS["contrast_method"]
    clahe_clip_limit: float = DEFAULT_SETTINGS["clahe_clip_limit"]
    clahe_tile_grid:  int   = DEFAULT_SETTINGS["clahe_tile_grid"]
    sharpen_strength: float = DEFAULT_SETTINGS["sharpen_strength"]
    sharpen_sigma:    float = DEFAULT_SETTINGS["sharpen_sigma"]
    force_grayscale:  bool  = DEFAULT_SETTINGS["force_grayscale"]
    show_edge_overlay:bool  = DEFAULT_SETTINGS["show_edge_overlay"]


@dataclass
class PipelineResult:
    """Output of one successful pipeline run."""
    original:          np.ndarray           # original (untouched)
    enhanced:          np.ndarray           # final output
    original_metrics:  ImageMetrics = field(default_factory=ImageMetrics)
    enhanced_metrics:  ImageMetrics = field(default_factory=ImageMetrics)
    delta:             dict = field(default_factory=dict)
    settings:          PipelineSettings = field(default_factory=PipelineSettings)
    stages_summary:    list = field(default_factory=list)
    total_time_ms:     float = 0.0
    stage_times_ms:    dict = field(default_factory=dict)
    warnings:          list = field(default_factory=list)
    edge_overlay:      Optional[np.ndarray] = None


def run_pipeline(
    original_image: np.ndarray,
    settings: Optional[PipelineSettings] = None,
) -> PipelineResult:
    """
    Execute the full enhancement pipeline on an image.

    Parameters
    ----------
    original_image : np.ndarray (uint8)
        The image as loaded by image_loader.load_image().
    settings : PipelineSettings | None
        If None, sensible defaults are used.

    Returns
    -------
    PipelineResult

    Raises
    ------
    ValueError  – on invalid input or parameter errors (caller handles display).
    """
    if settings is None:
        settings = PipelineSettings()

    if original_image is None:
        raise ValueError("Pipeline received None image.")

    t_total = time.perf_counter()
    stage_times: dict[str, float] = {}
    stages_summary = []
    warnings: list[str] = []

    # Keep the pristine original
    original = original_image.copy()

    # ── Stage 1: Acquisition (already done by loader; validate here) ──────────
    t0 = time.perf_counter()
    img = ensure_uint8(original_image.copy())
    _assert_shape(img)
    stage_times["acquisition"] = _ms(t0)
    stages_summary.append(("✅ Acquisition", "Image validated and loaded"))

    # ── Stage 2: Grayscale Conversion ─────────────────────────────────────────
    t0 = time.perf_counter()
    already_gray = is_grayscale(img)
    if settings.force_grayscale and not already_gray:
        img = to_grayscale(img)
        stages_summary.append(("✅ Grayscale Conversion", "Converted color → grayscale"))
        warnings.append(
            "Color image converted to grayscale. Colour information is not preserved."
        )
    elif already_gray:
        stages_summary.append(("✅ Grayscale", "Image is already grayscale — preserved"))
    else:
        # Keep as color; contrast enhancement will use luma channel.
        stages_summary.append(("✅ Color Preserved", "Processing in color mode"))
    stage_times["grayscale"] = _ms(t0)

    # ── Stage 3: Noise Reduction ───────────────────────────────────────────────
    t0 = time.perf_counter()
    img = apply_noise_reduction(
        img,
        method=settings.noise_method,
        kernel_size=settings.kernel_size,
        sigma=settings.gaussian_sigma,
    )
    stage_times["noise_reduction"] = _ms(t0)
    stages_summary.append((
        f"✅ Noise Removal ({settings.noise_method})",
        f"Kernel {settings.kernel_size}×{settings.kernel_size}"
        + (f", σ={settings.gaussian_sigma}" if settings.noise_method == "Gaussian" else ""),
    ))

    # ── Stage 4: Contrast Enhancement ─────────────────────────────────────────
    t0 = time.perf_counter()
    img = apply_contrast_enhancement(
        img,
        method=settings.contrast_method,
        clip_limit=settings.clahe_clip_limit,
        tile_grid_size=settings.clahe_tile_grid,
    )
    stage_times["contrast"] = _ms(t0)
    stages_summary.append((
        f"✅ Contrast ({settings.contrast_method})",
        (
            f"Clip={settings.clahe_clip_limit}, Tiles={settings.clahe_tile_grid}×{settings.clahe_tile_grid}"
            if settings.contrast_method == "CLAHE"
            else "Global histogram equalization"
        ),
    ))

    # ── Stage 5: Edge Enhancement ─────────────────────────────────────────────
    t0 = time.perf_counter()
    img = apply_edge_enhancement(
        img,
        strength=settings.sharpen_strength,
        sigma=settings.sharpen_sigma,
    )
    stage_times["edge_enhancement"] = _ms(t0)
    stages_summary.append((
        "✅ Edge Enhancement (Unsharp Masking)",
        f"α={settings.sharpen_strength}, σ={settings.sharpen_sigma}",
    ))

    # ── Stage 6: Final output ──────────────────────────────────────────────────
    t0 = time.perf_counter()
    enhanced = ensure_uint8(img)

    # Optional Sobel edge overlay for educational display
    edge_overlay = None
    if settings.show_edge_overlay:
        from core.edge_enhancement import sobel_edges
        edge_overlay = sobel_edges(enhanced)

    stage_times["output"] = _ms(t0)
    stages_summary.append(("✅ Output", "Enhanced image ready"))

    # ── Metrics ───────────────────────────────────────────────────────────────
    orig_metrics = compute_metrics(original)
    enh_metrics  = compute_metrics(enhanced)
    delta        = metrics_delta(orig_metrics, enh_metrics)

    total_ms = _ms(t_total)

    return PipelineResult(
        original=original,
        enhanced=enhanced,
        original_metrics=orig_metrics,
        enhanced_metrics=enh_metrics,
        delta=delta,
        settings=settings,
        stages_summary=stages_summary,
        total_time_ms=total_ms,
        stage_times_ms=stage_times,
        warnings=warnings,
        edge_overlay=edge_overlay,
    )


# ─── Private helpers ──────────────────────────────────────────────────────────

def _ms(t0: float) -> float:
    return (time.perf_counter() - t0) * 1000


def _assert_shape(img: np.ndarray) -> None:
    if img.ndim not in (2, 3):
        raise ValueError(
            f"Unexpected image dimensions: {img.ndim}D array. "
            "Expected 2D (grayscale) or 3D (color)."
        )
    if img.ndim == 3 and img.shape[2] not in (1, 3, 4):
        raise ValueError(
            f"Unexpected number of channels: {img.shape[2]}. "
            "Expected 1, 3, or 4."
        )
