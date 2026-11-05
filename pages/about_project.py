"""
pages/about_project.py
───────────────────────
Scanova — About Project / documentation page for college viva.
"""

from __future__ import annotations
import streamlit as st


def render():
    st.markdown("## 📑 About the Project")
    st.markdown(
        "**CGIP – Scanova Medical Image Enhancement System**  \n"
        "Computer Graphics and Image Processing • College Mini Project"
    )
    st.divider()

    tab_abs, tab_obj, tab_meth, tab_alg, tab_req, tab_lim, tab_viva = st.tabs([
        "Abstract", "Objectives", "Methodology",
        "Algorithms", "Requirements", "Limitations", "Viva Q&A"
    ])

    with tab_abs:
        st.markdown("""
### Abstract

Medical imaging is a cornerstone of modern clinical diagnosis. However, raw medical images —
such as X-rays, MRI scans, and CT slices — often suffer from noise, low contrast, and poor
visibility of fine anatomical details. These limitations arise from sensor imperfections,
acquisition protocols, patient movement, and the inherent trade-off between radiation dose
and image quality.

**Scanova** is a web-based educational image-processing system developed as a mini project
for the Computer Graphics and Image Processing (CGIP) subject. It demonstrates how classical
digital image processing techniques can be applied to enhance the visual quality of medical
images. The system implements a six-stage enhancement pipeline: image acquisition and
validation, grayscale conversion, noise suppression, adaptive contrast enhancement,
edge-detail sharpening, and output generation.

The application is built using Python, OpenCV, and Streamlit. It provides an interactive
dashboard where users can upload images, adjust processing parameters, compare original and
enhanced images, and analyse pixel intensity histograms. DICOM file support is provided
through PyDICOM.

**Educational Use Disclaimer**: This system is developed for academic demonstration only.
Enhanced images are NOT guaranteed to be diagnostically superior. The software does not
diagnose any medical condition and must not replace professional medical interpretation.
""")

    with tab_obj:
        st.markdown("""
### Objectives

1. Design and implement a modular, web-based image-processing application for medical images.
2. Demonstrate classical image enhancement algorithms: median filtering, Gaussian filtering,
   CLAHE, and unsharp masking.
3. Provide interactive visualisation of pixel intensity histograms and cumulative distribution
   functions (CDFs).
4. Allow users to compare original and enhanced images with quantitative statistical indicators.
5. Support multiple image formats including PNG, JPG, BMP, and DICOM.
6. Produce an automated academic PDF report summarising the applied techniques and results.
7. Document the project's algorithms, architecture, limitations, and future scope.

### Problem Statement

Medical images are commonly degraded by noise during acquisition and may lack the tonal
contrast necessary to reveal subtle anatomical features. Radiologists and clinicians rely on
high-quality images for accurate assessment. Image-processing techniques that reduce noise
and enhance contrast can improve the visual interpretability of medical images in educational
and research contexts. This project addresses the need for a practical, educational tool that
demonstrates these techniques interactively.

### Existing Systems

Existing medical image viewing and enhancement tools (e.g., OsiriX, RadiAnt, 3D Slicer)
are sophisticated clinical platforms requiring specialised hardware, licensing, and domain
expertise. They are not designed for educational exploration of image-processing algorithms.
Scanova fills this gap by providing a lightweight, accessible, and clearly documented
demonstration of the underlying digital image processing concepts.
""")

    with tab_meth:
        st.markdown("""
### Proposed Methodology

Scanova implements a sequential image enhancement pipeline:

```
Upload → Acquisition & Validation → Grayscale Conversion →
Noise Reduction → Contrast Enhancement → Edge Enhancement → Output
```

**Stage 1 — Acquisition & Validation**  
The uploaded file is read into memory, validated for format, size, and dimensions.
DICOM files are processed through PyDICOM with Hounsfield Unit windowing.

**Stage 2 — Grayscale Conversion**  
Color images are optionally converted to single-channel grayscale using the standard
luminance formula: Y = 0.299R + 0.587G + 0.114B. If the image is already grayscale,
this step is skipped. The original array is preserved unchanged.

**Stage 3 — Noise Reduction**  
- *Median filter*: replaces each pixel with the median of its k×k neighbourhood.
  Particularly effective for salt-and-pepper noise.
- *Gaussian filter*: convolves with a Gaussian kernel G(x,y) = exp(−(x²+y²)/(2σ²)).
  Suited for Gaussian (electronic) noise.

**Stage 4 — Contrast Enhancement (CLAHE)**  
Contrast Limited Adaptive Histogram Equalization divides the image into tiles and
applies local histogram equalization with a clip limit to prevent noise amplification.
For color images, only the luminance channel (Y in YCrCb) is modified.

**Stage 5 — Edge Enhancement (Unsharp Masking)**  
I_sharp = clip(I + α·(I − GaussBlur(I, σ)), 0, 255)
The weight α controls sharpening strength. Excessive values create artefacts.

**Stage 6 — Output**  
The final image is stored in session memory for display, comparison, and download.
No permanent storage of user images occurs.

### System Architecture

```
app.py  (Streamlit entrypoint)
  ├── Sidebar Navigation
  ├── pages/
  │   ├── image_enhancement.py    ← Upload, pipeline trigger, download
  │   ├── image_comparison.py     ← Before/After comparison
  │   ├── histogram_analysis.py   ← Histogram & CDF plots
  │   ├── image_information.py    ← Technical metrics
  │   └── about_project.py        ← Documentation
  ├── core/
  │   ├── image_loader.py         ← Raster + DICOM loading
  │   ├── preprocessing.py        ← Grayscale, normalization
  │   ├── noise_reduction.py      ← Median, Gaussian
  │   ├── contrast_enhancement.py ← CLAHE, HistEq
  │   ├── edge_enhancement.py     ← Unsharp masking, Sobel, Laplacian
  │   └── image_metrics.py        ← Entropy, Laplacian var., Michelson
  ├── services/
  │   ├── image_processing_service.py ← Pipeline orchestrator
  │   ├── histogram_service.py        ← Plotly histogram & CDF
  │   └── export_service.py           ← PNG bytes, ReportLab PDF
  └── utils/
      ├── validation.py               ← File & parameter checks
      └── image_formatting.py         ← Display helpers
```
""")

    with tab_alg:
        st.markdown("""
### Algorithm Details & Pseudocode

---
#### 1. Median Filter

**Purpose**: Remove salt-and-pepper / impulse noise.

```
for each pixel (x, y):
    neighbourhood = pixels in k×k window centred at (x, y)
    output(x, y)  = median(neighbourhood)
```

**Complexity**: OpenCV uses an optimised O(k · H · W) algorithm.  
**OpenCV call**: `cv2.medianBlur(image, ksize)`

---
#### 2. Gaussian Filter

**Purpose**: Attenuate Gaussian / electronic noise.

```
Kernel G(i,j) = (1/(2πσ²)) · exp(−(i² + j²)/(2σ²))
output = convolve(image, G)
```

**OpenCV call**: `cv2.GaussianBlur(image, (k, k), sigma)`

---
#### 3. CLAHE — Contrast Limited Adaptive Histogram Equalization

**Purpose**: Enhance local contrast without amplifying noise.

```
1. Divide image into (tile × tile) non-overlapping tiles.
2. For each tile:
   a. Compute histogram H.
   b. Clip H at clipLimit (redistribute excess uniformly).
   c. Compute CDF and apply histogram equalization.
3. Bilinear interpolation between tiles to avoid tile borders.
```

**Clip limit**: prevents noise amplification by limiting the maximum histogram bin.  
**OpenCV call**: `cv2.createCLAHE(clipLimit, tileGridSize).apply(image)`

---
#### 4. Unsharp Masking

**Purpose**: Enhance edge detail and fine structures.

```
blurred  = GaussianBlur(image, σ)
residual = image − blurred          # high-frequency detail
output   = clip(image + α · residual, 0, 255)
         = clip((1+α)·image − α·blurred, 0, 255)
```

**Parameter α**: sharpening weight. α = 0 → no change; α > 1 → strong sharpening.  
**Caution**: high α amplifies noise alongside edge detail.

---
#### 5. Shannon Entropy

```
H = −Σᵢ pᵢ · log₂(pᵢ)    where pᵢ = count(i) / total_pixels, for i in [0, 255]
```

Range: 0 (all pixels same) → 8 bits (uniform distribution for uint8).

---
#### 6. Variance of the Laplacian (Sharpness proxy)

```
L = Laplacian(gray_image)    # second-order derivative
sharpness = Var(L)
```

Higher value → more high-frequency content (edges / noise).
""")

    with tab_req:
        st.markdown("""
### Software Requirements

| Component | Tool / Library | Version |
|-----------|---------------|---------|
| Language | Python | 3.10+ |
| Web Framework | Streamlit | 1.65+ |
| Image Processing | OpenCV (opencv-python) | 5.0+ |
| Numerical Computing | NumPy | 2.5+ |
| Image Handling | Pillow | 12+ |
| Visualization | Plotly, Matplotlib | 7+, 3.11+ |
| Medical Imaging | PyDICOM | 3.0+ |
| PDF Generation | ReportLab | 5.0+ |
| Testing | Pytest | 9+ |
| Numerical Utilities | SciPy | 1.18+ |

### Installation

```bash
# Clone or extract the project
cd "cgip medical image enhancement"

# Install dependencies
python -m pip install -r requirements.txt

# Generate demo sample images
python data/generate_samples.py

# Launch the application
python -m streamlit run app.py
```

### Applications of Image Enhancement in Medicine

- **Radiology**: Enhancing X-ray visibility of bone fractures, lung nodules, and pneumothorax.
- **Neurology**: Improving contrast in brain MRI for lesion detection research.
- **Orthopaedics**: Clarifying cartilage and bone boundaries in CT and MRI.
- **Pathology**: Pre-processing digital histology slides for computer-aided analysis.
- **Education**: Teaching image processing concepts using real-world medical examples.
- **Research**: Preprocessing images for machine learning datasets.
""")

    with tab_lim:
        st.markdown("""
### Limitations

1. **Not a diagnostic tool**: The system is designed for educational demonstration only.
   Enhanced images must not be used for clinical diagnosis without validation.

2. **Grayscale pipeline**: The primary enhancement pipeline converts color images to
   grayscale. Color medical images (e.g., dermoscopy, endoscopy) may lose chromatic
   information when processed in grayscale mode.

3. **No ground-truth reference**: Without a genuine reference image, metrics such as
   PSNR and SSIM cannot be meaningfully computed. The quality indicators provided
   (entropy, Laplacian variance) describe pixel statistics, not diagnostic quality.

4. **Parameter sensitivity**: Enhancement quality depends strongly on chosen parameters.
   Incorrect settings (e.g., high CLAHE clip limit, high sharpening α) can introduce
   artefacts, over-enhance noise, or create false detail.

5. **DICOM limitations**: Only basic DICOM windowing is supported. Compressed DICOM
   (JPEG 2000, RLE), multi-frame series, and modality-specific LUTs are not fully handled.

6. **Memory**: Very large images (e.g., full-resolution pathology slides) may cause
   performance issues. The 30 MB upload limit mitigates this.

7. **No persistent storage**: Session data is stored in Streamlit session_state and
   cleared when the browser tab is closed. No long-term storage is implemented.

### Future Enhancements

1. **Deep learning denoising**: Integrate neural network-based denoising (e.g., DnCNN)
   for superior noise suppression.
2. **DICOM series browser**: Support multi-slice DICOM series with slice navigation.
3. **Region-of-interest (ROI) enhancement**: Allow selective enhancement of user-defined areas.
4. **Colour image enhancement**: Full colour-preserving pipeline for dermoscopy and endoscopy.
5. **Batch processing**: Process multiple images in one session.
6. **PSNR/SSIM with reference**: Accept a user-supplied reference image for full-reference quality assessment.
7. **Export to DICOM**: Write enhanced images back into DICOM format.
8. **Mobile-responsive design**: Improve layout for tablet and mobile browsers.
""")

    with tab_viva:
        st.markdown("""
### Viva Questions & Answers

---
**Q1: What is image enhancement? How does it differ from image restoration?**  
**A**: Image enhancement improves the visual appearance of an image for a specific observer.
It is subjective — what is "better" depends on the intended use. Image restoration uses a
mathematical model of degradation to recover an approximation of the original undistorted
image. Enhancement has no reference model; restoration does.

---
**Q2: What is CLAHE and why is it preferred over global histogram equalization for medical images?**  
**A**: CLAHE (Contrast Limited Adaptive Histogram Equalization) divides the image into
small tiles and applies histogram equalization locally. A clip limit prevents excessive
amplification of noise in uniform areas. Global HE redistributes intensities across the
entire image, which can over-brighten homogeneous regions and amplify noise. CLAHE
preserves local contrast more faithfully — crucial for medical images where subtle
regional variations are diagnostically relevant.

---
**Q3: Why is median filtering preferred for X-ray images over Gaussian filtering?**  
**A**: X-ray images often suffer from salt-and-pepper (impulse) noise — isolated pixels
with extreme intensities. The median filter is a non-linear filter that replaces each pixel
with the median of its neighbourhood, which is highly resistant to outlier values. Gaussian
filtering uses a weighted average, so extreme-valued noise pixels still influence the output.
For Gaussian noise (common in MRI), Gaussian filtering is preferred.

---
**Q4: Explain unsharp masking. What does the parameter α control?**  
**A**: Unsharp masking first creates a blurred version of the image, then adds a scaled
version of the difference (the "residual" or "unsharp mask") to the original:
`I_sharp = I + α·(I − blur(I))`.
α controls sharpening strength. α = 0 means no change; higher values increase sharpening.
Excessive α amplifies noise and creates ringing artefacts around edges.

---
**Q5: What does the histogram of an image tell you?**  
**A**: A histogram plots the frequency of each pixel intensity (0–255 for 8-bit images).
A narrow histogram indicates low contrast (small tonal range). A wide, flat histogram
indicates high contrast (many different intensities well spread). CLAHE and histogram
equalization aim to spread the distribution to improve visual contrast.

---
**Q6: What is Shannon entropy in the context of image processing?**  
**A**: Entropy H = −Σ pᵢ log₂(pᵢ) measures the randomness or information content of
pixel intensities. A uniform intensity (constant image) has entropy 0. A perfectly uniform
distribution across all 256 values has entropy 8 bits. Higher entropy after enhancement
often indicates more varied pixel intensities — but can also indicate noise amplification.

---
**Q7: What is the Variance of the Laplacian and what does it measure?**  
**A**: The Laplacian is a second-order derivative operator that highlights regions of rapid
intensity change (edges). The variance of the Laplacian image is used as a focus measure:
sharp images have many strong edges and thus a high Laplacian variance. It is used in
autofocus systems and as a basic sharpness proxy. However, noisy images also score highly.

---
**Q8: What is DICOM? How does Scanova handle DICOM files?**  
**A**: DICOM (Digital Imaging and Communications in Medicine) is the standard format for
medical images and related data. Scanova uses PyDICOM to read DICOM files. It applies
rescale slope and intercept to convert raw pixel values to Hounsfield Units (for CT),
then applies window centre/width windowing to map the HU range to a displayable 0–255
scale. MONOCHROME1 images (inverted) are corrected to MONOCHROME2 convention.

---
**Q9: Why should we not claim that these enhanced images are diagnostically superior?**  
**A**: Image enhancement techniques modify pixel values based on mathematical transformations.
They can improve visual clarity for a human observer, but they may also introduce
artefacts, amplify noise, or alter intensities in ways that are misleading for diagnosis.
Clinical validation — comparing enhancement outcomes with expert radiologist assessments
on standardised datasets — is required before any enhancement method can be trusted for
diagnostic purposes.

---
**Q10: What is Michelson contrast? What is its limitation?**  
**A**: Michelson contrast = (Imax − Imin) / (Imax + Imin). It ranges from 0 (no contrast)
to 1 (maximum contrast). Its limitation is that it uses only the minimum and maximum pixel
values, making it sensitive to a single outlier bright or dark pixel. A more robust measure
would use percentile values.

---
**Q11: How is grayscale conversion performed, and why is it done on a luminance basis?**  
**A**: OpenCV uses: Y = 0.114·B + 0.587·G + 0.299·R (the BT.601 luma formula).
These weights reflect human visual sensitivity — the eye is most sensitive to green,
moderately to red, and least to blue. Using these weights preserves perceived brightness
better than a simple average.

---
**Q12: What is the cumulative distribution function (CDF) of an image histogram?**  
**A**: The CDF at intensity i gives the fraction of pixels with intensity ≤ i.
In histogram equalization, the CDF is used as the transformation function:
output = round((CDF(i) / CDF(255)) · 255).
A perfectly equalised image has a linear CDF. CLAHE makes the local CDFs approximately
linear within each tile, improving local contrast.
""")
