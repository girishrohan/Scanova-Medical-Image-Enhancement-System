"""
SCANOVA — Medical Image Enhancement System
Main application entry point with unified multi-view workspace.
"""

import streamlit as st

# ─── Page Configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="SCANOVA — Medical Image Enhancement",
    page_icon="🩻",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": None,
        "Report a bug": None,
        "About": "SCANOVA v1.0.0 — Medical Image Enhancement System for Educational Purposes",
    },
)

# ─── Custom CSS ────────────────────────────────────────────────────────────────

st.markdown(
    """
    <style>
    /* Premium medical technology theme — matching SCANOVA branding */
    :root {
        --navy: #0F2C4D;
        --blue: #1E40AF;
        --teal: #0D9488;
        --success: #16A34A;
        --warning: #F59E0B;
        --error: #DC2626;
        --bg: #F8FAFC;
        --surface: #FFFFFF;
        --text: #0F172A;
        --muted: #475569;
        --border: #E2E8F0;
    }

    /* Global styles */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }

    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0F2C4D 0%, #1E3A5F 100%);
    }

    section[data-testid="stSidebar"] * {
        color: white !important;
    }

    /* Button styles */
    .stButton > button {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #1E40AF, #1D4ED8);
        border: none;
    }

    .stButton > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #1D4ED8, #2563EB);
        box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }

    /* Metric cards */
    [data-testid="stMetric"] {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1rem;
    }

    /* Expander */
    .streamlit-expanderHeader {
        background: #F8FAFC;
        border-radius: 8px;
        border: 1px solid #E2E8F0;
    }

    /* File uploader */
    .stFileUploader > div > div {
        border: 2px dashed #CBD5E1;
        border-radius: 12px;
    }

    .stFileUploader > div > div:hover {
        border-color: #14B8A6;
        background: #ECFDF5;
    }

    /* Hide default streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: #F1F5F9;
    }
    ::-webkit-scrollbar-thumb {
        background: #94A3B8;
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #64748B;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ─── Session State Initialization ─────────────────────────────────────────────

if "authenticated" not in st.session_state:
    st.session_state["authenticated"] = False

if "page_radio" not in st.session_state:
    st.session_state["page_radio"] = "Dashboard"

if "username" not in st.session_state:
    st.session_state["username"] = "User"

# ─── Page Imports ─────────────────────────────────────────────────────────────

from pages.login import render as render_login, check_auth, logout
from pages.dashboard import render as render_dashboard
from pages.image_enhancement import render as render_enhancement
from pages.image_comparison import render as render_comparison
from pages.ai_analysis_dashboard import render as render_ai_analysis
from pages.histogram_analysis import render as render_histogram
from pages.image_information import render as render_image_info
from pages.about_project import render as render_about
from pages.xray_mirror import render as render_xray
from components.dashboard_workspace import render_dashboard_workspace

from config import APP_NAME, APP_VERSION, COLORS, DISCLAIMER


# ─── Navigation Configuration ──────────────────────────────────────────────────

PAGES = {
    "Home": {
        "icon": "🏠",
        "render": render_dashboard,
        "requires_auth": True,
    },
    "Image Enhancement": {
        "icon": "🔬",
        "render": render_enhancement,
        "requires_auth": True,
    },
    "AI Analysis": {
        "icon": "🤖",
        "render": render_ai_analysis,
        "requires_auth": True,
    },
    "Comparison": {
        "icon": "⚖️",
        "render": render_comparison,
        "requires_auth": True,
    },
    "Unified Workspace": {
        "icon": "🪟",
        "render": render_dashboard_workspace,
        "requires_auth": True,
    },
    "Histogram Analysis": {
        "icon": "📊",
        "render": render_histogram,
        "requires_auth": True,
    },
    "Image Information": {
        "icon": "ℹ️",
        "render": render_image_info,
        "requires_auth": True,
    },
    "X-Ray Mirror": {
        "icon": "🪟",
        "render": render_xray,
        "requires_auth": True,
    },
    "About": {
        "icon": "ℹ️",
        "render": render_about,
        "requires_auth": False,
    },
}


# ─── Sidebar Navigation ────────────────────────────────────────────────────────

def render_sidebar():
    """Render the sidebar navigation."""
    with st.sidebar:
        # Logo
        st.markdown(
            f"""
            <div style="text-align: center; padding: 1.5rem 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.2);">
                <div style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #14B8A6, #0D9488);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    margin: 0 auto 1rem;
                    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.3);
                ">
                    🩻
                </div>
                <h2 style="margin: 0 0 0.25rem; font-weight: 800;">{APP_NAME}</h2>
                <p style="margin: 0; opacity: 0.8; font-size: 0.85rem;">v{APP_VERSION}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # Navigation
        st.markdown("### Navigation")

        # Filter pages based on auth
        if st.session_state.get("authenticated", False):
            available_pages = list(PAGES.keys())
        else:
            available_pages = ["About"]

        # Page selection
        if "page_radio" not in st.session_state:
            st.session_state["page_radio"] = "Dashboard" if st.session_state.get("authenticated", False) else "About"

        current_page = st.session_state["page_radio"]
        if current_page not in available_pages:
            current_page = available_pages[0]

        page_index = available_pages.index(current_page) if current_page in available_pages else 0

        page_names = [f"{PAGES[p]['icon']}  {p}" for p in available_pages]
        selected = st.radio(
            "",
            options=page_names,
            index=page_index,
            key="page_radio",
            label_visibility="collapsed",
        )

        if selected:
            selected_page = available_pages[page_names.index(selected)] if selected in page_names else available_pages[0]
            st.session_state["page_radio"] = selected_page

        # User info and logout
        if st.session_state.get("authenticated", False):
            st.markdown("---")
            st.markdown(
                f"""
                <div style="padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">👤 {st.session_state.get('username', 'User')}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button("🚪 Logout", use_container_width=True):
                logout()
                st.rerun()

        # Disclaimer
        st.markdown("---")
        st.caption(f"⚠️ {DISCLAIMER[:100]}...")


# ─── Main Application ──────────────────────────────────────────────────────────

def main():
    """Main application entry point."""

    # Render sidebar
    render_sidebar()

    # Check authentication for protected pages
    current_page = st.session_state.get("page_radio", "Home")

    if current_page == "Login" or (current_page == "Home" and not st.session_state.get("authenticated", False)):
        # Show login page
        render_login()
        return

    if PAGES.get(current_page, {}).get("requires_auth", True) and not st.session_state.get("authenticated", False):
        # Redirect to login
        st.session_state["page_radio"] = "Login"
        st.rerun()
        return

    # Render the selected page
    page_config = PAGES.get(current_page)
    if page_config:
        page_config["render"]()
    else:
        st.error(f"Page '{current_page}' not found")


if __name__ == "__main__":
    main()