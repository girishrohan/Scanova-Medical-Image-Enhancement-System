# config.py — Scanova Medical Image Enhancement System
# Central configuration: colors, limits, and default processing parameters.

APP_NAME = "Scanova"
APP_TAGLINE = "A Clearer View of Every Scan."
APP_VERSION = "1.0.0"
PROJECT_FULL_NAME = "CGIP – Medical Image Enhancement System"

# ─── Colour Palette ───────────────────────────────────────────────────────────
# Per design brief: Professional medical technology palette
COLORS = {
    "navy":       "#172B4D",   # Primary Navy - Deep Navy
    "blue":       "#2563EB",   # Primary Blue - Professional Blue
    "teal":       "#14B8A6",   # Accent Teal - Medical Teal
    "background": "#F8FAFC",   # Main Background - Soft White
    "white":      "#FFFFFF",   # Card Background - White
    "text":       "#172033",   # Main Text - Dark Slate
    "muted":      "#64748B",   # Secondary Text - Slate Grey
    "success":    "#16A34A",   # Success - Green
    "warning":    "#F59E0B",
    "error":      "#DC2626",   # Error - Red
    "border":     "#E2E8F0",   # Border - Light Grey
    "card_bg":    "#FFFFFF",
    "bg_secondary": "#F1F5F9", # Secondary Background - Light Grey
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
