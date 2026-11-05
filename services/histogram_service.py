"""
services/histogram_service.py
──────────────────────────────
Histogram computation and visualization for medical images.

Returns Plotly figures (interactive) and Matplotlib figures (static fallback).
All statistics are calculated from actual pixel data — never hardcoded.
"""

from __future__ import annotations

from typing import Optional

import cv2
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# ─── Histogram data ───────────────────────────────────────────────────────────

def compute_histogram(image: np.ndarray) -> dict:
    """
    Compute per-channel pixel intensity histogram(s).

    Returns a dict with:
      channels : list of dicts, one per channel with keys:
                 name, hist (256 values), bin_edges (257 values)
      is_color : bool
    """
    if image is None:
        return {"channels": [], "is_color": False}

    is_color = image.ndim == 3 and image.shape[2] == 3
    result = {"is_color": is_color, "channels": []}

    if not is_color:
        gray = image if image.ndim == 2 else image[:, :, 0]
        hist, edges = np.histogram(gray, bins=256, range=(0, 255))
        result["channels"].append({
            "name": "Intensity",
            "hist": hist.tolist(),
            "bin_edges": edges.tolist(),
            "color": "rgba(37, 99, 235, 0.8)",   # Electric Blue
        })
    else:
        channel_info = [
            ("Blue",  0, "rgba(30,  80, 200, 0.7)"),
            ("Green", 1, "rgba(16, 185, 129, 0.7)"),
            ("Red",   2, "rgba(239,  68,  68, 0.7)"),
        ]
        for name, idx, color in channel_info:
            ch = image[:, :, idx]
            hist, edges = np.histogram(ch, bins=256, range=(0, 255))
            result["channels"].append({
                "name": name,
                "hist": hist.tolist(),
                "bin_edges": edges.tolist(),
                "color": color,
            })

    return result


# ─── Plotly visualization ──────────────────────────────────────────────────────

def make_comparison_figure(
    orig_image: np.ndarray,
    enh_image: np.ndarray,
    title: str = "Pixel Intensity Distribution",
) -> go.Figure:
    """
    Create a side-by-side Plotly histogram comparison figure.
    Original on the left, Enhanced on the right.
    """
    orig_hist = compute_histogram(orig_image)
    enh_hist  = compute_histogram(enh_image)

    n_channels = max(len(orig_hist["channels"]), 1)
    fig = make_subplots(
        rows=n_channels,
        cols=2,
        subplot_titles=_subplot_titles(orig_hist, enh_hist, n_channels),
        horizontal_spacing=0.1,
        vertical_spacing=0.15,
    )

    for row_i, (och, ech) in enumerate(
        zip(orig_hist["channels"], enh_hist["channels"]), start=1
    ):
        bins = list(range(256))
        # Original
        fig.add_trace(
            go.Bar(
                x=bins,
                y=och["hist"],
                name=f"Original – {och['name']}",
                marker_color=och["color"],
                showlegend=False,
            ),
            row=row_i, col=1,
        )
        # Enhanced
        fig.add_trace(
            go.Bar(
                x=bins,
                y=ech["hist"],
                name=f"Enhanced – {ech['name']}",
                marker_color="rgba(20, 184, 166, 0.8)",  # Teal
                showlegend=False,
            ),
            row=row_i, col=2,
        )

    fig.update_layout(
        title=dict(text=title, font=dict(size=16, color="#172B4D")),
        plot_bgcolor="#F8FAFC",
        paper_bgcolor="#FFFFFF",
        font=dict(family="Inter, sans-serif", size=12, color="#1E293B"),
        margin=dict(l=40, r=40, t=80, b=40),
        bargap=0,
    )
    fig.update_xaxes(title_text="Pixel Intensity (0–255)", range=[0, 255])
    fig.update_yaxes(title_text="Pixel Count")
    return fig


def make_cdf_figure(
    orig_image: np.ndarray,
    enh_image: np.ndarray,
) -> go.Figure:
    """Cumulative distribution function comparison for educational display."""
    fig = go.Figure()

    def add_cdf(img, label, color):
        if img is None:
            return
        gray = img if img.ndim == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hist, _ = np.histogram(gray, bins=256, range=(0, 255))
        cdf = np.cumsum(hist).astype(np.float64)
        cdf /= cdf[-1]
        fig.add_trace(go.Scatter(
            x=list(range(256)),
            y=cdf.tolist(),
            mode="lines",
            name=label,
            line=dict(color=color, width=2),
        ))

    add_cdf(orig_image, "Original",  "#2563EB")
    add_cdf(enh_image,  "Enhanced",  "#14B8A6")

    fig.update_layout(
        title=dict(text="Cumulative Distribution Function (CDF)", font=dict(size=15, color="#172B4D")),
        xaxis_title="Pixel Intensity",
        yaxis_title="Cumulative Probability",
        plot_bgcolor="#F8FAFC",
        paper_bgcolor="#FFFFFF",
        font=dict(family="Inter, sans-serif", size=12),
        legend=dict(x=0.02, y=0.98),
        margin=dict(l=40, r=20, t=60, b=40),
    )
    return fig


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _subplot_titles(orig_hist, enh_hist, n_channels):
    titles = []
    for och in orig_hist["channels"]:
        titles.append(f"Original – {och['name']}")
        titles.append(f"Enhanced – {och['name']}")
    return titles
