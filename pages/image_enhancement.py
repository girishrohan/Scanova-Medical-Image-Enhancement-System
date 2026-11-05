"""
pages/image_enhancement.py
───────────────────────────
Scanova — Image Enhancement page.

Allows users to:
  1. Upload an image or select a sample.
  2. Configure enhancement settings (sidebar expander).
  3. Click "Enhance Image" to run the real pipeline.
  4. View the enhanced result and processing summary.
  5. Download the enhanced PNG.
"""

from __future__ import annotations

import io
import os

import numpy as np
import streamlit as st
from PIL import Image

from config import DISCLAIMER, SAMPLE_IMAGE_DIR, SAMPLE_IMAGES
from core.image_loader import load_image
from services.image_processing_service import run_pipeline, PipelineSettings
from services.export_service import image_to_png_bytes, image_to_display_rgb
from utils.validation import validate_uploaded_file
from utils.image_formatting import human_file_size, format_shape, channels_str


def render(settings: PipelineSettings):
    """Render the Image Enhancement page with clean, professional UI."""

    st.markdown("## Image Enhancement")
    st.markdown(
        "Upload a medical image, adjust enhancement settings in the sidebar, "
        "then click **Enhance Image** to run the processing pipeline."
    )
    st.warning(DISCLAIMER, icon="⚠️")
    st.divider()

    # ── Upload section - clean two-column layout ────────────────────────────────────
    col_up, col_samp = st.columns([2, 1], gap="medium")

    with col_up:
        st.markdown("### Upload Image")
        st.markdown(
            "<p style='color: #64748B; font-size: 0.9rem; margin-top: -0.5rem;'>"
            "Drag and drop an image file or click to browse.</p>",
            unsafe_allow_html=True,
        )
        uploaded = st.file_uploader(
            "",
            type=["png", "jpg", "jpeg", "bmp", "dcm"],
            help="Supported: PNG, JPG, JPEG, BMP, DICOM (.dcm). Max 30 MB.",
            key="enhancement_uploader",
        )

    with col_samp:
        st.markdown("### Demo Images")
        sample_choice = st.selectbox(
            "Select a sample",
            options=["— None —"] + list(SAMPLE_IMAGES.keys()),
            key="sample_choice",
        )
        if st.button("Load Sample", key="load_sample_btn", use_container_width=True):
            if sample_choice != "— None —":
                sample_path = os.path.join(
                    SAMPLE_IMAGE_DIR, SAMPLE_IMAGES[sample_choice]
                )
                if os.path.exists(sample_path):
                    with open(sample_path, "rb") as f:
                        raw = f.read()
                    _load_and_store(raw, os.path.basename(sample_path))
                    st.success(f"Loaded: {sample_choice}")
                else:
                    st.error(
                        f"Sample not found: {sample_path}. "
                        "Run `python data/generate_samples.py` to create samples."
                    )

    # ── Process uploaded file ─────────────────────────────────────────────────
    if uploaded is not None:
        ok, err = validate_uploaded_file(uploaded)
        if not ok:
            st.error(f"{err}")
        else:
            raw = uploaded.getvalue()
            fname = uploaded.name
            if (
                "original_image" not in st.session_state
                or st.session_state.get("loaded_filename") != fname
            ):
                _load_and_store(raw, fname)

    # ── Display uploaded image info ───────────────────────────────────────────
    if "original_image" in st.session_state:
        orig = st.session_state["original_image"]
        fname = st.session_state.get("loaded_filename", "image")

        st.divider()
        col_img, col_info = st.columns([3, 2], gap="large")

        with col_img:
            st.markdown("### Uploaded Image")
            display = image_to_display_rgb(orig)
            st.image(display, caption=fname, use_container_width=True)

        with col_info:
            st.markdown("### Image Properties")
            fs = st.session_state.get("loaded_file_size", 0)
            _info_badge("Shape", format_shape(orig))
            _info_badge("Channels", channels_str(orig))
            _info_badge("Pixel Type", str(orig.dtype))
            _info_badge("File Size", human_file_size(fs))
            if st.session_state.get("is_dicom"):
                st.info("DICOM file detected and windowed correctly.", icon="ℹ️")
                meta = st.session_state.get("dicom_meta", {})
                if meta:
                    for k, v in meta.items():
                        st.caption(f"**{k}**: {v}")

        # ── Action buttons ────────────────────────────────────────────────────
        st.divider()
        st.markdown("### Processing")

        col_a, col_b, col_c = st.columns(3, gap="medium")

        with col_a:
            enhance_clicked = st.button(
                "Enhance Image",
                key="enhance_btn",
                use_container_width=True,
                type="primary",
            )
        with col_b:
            reset_clicked = st.button(
                "Reset",
                key="reset_btn",
                use_container_width=True,
            )
        with col_c:
            if "enhanced_image" in st.session_state:
                png_bytes = image_to_png_bytes(st.session_state["enhanced_image"])
                st.download_button(
                    "Download Enhanced PNG",
                    data=png_bytes,
                    file_name="scanova_enhanced.png",
                    mime="image/png",
                    use_container_width=True,
                )
            else:
                st.button("Download (run enhance first)", disabled=True, use_container_width=True)

        if reset_clicked:
            _clear_session()
            st.rerun()

        if enhance_clicked:
            _run_enhancement(orig, settings)

        # ── Show enhanced result ─────────────────────────────────────────────────
        if "enhanced_image" in st.session_state:
            _display_results()

    else:
        st.info(
            "Upload an image from the sidebar to begin enhancement.",
            icon="ℹ️",
        )


# ─── Private helpers ──────────────────────────────────────────────────────────

def _load_and_store(raw_bytes: bytes, filename: str):
    """Load image, store in session_state; show errors in UI."""
    try:
        result = load_image(raw_bytes, filename)
        st.session_state["original_image"]   = result.image
        st.session_state["loaded_filename"]   = filename
        st.session_state["loaded_file_size"]  = result.file_size_bytes
        st.session_state["is_dicom"]          = result.is_dicom
        st.session_state["dicom_meta"]        = result.metadata
        # Clear old results when a new image loads
        st.session_state.pop("enhanced_image",   None)
        st.session_state.pop("pipeline_result",  None)
    except ValueError as exc:
        st.error(f"{exc}")
    except Exception as exc:
        st.error(f"Unexpected error loading image: {exc}")


def _run_enhancement(orig: np.ndarray, settings: PipelineSettings):
    """Run the pipeline and store the result in session_state."""
    with st.spinner("Running enhancement pipeline…"):
        try:
            result = run_pipeline(orig, settings)
            st.session_state["enhanced_image"]  = result.enhanced
            st.session_state["pipeline_result"] = result
            st.success(
                f"Enhancement complete in **{result.total_time_ms:.0f} ms**",
            )
        except ValueError as exc:
            st.error(f"Processing error: {exc}")
        except Exception as exc:
            st.error(f"Unexpected error: {exc}")


def _display_results():
    """Show enhanced image + compact processing summary."""
    result = st.session_state.get("pipeline_result")
    if result is None:
        return

    st.divider()
    st.markdown("### Enhancement Result")

    col_orig, col_enh = st.columns(2, gap="medium")
    with col_orig:
        st.markdown("**Original**")
        st.image(
            image_to_display_rgb(result.original),
            caption="Original image",
            use_container_width=True,
        )
    with col_enh:
        st.markdown("**Enhanced**")
        st.image(
            image_to_display_rgb(result.enhanced),
            caption="After enhancement",
            use_container_width=True,
        )

    # Processing summary
    st.markdown("### Processing Summary")
    with st.expander("View applied stages and parameters", expanded=False):
        for label, detail in result.stages_summary:
            st.markdown(f"- **{label}** — {detail}")
        st.caption(f"Total processing time: {result.total_time_ms:.1f} ms")

    # Quick metric comparison
    d = result.delta
    m1, m2, m3, m4 = st.columns(4)
    _metric_col(m1, "Contrast (σ)",     f"{result.enhanced_metrics.std:.1f}",       f"{d.get('std_delta_pct', 0):+.1f}%")
    _metric_col(m2, "Entropy",          f"{result.enhanced_metrics.entropy:.3f}",   f"{d.get('entropy_delta_pct', 0):+.1f}%")
    _metric_col(m3, "Sharpness",        f"{result.enhanced_metrics.laplacian_var:.1f}", f"{d.get('lap_var_delta_pct', 0):+.1f}%")
    _metric_col(m4, "Int. Range",       f"{result.enhanced_metrics.intensity_range}", f"{d.get('range_delta', 0):+d}")

    if result.warnings:
        for w in result.warnings:
            st.warning(w)

    if result.edge_overlay is not None:
        with st.expander("Sobel Edge Overlay"):
            st.image(result.edge_overlay, caption="Sobel edge map", use_container_width=True)


def _clear_session():
    for key in ["original_image", "enhanced_image", "pipeline_result",
                "loaded_filename", "loaded_file_size", "is_dicom", "dicom_meta"]:
        st.session_state.pop(key, None)


def _empty_state():
    st.markdown(
        """
        <div style="text-align:center; padding:3rem 1rem; color:#64748B;">
            <div style="font-size:4rem; margin-bottom:1rem;">🩻</div>
            <h3 style="color:#172B4D; margin-bottom:0.5rem;">Upload a Medical Image to Begin</h3>
            <p style="margin:0.25rem 0; color:#64748B;">Supported formats: PNG, JPG, JPEG, BMP, DICOM (.dcm)</p>
            <p style="margin:0.25rem 0; color:#64748B;">Or select a demo image from the panel above.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _info_badge(label: str, value: str):
    """Display a key-value info badge in a card-like format."""
    st.markdown(
        f"<div style='display:flex; justify-content:space-between; "
        f"padding:0.6rem 1rem; margin:0.3rem 0; background:#F8FAFC; "
        f"border-radius:8px; font-size:0.8rem; border: 1px solid #E2E8F0;'>"
        f"<span style='color:#64748B; font-weight:500;'>{label}</span>"
        f"<span style='color:#172B4D; font-weight:600;'>{value}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )


def _metric_col(col, label, value, delta):
    with col:
        st.metric(label=label, value=value, delta=delta)
