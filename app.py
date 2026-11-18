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

def _init_session_state():
    """Initialize all required session state keys with safe defaults."""
    defaults = {
        "authenticated": False,
        "username": "User",
        "page_radio": "About",  # Default to public page
        "original_image": None,
        "enhanced_image": None,
        "enhancement_params": {
            "noiseMethod": "Median",
            "kernelSize": 5,
            "contrastMethod": "CLAHE",
            "claheClipLimit": 2.0,
            "claheTileGrid": 8,
            "sharpenStrength": 1.2,
            "sharpenSigma": 1.0,
            "forceGrayscale": False,
        },
        "processing_metrics": {
            "original": None,
            "enhanced": None,
        },
        "transformation_history": [
            {
                "id": "initial",
                "label": "Original",
                "timestamp": __import__("datetime").datetime.now().isoformat(),
            }
        ],
        "is_processing": False,
        "analysis_panel_initialized": False,
        "ai_report_generator_initialized": False,
        "workspace_initialized": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

_init_session_state()

# ─── Page Imports with Error Handling ──────────────────────────────────────────

def _safe_import_page(module_name: str, func_name: str = "render"):
    """Safely import a page render function, returning a fallback if import fails."""
    try:
        module = __import__(f"pages.{module_name}", fromlist=[func_name])
        return getattr(module, func_name)
    except Exception as e:
        # Return a fallback render function that shows the error
        def fallback_render():
            st.error(f"Failed to load page: **{module_name}**")
            st.exception(e)
            st.info("Please check the terminal for error details.")
        return fallback_render

# Import all page render functions with error handling
render_login = _safe_import_page("login", "render")
render_dashboard = _safe_import_page("dashboard", "render")
render_enhancement = _safe_import_page("image_enhancement", "render")
render_comparison = _safe_import_page("image_comparison", "render")
render_ai_analysis = _safe_import_page("ai_analysis_dashboard", "render")
render_histogram = _safe_import_page("histogram_analysis", "render")
render_image_info = _safe_import_page("image_information", "render")
render_about = _safe_import_page("about_project", "render")
render_xray = _safe_import_page("xray_mirror", "render")

# Import components
try:
    from components.dashboard_workspace import render_dashboard_workspace
except Exception as e:
    def render_dashboard_workspace():
        st.error("Failed to load Unified Workspace component")
        st.exception(e)

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
    """Render the sidebar navigation with error handling."""
    try:
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

            # Page selection - validate current page
            current_page = st.session_state.get("page_radio", "About")
            if current_page not in available_pages:
                current_page = available_pages[0]
                st.session_state["page_radio"] = current_page

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
                    _logout()
                    st.rerun()

            # Disclaimer
            st.markdown("---")
            st.caption(f"⚠️ {DISCLAIMER[:100]}...")
    except Exception as e:
        st.sidebar.error("Sidebar rendering error")
        st.sidebar.exception(e)


def _logout():
    """Clear authentication state."""
    for key in ["authenticated", "username"]:
        st.session_state.pop(key, None)
    st.session_state["page_radio"] = "About"


# ─── Main Application ──────────────────────────────────────────────────────────

def main():
    """Main application entry point with robust error handling."""
    try:
        # Render sidebar
        render_sidebar()

        # Get current page with fallback
        current_page = st.session_state.get("page_radio", "About")

        # Handle login redirect - if not authenticated and trying to access protected page
        page_config = PAGES.get(current_page)
        if not page_config:
            # Invalid page - reset to safe default
            st.session_state["page_radio"] = "About"
            current_page = "About"
            page_config = PAGES["About"]

        # Authentication check
        requires_auth = page_config.get("requires_auth", True)
        is_authenticated = st.session_state.get("authenticated", False)

        if requires_auth and not is_authenticated:
            # Redirect to login - we'll show login form inline instead of separate page
            st.session_state["page_radio"] = "About"
            st.info("Please log in to access this page.", icon="🔒")
            _render_login_form()
            return

        # Render the selected page with error handling
        render_func = page_config.get("render")
        if render_func:
            try:
                render_func()
            except Exception as e:
                st.error(f"Error rendering page: **{current_page}**")
                st.exception(e)
                st.info("This page encountered an error. Please try navigating to another page or refresh.")
        else:
            st.error(f"Page '{current_page}' has no render function")

    except Exception as e:
        st.error("Application error")
        st.exception(e)


def _render_login_form():
    """Render inline login form when authentication is required."""
    st.markdown(
        f"""
        <div style="
            background: white;
            border-radius: 20px;
            padding: 3rem 2.5rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            border: 1px solid {COLORS['border']};
            text-align: center;
            max-width: 480px;
            margin: 2rem auto;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, {COLORS['navy']}, {COLORS['blue']});
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                margin: 0 auto 1.5rem;
                box-shadow: 0 8px 24px rgba(30, 64, 175, 0.3);
            ">
                🩻
            </div>
            <h1 style="color: {COLORS['navy']}; margin: 0 0 0.5rem 0; font-size: 2rem; font-weight: 800;">{APP_NAME}</h1>
            <p style="color: {COLORS['muted']}; margin: 0 0 2rem 0; font-size: 1rem; font-style: italic;">A Clearer View of Every Scan.</p>

            <div style="
                background: {COLORS['background']};
                border-radius: 12px;
                padding: 1.25rem;
                margin-bottom: 1.5rem;
                text-align: left;
            ">
                <p style="margin: 0 0 0.75rem 0; color: {COLORS['muted']}; font-size: 0.85rem; font-weight: 600;">Demo Credentials</p>
                <div style="font-family: monospace; font-size: 0.85rem; color: {COLORS['text']}; line-height: 1.8;">
                    <strong>Username:</strong> demo<br>
                    <strong>Password:</strong> scanova2024
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form("login_form", clear_on_submit=False):
        st.markdown("### Sign In")
        username = st.text_input("Username", placeholder="Enter username", key="login_username")
        password = st.text_input("Password", type="password", placeholder="Enter password", key="login_password")

        col1, col2 = st.columns(2)
        with col1:
            remember = st.checkbox("Remember me", value=True)
        with col2:
            st.markdown(
                f"<div style='text-align:right; margin-top: 0.5rem;'>"
                f"<a href='#' style='color: {COLORS['blue']}; text-decoration: none; font-size: 0.85rem;'>Forgot password?</a>"
                f"</div>",
                unsafe_allow_html=True,
            )

        submitted = st.form_submit_button("Sign In", type="primary", use_container_width=True)

        if submitted:
            if _authenticate(username, password):
                st.session_state["authenticated"] = True
                st.session_state["username"] = username
                st.session_state["page_radio"] = "Home"
                st.rerun()
            else:
                st.error("Invalid username or password. Please try demo credentials.")

    st.markdown("---")
    st.caption(f"⚠️ {DISCLAIMER}")


def _authenticate(username: str, password: str) -> bool:
    """Simple authentication for demo purposes."""
    demo_users = {
        "demo": "scanova2024",
        "admin": "admin123",
        "researcher": "research2024",
    }
    return demo_users.get(username) == password


if __name__ == "__main__":
    main()