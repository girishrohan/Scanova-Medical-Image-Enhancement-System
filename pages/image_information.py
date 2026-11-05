"""
pages/image_information.py
───────────────────────────
Technical image information and quality analysis page.
"""

from __future__ import annotations
import streamlit as st
import numpy as np
from core.image_metrics import compute_metrics, metrics_delta
from utils.image_formatting import human_file_size, format_shape, channels_str


def render():
    st.markdown("## 📈 Image Information & Quality Analysis")
    st.markdown(
        "Technical statistics about the uploaded and enhanced images. "
        "All values are computed from actual image pixel data."
    )
    st.divider()

    orig = st.session_state.get("original_image")
    enh  = st.session_state.get("enhanced_image")
    pr   = st.session_state.get("pipeline_result")

    if orig is None:
        st.info("Upload and enhance an image on the **Image Enhancement** page first.", icon="ℹ️")
        return

    om = compute_metrics(orig)
    em = compute_metrics(enh) if enh is not None else None

    # ── Image Properties ───────────────────────────────────────────────────────
    st.markdown("### 🖼 Image Properties")
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Original")
        _card_table({
            "Shape":      format_shape(orig),
            "Channels":   channels_str(orig),
            "Pixel Type": str(orig.dtype),
            "Total Pixels": f"{om.num_pixels:,}",
            "File Size":  human_file_size(st.session_state.get("loaded_file_size", 0)),
            "DICOM":      "Yes" if st.session_state.get("is_dicom") else "No",
        })

    if enh is not None and em:
        with col2:
            st.markdown("#### Enhanced")
            _card_table({
                "Shape":      format_shape(enh),
                "Channels":   channels_str(enh),
                "Pixel Type": str(enh.dtype),
                "Total Pixels": f"{em.num_pixels:,}",
                "Output Format": "PNG (in-memory)",
                "Processing":    f"{pr.total_time_ms:.1f} ms" if pr else "—",
            })

    # ── Quality Indicators ────────────────────────────────────────────────────
    st.divider()
    st.markdown("### 🔬 Quality Indicators")

    indicators = [
        ("Mean Intensity",
         om.mean, em.mean if em else None,
         "Average pixel brightness. Shifts with contrast methods.",
         False),
        ("Std. Dev. (Contrast proxy)",
         om.std, em.std if em else None,
         "Standard deviation of pixel intensities. Higher ≈ more contrast. "
         "Also increases with noise — not a reliable isolated metric.",
         True),
        ("Shannon Entropy",
         om.entropy, em.entropy if em else None,
         "Information density: H = −Σ pᵢ log₂ pᵢ.  Range: 0–8 bits for uint8. "
         "Higher ≠ better. JPEG artefacts and noise raise entropy.",
         True),
        ("Laplacian Variance",
         om.laplacian_var, em.laplacian_var if em else None,
         "Variance of the Laplacian — a focus / sharpness proxy. "
         "High noise inflates this value; cannot compare across different images.",
         True),
        ("Michelson Contrast",
         om.michelson, em.michelson if em else None,
         "(Imax − Imin) / (Imax + Imin). Range 0–1. Sensitive to outlier pixels.",
         True),
        ("Intensity Range",
         om.intensity_range, em.intensity_range if em else None,
         "Max − Min pixel value. Indicates dynamic range utilisation.",
         True),
        ("Min / Max Intensity",
         f"{om.min_val} / {om.max_val}",
         f"{em.min_val} / {em.max_val}" if em else None,
         "Minimum and maximum pixel intensity values.",
         False),
    ]

    for label, ov, ev, note, higher_better in indicators:
        with st.expander(f"**{label}**", expanded=False):
            c1, c2, c3 = st.columns(3)
            c1.metric("Original",  _fmt(ov))
            if ev is not None:
                try:
                    delta = float(ev) - float(ov)
                    pct   = (delta / abs(float(ov)) * 100) if float(ov) != 0 else 0
                    c2.metric("Enhanced", _fmt(ev), f"{pct:+.1f}%")
                except (TypeError, ValueError):
                    c2.metric("Enhanced", _fmt(ev))
            else:
                c2.metric("Enhanced", "—")
            c3.markdown(f"*{note}*")

    # ── Processing breakdown ──────────────────────────────────────────────────
    if pr:
        st.divider()
        st.markdown("### ⏱ Stage-by-Stage Timing")
        for stage, ms in pr.stage_times_ms.items():
            st.progress(
                int(min(ms / pr.total_time_ms * 100, 100)),
                text=f"{stage.replace('_', ' ').title()}: {ms:.2f} ms",
            )
        st.caption(f"Total pipeline time: **{pr.total_time_ms:.1f} ms**")

    # ── Limitations notice ────────────────────────────────────────────────────
    st.divider()
    st.warning(
        "**Metric Limitations**: These indicators describe pixel-level statistics. "
        "They do NOT measure diagnostic quality, clinical utility, or medical accuracy. "
        "A higher sharpness score can indicate noise amplification. "
        "Do not use these metrics to make clinical decisions.",
        icon="⚠️",
    )


def _card_table(data: dict):
    for k, v in data.items():
        st.markdown(
            f"<div style='display:flex;justify-content:space-between;padding:5px 10px;"
            f"background:#F8FAFC;border-radius:6px;margin:3px 0;font-size:0.85rem;'>"
            f"<span style='color:#64748B;font-weight:600;'>{k}</span>"
            f"<span style='color:#172B4D;font-weight:700;'>{v}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )


def _fmt(v) -> str:
    if isinstance(v, str):
        return v
    if isinstance(v, float):
        return f"{v:.4f}" if abs(v) < 100 else f"{v:.1f}"
    return str(v)
