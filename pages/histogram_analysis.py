"""
pages/histogram_analysis.py
────────────────────────────
Pixel intensity histogram and CDF analysis page.
All statistics computed from real pixel data.
"""

from __future__ import annotations
import streamlit as st
from services.histogram_service import make_comparison_figure, make_cdf_figure, compute_histogram
from services.export_service import image_to_display_rgb
import numpy as np


def render():
    st.markdown("## 📊 Histogram Analysis")
    st.markdown(
        "Pixel intensity histograms reveal the tonal distribution of an image. "
        "A well-enhanced medical image often shows a broader, more uniform distribution "
        "— though this does not automatically imply better diagnostic value."
    )
    st.divider()

    orig = st.session_state.get("original_image")
    enh  = st.session_state.get("enhanced_image")

    if orig is None or enh is None:
        st.info(
            "Please process an image on the **Image Enhancement** page first.",
            icon="ℹ️",
        )
        return

    # ── Histogram plots ────────────────────────────────────────────────────────
    tab_hist, tab_cdf, tab_stats = st.tabs(
        ["📊 Intensity Histogram", "📈 CDF Comparison", "🔢 Statistics"]
    )

    with tab_hist:
        st.plotly_chart(
            make_comparison_figure(orig, enh, "Pixel Intensity Distribution — Original vs Enhanced"),
            use_container_width=True,
        )
        st.caption(
            "Histograms computed from actual pixel arrays. "
            "Each bar represents the count of pixels at that intensity (0–255). "
            "A wider spread typically indicates higher contrast."
        )

    with tab_cdf:
        st.plotly_chart(
            make_cdf_figure(orig, enh),
            use_container_width=True,
        )
        st.caption(
            "The CDF shows the cumulative fraction of pixels below each intensity. "
            "A more linear CDF (uniform distribution) corresponds to higher contrast. "
            "CLAHE drives the CDF toward linearity while limiting noise amplification."
        )

    with tab_stats:
        _statistics_table(orig, enh)


def _statistics_table(orig, enh):
    import cv2

    def gray(img):
        if img.ndim == 3:
            return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img

    def stats_for(img):
        g = gray(img).astype(np.float64)
        hist, _ = np.histogram(gray(img), bins=256, range=(0, 255))
        hist_p = hist[hist > 0] / float(gray(img).size)
        entropy = float(-np.sum(hist_p * np.log2(hist_p)))
        return {
            "Min Intensity":   int(g.min()),
            "Max Intensity":   int(g.max()),
            "Intensity Range": int(g.max() - g.min()),
            "Mean":            round(float(g.mean()), 3),
            "Std. Deviation":  round(float(g.std()),  3),
            "Variance":        round(float(g.var()),   3),
            "Entropy (bits)":  round(entropy,           4),
            "Median":          round(float(np.median(g)), 3),
        }

    o_stats = stats_for(orig)
    e_stats = stats_for(enh)

    st.markdown("#### Pixel Intensity Statistics (Grayscale-equivalent)")

    # Build table
    cols = st.columns([2, 1.5, 1.5, 1.5])
    headers = ["Metric", "Original", "Enhanced", "Change"]
    for col, h in zip(cols, headers):
        col.markdown(
            f"<div style='font-weight:700;color:#172B4D;padding:4px 0;"
            f"border-bottom:2px solid #2563EB;'>{h}</div>",
            unsafe_allow_html=True,
        )

    for metric in o_stats:
        ov = o_stats[metric]
        ev = e_stats[metric]
        try:
            delta = round(float(ev) - float(ov), 4)
            delta_str = f"{delta:+.4g}"
            color = "#10B981" if delta > 0 else ("#EF4444" if delta < 0 else "#64748B")
        except Exception:
            delta_str = "—"
            color = "#64748B"

        r = st.columns([2, 1.5, 1.5, 1.5])
        r[0].markdown(
            f"<div style='padding:4px 0;font-size:0.88rem;color:#1E293B'>{metric}</div>",
            unsafe_allow_html=True
        )
        r[1].markdown(
            f"<div style='padding:4px 0;font-size:0.88rem;font-family:monospace'>{ov}</div>",
            unsafe_allow_html=True
        )
        r[2].markdown(
            f"<div style='padding:4px 0;font-size:0.88rem;font-family:monospace'>{ev}</div>",
            unsafe_allow_html=True
        )
        r[3].markdown(
            f"<div style='padding:4px 0;font-size:0.88rem;font-weight:600;color:{color}'>{delta_str}</div>",
            unsafe_allow_html=True
        )

    st.divider()
    st.markdown("##### Interpretation Guidelines")
    st.markdown("""
    | Metric | What it measures | Limitation |
    |--------|-----------------|------------|
    | **Mean Intensity** | Average brightness | Shifts with contrast methods |
    | **Std. Deviation** | Global contrast (spread of intensities) | Also increases with noise |
    | **Intensity Range** | Dynamic range used | Sensitive to single outlier pixels |
    | **Entropy** | Information density / complexity | JPEG artefacts raise entropy |
    | **Variance of Lap.** | Perceived sharpness (edge strength) | High noise ↑ this value artificially |
    """)
    st.caption(
        "⚠ None of these metrics proves that an enhanced image is medically superior. "
        "They describe pixel statistics only."
    )
