"""
services/export_service.py
───────────────────────────
Image export and PDF report generation for Scanova.

Functions
─────────
  • image_to_png_bytes  – convert NumPy array → PNG bytes (for st.download_button)
  • generate_pdf_report – create a multi-page academic PDF using ReportLab
"""

from __future__ import annotations

import io
import time
from typing import Optional

import cv2
import numpy as np
from PIL import Image


# ─── PNG Export ───────────────────────────────────────────────────────────────

def image_to_png_bytes(image: np.ndarray) -> bytes:
    """
    Convert a uint8 NumPy array (HxW or HxWx3 BGR) to PNG bytes.

    Returns
    -------
    bytes  – raw PNG file content suitable for st.download_button.

    Raises
    ------
    ValueError  – if the image cannot be encoded.
    """
    if image is None:
        raise ValueError("export: received None image.")

    # Convert BGR → RGB if color
    if image.ndim == 3 and image.shape[2] == 3:
        pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    else:
        pil_img = Image.fromarray(image)

    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


def image_to_display_rgb(image: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV) to RGB (Streamlit / Matplotlib) for display."""
    if image is None:
        return np.zeros((64, 64), dtype=np.uint8)
    if image.ndim == 3 and image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image


# ─── PDF Report ───────────────────────────────────────────────────────────────

def generate_pdf_report(
    original_image: np.ndarray,
    enhanced_image: np.ndarray,
    orig_metrics,
    enh_metrics,
    settings,
    delta: dict,
    processing_time_ms: float,
    filename: str = "uploaded_image",
) -> bytes:
    """
    Generate a multi-page academic PDF report using ReportLab.

    Returns
    -------
    bytes  – PDF file content.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors as rl_colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, Image as RLImage, PageBreak,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    except ImportError:
        raise ImportError(
            "reportlab is not installed. Run: pip install reportlab"
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    navy   = rl_colors.HexColor("#172B4D")
    blue   = rl_colors.HexColor("#2563EB")
    teal   = rl_colors.HexColor("#14B8A6")
    light  = rl_colors.HexColor("#F1F5F9")
    white  = rl_colors.white

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        textColor=navy, fontSize=22, spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "H2", parent=styles["Heading2"],
        textColor=blue, fontSize=14, spaceBefore=12, spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        textColor=rl_colors.HexColor("#1E293B"),
        fontSize=10, leading=15, spaceAfter=4,
        fontName="Helvetica",
    )
    small_style = ParagraphStyle(
        "Small", parent=styles["Normal"],
        textColor=rl_colors.HexColor("#64748B"),
        fontSize=8, leading=11,
        fontName="Helvetica-Oblique",
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=styles["Normal"],
        textColor=rl_colors.HexColor("#B45309"),
        fontSize=9, leading=13, backColor=rl_colors.HexColor("#FEF3C7"),
        borderPadding=(4, 4, 4, 4),
        fontName="Helvetica-Bold",
    )

    story = []

    # ── Cover ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("SCANOVA", title_style))
    story.append(Paragraph("Medical Image Enhancement System", h2_style))
    story.append(Paragraph("CGIP Mini Project Report", body_style))
    story.append(HRFlowable(width="100%", thickness=2, color=teal, spaceAfter=10))
    story.append(Paragraph(
        "⚠ Educational Use Only — This report is generated for academic demonstration "
        "purposes. Enhanced images are NOT guaranteed to be diagnostically superior. "
        "This software does not diagnose diseases and must not replace professional "
        "medical interpretation.",
        disclaimer_style,
    ))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}", small_style))
    story.append(Paragraph(f"Source File: {filename}", small_style))

    # ── Image comparison (thumbnails) ─────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Image Comparison", h2_style))

    img_row = []
    for img_arr, label in [(original_image, "Original"), (enhanced_image, "Enhanced")]:
        if img_arr is not None:
            thumb_buf = io.BytesIO()
            thumb = _make_thumbnail(img_arr, max_size=280)
            pil = Image.fromarray(thumb)
            pil.save(thumb_buf, format="PNG")
            thumb_buf.seek(0)
            img_row.append([
                RLImage(thumb_buf, width=7*cm, height=7*cm),
                Paragraph(label, body_style),
            ])

    if img_row:
        t = Table([[cell[0] for cell in img_row]], colWidths=[8*cm, 8*cm])
        t.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t)
        labels_t = Table([[cell[1] for cell in img_row]], colWidths=[8*cm, 8*cm])
        labels_t.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(labels_t)

    # ── Processing Parameters ─────────────────────────────────────────────────
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("Processing Parameters", h2_style))
    params = [
        ["Parameter",          "Value"],
        ["Noise Method",       settings.noise_method],
        ["Kernel Size",        f"{settings.kernel_size}×{settings.kernel_size}"],
        ["Contrast Method",    settings.contrast_method],
        ["CLAHE Clip Limit",   f"{settings.clahe_clip_limit}"],
        ["CLAHE Tile Grid",    f"{settings.clahe_tile_grid}×{settings.clahe_tile_grid}"],
        ["Sharpen Strength",   f"{settings.sharpen_strength}"],
        ["Sharpen σ",          f"{settings.sharpen_sigma}"],
        ["Processing Time",    f"{processing_time_ms:.1f} ms"],
    ]
    pt = _make_table(params, navy, blue, light, white)
    story.append(pt)

    # ── Quality Metrics ───────────────────────────────────────────────────────
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("Image Quality Indicators", h2_style))
    metrics_data = [
        ["Metric",                      "Original",           "Enhanced",           "Change"],
        ["Mean Intensity",              f"{orig_metrics.mean:.2f}",    f"{enh_metrics.mean:.2f}",    _delta_str(delta.get("mean_delta", 0))],
        ["Std. Dev. (Contrast proxy)",  f"{orig_metrics.std:.2f}",     f"{enh_metrics.std:.2f}",     f"{delta.get('std_delta_pct', 0):+.1f}%"],
        ["Shannon Entropy",             f"{orig_metrics.entropy:.4f}", f"{enh_metrics.entropy:.4f}", f"{delta.get('entropy_delta_pct', 0):+.1f}%"],
        ["Laplacian Variance",          f"{orig_metrics.laplacian_var:.2f}", f"{enh_metrics.laplacian_var:.2f}", f"{delta.get('lap_var_delta_pct', 0):+.1f}%"],
        ["Intensity Range",             f"{orig_metrics.intensity_range}",   f"{enh_metrics.intensity_range}",   f"{delta.get('range_delta', 0):+d}"],
        ["Min / Max",                   f"{orig_metrics.min_val} / {orig_metrics.max_val}", f"{enh_metrics.min_val} / {enh_metrics.max_val}", "—"],
    ]
    mt = _make_table(metrics_data, navy, blue, light, white)
    story.append(mt)

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Note: These metrics describe pixel statistics only. They do NOT measure "
        "diagnostic quality or clinical utility. Higher entropy or Laplacian variance "
        "can indicate noise amplification rather than improved diagnostic clarity.",
        small_style,
    ))

    # ── Algorithm Description ─────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Algorithms Applied", h2_style))
    alg_texts = [
        ("<b>Noise Reduction (Median / Gaussian Filter)</b>: Spatial filtering removes "
         "high-frequency noise by replacing each pixel with the median or weighted average "
         "of its neighbourhood. Median filtering is robust to salt-and-pepper noise."),
        ("<b>CLAHE (Contrast Limited Adaptive Histogram Equalization)</b>: Divides the image "
         "into small tiles and applies histogram equalization within each tile. A clip limit "
         "prevents over-amplification of noise. Reference: Zuiderveld (1994)."),
        ("<b>Unsharp Masking</b>: Sharpens the image by adding a scaled high-frequency "
         "residual: I_sharp = I + α·(I − Blur(I, σ)). Weight α controls the sharpening "
         "strength; σ controls the blur scale."),
    ]
    for txt in alg_texts:
        story.append(Paragraph(txt, body_style))
        story.append(Spacer(1, 0.2*cm))

    story.append(HRFlowable(width="100%", thickness=1, color=teal, spaceAfter=6))
    story.append(Paragraph(
        "CGIP – Scanova Medical Image Enhancement System | Academic Mini Project | "
        "Computer Graphics and Image Processing",
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()


# ─── Private helpers ──────────────────────────────────────────────────────────

def _make_thumbnail(image: np.ndarray, max_size: int = 256) -> np.ndarray:
    """Resize (keeping aspect ratio) and convert BGR→RGB for PIL."""
    h, w = image.shape[:2]
    scale = min(max_size / w, max_size / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_AREA)
    if resized.ndim == 3 and resized.shape[2] == 3:
        return cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    return resized


def _delta_str(val: float) -> str:
    return f"{val:+.2f}" if val != 0 else "—"


def _make_table(data, navy, blue, light, white):
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib.units import cm
    t = Table(data, colWidths="*")
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), navy),
        ("TEXTCOLOR",   (0, 0), (-1, 0), white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, light]),
        ("FONTSIZE",    (0, 1), (-1, -1), 9),
        ("GRID",        (0, 0), (-1, -1), 0.5, blue),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t
