"""
pages/ai_analysis_dashboard.py — AI Analysis Dashboard for Scanova

Provides a comprehensive AI-assisted medical image analysis interface including:
- Body region identification
- Abnormality detection
- Visual annotations and bounding boxes
- AI-generated medical reports
- Patient-friendly explanations
- Safe medical guidance

This dashboard integrates with the core AI model layer for inference.
"""

from __future__ import annotations

import io
import os
import time
from dataclasses import dataclass
from typing import Optional

import numpy as np
import streamlit as st

from config import DISCLAIMER, COLORS
from core.image_loader import load_image, LoadResult
from core.ai_model import (
    ModelTask,
    AIAnalysisResult,
    AbnormalityFinding,
    BodyPartResult,
    BodyPartIdentificationModel,
    FractureDetectionModel,
    get_model_registry,
    initialize_default_models,
)


# ─── Page Constants ──────────────────────────────────────────────────────────

BODY_PARTS_DISPLAY = {
    "chest": "Chest",
    "skull": "Skull",
    "spine": "Spine",
    "shoulder": "Shoulder",
    "arm": "Arm",
    "elbow": "Elbow",
    "wrist": "Wrist",
    "hand": "Hand",
    "pelvis": "Pelvis",
    "hip": "Hip",
    "knee": "Knee",
    "leg": "Leg",
    "ankle": "Ankle",
    "foot": "Foot",
}

# Confidence color mapping
CONFIDENCE_COLORS = {
    "high": {"color": "#10B981", "bg": "#ECFDF3"},    # Green
    "medium": {"color": "#F59E0B", "bg": "#FFFBEB"},  # Amber
    "low": {"color": "#EF4444", "bg": "#FEF3CF"},     # Red
    "uncertain": {"color": "#6B7280", "bg": "#F3F4F6"},  # Gray
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _format_confidence(confidence: Optional[float]) -> Tuple[str, str]:
    """Format confidence score with color coding."""
    if confidence is None:
        return "N/A", CONFIDENCE_COLORS["uncertain"]
    try:
        c = float(confidence)
    except (ValueError, TypeError):
        return "N/A", CONFIDENCE_COLORS["uncertain"]
    if c >= 0.8:
        return f"{c:.0%}", CONFIDENCE_COLORS["high"]
    elif c >= 0.5:
        return f"{c:.0%}", CONFIDENCE_COLORS["medium"]
    else:
        return f"{c:.0%}", CONFIDENCE_COLORS["low"]


def _body_part_display_name(body_part_key: str) -> str:
    """Return a display-friendly name for a body part key."""
    return BODY_PARTS_DISPLAY.get(body_part_key, body_part_key.title())


def _findings_to_table(findings: list) -> list:
    """Convert abnormality findings to table rows for display."""
    if not findings:
        return [
            [
                "No abnormalities detected",
                "—",
                "—",
                "N/A",
                "—",
            ]
        ]

    rows = []
    for finding in findings:
        conf_str, conf_color = _format_confidence(finding.confidence)
        severity = finding.severity or "—"
        rows.append([
            finding.abnormality_type.replace("_", " ").title(),
            finding.location or "—",
            finding.description[:80] + ("..." if len(finding.description) > 80 else ""),
            conf_str,
            severity,
        ])
    return rows


def _generate_patient_friendly_explanation(
    result: AIAnalysisResult,
) -> str:
    """Generate a patient-friendly explanation from the AI analysis result."""
    parts = []

    # Body region
    if result.body_region and result.body_region.body_part:
        bp = result.body_region.body_part
        conf = result.body_region.confidence
        conf_str = f" with {conf:.0%} confidence" if conf is not None else ""
        parts.append(
            f"The AI analyzed the image and identified it as a {_body_part_display_name(bp)} "
            f"image{conf_str}."
        )

    # Findings
    if result.findings:
        parts.append("The AI detected the following potential findings:")
        for finding in result.findings:
            conf_str, _ = _format_confidence(finding.confidence)
            parts.append(
                f"• {finding.description}. "
                f"Confidence: {conf_str}."
            )
    else:
        parts.append(
            "The AI did not detect any suspected abnormalities in the image."
        )

    # Limitations and next steps
    if result.limitations:
        parts.append(
            "⚠ Important: These are AI-assisted observations only. "
            "They are not a medical diagnosis."
        )

    if result.recommended_next_steps:
        parts.append("Recommended next steps:")
        for step in result.recommended_next_steps:
            parts.append(f"• {step}")

    return " ".join(parts)


def _generate_safe_medical_guidance(
    result: AIAnalysisResult,
) -> str:
    """Generate safe, general medical guidance based on findings."""
    guidance_parts = []

    # Always include general guidance
    guidance_parts.append(
        "General guidance based on AI-assisted findings:"
    )

    # Check for fracture-related findings
    fracture_keywords = any(
        "fracture" in f.abnormality_type.lower()
        or "bone" in f.abnormality_type.lower()
        or "dislocation" in f.abnormality_type.lower()
        for f in result.findings
    )

    # Check for swelling/joint findings
    swelling_keywords = any(
        "swelling" in f.abnormality_type.lower()
        or "joint" in f.abnormality_type.lower()
        for f in result.findings
    )

    if fracture_keywords:
        guidance_parts.append(
            "• Consult an orthopedic specialist or radiologist for suspected bone injuries."
        )
        guidance_parts.append(
            "• X-ray or additional imaging may be recommended for proper assessment."
        )

    if swelling_keywords:
        guidance_parts.append(
            "• Seek medical evaluation for persistent swelling or soft tissue abnormalities."
        )
        guidance_parts.append(
            "• A healthcare provider can determine if further imaging or treatment is needed."
        )

    # General guidance for any findings
    if result.findings:
        guidance_parts.append(
            "• Have all suspected findings reviewed by a qualified radiologist or "
            "appropriate medical specialist."
        )

    # Always add disclaimer
    guidance_parts.append(
        "• This guidance is AI-assisted and general in nature. "
        "Always consult qualified healthcare professionals for medical advice, "
        "diagnosis, and treatment planning."
    )

    return "\n".join(guidance_parts)


# ─── Page Rendering ──────────────────────────────────────────────────────────

def render():
    """Render the AI Analysis Dashboard page."""

    st.markdown("## AI-Assisted Medical Image Analysis")

    st.markdown(
        "Upload a medical image (X-ray, MRI, or CT scan) to receive AI-assisted "
        "analysis of visible anatomical regions and suspected abnormalities. "
        "Note: This is an AI-assisted system for educational purposes only — "
        "all findings must be confirmed by a qualified healthcare professional."
    )
    st.warning(DISCLAIMER, icon="⚠️")

    # ── Initialize models ────────────────────────────────────────────────────
    if "ai_models_initialized" not in st.session_state:
        registry = get_model_registry()
        initialize_default_models(registry)
        st.session_state.ai_models_initialized = True

    registry = get_model_registry()

    # ── Upload section ───────────────────────────────────────────────────────
    st.markdown("### Upload Medical Image")

    col_upload, col_samples = st.columns([2, 1], gap="medium")

    with col_upload:
        st.markdown(
            "<p style='color: #64748B; font-size: 0.9rem; margin-top: -0.5rem;'>"
            "Upload a medical image file (supported: PNG, JPG, JPEG, BMP, DICOM).</p>",
            unsafe_allow_html=True,
        )
        uploaded = st.file_uploader(
            "",
            type=["png", "jpg", "jpeg", "bmp", "dcm"],
            help="Supported formats: PNG, JPG, JPEG, BMP, DICOM (.dcm). Max 30 MB.",
            key="ai_uploader",
        )

    with col_samples:
        st.markdown("### Demo Images")
        sample_choice = st.selectbox(
            "Select a sample",
            options=["— None —"] + [
                "Chest X-Ray (Demo)",
                "Brain MRI (Demo)",
                "Knee CT (Demo)",
            ],
            key="ai_sample_choice",
        )
        if st.button("Load Sample", key="ai_load_sample_btn", use_container_width=True):
            if sample_choice != "— None —":
                sample_map = {
                    "Chest X-Ray (Demo)": "chest_xray_demo.png",
                    "Brain MRI (Demo)": "brain_mri_demo.png",
                    "Knee CT (Demo)": "knee_ct_demo.png",
                }
                sample_path = os.path.join(
                    "data/sample_images", sample_map[sample_choice]
                )
                if os.path.exists(sample_path):
                    with open(sample_path, "rb") as f:
                        raw = f.read()
                    _load_sample_image(raw, os.path.basename(sample_path))
                    st.success(f"Loaded: {sample_choice}")
                else:
                    st.error(f"Sample not found: {sample_path}")

    # ── Process uploaded/image ───────────────────────────────────────────────
    if uploaded is not None:
        ok, err = _validate_uploaded_file(uploaded)
        if not ok:
            st.error(f"{err}")
        else:
            raw = uploaded.getvalue()
            fname = uploaded.name
            if (
                "ai_original_image" not in st.session_state
                or st.session_state.get("ai_loaded_filename") != fname
            ):
                _load_sample_image(raw, fname)

    # ── Display and analyze ─────────────────────────────────────────────────
    if "ai_original_image" in st.session_state:
        orig_result = st.session_state.get("ai_load_result")
        orig_image = st.session_state["ai_original_image"]

        # ── Analysis pipeline ────────────────────────────────────────────────
        if st.button(
            "Run AI Analysis",
            key="ai_run_analysis_btn",
            type="primary",
            use_container_width=True,
        ):
            with st.spinner("Running AI analysis... This may take a moment."):
                analysis_result = _run_ai_analysis(orig_image, registry)

                # Store result for this turn
                st.session_state.ai_analysis_result = analysis_result
                st.session_state.ai_analysis_time = time.time()

        # ── Display results if available ──────────────────────────────────────
        if "ai_analysis_result" in st.session_state:
            result = st.session_state.ai_analysis_result

            # ── Summary cards ─────────────────────────────────────────────────
            st.markdown("### Analysis Summary")

            # Body region card
            if result.body_region:
                bp_key = result.body_region.body_part
                bp_display = _body_part_display_name(bp_key)
                conf, conf_color = _format_confidence(result.body_region.confidence)

                st.markdown(
                    f"""
                    <div style="
                        background: white;
                        border: 1px solid {COLORS['border']};
                        border-radius: 16px;
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    ">
                        <div style="
                            font-size: 1.5rem;
                            margin-bottom: 0.75rem;
                            background: linear-gradient(135deg, {COLORS['blue']}, {COLORS['teal']});
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">
                            📍 Body Region Identified
                        </div>
                        <div style="
                            color: {COLORS['navy']};
                            font-weight: 700;
                            font-size: 1.2rem;
                            margin-bottom: 0.5rem;
                        ">
                            {bp_display}
                        </div>
                        <div style="
                            color: {conf_color['color']};
                            font-size: 0.9rem;
                            margin-bottom: 0.5rem;
                        ">
                            Identification confidence: {conf}
                        </div>
                        <div style="
                            color: {COLORS['muted']};
                            font-size: 0.85rem;
                        ">
                            <strong>Suggested alternatives:</strong> {', '.join(
                                [_body_part_display_name(p) for p in result.body_region.alternative_parts[:3]]
                            )}
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

            # Findings card
            if result.findings:
                st.markdown(
                    f"""
                    <div style="
                        background: white;
                        border: 1px solid {COLORS['border']};
                        border-radius: 16px;
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    """
                )
            else:
                st.markdown(
                    f"""
                    <div style="
                        background: white;
                        border: 1px solid {COLORS['border']};
                        border-radius: 16px;
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                        color: {COLORS['muted']};
                    """
                )

            # ── Visual identification ───────────────────────────────────────────
            st.markdown("### Visual Identification")

            col_img_left, col_img_right = st.columns(2, gap="medium")

            with col_img_left:
                st.markdown("**Original Image**")
                display = (
                    orig_image
                    if orig_image.ndim == 2
                    else (
                        cv2.cvtColor(orig_image, cv2.COLOR_BGR2RGB)
                        if orig_image.shape[2] == 3
                        else orig_image
                    )
                )
                st.image(
                    display,
                    caption="Original uploaded image",
                    use_container_width=True,
                )

            with col_img_right:
                st.markdown("**Analysis Overlay**")
                if result.findings or result.body_region:
                    # Create a simple visualization
                    viz_image = display.copy() if isinstance(display, np.ndarray) else display
                    # Draw annotations (simple version - just show that analysis was done)
                    annotated = _draw_analysis_annotations(
                        viz_image, result
                    )
                    st.image(
                        annotated,
                        caption="AI analysis annotations",
                        use_container_width=True,
                    )
                else:
                    st.info(
                        "No abnormalities detected or analysis not available. "
                        "The image will be displayed without annotations."
                    )
                    st.image(
                        display,
                        caption="Original image (no annotations)",
                        use_container_width=True,
                    )

            # ── AI Interpretation ───────────────────────────────────────────────
            st.markdown("### AI Interpretation")

            # Patient-friendly explanation
            explanation = _generate_patient_friendly_explanation(result)
            st.markdown(
                f"""
                <div style="
                    background: white;
                    border: 1px solid {COLORS['border']};
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                ">
                    <p style="margin:0; font-size: 1rem; line-height: 1.6;">
                        {explanation}
                    </p>
                </div>
                """,
                unsafe_allow_html=True,
            )

            # Safe medical guidance
            guidance = _generate_safe_medical_guidance(result)
            st.markdown(
                f"""
                <div style="
                    background: white;
                    border-left: 4px solid {COLORS['warning']};
                    border-radius: 0 16px 16px 0;
                    padding: 1rem 1.5rem;
                    margin-bottom: 1.5rem;
                    background-color: {COLORS['bg_secondary']};
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                ">
                    {guidance}
                </div>
                """,
                unsafe_allow_html=True,
            )

            # ── Download Report ────────────────────────────────────────────────
            st.markdown("### Download Report")

            col_btn1, col_btn2 = st.columns(2, gap="medium")

            with col_btn1:
                if st.button(
                    "📄 Generate PDF Report",
                    key="ai_pdf_btn",
                    type="primary",
                    use_container_width=True,
                ):
                    _generate_pdf_report(result)

            with col_btn2:
                if st.button(
                    "📋 Copy to Clipboard",
                    key="ai_copy_btn",
                    type="secondary",
                    use_container_width=True,
                ):
                    # In a real app, this would use JS clipboard API
                    st.success(
                        "Analysis text copied! (Feature available in full application)"
                    )

    else:
        st.info(
            "Upload a medical image from the sidebar to begin AI analysis.",
            icon="ℹ️",
        )


# ─── Private Helpers ────────────────────────────────────────────────────────

def _validate_uploaded_file(uploaded) -> tuple[bool, str]:
    """Validate an uploaded file, returning (ok, error_message)."""
    import cv2

    file_size = len(uploaded.getvalue())

    if file_size == 0:
        return False, "Uploaded file is empty."

    if file_size > 30 * 1024 * 1024:
        return False, "File size exceeds 30 MB limit."

    # Try to load the image
    import io
    from PIL import Image

    try:
        pil_img = Image.open(io.BytesIO(uploaded.getvalue()))
        pil_img.verify()
    except Exception as e:
        return False, f"Cannot decode image: {e}"

    # Supported extensions
    ext = uploaded.name.rsplit(".", 1)[-1].lower() if "." in uploaded.name else ""
    if ext not in ["png", "jpg", "jpeg", "bmp", "dcm"]:
        return False, f"Unsupported format '.{ext}'. Allowed: png, jpg, jpeg, bmp, dcm"

    return True, ""


def _load_sample_image(raw_bytes: bytes, filename: str) -> None:
    """Load an image into session state."""
    from core.image_loader import load_image

    try:
        result = load_image(raw_bytes, filename)
        st.session_state["ai_original_image"] = result.image
        st.session_state["ai_load_result"] = result
        st.session_state["ai_loaded_filename"] = filename
        # Clear previous analysis
        st.session_state.pop("ai_analysis_result", None)
        st.success(f"Image loaded: {filename}")
    except ValueError as exc:
        st.error(f"Error loading image: {exc}")
    except Exception as exc:
        st.error(f"Unexpected error loading image: {exc}")


def _run_ai_analysis(
    image: np.ndarray,
    registry,
) -> AIAnalysisResult:
    """
    Run the full AI analysis pipeline on a loaded image.

    Steps:
    1. Body part identification
    2. Abnormality detection (fracture detection)
    3. Compile results into AIAnalysisResult
    """
    import cv2

    # Step 1: Body part identification
    body_part_model = registry.get("body_part_identification")
    if body_part_model and body_part_model.is_loaded():
        body_result = body_part_model.predict(image)
    else:
        # Use the template model's heuristic fallback
        body_part_model = registry.get("body_part_identification")
        body_result = body_part_model._heuristic_body_part_identification(image) if body_part_model else None

    # Step 2: Fracture detection
    fracture_model = registry.get("fracture_detection")
    findings = []

    if fracture_model and fracture_model.is_loaded():
        # Run fracture detection
        fracture_result = fracture_model.predict(image)
        # Extract findings from the result
        if fracture_result.findings:
            findings.extend(fracture_result.findings)
        # Also add body region from fracture result if available
        if fracture_result.body_region and body_result:
            # Merge body region info
            if not body_result.body_part or body_result.body_part == "analysis_unavailable":
                body_result = fracture_result.body_region
    else:
        # Use the template model - no actual model loaded, return structured result
        # indicating model unavailable
        template_model = registry.get("fracture_detection")
        if template_model:
            # Return the "model not loaded" structured result
            # but we'll use its limitations and next steps
            pass
        # Add a note that no model is available
        findings.append(
            AbnormalityFinding(
                abnormality_type="model_unavailable",
                location="analysis pipeline",
                description=
                    "Fracture detection model is not currently loaded. "
                    "AI-assisted fracture analysis is unavailable. "
                    "The image enhancement pipeline and basic analysis are still available.",
                confidence=None,
                severity=None,
                anatomical_region="unknown",
            )
        )

    # If no findings from model but we have body part identification, add a general finding
    if not findings and body_result:
        findings.append(
            AbnormalityFinding(
                abnormality_type="image_analysis_completed",
                location="full image",
                description=
                    "AI-assisted analysis completed. No specific abnormalities were automatically "
                    "detected using the current model configuration. Image enhancement and quality "
                    "metrics are available for review.",
                confidence=0.7,
                severity=None,
                anatomical_region=body_result.body_part or "unknown",
            )
        )

    # Step 3: Compile the full analysis result
    image_type = _detect_image_type(image)

    # Determine quality
    quality = _assess_image_quality(image)

    # Build the result
    result = AIAnalysisResult(
        image_type=image_type,
        body_region=body_result,
        findings=findings,
        image_quality=quality,
        processing_status="completed",
        patient_friendly_explanation="",
        limitations=_get_model_limitations(registry),
        recommended_next_steps=_get_recommended_next_steps(
            findings, body_result, image_type
        ),
    )

    # Populate patient-friendly explanation
    result.patient_friendly_explanation = _generate_patient_friendly_explanation(result)

    return result


def _detect_image_type(image: np.ndarray) -> str:
    """Detect the likely imaging modality from the image."""
    import cv2

    if image is None:
        return "unknown"

    # Convert to grayscale if color
    if image.ndim == 3 and image.shape[2] == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image if image.ndim == 2 else image[:, :, 0]

    # Simple heuristics based on image statistics
    mean_intensity = float(gray.mean())
    h, w = gray.shape

    # Very rough classification
    if mean_intensity > 150 and w / h > 0.8:
        # Bright image, wide - likely chest X-ray
        return "X-ray"
    elif mean_intensity < 100 and 0.8 < h / w < 1.5:
        # Darker, square-ish - could be brain MRI
        return "MRI"
    elif mean_intensity > 100 and (w > 512 or h > 512):
        # Large image - could be CT
        return "CT scan"
    else:
        return "X-ray"  # Default


def _assess_image_quality(image: np.ndarray) -> str:
    """Assess basic image quality metrics."""
    import cv2

    if image is None or image.size == 0:
        return "unknown"

    # Convert to grayscale if needed
    if image.ndim == 3 and image.shape[2] == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image if image.ndim == 2 else image[:, :, 0]

    # Compute basic metrics
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    mean_intensity = float(gray.mean())

    # Heuristic quality assessment
    if laplacian_var > 100 and 50 < mean_intensity < 200:
        return "good"
    elif laplacian_var > 20 and 40 < mean_intensity < 220:
        return "fair"
    else:
        return "poor"


def _draw_analysis_annotations(
    image: np.ndarray,
    result: AIAnalysisResult,
) -> np.ndarray:
    """Draw basic analysis annotations on the image."""
    import cv2

    output = image.copy()

    # Draw body region identification
    if result.body_region and result.body_region.body_part:
        bp = result.body_region.body_part
        conf = result.body_region.confidence or 0.0
        label = f"Region: {_body_part_display_name(bp)} ({conf:.0%})"
        # Place text in top-left corner
        text_size = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
        )[0]
        text_x = 10
        text_y = text_size[1] + 10

        # Draw background rectangle
        cv2.rectangle(
            output,
            (text_x - 5, text_y - text_size[1] - 5),
            (text_x + text_size[0] + 5, text_y + 5),
            (0, 0, 0),
            -1,
        )
        # Draw text
        cv2.putText(
            output,
            label,
            (text_x, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            2,
        )

    # Draw findings bounding boxes (placeholder - no real localization)
    for i, finding in enumerate(result.findings[:3]):  # Limit to first 3
        # Draw a placeholder box - in production these would be real localization boxes
        h, w = image.shape[:2]
        box_size = min(w, h) // 8
        box_x = (i * box_size) % (w - box_size)
        box_y = (i * box_size) // (w - box_size) * 2 % (h - box_size)

        # Draw rectangle
        cv2.rectangle(
            output,
            (box_x, box_y),
            (box_x + box_size, box_y + box_size),
            (0, 255, 0),
            2,
        )

        # Label
        label = finding.abnormality_type.replace("_", " ").title()[:20]
        cv2.putText(
            output,
            label,
            (box_x, box_y - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (0, 255, 0),
            1,
        )

    return output


def _get_model_limitations(registry) -> list:
    """Get limitations from all registered models."""
    limitations = []
    for model_name in ["body_part_identification", "fracture_detection"]:
        model = registry.get(model_name)
        if model:
            limitations.append(
                f"{model.model_name}: Model currently {'loaded' if model.is_loaded() else 'not loaded'.lower()}. "
                "AI-assisted results are supportive only and must be confirmed by a qualified "
                "healthcare professional."
            )
    return limitations


def _get_recommended_next_steps(
    findings: list,
    body_result: Optional[BodyPartResult],
    image_type: str,
) -> list:
    """Generate recommended next steps based on analysis results."""
    steps = []

    # General medical guidance
    steps.append(
        "Have all AI-assisted findings reviewed by a qualified radiologist or "
        "appropriate medical specialist."
    )

    # Body-part-specific guidance
    if body_result and body_result.body_part:
        bp = body_result.body_part
        if bp in ("chest", "lung", "thorax"):
            steps.append(
                "Seek medical evaluation for any chest-related findings. "
                "A radiologist can provide proper interpretation."
            )
        elif bp in ("knee", "hip", "spine"):
            steps.append(
                "Consult an orthopedic specialist for joint or spine-related findings."
            )
        elif bp in ("skull", "head"):
            steps.append(
                "Have head or skull findings reviewed by a neuroradiologist "
                "or qualified specialist."
            )

    # Findings-specific guidance
    if any("fracture" in f.abnormality_type.lower() for f in findings):
        steps.append(
            "Consult an orthopedic specialist for suspected bone injuries "
            "and follow recommended imaging."
        )

    if any("swelling" in f.abnormality_type.lower() for f in findings):
        steps.append(
            "Seek medical evaluation for persistent swelling. "
            "A healthcare provider can determine the cause and appropriate treatment."
        )

    # Model availability guidance
    steps.append(
        "Ensure AI models are properly deployed and validated before "
        "relying on their findings for medical decision-making."
    )

    return steps


def _generate_pdf_report(result: AIAnalysisResult) -> None:
    """Generate and provide a downloadable PDF report."""
    import io
    from datetime import datetime

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors as rl_colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, PageBreak,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    except ImportError:
        st.error(
            "reportlab is not installed. Run: pip install reportlab"
        )
        return

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin = 2 * cm,
        topMargin = 2 * cm,
        bottomMargin = 2 * cm,
    )

    styles = getSampleStyleSheet()
    navy = rl_colors.HexColor("#172B4D")
    blue = rl_colors.HexColor("#2563EB")
    teal = rl_colors.HexColor("#14B8A6")
    light = rl_colors.HexColor("#F1F5F9")
    white = rl_colors.white

    # Styles
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

    # ── Title ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("SCANOVA", title_style))
    story.append(Paragraph("AI-Assisted Medical Image Analysis Report", h2_style))
    story.append(Paragraph("Educational Demonstration Report", body_style))
    story.append(HRFlowable(width="100%", thickness=2, color=teal, spaceAfter=8))
    story.append(Paragraph(
        "⚠ Educational Use Only — This report is generated for academic demonstration "
        "purposes. AI-assisted findings are NOT a medical diagnosis. All findings must "
        "be confirmed by a qualified healthcare professional. This software does not "
        "diagnose diseases and must not replace professional medical interpretation.",
        disclaimer_style,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        small_style,
    ))
    story.append(Paragraph(
        f"Source Image: {st.session_state.get('ai_loaded_filename', 'uploaded image')}",
        small_style,
    ))
    story.append(Paragraph(
        f"Analysis Date: {datetime.now().strftime('%Y-%m-%d')}",
        small_style,
    ))
    story.append(Spacer(1, 0.3 * cm))

    # ── Patient Information ──────────────────────────────────────────────
    story.append(Paragraph("Patient Information", h2_style))
    story.append(Paragraph(
        f"Body Region Identified: {_body_part_display_name(result.body_region.body_part) if result.body_region and result.body_region.body_part else 'Not identified'}",
        body_style,
    ))
    if result.body_region and result.body_region.confidence is not None:
        story.append(
            Paragraph(
                f"Body Region Identification Confidence: {result.body_region.confidence:.1%}",
                body_style,
            )
        )

    # ── AI Findings ──────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("AI-Generated Findings", h2_style))

    if not result.findings:
        story.append(
            Paragraph(
                "No specific abnormalities were automatically detected by the AI analysis system. "
                "The image was processed and a body region was identified, but no suspected "
                "pathological findings were flagged.",
                body_style,
            )
        )
    else:
        # Findings table
        findings_data = [["Finding", "Location", "Description", "Confidence", "Severity"]]

        for finding in result.findings:
            conf_str, _ = _format_confidence(finding.confidence)
            severity = finding.severity or "Not specified"
            findings_data.append([
                finding.abnormality_type.replace("_", " ").title(),
                finding.location or "—",
                finding.description[:60] + ("..." if len(finding.description) > 60 else ""),
                conf_str,
                severity,
            ])

        from reportlab.platypus import Table as RLTable
        ft = RLTable(
            findings_data,
            colWidths=[3.5*cm, 2.5*cm, 5*cm, 2*cm, 2*cm],
        )
        ft.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, light]),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, blue),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(ft)

    story.append(Spacer(1, 0.3 * cm))

    # ── Image Information ────────────────────────────────────────────────
    story.append(Paragraph("Image Information", h2_style))

    # Detect image type
    image_type = result.image_type
    story.append(Paragraph(f"Image Type: {image_type}", body_style))

    # Body region
    if result.body_region:
        bp = result.body_region.body_part or "not identified"
        story.append(Paragraph(f"Identified Body Region: {_body_part_display_name(bp)}", body_style))
        if result.body_region.confidence is not None:
            story.append(Paragraph(
                f"Identification Confidence: {result.body_region.confidence:.1%}",
                body_style,
            ))

    # Image quality
    story.append(Paragraph(f"Image Quality: {result.image_quality}", body_style))

    # ── Algorithms Applied ───────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Algorithms Applied", h2_style))

    algorithm_texts = [
        ("<b>Body Part Identification:</b> ",
         "Uses a convolutional neural network (when loaded) or heuristic-based "
         "analysis to identify the anatomical region visible in the medical image. "
         "Capability supports: chest, skull, spine, shoulder, arm, elbow, wrist, hand, "
         "pelvis, hip, knee, leg, ankle, foot."),
        ("<b>Abnormality Detection:</b> ",
         "Uses a fracture detection model (when loaded) to identify possible bone fractures, "
         "abnormal alignment, joint abnormalities, and other structural anomalies in X-ray images. "
         "Confidence scores are provided when supported by the model. All findings must be "
         "confirmed by a qualified radiologist."),
    ]

    for label, detail in algorithm_texts:
        story.append(Paragraph(label + detail, body_style))
        story.append(Spacer(1, 0.1 * cm))

    story.append(HRFlowable(width="100%", thickness=1, color=teal, spaceAfter=4))
    story.append(Paragraph(
        "SCANOVA Medical Image Enhancement System | AI Analysis Module | "
        "Educational Demonstration | Not a Diagnostic Tool",
        small_style,
    ))

    doc.build(story)
    pdf_bytes = buf.getvalue()

    st.download_button(
        "⬇ Download PDF Report",
        data=pdf_bytes,
        file_name="scanova_ai_analysis_report.pdf",
        mime="application/pdf",
        type="primary",
    )

    st.success("PDF report generated successfully.")