# Scanova — Medical Image Enhancement System

**A Clearer View of Every Scan.**

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.65%2B-red)
![OpenCV](https://img.shields.io/badge/OpenCV-5.0%2B-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

> **Educational Use Only** — This system is developed as an image-processing demonstration for academic purposes. Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation.

---

## Overview

Scanova is a web-based medical image enhancement application built for the **Computer Graphics and Image Processing (CGIP)** course. It demonstrates classical digital image processing techniques applied to medical images (X-rays, MRI, CT scans) through an interactive Streamlit dashboard.

### Key Features

| Module | Description |
|--------|-------------|
| 🔬 **Image Enhancement** | Upload images, configure processing parameters, run the 6-stage pipeline, download results |
| ⚖️ **Image Comparison** | Side-by-side original vs enhanced with quantitative metrics |
| 📊 **Histogram Analysis** | Interactive Plotly histograms & CDF comparison from real pixel data |
| 📈 **Image Information** | Technical stats: entropy, Laplacian variance, Michelson contrast, processing timing |
| 📑 **About Project** | Full documentation: algorithms, methodology, limitations, viva Q&A |
| 📄 **PDF Report** | Generate academic report with images, parameters, metrics, and algorithm descriptions |

---

## Pipeline Stages

```
Upload → Acquisition & Validation → Grayscale Conversion →
Noise Reduction → Contrast Enhancement → Edge Enhancement → Output
```

| Stage | Technique | Purpose |
|-------|-----------|---------|
| 1. Acquisition | Multi-format loading (PNG, JPG, BMP, DICOM) | Read & validate medical images |
| 2. Grayscale | Luminance conversion (Y = 0.299R + 0.587G + 0.114B) | Single-channel processing |
| 3. Noise Reduction | Median / Gaussian filter | Remove salt-and-pepper / Gaussian noise |
| 4. Contrast | CLAHE / Histogram Equalization | Adaptive/local contrast enhancement |
| 5. Edge Enhancement | Unsharp masking (I + α·(I − Blur)) | Sharpen anatomical details |
| 6. Output | Display, metrics, download | Compare & export results |

---

## Installation

```bash
# Clone / navigate to project
cd "cgip medical image enhancement"

# Install dependencies
pip install -r requirements.txt

# Generate demo images
python data/generate_samples.py

# Launch application
streamlit run app.py
```

The app opens at `http://localhost:8501`.

---

## Dependencies

| Category | Package | Version |
|----------|---------|---------|
| Web Framework | `streamlit` | ≥1.65 |
| Image Processing | `opencv-python` | ≥5.0 |
| Numerical Computing | `numpy` | ≥2.5 |
| Image I/O | `pillow` | ≥12.0 |
| Visualization | `plotly`, `matplotlib` | ≥7.0, ≥3.11 |
| DICOM | `pydicom` | ≥3.0 |
| PDF Generation | `reportlab` | ≥5.0 |
| Testing | `pytest` | ≥9.0 |

---

## Project Structure

```
cgip medical image enhancement/
├── app.py                      # Streamlit entrypoint + UI styling
├── config.py                   # Colors, limits, default parameters
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── core/                       # Core image processing algorithms
│   ├── __init__.py
│   ├── image_loader.py         # Multi-format loading (incl. DICOM)
│   ├── preprocessing.py        # Grayscale, normalization
│   ├── noise_reduction.py      # Median, Gaussian filters
│   ├── contrast_enhancement.py # CLAHE, Histogram Equalization
│   ├── edge_enhancement.py     # Unsharp masking, Sobel, Laplacian
│   └── image_metrics.py        # Entropy, Laplacian variance, Michelson
├── services/                   # Pipeline orchestration & utilities
│   ├── __init__.py
│   ├── image_processing_service.py  # 6-stage pipeline runner
│   ├── histogram_service.py         # Plotly histogram & CDF figures
│   └── export_service.py            # PNG export, ReportLab PDF
├── pages/                      # Streamlit multipage app
│   ├── __init__.py
│   ├── image_enhancement.py    # Upload & process
│   ├── image_comparison.py     # Side-by-side comparison
│   ├── histogram_analysis.py   # Histograms & CDF
│   ├── image_information.py    # Technical metrics
│   └── about_project.py        # Documentation & viva Q&A
├── utils/                      # Helper functions
│   ├── __init__.py
│   ├── validation.py           # File & parameter validation
│   └── image_formatting.py     # Display formatting
├── data/                       # Demo assets
│   ├── generate_samples.py     # Synthetic medical image generator
│   └── sample_images/          # Generated PNG demos
└── tests/                      # Unit tests (73 tests)
    ├── test_enhancement.py
    ├── test_image_loading.py
    ├── test_metrics.py
    └── test_preprocessing.py
```

---

## Screenshots

### Home Page
![Home](docs/home.png)

### Image Enhancement
![Enhancement](docs/enhancement.png)

### Histogram Analysis
![Histogram](docs/histogram.png)

---

## Usage

1. **Start the app**: `streamlit run app.py`
2. **Navigate** using the sidebar: Home → Image Enhancement → Image Comparison → Histogram Analysis → Image Information → About Project
3. **Upload** a medical image (PNG, JPG, BMP, DICOM up to 30 MB)
4. **Configure** processing parameters in the sidebar expanders:
   - Noise Reduction: Median/Gaussian, kernel size, σ
   - Contrast: CLAHE/Histogram Equalization, clip limit, tile grid
   - Sharpening: Unsharp mask strength (α) and blur σ
5. **Click "Enhance Image"** to run the pipeline
6. **Compare** results on the Image Comparison page
7. **Analyze** histograms and metrics
8. **Download** enhanced image or generate a PDF report

---

## DICOM Support

Scanova handles DICOM files using PyDICOM:
- Reads pixel data and applies Rescale Slope/Intercept (Hounsfield Units)
- Applies Window Center/Width for display windowing
- Corrects MONOCHROME1 (inverted) → MONOCHROME2 convention
- Extracts metadata: Modality, Photometric Interpretation, Bits Stored, Rows, Columns

---

## Algorithm References

1. **Median Filter** — Non-linear filter replacing pixel with neighborhood median. Robust to impulse noise.
2. **Gaussian Filter** — Convolution with Gaussian kernel. Attenuates Gaussian noise.
3. **CLAHE** — Contrast Limited Adaptive Histogram Equalization (Zuiderveld, 1994). Local histogram equalization with clip limit to prevent noise amplification.
4. **Unsharp Masking** — `I_sharp = clip(I + α·(I − GaussBlur(I, σ)))`. Enhances high-frequency detail.
5. **Shannon Entropy** — `H = −Σ pᵢ log₂(pᵢ)`. Measures information content.
6. **Variance of Laplacian** — Focus/sharpness proxy. High values = strong edges (or noise).

---

## Limitations

⚠️ **This is an educational tool, not a clinical diagnostic system.**

- Enhanced images may contain artefacts or amplified noise
- Metrics (entropy, Laplacian variance) describe pixel statistics, not diagnostic quality
- Grayscale pipeline loses color information
- No ground-truth reference for PSNR/SSIM
- Basic DICOM support only (no compressed transfer syntaxes, multi-frame series)
- Session data is not persisted

---

## Future Enhancements

- Deep learning denoising (DnCNN, etc.)
- DICOM series browser with slice navigation
- ROI-based selective enhancement
- Color-preserving pipeline for dermoscopy/endoscopy
- Batch processing
- PSNR/SSIM with reference image
- Export enhanced images back to DICOM

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=core --cov=services --cov=utils
```

**81 tests passing** covering:
- Image loading (PNG, JPG, BMP, DICOM, validation)
- Noise reduction (Median, Gaussian, edge cases)
- Contrast enhancement (CLAHE, HistEq, color handling)
- Edge enhancement (unsharp masking, Sobel, Laplacian)
- Image metrics (entropy, Laplacian variance, Michelson contrast)
- Preprocessing (grayscale conversion, normalization)
- Full pipeline integration

---

## Academic Context

**Project**: CGIP Mini Project — Medical Image Enhancement System  
**Course**: Computer Graphics and Image Processing  
**Domain**: Digital Image Processing / Medical Imaging  

### Viva Preparation

The **About Project** page includes 12 detailed viva questions with answers covering:
- Image enhancement vs restoration
- CLAHE vs global histogram equalization
- Median vs Gaussian filtering for different noise types
- Unsharp masking parameters
- Histogram and CDF interpretation
- Shannon entropy in image processing
- Variance of Laplacian as sharpness proxy
- DICOM handling and Hounsfield Units
- Why enhanced images aren't diagnostically superior
- Michelson contrast limitations
- Grayscale conversion luminance weights
- CDF role in histogram equalization

---

## License

MIT License — Educational use encouraged. See [LICENSE](LICENSE) for details.

---

## Disclaimer

> **⚠️ Educational Use Only**  
> This system is developed as an image-processing demonstration for academic purposes. Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation. Clinical use requires appropriate validation and qualified medical oversight.

---

**Built with** Python, Streamlit, OpenCV, NumPy, Plotly, Pillow, PyDICOM, ReportLab