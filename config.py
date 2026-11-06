# config.py — Scanova Medical Image Enhancement System
# Central configuration: colors, limits, and default processing parameters.

APP_NAME = "Scanova"
APP_TAGLINE = "A Clearer View of Every Scan."
APP_VERSION = "1.0.0"
PROJECT_FULL_NAME = "CGIP – Medical Image Enhancement System"

# ─── Premium Medical Technology Color Palette ─────────────────────────────────
# Refined colors for professional, premium aesthetic
COLORS = {
    # Core brand colors
    "navy":       "#0F2C4D",   # Deep Navy - Primary brand color
    "navy_light": "#1E3A5F",   # Navy gradient end
    "navy_dim":   "#0A1F33",   # Navy dark variant
    "blue":       "#1E40AF",   # Medical Blue - Primary CTA
    "blue_light": "#3B82F6",   # Blue lighter
    "blue_dim":   "#1D4ED8",   # Blue darker
    "teal":       "#0D9488",   # Medical Teal - Accent
    "teal_light": "#14B8A6",   # Teal lighter
    "teal_dim":   "#0F766E",   # Teal darker

    # Gradients
    "blue_teal_gradient": "#0F2C4D",  # Gradient start
    "navy_end": "#1E40AF",           # Gradient end

    # Backgrounds
    "background": "#F8FAFC",   # Main Background - Clean white
    "background_dark": "#F1F5F9", # Secondary background - Light grey
    "white":      "#FFFFFF",   # Pure white for cards
    "surface":    "#FFFFFF",   # Card background

    # Text colors
    "text":       "#0F172A",   # Main Text - Dark slate
    "text_dim":   "#1E293B",   # Slightly lighter text
    "muted":      "#475569",   # Secondary Text - Slate Grey
    "muted_light":"#64748B",   # Muted lighter

    # Status colors
    "success":    "#16A34A",   # Success - Green
    "warning":    "#F59E0B",   # Warning - Amber
    "error":      "#DC2626",   # Error - Red

    # Borders & dividers
    "border":     "#E2E8F0",   # Border - Light Grey
    "border_dim": "#CBD5E1",   # Border darker

    # Shadows (for reference)
    "shadow_sm":  "0 1px 3px rgba(0,0,0,0.05)",
    "shadow_md":  "0 4px 6px rgba(0,0,0,0.08)",
    "shadow_lg":  "0 10px 25px rgba(0,0,0,0.10)",
}

# ─── Design System Constants ──────────────────────────────────────────────────
SPACING = {
    "xs": 4,    # Extra small
    "sm": 8,    # Small
    "md": 12,   # Medium
    "lg": 16,   # Large
    "xl": 20,   # Extra large
    "2xl": 24,  # 2X large
    "3xl": 32,  # 3X large
    "4xl": 48,  # 4X large
}

RADIUS = {
    "none": 0,
    "sm": 4,
    "md": 8,
    "lg": 12,
    "xl": 16,
    "2xl": 20,
    "full": 9999,
}

TYPOGRAPHY = {
    "font_family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    "font_size_sm": 0.875,   # 14px
    "font_size_base": 1,     # 16px
    "font_size_md": 1.125,   # 18px
    "font_size_lg": 1.25,    # 20px
    "font_size_xl": 1.5,     # 24px
    "font_size_2xl": 1.75,   # 28px
    "font_size_3xl": 2,      # 32px
    "font_size_4xl": 2.5,    # 40px
}

# ─── File & Upload Constraints ────────────────────────────────────────────────
ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "dcm"]
MAX_FILE_SIZE_MB = 30
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_IMAGE_DIMENSION = 8192          # pixels per side
MIN_IMAGE_DIMENSION = 8             # pixels per side

# ─── Default Processing Parameters ───────────────────────────────────────────
DEFAULT_SETTINGS = {
    # Noise reduction
    "noise_method":       "Median",          # "Median" | "Gaussian"
    "kernel_size":        5,                 # must be odd
    "gaussian_sigma":     1.0,

    # Contrast enhancement
    "contrast_method":    "CLAHE",           # "CLAHE" | "Histogram Equalization"
    "clahe_clip_limit":   2.0,
    "clahe_tile_grid":    8,                 # n × n tiles

    # Sharpening / edge enhancement
    "sharpen_strength":   1.2,              # unsharp mask weight α ∈ [0.2, 3.0]
    "sharpen_sigma":      1.0,
    "show_edge_overlay":  False,

    # Grayscale processing
    "force_grayscale":    False,            # True ➜ always convert to gray
}

# ─── Parameter Boundaries ────────────────────────────────────────────────────
PARAM_BOUNDS = {
    "kernel_size_min":       3,
    "kernel_size_max":       21,
    "gaussian_sigma_min":    0.1,
    "gaussian_sigma_max":    5.0,
    "clahe_clip_min":        0.5,
    "clahe_clip_max":        10.0,
    "clahe_tile_min":        2,
    "clahe_tile_max":        32,
    "sharpen_min":           0.0,
    "sharpen_max":           3.0,
}

# ─── Sample Images ────────────────────────────────────────────────────────────
SAMPLE_IMAGE_DIR = "data/sample_images"
SAMPLE_IMAGES = {
    "Chest X-Ray (Demo)":  "chest_xray_demo.png",
    "Brain MRI (Demo)":    "brain_mri_demo.png",
    "Knee CT (Demo)":      "knee_ct_demo.png",
}

# ─── Export ──────────────────────────────────────────────────────────────────
EXPORT_FORMAT = "PNG"
EXPORT_QUALITY = 95          # used for JPEG fallback

# ─── Disclaimer (displayed prominently in UI) ─────────────────────────────────
DISCLAIMER = (
    "⚠️  Educational Use Only — This system is developed as an image-processing "
    "demonstration for academic purposes. Enhanced images are NOT guaranteed to be "
    "diagnostically superior and must NOT replace professional medical interpretation. "
    "Clinical use requires appropriate validation and qualified medical oversight."
)