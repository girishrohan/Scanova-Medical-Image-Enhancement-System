"""
components/analysis_panel.py — SCANOVA Unified Dashboard Analysis Panel

Provides real-time quantitative metrics display for original and enhanced images,
with synchronous updates from the enhancement pipeline.
"""

from __future__ import annotations

import streamlit as st
import numpy as np
from core.image_metrics import compute_metrics

# ─── Color Palette (imported from existing config) ───────────────────────
from config import COLORS

# ─── Constants ────────────────────────────────────────────────────────────

# Disclaimer text — must be unavoidable on every render
DISCLAIMER_TEXT = (
    "⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. "
    "Always consult qualified radiologists for medical interpretation."
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _compute_image_stats(img: np.ndarray) -> dict | None:
    """Compute basic image quality metrics from a numpy array.

    Returns dict with: mean, std, entropy, laplacian_var, intensity_range
    or None if image is empty/unavailable.
    """
    if img is None or img.size == 0:
        return None

    # Convert to grayscale if color
    if img.ndim == 3 and img.shape[2] == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img if img.ndim == 2 else img[:, :, 0]

    # Basic statistics
    mean_val = float(gray.mean())
    std_val = float(gray.std())
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Entropy computation
    hist, _ = np.histogram(gray.astype(int), bins=256, range=(0, 255))
    hist = hist[hist > 0].astype(float)
    if hist.sum() > 0:
        probs = hist / hist.sum()
        entropy = float(-np.sum(probs * np.log2(probs)))
    else:
        entropy = 0.0

    intensity_range = f"{int(gray.min())} - {int(gray.max())}"

    return {
        "mean": round(mean_val, 3),
        "std": round(std_val, 3),
        "entropy": round(entropy, 4),
        "laplacian_var": round(laplacian_var, 1),
        "intensity_range": intensity_range,
    }


# ─── Renderable Components ────────────────────────────────────────────────

def render_analysis_panel(
    original_image: np.ndarray | None,
    enhanced_image: np.ndarray | None,
    enhancement_params: dict,
    processing_metrics: dict | None = None,
    is_processing: bool = False,
    show_dislcimer: bool = True,
) -> None:
    """Render the Analysis Panel component in the unified dashboard workspace.

    Displays quantitative comparison metrics between original and enhanced images,
    enhancement parameters, processing status, and transformation history.

    Parameters
    ----------
    original_image : np.ndarray | None
        Original uploaded/loaded image array.
    enhanced_image : np.ndarray | None
        Enhanced image array from the pipeline.
    enhancement_params : dict
        Current enhancement parameter settings.
    processing_metrics : dict | None, optional
        Pre-computed metrics dict (mean, std, entropy, laplacian_var, intensity_range).
        If None, will be computed from the images.
    is_processing : bool, optional
        Whether the enhancement pipeline is currently running.
    show_dislcimer : bool, optional
        Whether to display the mandatory medical disclaimer at the bottom.
    """

    # ─── Initialize session state keys if needed ──────────────────────
    if "analysis_panel_initialized" not in st.session_state:
        st.session_state.analysis_panel_initialized = True
        st.session_state.metrics = {
            "original": None,
            "enhanced": None,
        }
        st.session_state.history = [
            {
                "id": "initial",
                "label": "Original",
                "timestamp": __import__("datetime").datetime.now().isoformat(),
            }
        ]

    # ─── Compute metrics if not provided ────────────────────────────
    if processing_metrics is None:
        orig_stats = _compute_image_stats(original_image) if original_image is not None else None
        enh_stats = _compute_image_stats(enhanced_image) if enhanced_image is not None else None

        processing_metrics = {
            "original": orig_stats,
            "enhanced": enh_stats,
        }

    # Store in session state for persistence across reruns
    st.session_state.metrics = processing_metrics

    # ─── UI Layout ──────────────────────────────────────────────────
    st.markdown("### 📊 Analysis Metrics")

    # Metrics comparison grid
    col1, col2 = st.columns(2, gap="medium")

    with col1:
        st.markdown("**Original Image**")
        if original_image is not None and processing_metrics["original"]:
            o = processing_metrics["original"]
            st.metric("Std. Dev.", f"{o['std']:.1f}")
            st.metric("Laplacian Variance", f"{o['laplacian_var']:.1f}")
            st.caption(f"Mean Intensity: {o['mean']:.1f}")
        else:
            st.info("No original image loaded", icon="ℹ️")

    with col2:
        st.markdown("**Enhanced Image**")
        if enhanced_image is not None and processing_metrics["enhanced"]:
            e = processing_metrics["enhanced"]
            st.metric("Entropy", f"{e['entropy']:.3f}")
            st.metric("Intensity Range", e["intensity_range"])
            st.caption(f"Sharpness: {e['laplacian_var']:.1f}")
        else:
            st.info("No enhanced image available", icon="ℹ️")

    # ─── Enhancement Parameters Card ────────────────────────────────
    with st.expander("🔧 Enhancement Parameters", expanded=False):
        # Noise method
        st.selectbox(
            "Noise Method",
            ["Median", "Gaussian"],
            index=["Median", "Gaussian"].index(enhancement_params.get("noiseMethod", "Median")),
            key="noise_method_selector",
            label_visibility="collapsed",
        )

        # CLAHE clip limit
        st.slider(
            "CLAHE Clip Limit",
            min_value=0.5,
            max_value=10.0,
            value=enhancement_params.get("claheClipLimit", 2.0),
            step=0.1,
            key="clahe_clip_limit",
            label_visibility="collapsed",
        )

        # Tile grid
        st.selectbox(
            "Tile Grid Size",
            ["2×2", "4×4", "8×8", "16×16"],
            index=["2×2", "4×4", "8×8", "16×16"].index(
                str(enhancement_params.get("claheTileGrid", 8))
            ),
            key="clahe_tile_grid",
            label_visibility="collapsed",
        )

        # Sharpening alpha
        st.slider(
            "Sharpening α",
            min_value=0.2,
            max_value=3.0,
            value=enhancement_params.get("sharpenStrength", 1.2),
            step=0.1,
            key="sharpen_strength",
            label_visibility="collapsed",
        )

        # Force grayscale
        st.checkbox(
            "Force Grayscale",
            value=enhancement_params.get("forceGrayscale", False),
            key="force_grayscale",
            label_visibility="collapsed",
        )

    # ─── Processing Status ──────────────────────────────────────────
    if is_processing:
        st.info("Enhancement pipeline in progress...", icon="🔄")

    # ─── Transformation History ─────────────────────────────────────
    history = st.session_state.get("history", [])
    if len(history) > 1:
        st.divider()
        st.markdown("### Transformation History")
        for step in history[1:]:  # Skip the initial "Original" entry
            st.caption(f"► {step.get('label', '—')} — {step.get('timestamp', '—')[:16]}")

    # ─── Mandatory Medical Disclaimer ───────────────────────────────
    if show_dislcimer:
        st.divider()
        st.caption(DISCLAIMER_TEXT)