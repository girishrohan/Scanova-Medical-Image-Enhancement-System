"""
components/dashboard_workspace.py — SCANOVA Unified Dashboard Workspace

Main container component that orchestrates the unified multi-view workspace,
synchronously connecting enhancement pipeline, comparison slider, analysis panel,
and AI clinical report generator into a single responsive layout.
"""

from __future__ import annotations

import streamlit as st
from typing import Optional, Dict, Any

# ─── Color Palette (imported from existing config) ───────────────────────
from config import COLORS

# ─── Component Imports ──────────────────────────────────────────────────
from components.analysis_panel import render_analysis_panel
from components.comparison_slider import render_comparison_slider
from components.ai_report_generator import render_ai_report_generator

# ─── Session State Initialization ──────────────────────────────────────
if "workspace_initialized" not in st.session_state:
    st.session_state.workspace_initialized = True
    # Initialize core state
    st.session_state.original_image = None
    st.session_state.enhanced_image = None
    st.session_state.enhancement_params = {
        "noiseMethod": "Median",
        "kernelSize": 5,
        "contrastMethod": "CLAHE",
        "claheClipLimit": 2.0,
        "claheTileGrid": 8,
        "sharpenStrength": 1.2,
        "sharpenSigma": 1.0,
        "forceGrayscale": False,
    }
    st.session_state.processing_metrics = {
        "original": None,
        "enhanced": None,
    }
    st.session_state.transformation_history = [
        {
            "id": "initial",
            "label": "Original",
            "timestamp": __import__("datetime").datetime.now().isoformat(),
        }
    ]
    st.session_state.is_processing = False


# ─── Main Workspace Renderer ───────────────────────────────────────────

def render_dashboard_workspace() -> None:
    """Render the complete unified SCANOVA dashboard workspace.

    Orchestrates four synchronous panels:
    1. Enhancement Parameters (collapsible sidebar controls)
    2. Comparison Slider (original vs enhanced, live metrics strip)
    3. Analysis Panel (quantitative metrics comparison)
    4. AI Clinical Assistant / Automated Scan Report (expandable AI-generated observations)

    All panels share a single source of truth via session state — changes in
    enhancement parameters synchronously update comparison metrics and analysis
    results without navigation or page reload.
    """

    # ─── Header ────────────────────────────────────────────────────
    st.markdown(
        f"""
        <div style="
            background: {COLORS.navy};
            color: {COLORS.white};
            padding: {COLORS.spacing.lg}px;
            border-radius: {COLORS.radius.lg} {COLORS.radius.lg} 0 0;
            margin: -{COLORS.spacing.lg} -{COLORS.spacing.lg} 0;
        ">
            <h1 style="{{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                🩻 SCANOVA Dashboard
            </h1>
            <p style="{{ margin: '.25rem 0 0 0', opacity: 0.8, fontSize: '0.8rem' }}>
                Unified Medical Image Enhancement Workspace
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ─── Status & Control Bar ──────────────────────────────────────
    with st.container():
        st.markdown("### Controls")

        # Left: Reset & Processing Status
        c1, c2 = st.columns([1, 1], gap="medium")

        with c1:
            if st.button(
                "🔄 Reset Workspace",
                use_container_width=True,
                type="secondary",
            ):
                # Reset all state
                st.session_state.original_image = None
                st.session_state.enhanced_image = None
                st.session_state.processing_metrics = {
                    "original": None,
                    "enhanced": None,
                }
                st.session_state.transformation_history = [
                    {
                        "id": "initial",
                        "label": "Original",
                        "timestamp": __import__("datetime").datetime.now().isoformat(),
                    }
                ]
                st.session_state.is_processing = False
                st.rerun()

        with c2:
            # Processing status indicator
            if st.session_state.is_processing:
                st.info("Enhancement pipeline in progress...", icon="🔄")
            else:
                st.caption("Ready for enhancement")

        # Right: AI Report Toggle
        with st.expander("🤖 AI Clinical Assistant", expanded=False):
            render_ai_report_generator(
                enhanced_image=st.session_state.enhanced_image,
                enhancement_params=st.session_state.enhancement_params,
                metrics=st.session_state.processing_metrics,
                is_processing=st.session_state.is_processing,
                show_dislcimer=True,
            )

    # ─── Unified Two-Column Layout ─────────────────────────────────
    # Left: Comparison + Metrics | Right: Analysis Parameters
    main_col1, main_col2 = st.columns([2, 1], gap="large")

    with main_col1:
        # Comparison Slider with live metrics
        render_comparison_slider(
            original_image=st.session_state.original_image,
            enhanced_image=st.session_state.enhanced_image,
            enhancement_params=st.session_state.enhancement_params,
            processing_metrics=st.session_state.processing_metrics,
            transformation_history=st.session_state.transformation_history,
        )

    with main_col2:
        # Analysis Panel with live metrics
        render_analysis_panel(
            original_image=st.session_state.original_image,
            enhanced_image=st.session_state.enhanced_image,
            enhancement_params=st.session_state.enhancement_params,
            processing_metrics=st.session_state.processing_metrics,
            is_processing=st.session_state.is_processing,
            show_dislcimer=False,  # Handled by AI panel
        )

    # ─── Enhancement Parameters Card (full width) ──────────────────
    st.divider()
    st.markdown("### 🔧 Enhancement Parameters")

    # Parameter controls in a responsive grid
    param_col1, param_col2, param_col3 = st.columns(3, gap="small")

    with param_col1:
        st.selectbox(
            "Noise Method",
            ["Median", "Gaussian"],
            index=["Median", "Gaussian"].index(
                st.session_state.enhancement_params.get("noiseMethod", "Median")
            ),
            key="noise_method",
            on_change=lambda: st.session_state.update(
                {**st.session_state.enhancement_params,
                 "noiseMethod": st.session_state.noise_method}
            ) if hasattr(st, "session_state") else None,
            label_visibility="collapsed",
        )

    with param_col2:
        st.slider(
            "CLAHE Clip Limit",
            min_value=0.5,
            max_value=10.0,
            value=st.session_state.enhancement_params.get("claheClipLimit", 2.0),
            step=0.1,
            key="clahe_clip",
            on_change=lambda: st.session_state.update(
                {**st.session_state.enhancement_params,
                 "claheClipLimit": st.session_state.clahe_clip}
            ) if hasattr(st, "session_state") else None,
            label_visibility="collapsed",
        )

    with param_col3:
        st.selectbox(
            "Tile Grid",
            ["2×2", "4×4", "8×8", "16×16"],
            index=["2×2", "4×4", "8×8", "16×16"].index(
                str(st.session_state.enhancement_params.get("claheTileGrid", 8))
            ),
            key="clahe_tile",
            label_visibility="collapsed",
        )

    # Sharpening row
    st.slider(
        "Sharpening α",
        min_value=0.2,
        max_value=3.0,
        value=st.session_state.enhancement_params.get("sharpenStrength", 1.2),
        step=0.1,
        key="sharpen",
        label_visibility="collapsed",
    )

    # Grayscale toggle
    st.checkbox(
        "Force Grayscale",
        value=st.session_state.enhancement_params.get("forceGrayscale", False),
        key="grayscale",
        label_visibility="collapsed",
    )

    # ─── Apply Enhancement Button ──────────────────────────────────
    st.divider()
    col_btn1, col_btn2, col_btn3 = st.columns([1, 1, 1], gap="medium")

    with col_btn1:
        st.write("")  # spacer

    with col_btn2:
        if st.button(
            "▶️ Apply Enhancement",
            use_container_width=True,
            type="primary",
        ):
            # Set processing state
            st.session_state.is_processing = True
            st.rerun()

    with col_btn3:
        st.write("")  # spacer

    # ─── Mandatory Medical Disclaimer (footer) ─────────────────────
    st.divider()
    st.caption(
        "⚠️ EDUCATIONAL USE ONLY: Not a diagnostic medical device. "
        "Always consult qualified radiologists for medical interpretation."
    )