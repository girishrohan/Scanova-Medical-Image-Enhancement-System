"""
components/comparison_slider.py — SCANOVA Unified Dashboard Comparison Slider

Provides synchronized side-by-side original/enhanced image viewing with real-time
metrics strip. Updates automatically when enhancement parameters change.
"""

from __future__ import annotations

import streamlit as st
from typing import Optional

# ─── Color Palette (imported from existing config) ───────────────────────
from config import COLORS

# ─── Renderable Component ────────────────────────────────────────────────

def render_comparison_slider(
    original_image: Optional[object],
    enhanced_image: Optional[object],
    enhancement_params: dict,
    processing_metrics: dict | None = None,
    transformation_history: list | None = None,
) -> None:
    """Render the Comparison Slider component in the unified dashboard workspace.

    Displays original and enhanced medical images side-by-side with a quantitative
    metrics strip below showing key image quality indicators that update synchronously
    as enhancement parameters change.

    Parameters
    ----------
    original_image : object
        Original image display object (Streamlit image element or None).
    enhanced_image : object
        Enhanced image display object (Streamlit image element or None).
    enhancement_params : dict
        Current enhancement parameter settings dict.
    processing_metrics : dict | None, optional
        Pre-computed metrics dict from analysis panel. If None, basic metrics
        will be computed inline.
    transformation_history : list | None, optional
        List of transformation steps taken. Each entry should have 'label' and
        'timestamp' keys.
    """

    # ─── Session State Initialization ───────────────────────────────
    if "comparison_slider_initialized" not in st.session_state:
        st.session_state.comparison_slider_initialized = True
        st.session_state.comparison_history = (
            transformation_history or []
        )

    # ─── Metrics Display Strip ──────────────────────────────────────
    # Compute or display provided metrics
    if processing_metrics is not None:
        metrics = processing_metrics
    else:
        # Fallback: show placeholder when no metrics available
        metrics = {
            "std_original": "—",
            "std_enhanced": "—",
            "entropy_original": "—",
            "entropy_enhanced": "—",
            "laplacian_original": "—",
            "laplacian_enhanced": "—",
            "processing_time": "—",
        }

    # ─── Layout: Two-Column Image View ──────────────────────────────
    st.markdown("### 🖼️ Side-by-Side Comparison")

    # Image columns
    col_l, col_r = st.columns(2, gap="medium")

    with col_l:
        st.markdown(
            f"""
            <div style="
                text-align:center;
                font-weight:600;
                color:#172B4D;
                background:#EFF6FF;
                padding:0.5rem 1rem;
                border-radius:10px;
                font-size:0.95rem;
                margin-bottom:1rem;
            ">
                Original
            </div>
            """,
            unsafe_allow_html=True,
        )
        if original_image is not None:
            st.image(
                original_image,
                caption="Original uploaded image",
                use_container_width=True,
            )
        else:
            st.info("Upload an image to see comparison", icon="ℹ️")

    with col_r:
        st.markdown(
            f"""
            <div style="
                text-align:center;
                font-weight:600;
                color:#FFFFFF;
                background:#14B8A6;
                padding:0.5rem 1rem;
                border-radius:10px;
                font-size:0.95rem;
                margin-bottom:1rem;
            ">
                Enhanced
            </div>
            """,
            unsafe_allow_html=True,
        )
        if enhanced_image is not None:
            st.image(
                enhanced_image,
                caption="After enhancement",
                use_container_width=True,
            )
        else:
            st.info("Run enhancement to see results", icon="ℹ️")

    # ─── Metrics Strip Below Images ─────────────────────────────────
    st.divider()
    st.markdown("### Comparison Metrics")

    m1, m2, m3, m4 = st.columns(4, gap="small")

    with m1:
        st.metric(
            "Std. Dev. Δ",
            f"{metrics.get('std_original', '—')} → {metrics.get('std_enhanced', '—')}",
            f"{float(metrics.get('std_enhanced', 0) - metrics.get('std_original', 0)):+.1f}%",
        )

    with m2:
        st.metric(
            "Entropy Δ",
            f"{metrics.get('entropy_original', '—')} → {metrics.get('entropy_enhanced', '—')}",
            f"{float(metrics.get('entropy_enhanced', 0) - metrics.get('entropy_original', 0)):+.3f}",
        )

    with m3:
        st.metric(
            "Sharpness Δ",
            f"{metrics.get('laplacian_original', '—')} → {metrics.get('laplacian_enhanced', '—')}",
            f"{float(metrics.get('laplacian_enhanced', 0) - metrics.get('laplacian_original', 0)):+.1f}",
        )

    with m4:
        st.metric(
            "Int. Range Δ",
            f"{metrics.get('intensity_range', '—')}",
            f"{float(metrics.get('range_delta', 0)):+d}",
        )

    # ─── Transformation History Note ────────────────────────────────
    history = st.session_state.get("comparison_history", [])
    if history and len(history) > 0:
        with st.expander("Applied Processing Steps", expanded=False):
            for step in history:
                ts = step.get("timestamp", "")[:16] if isinstance(step.get("timestamp"), str) else "—"
                st.caption(f"► {step.get('label', '—')} ({ts})")

    # ─── Mandatory Medical Disclaimer ───────────────────────────────
    st.divider()
    st.caption(
        "⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. "
        "Always consult qualified radiologists for medical interpretation."
    )