"""
app.py — Scanova Medical Image Enhancement System
──────────────────────────────────────────────────
Main Streamlit entrypoint.

Run with:
    python -m streamlit run app.py
"""

from __future__ import annotations

import os
import sys

import streamlit as st

# ── Path setup so modules can be imported from project root ───────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from config import (
    APP_NAME, APP_TAGLINE, APP_VERSION, COLORS,
    DEFAULT_SETTINGS, PARAM_BOUNDS, DISCLAIMER,
    SAMPLE_IMAGES, SAMPLE_IMAGE_DIR,
)
from services.image_processing_service import PipelineSettings

# ── Page configuration ─────────────────────────────────────────────────────────
st.set_page_config(
    page_title=f"{APP_NAME} — Medical Image Enhancement",
    page_icon="🩻",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "About": (
            f"**{APP_NAME}** – {APP_TAGLINE}  \n"
            "CGIP Mini Project · Computer Science & Engineering  \n"
            "Educational use only. Not a diagnostic tool."
        ),
    },
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown(
    f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    /* Root variables */
    :root {{
        --navy:  {COLORS['navy']};
        --blue:  {COLORS['blue']};
        --teal:  {COLORS['teal']};
        --bg:    {COLORS['background']};
        --text:  {COLORS['text']};
        --muted: {COLORS['muted']};
    }}

    /* ── Global ─────────────────────────────────────────────────────── */
    html, body, [class*="css"] {{
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: var(--bg);
        color: var(--text);
    }}

    /* App background */
    .stApp {{
        background: linear-gradient(135deg, #EFF6FF 0%, #F1F5F9 50%, #F0FDF4 100%);
        min-height: 100vh;
    }}

    /* ── Main content area ───────────────────────────────────────────── */
    .main .block-container {{
        padding-top: 1.5rem;
        padding-bottom: 3rem;
        max-width: 1280px;
    }}

    /* ── Sidebar ─────────────────────────────────────────────────────── */
    section[data-testid="stSidebar"] {{
        background: linear-gradient(180deg, {COLORS['navy']} 0%, #1e3a5f 100%);
        border-right: none;
        box-shadow: 4px 0 20px rgba(0,0,0,0.15);
    }}
    section[data-testid="stSidebar"] * {{
        color: #E2E8F0 !important;
    }}
    section[data-testid="stSidebar"] .stSelectbox label,
    section[data-testid="stSidebar"] .stSlider label,
    section[data-testid="stSidebar"] .stCheckbox label,
    section[data-testid="stSidebar"] .stRadio label {{
        color: #CBD5E1 !important;
        font-size: 0.82rem;
        font-weight: 500;
        letter-spacing: 0.02em;
    }}
    section[data-testid="stSidebar"] .stSelectbox > div > div {{
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white !important;
        border-radius: 8px;
    }}
    section[data-testid="stSidebar"] hr {{
        border-color: rgba(255,255,255,0.15) !important;
    }}
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {{
        color: #94A3B8 !important;
        font-size: 0.78rem;
    }}

    /* ── Primary buttons ─────────────────────────────────────────────── */
    .stButton > button[kind="primary"] {{
        background: linear-gradient(135deg, {COLORS['blue']}, #1d4ed8);
        border: none;
        color: white;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.55rem 1.2rem;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(37,99,235,0.35);
    }}
    .stButton > button[kind="primary"]:hover {{
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(37,99,235,0.45);
    }}
    .stButton > button[kind="secondary"] {{
        background: white;
        border: 1.5px solid #E2E8F0;
        color: {COLORS['navy']};
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s ease;
    }}
    .stButton > button[kind="secondary"]:hover {{
        border-color: {COLORS['blue']};
        color: {COLORS['blue']};
        box-shadow: 0 2px 8px rgba(37,99,235,0.2);
    }}

    /* ── Download button ─────────────────────────────────────────────── */
    .stDownloadButton > button {{
        background: linear-gradient(135deg, {COLORS['teal']}, #0d9488);
        border: none;
        color: white;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.55rem 1.2rem;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(20,184,166,0.35);
    }}
    .stDownloadButton > button:hover {{
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(20,184,166,0.45);
    }}

    /* ── Metric cards ────────────────────────────────────────────────── */
    [data-testid="stMetric"] {{
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: box-shadow 0.2s;
    }}
    [data-testid="stMetric"]:hover {{
        box-shadow: 0 4px 16px rgba(0,0,0,0.10);
    }}
    [data-testid="stMetricLabel"] p {{
        color: #64748B;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }}
    [data-testid="stMetricValue"] {{
        color: {COLORS['navy']};
        font-weight: 700;
    }}

    /* ── Tabs ────────────────────────────────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {{
        background: white;
        border-radius: 12px;
        padding: 4px;
        gap: 2px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }}
    .stTabs [data-baseweb="tab"] {{
        border-radius: 9px;
        font-weight: 600;
        font-size: 0.85rem;
        color: #64748B;
        padding: 8px 16px;
    }}
    .stTabs [aria-selected="true"] {{
        background: linear-gradient(135deg, {COLORS['blue']}, #1d4ed8);
        color: white !important;
    }}

    /* ── Expander ────────────────────────────────────────────────────── */
    .streamlit-expanderHeader {{
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        font-weight: 600;
        color: {COLORS['navy']};
    }}
    .streamlit-expanderContent {{
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-top: none;
        border-radius: 0 0 10px 10px;
    }}

    /* ── File uploader ───────────────────────────────────────────────── */
    [data-testid="stFileUploaderDropzone"] {{
        background: linear-gradient(135deg, #EFF6FF, #F0F9FF);
        border: 2px dashed {COLORS['blue']};
        border-radius: 14px;
        transition: all 0.2s ease;
    }}
    [data-testid="stFileUploaderDropzone"]:hover {{
        border-color: {COLORS['teal']};
        background: linear-gradient(135deg, #F0FDF4, #ECFDF5);
    }}

    /* ── Info / Warning / Success boxes ─────────────────────────────── */
    .stAlert {{
        border-radius: 10px;
        border-left-width: 4px;
    }}

    /* ── Images ──────────────────────────────────────────────────────── */
    [data-testid="stImage"] img {{
        border-radius: 10px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }}

    /* ── Dividers ────────────────────────────────────────────────────── */
    hr {{
        border-color: #E2E8F0;
        margin: 1.5rem 0;
    }}

    /* ── Heading colours ─────────────────────────────────────────────── */
    h1, h2, h3 {{
        color: {COLORS['navy']};
        font-weight: 700;
    }}
    h2 {{ font-size: 1.5rem; }}
    h3 {{ font-size: 1.15rem; }}

    /* ── Progress bar ────────────────────────────────────────────────── */
    .stProgress > div > div > div {{
        background: linear-gradient(90deg, {COLORS['blue']}, {COLORS['teal']});
        border-radius: 99px;
    }}

    /* ── Spinner ─────────────────────────────────────────────────────── */
    .stSpinner > div {{
        border-top-color: {COLORS['blue']} !important;
    }}
    </style>
    """,
    unsafe_allow_html=True,
)


# ── Sidebar ───────────────────────────────────────────────────────────────────
def _render_sidebar() -> tuple[str, PipelineSettings]:
    with st.sidebar:
        # Brand
        st.markdown(
            f"""
            <div style="text-align:center; padding:1.2rem 0 0.5rem;">
                <div style="font-size:2.8rem;">🩻</div>
                <div style="font-size:1.5rem; font-weight:800; color:#FFFFFF;
                            letter-spacing:0.04em;">SCANOVA</div>
                <div style="font-size:0.72rem; color:#94A3B8; margin-top:2px;
                            letter-spacing:0.06em;">A Clearer View of Every Scan.</div>
                <div style="font-size:0.65rem; color:#64748B; margin-top:4px;">
                    CGIP Mini Project · v{APP_VERSION}
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("---")

        # Navigation
        st.markdown(
            "<div style='font-size:0.7rem;font-weight:700;color:#64748B;"
            "letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;'>"
            "Navigation</div>",
            unsafe_allow_html=True,
        )
        pages = [
            ("🏠",  "Home"),
            ("🔬",  "Image Enhancement"),
            ("⚖️",   "Image Comparison"),
            ("📊",  "Histogram Analysis"),
            ("📈",  "Image Information"),
            ("📑",  "About Project"),
        ]
        page_labels = [f"{icon}  {name}" for icon, name in pages]
        selected_label = st.radio(
            "navigation",
            options=page_labels,
            label_visibility="collapsed",
            key="page_radio",
        )
        # Extract clean page name
        page_name = selected_label.split("  ", 1)[-1]

        st.markdown("---")

        # ── Processing Settings ────────────────────────────────────────────────
        st.markdown(
            "<div style='font-size:0.7rem;font-weight:700;color:#64748B;"
            "letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;'>"
            "⚙ Enhancement Settings</div>",
            unsafe_allow_html=True,
        )

        with st.expander("Noise Reduction", expanded=True):
            noise_method = st.selectbox(
                "Filter type",
                ["Median", "Gaussian"],
                index=0 if DEFAULT_SETTINGS["noise_method"] == "Median" else 1,
                key="noise_method",
            )
            kernel_size = st.select_slider(
                "Kernel size (must be odd)",
                options=[3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
                value=DEFAULT_SETTINGS["kernel_size"],
                key="kernel_size",
            )
            gauss_sigma = 1.0
            if noise_method == "Gaussian":
                gauss_sigma = st.slider(
                    "Gaussian σ",
                    min_value=PARAM_BOUNDS["gaussian_sigma_min"],
                    max_value=PARAM_BOUNDS["gaussian_sigma_max"],
                    value=DEFAULT_SETTINGS["gaussian_sigma"],
                    step=0.1,
                    key="gauss_sigma",
                )

        with st.expander("Contrast Enhancement", expanded=True):
            contrast_method = st.selectbox(
                "Method",
                ["CLAHE", "Histogram Equalization"],
                index=0,
                key="contrast_method",
            )
            clahe_clip = DEFAULT_SETTINGS["clahe_clip_limit"]
            clahe_tile = DEFAULT_SETTINGS["clahe_tile_grid"]
            if contrast_method == "CLAHE":
                clahe_clip = st.slider(
                    "Clip limit",
                    min_value=PARAM_BOUNDS["clahe_clip_min"],
                    max_value=PARAM_BOUNDS["clahe_clip_max"],
                    value=DEFAULT_SETTINGS["clahe_clip_limit"],
                    step=0.5,
                    key="clahe_clip",
                )
                clahe_tile = st.select_slider(
                    "Tile grid size",
                    options=[2, 4, 6, 8, 10, 12, 16, 24, 32],
                    value=DEFAULT_SETTINGS["clahe_tile_grid"],
                    key="clahe_tile",
                )

        with st.expander("Edge Enhancement", expanded=True):
            sharpen_strength = st.slider(
                "Sharpening strength (α)",
                min_value=PARAM_BOUNDS["sharpen_min"],
                max_value=PARAM_BOUNDS["sharpen_max"],
                value=DEFAULT_SETTINGS["sharpen_strength"],
                step=0.1,
                key="sharpen_str",
            )
            sharpen_sigma = st.slider(
                "Sharpen blur σ",
                min_value=0.1,
                max_value=3.0,
                value=DEFAULT_SETTINGS["sharpen_sigma"],
                step=0.1,
                key="sharpen_sigma",
            )

        with st.expander("Advanced", expanded=False):
            force_gray = st.checkbox(
                "Force grayscale conversion",
                value=DEFAULT_SETTINGS["force_grayscale"],
                key="force_gray",
                help="Always convert color images to grayscale before processing.",
            )
            show_edges = st.checkbox(
                "Show Sobel edge overlay",
                value=DEFAULT_SETTINGS["show_edge_overlay"],
                key="show_edges",
                help="Display Sobel edge map for educational visualisation.",
            )

        st.markdown("---")

        # Session state indicator
        has_orig = "original_image" in st.session_state
        has_enh  = "enhanced_image" in st.session_state
        st.markdown(
            f"""
            <div style="font-size:0.75rem; color:#94A3B8; padding:0 0.5rem;">
                <div style="margin:2px 0;">
                    {'✅' if has_orig else '⬜'} Image loaded
                </div>
                <div style="margin:2px 0;">
                    {'✅' if has_enh else '⬜'} Enhanced
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    settings = PipelineSettings(
        noise_method=noise_method,
        kernel_size=int(kernel_size),
        gaussian_sigma=float(gauss_sigma),
        contrast_method=contrast_method,
        clahe_clip_limit=float(clahe_clip),
        clahe_tile_grid=int(clahe_tile),
        sharpen_strength=float(sharpen_strength),
        sharpen_sigma=float(sharpen_sigma),
        force_grayscale=bool(force_gray),
        show_edge_overlay=bool(show_edges),
    )
    return page_name, settings


# ── Home page ─────────────────────────────────────────────────────────────────
def _render_home():
    # Hero
    st.markdown(
        f"""
        <div style="background:linear-gradient(135deg,{COLORS['navy']} 0%,#1e40af 60%,#0891b2 100%);
                    border-radius:20px; padding:3rem 2.5rem; margin-bottom:2rem;
                    box-shadow:0 10px 40px rgba(23,43,77,0.25);">
            <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
                <div style="font-size:5rem;">🩻</div>
                <div>
                    <h1 style="color:white;margin:0;font-size:2.8rem;font-weight:800;
                                letter-spacing:-0.02em;">SCANOVA</h1>
                    <p style="color:#93C5FD;margin:4px 0;font-size:1.1rem;font-style:italic;">
                        A Clearer View of Every Scan.
                    </p>
                    <p style="color:#CBD5E1;margin:8px 0 0;font-size:0.9rem;max-width:600px;">
                        A Computer Graphics &amp; Image Processing mini project demonstrating
                        real digital image enhancement algorithms on medical imaging modalities.
                    </p>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Feature cards
    features = [
        ("🔬", "Real Algorithms",
         "Actual OpenCV implementations: Median/Gaussian filtering, CLAHE, Unsharp Masking."),
        ("📊", "Histogram Analysis",
         "Interactive Plotly histograms and CDF comparison from actual pixel data."),
        ("⚖️", "Before / After",
         "Side-by-side comparison with quantitative quality metrics."),
        ("🏥", "DICOM Support",
         "Load DICOM files with Hounsfield Unit windowing and MONOCHROME1/2 handling."),
        ("📑", "PDF Report",
         "Generate an academic ReportLab PDF with parameters, metrics, and images."),
        ("🎓", "Viva Ready",
         "12+ viva Q&A, algorithm explanations, pseudocode, and project documentation."),
    ]

    cols = st.columns(3, gap="medium")
    for i, (icon, title, desc) in enumerate(features):
        with cols[i % 3]:
            st.markdown(
                f"""
                <div style="background:white;border:1px solid #E2E8F0;border-radius:14px;
                            padding:1.4rem;margin-bottom:1rem;
                            box-shadow:0 2px 10px rgba(0,0,0,0.05);
                            transition:all 0.2s ease;">
                    <div style="font-size:2rem;margin-bottom:0.6rem;">{icon}</div>
                    <div style="font-weight:700;color:{COLORS['navy']};
                                margin-bottom:0.4rem;font-size:0.95rem;">{title}</div>
                    <div style="color:{COLORS['muted']};font-size:0.82rem;
                                line-height:1.5;">{desc}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # Pipeline overview
    st.markdown("---")
    st.markdown("### 🔄 Enhancement Pipeline")
    stages = [
        ("1", "Acquisition", "Load & validate"),
        ("2", "Grayscale", "Smart conversion"),
        ("3", "Denoise", "Median / Gaussian"),
        ("4", "Contrast", "CLAHE / HE"),
        ("5", "Sharpen", "Unsharp masking"),
        ("6", "Output", "Download & analyse"),
    ]
    pcols = st.columns(6, gap="small")
    for col, (num, title, sub) in zip(pcols, stages):
        with col:
            st.markdown(
                f"""
                <div style="text-align:center;background:white;border-radius:12px;
                            padding:0.9rem 0.4rem;border:1px solid #E2E8F0;
                            box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <div style="background:linear-gradient(135deg,{COLORS['blue']},{COLORS['teal']});
                                color:white;border-radius:50%;width:32px;height:32px;
                                display:flex;align-items:center;justify-content:center;
                                font-weight:700;font-size:0.9rem;margin:0 auto 6px;">
                        {num}
                    </div>
                    <div style="font-weight:700;color:{COLORS['navy']};font-size:0.82rem;">{title}</div>
                    <div style="color:{COLORS['muted']};font-size:0.72rem;margin-top:2px;">{sub}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # CTA
    st.markdown("---")
    st.markdown(
        f"""
        <div style="text-align:center;padding:2rem;background:linear-gradient(135deg,#EFF6FF,#F0FDF4);
                    border-radius:16px;border:1px solid #E2E8F0;">
            <div style="font-size:1.2rem;font-weight:700;color:{COLORS['navy']};margin-bottom:0.5rem;">
                Ready to enhance your images?
            </div>
            <div style="color:{COLORS['muted']};font-size:0.9rem;margin-bottom:1rem;">
                Select <b>Image Enhancement</b> from the sidebar to get started.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Disclaimer
    st.markdown("---")
    st.warning(DISCLAIMER, icon="⚠️")

    # Sample images preview
    st.markdown("### 🗂 Available Demo Images")
    sample_cols = st.columns(3, gap="medium")
    sample_paths = {
        name: os.path.join(SAMPLE_IMAGE_DIR, fname)
        for name, fname in SAMPLE_IMAGES.items()
    }
    for col, (name, path) in zip(sample_cols, sample_paths.items()):
        with col:
            if os.path.exists(path):
                from PIL import Image as PILImage
                img = PILImage.open(path)
                st.image(img, caption=f"{name} (synthetic demo)", use_container_width=True)
            else:
                st.info(f"{name}: run `python data/generate_samples.py` to create samples.")


# ── PDF download section (shared) ─────────────────────────────────────────────
def _pdf_section():
    pr   = st.session_state.get("pipeline_result")
    orig = st.session_state.get("original_image")
    enh  = st.session_state.get("enhanced_image")
    if pr and orig is not None and enh is not None:
        st.markdown("---")
        st.markdown("### 📄 Generate PDF Report")
        if st.button("Generate & Download PDF Report", key="pdf_btn", type="secondary"):
            with st.spinner("Generating PDF…"):
                try:
                    from services.export_service import generate_pdf_report
                    pdf_bytes = generate_pdf_report(
                        original_image=orig,
                        enhanced_image=enh,
                        orig_metrics=pr.original_metrics,
                        enh_metrics=pr.enhanced_metrics,
                        settings=pr.settings,
                        delta=pr.delta,
                        processing_time_ms=pr.total_time_ms,
                        filename=st.session_state.get("loaded_filename", "image"),
                    )
                    st.download_button(
                        "⬇ Download PDF Report",
                        data=pdf_bytes,
                        file_name="scanova_report.pdf",
                        mime="application/pdf",
                        key="pdf_dl_btn",
                        type="primary",
                    )
                    st.success("PDF generated successfully.")
                except Exception as exc:
                    st.error(f"PDF generation failed: {exc}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    page, settings = _render_sidebar()

    if page == "Home":
        _render_home()

    elif page == "Image Enhancement":
        from pages.image_enhancement import render as render_enhance
        render_enhance(settings)
        _pdf_section()

    elif page == "Image Comparison":
        from pages.image_comparison import render as render_compare
        render_compare()

    elif page == "Histogram Analysis":
        from pages.histogram_analysis import render as render_hist
        render_hist()

    elif page == "Image Information":
        from pages.image_information import render as render_info
        render_info()

    elif page == "About Project":
        from pages.about_project import render as render_about
        render_about()

    # Footer
    st.markdown(
        f"""
        <div style="text-align:center;color:{COLORS['muted']};font-size:0.75rem;
                    padding:2rem 0 1rem;border-top:1px solid #E2E8F0;margin-top:3rem;">
            <span style="font-weight:600;color:{COLORS['navy']};">SCANOVA</span> ·
            CGIP Mini Project · Computer Science &amp; Engineering ·
            Built with Python, Streamlit &amp; OpenCV ·
            Educational Use Only
        </div>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
