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
    st.markdown("## Histogram Analysis")
    st.markdown(
        "Pixel intensity histograms reveal the tonal distribution of an image. "
        "A broader distribution typically indicates higher contrast after enhancement."
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

    # ── Analysis tabs ────────────────────────────────────────────────────────
    tab_hist, tab_cdf, tab_stats = st.tabs(
        ["Intensity Histogram", "CDF Comparison", "Statistics"]
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
    """Display pixel intensity statistics comparison table."""
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

    st.markdown("### Pixel Intensity Statistics")

    # Build comparison table
    cols = st.columns([2, 1.2, 1.2, 1.2])
    headers = ["Metric", "Original", "Enhanced", "Δ Change"]
    for col, h in zip(cols, headers):
        col.markdown(
            f"<div style='font-weight:600;color:#172B4D;padding:0.4rem 0;"
            f"border-bottom:1px solid #E2E8F0;font-size:0.85rem;'>{h}</div>",
            unsafe_allow_html=True,
        )

    for metric in o_stats:
        ov = o_stats[metric]
        ev = e_stats[metric]
        try:
            delta = round(float(ev) - float(ov), 4)
            delta_str = f"{delta:+.4g}"
            color = "#16A34A" if delta > 0 else ("#DC2626" if delta < 0 else "#64748B")
        except Exception:
            delta_str = "—"
            color = "#64748B"

        r = st.columns([2, 1.2, 1.2, 1.2])
        r[0].markdown(
            f"<div style='padding:0.4rem 0;font-size:0.82rem;color:#1E293B;'>{metric}</div>",
            unsafe_allow_html=True
        )
        r[1].markdown(
            f"<div style='padding:0.4rem 0;font-size:0.82rem;text-align:center;'>{ov}</div>",
            unsafe_allow_html=True
        )
        r[2].markdown(
            f"<div style='padding:0.4rem 0;font-size:0.82rem;text-align:center;'>{ev}</div>",
            unsafe_allow_html=True
        )
        r[3].markdown(
            f"<div style='padding:0.4rem 0;font-size:0.82rem;font-weight:600;text-align:center;color:{color}'>{delta_str}</div>",
            unsafe_allow_html=True
        )

    st.divider()
    st.markdown("### Interpretation Guidelines")
    st.markdown(
        "| Metric | What it measures | Limitation |\n"
        "|--|--|--|\n"
        "| **Mean** | Average brightness | Shifts with contrast methods |\n"
        "| **Std. Deviation** | Global contrast | Also increases with noise |\n"
        "| **Intensity Range** | Dynamic range used | Sensitive to outlier pixels |\n"
        "| **Entropy** | Information density | JPEG artefacts raise entropy |\n"
        "| **Variance of Lap.** | Perceived sharpness | High noise inflates value |",
        unsafe_allow_html=True,
    )

    st.caption(
        "Warning: These metrics describe pixel statistics only. "
        "They do NOT measure diagnostic quality or clinical value."
    )
