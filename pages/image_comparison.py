"""
pages/image_comparison.py
──────────────────────────
Side-by-side before/after comparison page.
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
from config import COLORS
from services.export_service import image_to_display_rgb, image_to_png_bytes
from utils.image_formatting import format_shape, channels_str


def render():
    st.markdown("## Image Comparison")
    st.markdown(
        "Compare your original and enhanced images side by side. "
        "All images shown are from actual uploaded and processed data."
    )
    st.divider()

    orig = st.session_state.get("original_image")
    enh  = st.session_state.get("enhanced_image")
    pr   = st.session_state.get("pipeline_result")

    if orig is None or enh is None:
        _no_image_notice()
        return

    # ── Side-by-side comparison ────────────────────────────────────────────────────────
    col_l, col_r = st.columns(2, gap="medium")

    with col_l:
        st.markdown(
            "<div style='text-align:center; font-weight:600; color:#172B4D; "
            "background:#EFF6FF; padding:0.5rem 1rem; border-radius:10px; "
            "font-size:0.95rem; margin-bottom:1rem;'>Original</div>",
            unsafe_allow_html=True,
        )
        st.image(image_to_display_rgb(orig), use_container_width=True)
        _props_table(orig)

    with col_r:
        st.markdown(
            "<div style='text-align:center; font-weight:600; color:#FFFFFF; "
            "background:#14B8A6; padding:0.5rem 1rem; border-radius:10px; "
            "font-size:0.95rem; margin-bottom:1rem;'>Enhanced</div>",
            unsafe_allow_html=True,
        )
        st.image(image_to_display_rgb(enh), use_container_width=True)
        _props_table(enh)

    # ── Download ──────────────────────────────────────────────────────────────
    st.divider()
    st.markdown("### Download")
    col_dl, _ = st.columns([1, 2])
    with col_dl:
        st.download_button(
            "Download Enhanced PNG",
            data=image_to_png_bytes(enh),
            file_name="scanova_enhanced.png",
            mime="image/png",
            use_container_width=True,
            type="primary",
        )

    # ── Delta metric summary ───────────────────────────────────────────────────
    if pr:
        st.divider()
        st.markdown("### Comparison Metrics")
        d = pr.delta
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Std. Dev. Δ",     f"{pr.original_metrics.std:.1f} → {pr.enhanced_metrics.std:.1f}",      f"{d.get('std_delta_pct',0):+.1f}%")
        c2.metric("Entropy Δ",       f"{pr.original_metrics.entropy:.3f} → {pr.enhanced_metrics.entropy:.3f}", f"{d.get('entropy_delta_pct',0):+.1f}%")
        c3.metric("Sharpness Δ",     f"{pr.original_metrics.laplacian_var:.1f} → {pr.enhanced_metrics.laplacian_var:.1f}", f"{d.get('lap_var_delta_pct',0):+.1f}%")
        c4.metric("Int. Range Δ",    f"{pr.original_metrics.intensity_range} → {pr.enhanced_metrics.intensity_range}", f"{d.get('range_delta',0):+d}")

        st.caption(
            "Note: These statistics describe mathematical changes. "
            "They do NOT measure diagnostic quality or clinical value."
        )

    # ── Processing settings recap ─────────────────────────────────────────────
    if pr:
        with st.expander("Applied Processing Settings"):
            s = pr.settings
            settings_text = f"""
            **Noise Reduction**: {s.noise_method} (kernel {s.kernel_size}×{s.kernel_size})

            **Contrast**: {s.contrast_method}"
            + (f" — clip {s.clahe_clip_limit}, tiles {s.clahe_tile_grid}×{s.clahe_tile_grid}" if s.contrast_method == "CLAHE" else "")
            + f"

            **Sharpening**: α={s.sharpen_strength}, σ={s.sharpen_sigma}"
            + f"

            **Processing Time**: {pr.total_time_ms:.1f} ms
            """
            st.markdown(settings_text)


def _no_image_notice():
    st.info(
        "No image has been enhanced yet. "
        "Please go to **Image Enhancement**, upload an image, and click **Enhance Image**.",
        icon="ℹ️",
    )
    st.markdown(
        f"""
        <div style="text-align:center; padding:3rem; color:{COLORS['muted']}">
            <div style="font-size:4rem; margin-bottom:1rem;">⚖️</div>
            <h3 style="color:{COLORS['navy']}; margin-bottom:0.5rem;">Nothing to Compare Yet</h3>
            <p style="margin:0; color:{COLORS['muted']}">Enhance an image first, then come back here.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
