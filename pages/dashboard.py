"""
pages/dashboard.py — Scanova Main Dashboard

Post-login dashboard showing user info, recent activity, quick actions,
and navigation to all features.
"""

from __future__ import annotations

import streamlit as st
from config import COLORS, APP_NAME, APP_VERSION, DISCLAIMER


def render():
    """Render the main dashboard after authentication."""

    # Add logout button in top right
    col_title, col_user = st.columns([3, 1])
    with col_title:
        st.markdown(f"## {APP_NAME} Dashboard")
        st.caption(f"Welcome back, **{st.session_state.get('username', 'User')}** · Version {APP_VERSION}")
    with col_user:
        if st.button("🚪 Logout", key="logout_btn", use_container_width=True):
            from pages.login import logout
            logout()

    st.divider()

    # ── Quick Stats Cards ──────────────────────────────────────────────────────
    st.markdown("### Overview")

    has_orig = "original_image" in st.session_state
    has_enh = "enhanced_image" in st.session_state
    has_ai = "ai_analysis_result" in st.session_state or "ai_enhanced_analysis" in st.session_state

    col1, col2, col3, col4 = st.columns(4, gap="medium")

    with col1:
        _stat_card(
            "Images Uploaded",
            "1" if has_orig else "0",
            "📤",
            "primary" if has_orig else "secondary",
        )
    with col2:
        _stat_card(
            "Enhanced",
            "1" if has_enh else "0",
            "🔬",
            "primary" if has_enh else "secondary",
        )
    with col3:
        _stat_card(
            "AI Analyzed",
            "1" if has_ai else "0",
            "🤖",
            "primary" if has_ai else "secondary",
        )
    with col4:
        _stat_card(
            "Reports Ready",
            "1" if has_enh and has_ai else "0",
            "📄",
            "primary" if has_enh and has_ai else "secondary",
        )

    st.divider()

    # ── Quick Actions ──────────────────────────────────────────────────────────
    st.markdown("### Quick Actions")

    qa1, qa2, qa3, qa4 = st.columns(4, gap="medium")

    with qa1:
        _action_card(
            "🔬 Enhance Image",
            "Upload and process medical images with our 6-stage pipeline",
            "Image Enhancement",
            COLORS["blue"],
        )

    with qa2:
        _action_card(
            "🤖 AI Analysis",
            "Run body part identification and abnormality detection",
            "AI Analysis",
            COLORS["teal"],
        )

    with qa3:
        _action_card(
            "📊 View Reports",
            "Generate and download professional PDF reports",
            "Image Enhancement",  # Navigate to enhancement for PDF
            COLORS["navy"],
        )

    with qa4:
        _action_card(
            "🪟 X-Ray Mirror",
            "Real-time anatomical visualization with webcam tracking",
            "X-Ray Mirror",
            COLORS["teal"],
        )

    with qa4:
        _action_card(
            "🪟 X-Ray Mirror",
            "Real-time anatomical visualization with webcam tracking",
            "X-Ray Mirror",
            COLORS["teal"],
        )

    st.divider()

    # ── Recent Activity ────────────────────────────────────────────────────────
    st.markdown("### Recent Activity")

    activities = []

    if has_ai:
        activities.append({
            "icon": "🤖",
            "title": "AI Analysis Completed",
            "detail": "Body part identification and abnormality detection finished",
            "time": "Just now",
        })

    if has_enh:
        pr = st.session_state.get("pipeline_result")
        time_str = f"{pr.total_time_ms:.0f} ms" if pr else "completed"
        activities.append({
            "icon": "🔬",
            "title": "Image Enhanced",
            "detail": f"Pipeline completed in {time_str}",
            "time": "Recent",
        })

    if has_orig:
        fname = st.session_state.get("loaded_filename", "image")
        activities.append({
            "icon": "📤",
            "title": "Image Uploaded",
            "detail": f"{fname}",
            "time": "Recent",
        })

    if not activities:
        st.markdown(
            f"""
            <div style="
                text-align: center;
                padding: 3rem 2rem;
                background: {COLORS['background']};
                border-radius: 16px;
                border: 1px dashed {COLORS['border']};
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <h3 style="color: {COLORS['navy']}; margin-bottom: 0.5rem;">No Activity Yet</h3>
                <p style="color: {COLORS['muted']}; margin: 0;">
                    Start by uploading a medical image from the Image Enhancement page.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        for activity in activities:
            _activity_item(activity)

    st.divider()

    # ── Feature Highlights ─────────────────────────────────────────────────────
    st.markdown("### Features at a Glance")

    features = [
        ("🔬", "Image Enhancement", "6-stage pipeline: Acquisition → Grayscale → Denoise → Contrast → Sharpen → Output"),
        ("⚖️", "Before/After Comparison", "Side-by-side with quantitative metric deltas"),
        ("📊", "Histogram Analysis", "Interactive Plotly histograms with CDF"),
        ("ℹ️", "Image Information", "DICOM metadata, pixel stats, quality indicators"),
        ("🤖", "AI Analysis", "Body region ID, fracture detection, visual overlays"),
        ("📄", "PDF Reports", "Professional academic reports with ReportLab"),
    ]

    for icon, title, desc in features:
        with st.expander(f"{icon}  {title}", expanded=False):
            st.markdown(desc)

    # Footer disclaimer
    st.markdown("---")
    st.caption(f"⚠️ {DISCLAIMER}")


def _stat_card(label: str, value: str, icon: str, card_type: str = "secondary"):
    """Render a statistic card."""
    bg_color = COLORS["background"]
    border_color = COLORS["border"]
    text_color = COLORS["navy"]
    value_color = COLORS["blue"] if card_type == "primary" else COLORS["muted"]
    icon_bg = f"linear-gradient(135deg, {COLORS['blue']}, {COLORS['teal']})" if card_type == "primary" else COLORS["background_dark"]

    st.markdown(
        f"""
        <div style="
            background: {bg_color};
            border: 1px solid {border_color};
            border-radius: 14px;
            padding: 1.25rem;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        ">
            <div style="
                width: 48px;
                height: 48px;
                background: {icon_bg};
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin: 0 auto 0.75rem;
            ">
                {icon}
            </div>
            <div style="
                font-size: 2rem;
                font-weight: 800;
                color: {value_color};
                line-height: 1;
                margin-bottom: 0.25rem;
            ">
                {value}
            </div>
            <div style="
                font-size: 0.8rem;
                color: {COLORS['muted']};
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            ">
                {label}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _action_card(title: str, description: str, target_page: str, accent_color: str):
    """Render an action card with navigation."""
    st.markdown(
        f"""
        <div style="
            background: white;
            border: 1px solid {COLORS['border']};
            border-radius: 14px;
            padding: 1.5rem;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
            transition: all 0.2s ease;
            height: 100%;
        ">
            <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, {accent_color}, {accent_color});
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin-bottom: 1rem;
            ">
                {title.split()[0]}
            </div>
            <div style="
                font-size: 1.1rem;
                font-weight: 700;
                color: {COLORS['navy']};
                margin-bottom: 0.5rem;
            ">
                {title}
            </div>
            <div style="
                color: {COLORS['muted']};
                font-size: 0.9rem;
                line-height: 1.5;
                margin-bottom: 1rem;
            ">
                {description}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button(
        f"Open {title.split()[-1]}",
        key=f"action_{title.replace(' ', '_').replace('🔬', '').replace('🤖', '').replace('📊', '').replace('📄', '').strip()}",
        use_container_width=True,
        type="secondary",
    ):
        st.session_state["page_radio"] = target_page
        st.rerun()


def _activity_item(activity: dict):
    """Render a single activity item."""
    st.markdown(
        f"""
        <div style="
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: white;
            border: 1px solid {COLORS['border']};
            border-radius: 12px;
            margin-bottom: 0.75rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        ">
            <div style="
                width: 44px;
                height: 44px;
                background: {COLORS['background']};
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                flex-shrink: 0;
            ">
                {activity['icon']}
            </div>
            <div style="flex: 1;">
                <div style="
                    font-weight: 600;
                    color: {COLORS['navy']};
                    font-size: 0.95rem;
                    margin-bottom: 0.25rem;
                ">
                    {activity['title']}
                </div>
                <div style="
                    color: {COLORS['muted']};
                    font-size: 0.85rem;
                    line-height: 1.4;
                ">
                    {activity['detail']}
                </div>
            </div>
            <div style="
                color: {COLORS['muted_light']};
                font-size: 0.75rem;
                text-align: right;
                padding-top: 0.25rem;
            ">
                {activity['time']}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )