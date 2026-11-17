"""
pages/login.py — Scanova Login & Authentication Page

Provides a clean, professional login interface with demo credentials
for educational demonstration purposes.
"""

from __future__ import annotations

import streamlit as st
from config import COLORS, DISCLAIMER, APP_NAME, APP_TAGLINE


def render():
    """Render the login page."""

    # Hide sidebar for login page
    st.markdown(
        """
        <style>
        section[data-testid="stSidebar"] { display: none !important; }
        .main .block-container { max-width: 480px; padding-top: 4rem; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # Centered login card
    st.markdown(
        f"""
        <div style="
            background: white;
            border-radius: 20px;
            padding: 3rem 2.5rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            border: 1px solid {COLORS['border']};
            text-align: center;
        ">
            <!-- Logo -->
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

            <h1 style="
                color: {COLORS['navy']};
                margin: 0 0 0.5rem 0;
                font-size: 2rem;
                font-weight: 800;
                letter-spacing: -0.02em;
            ">
                {APP_NAME}
            </h1>
            <p style="
                color: {COLORS['muted']};
                margin: 0 0 2rem 0;
                font-size: 1rem;
                font-style: italic;
            ">
                {APP_TAGLINE}
            </p>

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

    # Login form
    with st.form("login_form", clear_on_submit=False):
        st.markdown("### Sign In")

        username = st.text_input(
            "Username",
            placeholder="Enter username",
            key="login_username",
        )
        password = st.text_input(
            "Password",
            type="password",
            placeholder="Enter password",
            key="login_password",
        )

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

        submitted = st.form_submit_button(
            "Sign In",
            type="primary",
            use_container_width=True,
        )

        if submitted:
            if _authenticate(username, password):
                st.session_state["authenticated"] = True
                st.session_state["username"] = username
                st.session_state["page_radio"] = "Dashboard"
                st.rerun()
            else:
                st.error("Invalid username or password. Please try demo credentials.")

    # Disclaimer
    st.markdown("---")
    st.caption(f"⚠️ {DISCLAIMER}")


def _authenticate(username: str, password: str) -> bool:
    """Simple authentication for demo purposes."""
    # Demo credentials
    demo_users = {
        "demo": "scanova2024",
        "admin": "admin123",
        "researcher": "research2024",
    }
    return demo_users.get(username) == password


def check_auth():
    """Check if user is authenticated, redirect to login if not."""
    if not st.session_state.get("authenticated", False):
        return False
    return True


def logout():
    """Clear authentication state."""
    for key in ["authenticated", "username"]:
        st.session_state.pop(key, None)
    st.session_state["page_radio"] = "Home"
    st.rerun()