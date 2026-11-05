"""
pages/image_comparison.py
──────────────────────────
Side-by-side before/after comparison page.
"""

from __future__ import annotations
import streamlit as st
from services.export_service import image_to_display_rgb, image_to_png_bytes
from utils.image_formatting import format_shape, channels_str


def render():
    st.markdown("## ⚖ Image Comparison")
    st.markdown(
        "Compare your original and enhanced images side by side. "
        "All images shown are the actual uploaded and processed data."
    )
    st.divider()

    orig = st.session_state.get("original_image")
    enh  = st.session_state.get("enhanced_image")
    pr   = st.session_state.get("pipeline_result")

    if orig is None or enh is None:
        _no_image_notice()
        return

    # ── Side-by-side ──────────────────────────────────────────────────────────
    col_l, col_r = st.columns(2, gap="medium")

    with col_l:
        st.markdown(
            "<div style='text-align:center; font-weight:700; color:#172B4D; "
            "background:#EFF6FF; padding:6px; border-radius:8px;'>ORIGINAL</div>",
            unsafe_allow_html=True,
        )
        st.image(image_to_display_rgb(orig), use_container_width=True)
        _props_table(orig, "Original")

    with col_r:
        st.markdown(
            "<div style='text-align:center; font-weight:700; color:#FFFFFF; "
            "background:#14B8A6; padding:6px; border-radius:8px;'>ENHANCED</div>",
            unsafe_allow_html=True,
        )
        st.image(image_to_display_rgb(enh), use_container_width=True)
        _props_table(enh, "Enhanced")

    # ── Download ──────────────────────────────────────────────────────────────
    st.divider()
    col_dl, _ = st.columns([1, 2])
    with col_dl:
        st.download_button(
            "⬇ Download Enhanced PNG",
            data=image_to_png_bytes(enh),
            file_name="scanova_enhanced.png",
            mime="image/png",
            use_container_width=True,
            type="primary",
        )

    # ── Delta metric summary ───────────────────────────────────────────────────
    if pr:
        st.divider()
        st.markdown("### 📈 Quick Comparison Metrics")
        d = pr.delta
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Std. Dev. Δ",     f"{pr.original_metrics.std:.1f} → {pr.enhanced_metrics.std:.1f}",      f"{d.get('std_delta_pct',0):+.1f}%")
        c2.metric("Entropy Δ",       f"{pr.original_metrics.entropy:.3f} → {pr.enhanced_metrics.entropy:.3f}", f"{d.get('entropy_delta_pct',0):+.1f}%")
        c3.metric("Sharpness Δ",     f"{pr.original_metrics.laplacian_var:.1f} → {pr.enhanced_metrics.laplacian_var:.1f}", f"{d.get('lap_var_delta_pct',0):+.1f}%")
        c4.metric("Int. Range Δ",    f"{pr.original_metrics.intensity_range} → {pr.enhanced_metrics.intensity_range}", f"{d.get('range_delta',0):+d}")

        st.caption(
            "⚠ These pixel-level statistics describe mathematical changes in the image. "
            "They do not measure diagnostic quality or clinical value."
        )

    # ── Processing settings recap ─────────────────────────────────────────────
    if pr:
        with st.expander("⚙ Applied Processing Settings"):
            s = pr.settings
            settings_text = (
                f"**Noise Reduction**: {s.noise_method} (kernel {s.kernel_size}×{s.kernel_size})  \n"
                f"**Contrast**: {s.contrast_method}"
                + (f" — clip {s.clahe_clip_limit}, tiles {s.clahe_tile_grid}×{s.clahe_tile_grid}" if s.contrast_method == "CLAHE" else "")
                + f"  \n**Sharpening**: α={s.sharpen_strength}, σ={s.sharpen_sigma}"
                + f"  \n**Processing Time**: {pr.total_time_ms:.1f} ms"
            )
            st.markdown(settings_text)


def _props_table(image, label: str):
    import numpy as np
    rows = {
        "Shape":    format_shape(image),
        "Channels": channels_str(image),
        "Dtype":    str(image.dtype),
        "Min / Max": f"{int(image.min())} / {int(image.max())}",
        "Mean":     f"{float(image.mean()):.2f}",
    }
    for k, v in rows.items():
        st.markdown(
            f"<div style='display:flex;justify-content:space-between;padding:4px 8px;"
            f"background:#F8FAFC;border-radius:5px;margin:2px 0;font-size:0.82rem;'>"
            f"<span style='color:#64748B'>{k}</span><span style='color:#172B4D;font-weight:600'>{v}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )


def _no_image_notice():
    st.info(
        "No image has been enhanced yet. "
        "Please go to **Image Enhancement**, upload an image, and click **Enhance Image**.",
        icon="ℹ️",
    )
    st.markdown(
        """
        <div style="text-align:center;padding:3rem;color:#64748B">
            <div style="font-size:4rem">⚖️</div>
            <h3 style="color:#172B4D">Nothing to Compare Yet</h3>
            <p>Enhance an image first, then come back here.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
