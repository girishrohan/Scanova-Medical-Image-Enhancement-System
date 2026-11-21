# Scanova — Medical Image Enhancement System

**A Clearer View of Every Scan.**

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)
![License](https://img.shields.io/badge/License-MIT-yellow)

> **Educational Use Only** — This system is developed as an image-processing demonstration for academic purposes. Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation.

---

## Overview

Scanova is a web-based medical image enhancement application built for the **Computer Graphics and Image Processing (CGIP)** course. It demonstrates classical digital image processing techniques applied to medical images (X-rays, MRI, CT scans) through an interactive Next.js dashboard.

### Key Features

| Module | Description |
|--------|-------------|
| 🔬 **Image Enhancement** | Upload images, configure processing parameters, run the 6-stage pipeline, download results |
| ⚖️ **Image Comparison** | Side-by-side original vs enhanced with quantitative metrics |
| 📊 **Histogram Analysis** | Interactive histogram analysis and distribution comparison |
| 📈 **Image Information** | Technical stats: entropy, Laplacian variance, Michelson contrast, processing timing |
| 📑 **About Project** | Full documentation: algorithms, methodology, limitations, viva Q&A |
| 🎥 **X-Ray Mirror AR** | Real-time anatomical visualization with webcam integration |

---

## Pipeline Stages

```
Upload → Acquisition & Validation → Grayscale Conversion →
Noise Reduction → Contrast Enhancement → Edge Enhancement → Output
```

| Stage | Technique | Purpose |
|-------|-----------|---------|
| 1. Acquisition | Multi-format loading (PNG, JPG, BMP, WebP) | Read & validate medical images |
| 2. Grayscale | Luminance conversion (Y = 0.299R + 0.587G + 0.114B) | Single-channel processing |
| 3. Noise Reduction | Median / Gaussian filter | Remove salt-and-pepper / Gaussian noise |
| 4. Contrast | CLAHE / Histogram Equalization | Adaptive/local contrast enhancement |
| 5. Edge Enhancement | Unsharp masking (I + α·(I − Blur)) | Sharpen anatomical details |
| 6. Output | Display, metrics, download | Compare & export results |

---

## Deployment

### Vercel (Production)

Deploy this application to Vercel:

1. Fork or import this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and create a new project
3. Import your GitHub repository
4. Vercel will automatically detect Next.js and build the application
5. Configure environment variables if needed
6. Deploy!

The application is a **client-side image processing** application. All image enhancement operations run in the browser using WebAssembly-compiled algorithms. No image data is transmitted to servers during processing.

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## Project Structure (Vercel-Ready Next.js)

```
cgip medical image enhancement/
├── app/                         # Next.js App Router pages
│   ├── api/                     # API routes (image processing endpoints)
│   │   └── enhance/route.ts     # Image enhancement API
│   ├── ai-analysis/page.tsx     # AI Analysis dashboard
│   ├── dashboard/page.tsx       # Main dashboard
│   ├── image-comparison/page.tsx
│   ├── image-enhancement/page.tsx
│   ├── image-information/page.tsx
│   ├── histogram-analysis/page.tsx
│   ├── login/page.tsx           # Authentication page
│   ├── xray-mirror/page.tsx     # X-Ray Mirror AR
│   ├── about/page.tsx
│   └── page.tsx                 # Home page
├── components/                  # React components
│   └── scanova-workspace.tsx    # Main workspace component
├── lib/                         # Utilities and configuration
│   ├── config.ts                # Colors, limits, default parameters
│   ├── types.ts                 # TypeScript type definitions
│   ├── image-processing.ts      # Client-side image processing algorithms
│   └── auth-context.tsx         # Authentication context
├── samples/                     # Demo images
│   ├── chest_xray_demo.png
│   ├── brain_mri_demo.png
│   └── knee_ct_demo.png
├── public/                      # Static assets
├── package.json                 # Next.js dependencies
├── next.config.ts               # Next.js configuration
├── vercel.json                  # Vercel deployment configuration
└── README.md                    # This file
```

---

## Dependencies

| Category | Package | Version |
|----------|---------|---------|
| Web Framework | `next` | 14.x |
| React | `react`, `react-dom` | 18.x |
| Image Processing | (Client-side) | - |
| Icons | `lucide-react` | ^0.320 |

---

## Usage

1. **Run the app**: `npm run dev` (development) or `npm run build && npm start` (production)
2. **Navigate** using the sidebar: Dashboard → Image Enhancement → Image Comparison → Histogram Analysis → Image Information → X-Ray Mirror → About Project
3. **Login** with demo credentials: `demo` / `scanova2024`
4. **Upload** a medical image (PNG, JPG, BMP, WebP up to 30 MB)
5. **Configure** processing parameters:
   - Noise Reduction: Median/Gaussian, kernel size
   - Contrast: CLAHE/Histogram Equalization, clip limit, tile grid
   - Sharpening: Unsharp mask strength (α) and blur σ
6. **Click "Enhance Image"** to run the pipeline
7. **View** results, statistics, and histograms
8. **Download** enhanced image

---

## Algorithm Details

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
- Session data is not persisted (demo edition)
- DICOM support requires backend server (not in Vercel frontend)

---

## Future Enhancements

- DICOM support via backend API route
- Dark mode theme
- Keyboard shortcuts
- Batch processing mode
- Report generation (PDF)
- Mobile-responsive design
- Accessibility improvements

---

## Local Development

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
npm install

# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

---

## Academic Context

**Project**: CGIP Mini Project — Medical Image Enhancement System  
**Course**: Computer Graphics and Image Processing  
**Domain**: Digital Image Processing / Medical Imaging  

### Viva Preparation Questions

The **About Project** page includes detailed responses covering:
- Image enhancement vs restoration
- CLAHE vs global histogram equalization
- Median vs Gaussian filtering for different noise types
- Unsharp masking parameters
- Histogram and CDF interpretation
- Shannon entropy in image processing
- Variance of Laplacian as sharpness proxy
- Grayscale conversion luminance weights
- CDF role in histogram equalization

---

## License

MIT License — Educational use encouraged.

---

## Disclaimer

> **⚠️ Educational Use Only**  
> This system is developed as an image-processing demonstration for academic purposes. Enhanced images are NOT guaranteed to be diagnostically superior and must NOT replace professional medical interpretation. Clinical use requires appropriate validation and qualified medical oversight.

---

**Built with** Next.js, TypeScript, React, and client-side image processing algorithms.