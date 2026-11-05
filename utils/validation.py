"""
utils/validation.py
────────────────────
File and parameter validation helpers for Scanova.
"""

from __future__ import annotations

from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, PARAM_BOUNDS


def validate_uploaded_file(file_obj) -> tuple[bool, str]:
    """
    Validate a Streamlit UploadedFile.

    Returns (True, "") on success, or (False, error_message) on failure.
    """
    if file_obj is None:
        return False, "No file uploaded."

    name = file_obj.name.lower()
    ext  = name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, (
            f"Unsupported file type '.{ext}'. "
            f"Please upload one of: {', '.join(ALLOWED_EXTENSIONS)}."
        )

    size = file_obj.size if hasattr(file_obj, "size") else len(file_obj.getvalue())
    if size == 0:
        return False, "The uploaded file is empty."
    if size > MAX_FILE_SIZE_BYTES:
        return False, (
            f"File too large ({size / 1024 / 1024:.1f} MB). "
            f"Maximum allowed: {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
        )

    return True, ""


def validate_kernel_size(k: int) -> tuple[bool, str]:
    lo = PARAM_BOUNDS["kernel_size_min"]
    hi = PARAM_BOUNDS["kernel_size_max"]
    if k % 2 == 0:
        return False, f"Kernel size must be an odd integer (got {k})."
    if not (lo <= k <= hi):
        return False, f"Kernel size {k} is out of range [{lo}, {hi}]."
    return True, ""


def validate_clahe_params(clip: float, tile: int) -> tuple[bool, str]:
    if not (PARAM_BOUNDS["clahe_clip_min"] <= clip <= PARAM_BOUNDS["clahe_clip_max"]):
        return False, (
            f"CLAHE clip limit {clip} is out of range "
            f"[{PARAM_BOUNDS['clahe_clip_min']}, {PARAM_BOUNDS['clahe_clip_max']}]."
        )
    if not (PARAM_BOUNDS["clahe_tile_min"] <= tile <= PARAM_BOUNDS["clahe_tile_max"]):
        return False, (
            f"Tile grid size {tile} is out of range "
            f"[{PARAM_BOUNDS['clahe_tile_min']}, {PARAM_BOUNDS['clahe_tile_max']}]."
        )
    return True, ""


def validate_sharpen_strength(s: float) -> tuple[bool, str]:
    lo = PARAM_BOUNDS["sharpen_min"]
    hi = PARAM_BOUNDS["sharpen_max"]
    if not (lo <= s <= hi):
        return False, f"Sharpening strength {s} is out of range [{lo}, {hi}]."
    return True, ""
