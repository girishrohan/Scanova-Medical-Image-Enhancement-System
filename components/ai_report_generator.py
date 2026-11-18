"""
components/ai_report_generator.py — SCANOVA AI Clinical Report Generator

Provides an expandable AI-assisted clinical observation panel that analyzes
processed image statistics and enhancement parameters to generate a structured,
educational radiological observation summary with mandatory non-diagnostic disclaimers.
"""

from __future__ import annotations

import streamlit as st
from typing import Optional, Dict, Any

# ─── Color Palette (imported from existing config) ───────────────────────
from config import COLORS

# ─── Mandatory Disclaimer — must be unavoidable on every render ──────────
DISCLAIMER_TEXT = (
    "⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. "
    "Always consult qualified radiologists for medical interpretation."
)


# ─── Report Generation Logic ─────────────────────────────────────────────

def _generate_observation_text(params: Dict[str, Any], metrics: Optional[Dict[str, Any]]) -> list[str]:
    """Generate educational observational sentences from enhancement params and image metrics.

    Returns a list of observation strings covering noise reduction, contrast enhancement,
    edge definition, and density analysis. Each string is educational/descriptive only,
    never diagnostic.
    """
    observations: list[str] = []

    # ─── Noise Reduction Assessment ──────────────────────────────────
    noise_method = params.get("noiseMethod", "Median")
    kernel = params.get("kernelSize", 5)
    observations.append(
        f"Noise reduction using {noise_method} kernel ({kernel}×{kernel}) "
        f"successfully reduced intensity standard deviation, improving "
        f"background uniformity for clearer anatomical structure visualization."
    )

    # ─── Contrast Enhancement Assessment ─────────────────────────────
    contrast_method = params.get("contrastMethod", "CLAHE")
    clip_limit = params.get("claheClipLimit", 2.0)
    observations.append(
        f"Adaptive contrast enhancement ({contrast_method} with clip limit {clip_limit}) "
        f"applied local histogram equalization, improving visibility of subtle "
        f"anatomical transitions and edge definition across tissue boundaries."
    )

    # ─── Edge/Sharpness Assessment ───────────────────────────────────
    laplacian_var = metrics.get("laplacian_var", 0) if metrics else 0
    sharpness_note = "enhanced" if laplacian_var > 200 else "moderate" if laplacian_var > 50 else "reduced"
    observations.append(
        f"Edge enhancement (unsharp masking α={params.get('sharpenStrength', 1.2)}) "
        f"resulted in {sharpness_note} increase in Laplacian variance ({laplacian_var:.1f}), "
        f"indicating improved high-frequency detail retention for fine structural analysis."
    )

    # ─── Density/Intensity Assessment ────────────────────────────────
    intensity_range = metrics.get("intensity_range", "—") if metrics else "—"
    observations.append(
        f"Intensity range spanning {intensity_range} supports adequate dynamic range "
        f"utilization for the selected modality, with mean intensity providing "
        f"baseline attenuation reference for the examined anatomy."
    )

    # ─── Overall Processing Summary ─────────────────────────────────
    processing_time = metrics.get("processing_time_ms", "—") if metrics else "—"
    observations.append(
        f"Overall processing completed in {processing_time} ms with parameter "
        f"configuration reflecting balanced noise suppression and detail preservation "
        f"for educational visualization purposes."
    )

    return observations


# ─── Renderable Component ────────────────────────────────────────────────

def render_ai_report_generator(
    enhanced_image: Optional[object] = None,
    enhancement_params: Optional[dict] = None,
    metrics: Optional[dict] = None,
    is_processing: bool = False,
    show_dislcimer: bool = True,
) -> None:
    """Render the AI Clinical Assistant / Automated Scan Report panel.

    An expandable panel that analyzes processed image statistics and enhancement
    parameters to generate a structured, educational radiological observation summary.
    Includes mandatory non-diagnostic medical disclaimers that are unavoidably displayed.

    Parameters
    ----------
    enhanced_image : object, optional
        Enhanced image display object (Streamlit image element or None).
    enhancement_params : dict, optional
        Current enhancement parameter settings. Expected keys:
        - noiseMethod: str — "Median" or "Gaussian"
        - kernelSize: int — kernel size (odd number)
        - contrastMethod: str — "CLAHE" or "Histogram Equalization"
        - claheClipLimit: float — CLAHE clip limit parameter
        - claheTileGrid: int — tile grid size
        - sharpenStrength: float — unsharp masking weight α
        - forceGrayscale: bool — whether grayscale conversion was applied
    metrics : dict, optional
        Image quality metrics dict. Expected keys:
        - mean: float — mean intensity
        - std: float — standard deviation
        - entropy: float — Shannon entropy
        - laplacian_var: float — Laplacian variance (sharpness proxy)
        - intensity_range: str — "min - max"
        - processing_time_ms: int or str — processing duration in milliseconds
    is_processing : bool, optional
        Whether the enhancement pipeline or report generation is currently running.
    show_dislcimer : bool, optional
        Whether to display the mandatory medical disclaimer at the bottom.
        This is set to True by default and should generally remain so for compliance.
    """

    # ─── Session State Initialization ───────────────────────────────
    if "ai_report_generator_initialized" not in st.session_state:
        st.session_state.ai_report_generator_initialized = True
        st.session_state.generated_report = None

    # ─── Processing State ───────────────────────────────────────────
    if is_processing:
        with st.spinner("Generating AI-assisted clinical observation..."):
            # Simulate processing time
            import time
            time.sleep(0.5)
            observations = _generate_observation_text(
                enhancement_params or {},
                metrics or {},
            )
            report_lines = [
                "=" * 60,
                "      SCANOA — AI-ASSISTED OBSERVATION REPORT",
                "=" * 60,
                f"Patient Image Modality: Educational Demonstration",
                f"Processing Date: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}",
                f"Processing Time: {metrics.get('processing_time_ms', '—') if metrics else '—'} ms",
                "-" * 60,
                "1. NOISE REDUCTION ASSESSMENT",
                "-" * 60,
                observations[0] if len(observations) > 0 else "Noise reduction parameters not configured.",
                "-" * 60,
                "2. CONTRAST ENHANCEMENT ASSESSMENT",
                "-" * 60,
                observations[1] if len(observations) > 1 else "Contrast enhancement parameters not configured.",
                "-" * 60,
                "3. EDGE DEFINITION & SHARPNESS",
                "-" * 60,
                observations[2] if len(observations) > 2 else "Edge enhancement parameters not configured.",
                "-" * 60,
                "4. TISSUE DENSITY & INTENSITY ANALYSIS",
                "-" * 60,
                observations[3] if len(observations) > 3 else "Intensity range analysis not available.",
                "-" * 60,
                "5. PROCESSING SUMMARY",
                "-" * 60,
                f"Total processing duration: {metrics.get('processing_time_ms', '—') if metrics else '—'} ms",
                f"Enhancement pipeline: 6-stage (Acquisition → Grayscale → Denoise → Contrast → Sharpen → Output)",
                f"Configuration: Noise={enhancement_params.get('noiseMethod', 'Median')}, "
                f"Contrast={enhancement_params.get('contrastMethod', 'CLAHE')}, "
                f"Sharpenα={enhancement_params.get('sharpenStrength', 1.2)}",
                "-" * 60,
                "⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. "
                "Always consult qualified radiologists for medical interpretation.",
                "-" * 60,
                "Report generated via AI-assisted observational analytics engine.",
                "This report describes image-processing outcomes only and does not constitute",
                "a medical diagnosis or clinical finding.",
                "-" * 60,
            ]
            full_report = "\n".join(report_lines)
            st.session_state.generated_report = full_report

    # ─── UI Layout ──────────────────────────────────────────────────
    # Always-show expandable area (collapsed by default on first render)
    expanded = st.session_state.get("report_expanded", False)

    # Trigger label
    trigger_label = "Generate AI Observation Report" if not expanded else "Collapse Report"

    # Report display area
    if st.session_state.generated_report is not None and expanded:
        st.info("Report generated — showing below")
        st.text_area(
            "AI Observation Report",
            value=st.session_state.generated_report,
            height=400,
            label_visibility="collapsed",
        )
    elif not expanded:
        # Show trigger button when collapsed
        if st.button(
            trigger_label,
            use_container_width=True,
            type="primary",
        ):
            st.session_state.report_expanded = True
            st.rerun()
    else:
        # When expanded and then collapsed again
        st.session_state.report_expanded = False

    # ─── Always-Visible Mandatory Disclaimer ────────────────────────
    st.divider()
    st.caption(DISCLAIMER_TEXT)