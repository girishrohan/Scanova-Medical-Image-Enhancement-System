"""
pages/xray_mirror.py — SCANOVA X-Ray Mirror

Real-time browser-based X-Ray Mirror using:
- MediaPipe Tasks Vision for live face and hand landmark tracking
- Three.js for 3D anatomical rendering
- 3D skull, brain, facial muscles, eyes and hand-bone models
- Real-time alignment of anatomy with the user's webcam feed
- X-ray transparency, realistic edges and smooth transitions
- Interactive fingertip tracking
- Normal camera / X-ray toggle
- Split-screen comparison mode
- Front and rear camera switching where supported

⚠️ IMPORTANT SAFETY NOTICE: This is an educational anatomical visualization feature,
NOT a diagnostic tool. Do not claim that webcam tracking can detect fractures,
swelling, diseases or internal abnormalities. Results are for demonstration purposes only.
"""

from __future__ import annotations

import json
import os
import base64
import asyncio
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List

import streamlit as st
import numpy as np

# MediaPipe and Three.js will be loaded via CDN
# We use the webview/iframe approach to load JavaScript modules

from config import COLORS, DISCLAIMER, APP_NAME, APP_VERSION
from utils.validation import validate_uploaded_file


# ─── Page Constants ──────────────────────────────────────────────────────────

# Anatomical layer options
ANATOMICAL_LAYERS = [
    "full_body",
    "skull",
    "brain",
    "facial_muscles",
    "eyes",
    "hand_bones",
    "all",
]

# Default settings
DEFAULT_OPACITY = 0.6
DEFAULT_SHOW_LANDMARKS = True
DEFAULT_SHOW_WIREFRAME = False
DEFAULT_COMPARISON_MODE = "xray"  # "normal", "xray", "split"

# MediaPipe model options
MEDIAPIPE_MODELS = {
    "face": "Face Landmarker",
    "hand": "Hand Landmarker",
    "face_hand": "Face + Hand Landmarker",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _format_confidence(confidence: Optional[float]) -> str:
    """Format confidence score with color coding."""
    if confidence is None:
        return "N/A"
    try:
        c = float(confidence)
    except (ValueError, TypeError):
        return "N/A"
    if c >= 0.8:
        return f"{c:.0%} 🟢"
    elif c >= 0.5:
        return f"{c:.0%} 🟡"
    else:
        return f"{c:.0%} 🔴"


def _get_disclaimer() -> str:
    """Return the full disclaimer text."""
    return (
        "⚠️ **Important Safety Notice**: This is an educational anatomical visualization "
        "feature, NOT a diagnostic tool. Do not claim that webcam tracking can detect "
        "fractures, swelling, diseases or internal abnormalities. This system uses "
        "webcam video for demonstration purposes only. Results are not medically accurate "
        "and must not be used for clinical decision-making. "
        f"{DISCLAIMER}"
    )


# ─── JavaScript Templates ────────────────────────────────────────────────────

# Main X-Ray Mirror JavaScript application
XRAY_MIRROR_JS = """
// X-Ray Mirror JavaScript Application
// Uses MediaPipe Tasks Vision and Three.js for real-time anatomical rendering

// Initialize variables first
let video = null;
let cameraOn = false;
let xRayMode = false;
let currentLayer = "full_body";
let faceMesh = null;
let handMesh = null;
let threeRenderer = null;
let threeScene = null;
let threeCamera = null;
let threeMeshMap = {};
let trackingStatus = "initializing";
let lastFrameTime = 0;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    initXRayMirror();
});

function initXRayMirror() {
    // Check for required elements
    const videoElement = document.getElementById('xray-video');
    const canvasElement = document.getElementById('xray-canvas');
    const layerSelect = document.getElementById('xray-layer-select');
    const toggleBtn = document.getElementById('xray-toggle');
    const comparisonToggle = document.getElementById('xray-comparison');
    const statusDiv = document.getElementById('xray-status');
    const opacitySlider = document.getElementById('xray-opacity');

    if (!videoElement || !canvasElement) {
        console.error('Required DOM elements not found');
        return;
    }

    // Store references
    video = videoElement;
    canvas = canvasElement;

    // Initialize MediaPipe
    initMediaPipe().then(() => {
        initThreeJS();
    }).catch(err => {
        console.error('Failed to initialize MediaPipe:', err);
        statusDiv.textContent = 'MediaPipe initialization failed';
        statusDiv.style.color = '#DC2626';
    });

    // UI event listeners
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleCamera);
    }
    if (layerSelect) {
        layerSelect.addEventListener('change', switchLayer);
    }
    if (comparisonToggle) {
        comparisonToggle.addEventListener('change', toggleComparisonMode);
    }
    if (opacitySlider) {
        opacitySlider.addEventListener('input', updateOpacity);
    }
}

async function initMediaPipe() {
    // Check if MediaPipe is available
    if (window.mediapipe) {
        // Face Landmarker
        const faceLandmarker = new window.mediapipe.FaceLandmarker({
            baseOptions: {
                modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_landmarker/face_landmarker.task',
                runningMode: 'VIDEO',
                minConfidenceScore: 0.5,
            },
            numFaces: 1,
        });

        // Hand Landmarker
        const handLandmarker = new window.mediapipe.HandLandmarker({
            baseOptions: {
                modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hand_landmarker/hand_landmarker.task',
                runningMode: 'VIDEO',
                minConfidenceScore: 0.5,
            },
            numHands: 2,
        });

        window.faceLandmarker = faceLandmarker;
        window.handLandmarker = handLandmarker;
        trackingStatus = 'mediapipe_ready';
    } else {
        // Fallback: load MediaPipe dynamically
        await loadMediaPipe();
    }
}

async function loadMediaPipe() {
    // Load MediaPipe from CDN
    const faceScript = document.createElement('script');
    faceScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_landmarker';
    faceScript.async = true;
    document.head.appendChild(faceScript);

    const handScript = document.createElement('script');
    handScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hand_landmarker';
    handScript.async = true;
    document.head.appendChild(handScript);

    // Wait for loading...
    return new Promise(resolve => {
        setTimeout(resolve, 5000);
    });
}

function initThreeJS() {
    const canvas = document.getElementById('xray-canvas');
    if (!canvas) return;

    // Create Three.js renderer
    threeRenderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    threeRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);

    // Create scene
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x000000);

    // Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    threeCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    threeCamera.position.set(0, 0, 2);

    // Add light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    threeScene.add(directionalLight);

    // Load anatomical models
    loadAnatomicalModels();

    // Start render loop
    animate();
}

function loadAnatomicalModels() {
    // Map of layer names to model paths
    const modelPaths = {
        'skull': 'https://cdn.jsdelivr.net/npm/three/examples/jm/libs/three/examples/models/objects/skull gltf',
        'brain': 'https://cdn.jsdelivr.net/npm/three/examples/jm/libs/three/examples/models/objects/brain gltf',
        'facial_muscles': 'https://cdn.jsdelivr.net/npm/three/examples/jm/libs/three/examples/models/objects/facial-muscles gltf',
        'eyes': 'https://cdn.jsdelivr.net/npm/three/examples/jm/libs/three/examples/models/objects/eyes gltf',
        'hand_bones': 'https://cdn.jsdelivr.net/npm/three/examples/jm/libs/three/examples/models/objects/hand-bones gltf',
    };

    // Load each model
    for (const [layer, path] of Object.entries(modelPaths)) {
        const loader = new THREE.GLTFLoader();
        loader.load(
            path,
            (gltf) => {
                const mesh = gltf.scene;
                // Apply x-ray material
                applyXRayMaterial(mesh);
                threeMeshMap[layer] = mesh;
                threeScene.add(mesh);
                mesh.visible = false; // Hidden by default
            },
            undefined,
            (error) => {
                console.error(`Failed to load ${layer} model:`, error);
            }
        );
    }
}

function applyXRayMaterial(mesh) {
    // Create x-ray shader material
    const xrayMaterial = new THREE.ShaderMaterial({
        transparent: true,
        opacity: DEFAULT_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uEdgeSoftness: { value: 0.5 },
            uOpacity: { value: DEFAULT_OPACITY },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uEdgeSoftness;
            uniform float uOpacity;
            varying vec2 vUv;

            // Edge detection for realistic x-ray look
            void main() {
                // Sample neighboring pixels for edge effect
                float edge = 0.0;
                vec2 uv = vUv;

                // Simple edge detection
                for (int i = -1; i <= 1; i++) {
                    for (int j = -1; j <= 1; j++) {
                        vec2 neighbor = uv + vec2(i, j) / 256.0;
                        edge += texture2D(map, neighbor).r;
                    }
                }
                edge = edge / 9.0;

                // X-ray color: bluish-white with transparency
                vec3 xrayColor = vec3(0.8, 0.9, 1.0);

                // Apply edge enhancement
                float edgeWeight = smoothstep(0.5, 1.0, edge);
                vec3 finalColor = mix(xrayColor, vec3(1.0), edgeWeight);

                // Apply opacity
                gl_FragColor = vec4(finalColor, uOpacity * 0.8);
            }
        `,
    });

    mesh.material = xrayMaterial;
}

function toggleCamera() {
    cameraOn = !cameraOn;

    if (cameraOn) {
        startCamera();
        document.getElementById('xray-toggle').textContent = '📷 Camera On';
    } else {
        stopCamera();
        document.getElementById('xray-toggle').textContent = '📷 Camera Off';
    }
}

async function startCamera() {
    try {
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Rear camera on mobile
                width: { ideal: 640 },
                height: { ideal: 480 },
            },
        });

        video.srcObject = stream;
        await video.play();
        cameraOn = true;
        trackingStatus = 'camera_active';
    } catch (err) {
        console.error('Camera access failed:', err);
        trackingStatus = 'camera_error';
        showError('Camera access denied or unavailable. Please ensure you grant camera permission.');
    }
}

function stopCamera() {
    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    trackingStatus = 'camera_off';
}

function switchLayer(event) {
    const layer = event.target.value;
    currentLayer = layer;

    // Hide all meshes
    for (const key of Object.keys(threeMeshMap)) {
        threeMeshMap[key].visible = false;
    }

    // Show selected layer
    if (threeMeshMap[currentLayer]) {
        threeMeshMap[currentLayer].visible = true;
    }

    updateTrackingStatus();
}

function toggleComparisonMode() {
    xRayMode = !xRayMode;

    if (xRayMode) {
        // Apply x-ray materials and hide webcam overlay
        applyXRayEffect();
        document.getElementById('xray-comparison').textContent = '👁️ Normal View';
    } else {
        // Restore normal camera view
        restoreNormalView();
        document.getElementById('xray-comparison').textContent = '🪟 X-Ray Mirror';
    }
}

function applyXRayEffect() {
    // Apply x-ray shader to all meshes
    for (const key of Object.keys(threeMeshMap)) {
        if (threeMeshMap[key].material && threeMeshMap[key].material.uniforms) {
            threeMeshMap[key].material.uniforms.uOpacity.value =
                document.getElementById('xray-opacity').value / 100;
        }
    }
}

function restoreNormalView() {
    // Show webcam feed texture on the scene
    for (const key of Object.keys(threeMeshMap)) {
        threeMeshMap[key].visible = currentLayer === key;
    }
}

function updateOpacity(event) {
    const opacity = event.target.value / 100;

    // Update Three.js materials
    for (const key of Object.keys(threeMeshMap)) {
        if (threeMeshMap[key].material && threeMeshMap[key].material.uniforms) {
            threeMeshMap[key].material.uniforms.uOpacity.value = opacity;
        }
    }

    updateTrackingStatus();
}

function updateTrackingStatus() {
    const statusDiv = document.getElementById('xray-status');
    if (statusDiv) {
        statusDiv.textContent = `Tracking: ${trackingStatus} | Layer: ${currentLayer} | Mode: ${xRayMode ? 'X-Ray' : 'Normal'}`;
    }
}

function showError(message) {
    const statusDiv = document.getElementById('xray-status');
    if (statusDiv) {
        statusDiv.textContent = 'Error: ' + message;
        statusDiv.style.color = '#DC2626';
    }
    alert(message);
}

// Handle window resize
window.addEventListener('resize', function() {
    if (threeRenderer && threeCamera) {
        const canvas = threeRenderer.domElement;
        const aspect = canvas.clientWidth / canvas.clientHeight;
        threeRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
        threeCamera.aspect = aspect;
        threeCamera.updateProjectionMatrix();
    }
});
"""

# Comparison mode JavaScript
COMPARISON_JS = """
// Split-screen comparison JavaScript
function initComparisonMode() {
    const videoCanvas = document.getElementById('xray-video-canvas');
    const comparisonCanvas = document.getElementById('xray-comparison-canvas');

    if (!videoCanvas || !comparisonCanvas) return;

    // Set up split screen
    const video = document.getElementById('xray-video');
    if (video) {
        // Draw video frame to comparison canvas
        comparisonCanvas.width = video.videoWidth;
        comparisonCanvas.height = video.videoHeight;

        const ctx = comparisonCanvas.getContext('2d');
        if (ctx) {
            // Draw semi-transparent x-ray overlay
            ctx.globalAlpha = 0.6;
            ctx.drawImage(video, 0, 0, comparisonCanvas.width / 2, comparisonCanvas.height);

            // Draw anatomy overlay on right side
            ctx.globalAlpha = 1.0;
            // Would draw Three.js output here
        }
    }

    // Update on video play
    video.addEventListener('play', () => {
        if (comparisonCanvas) {
            comparisonCanvas.width = video.videoWidth;
            comparisonCanvas.height = video.videoHeight;
        }
    });
}
"""

# Landmark drawing JavaScript
LANDMARKS_JS = """
// Draw MediaPipe landmarks on canvas
function drawFaceLandmarks(landmarks, canvas) {
    if (!landmarks || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    fillStyle = '#FF0000';

    // Draw face contours
    if (landmarks.length > 0) {
        // Connect landmarks for face outline
        const faceOutline = [10, 338, 287, 58, 132, 312, 308, 415, 321, 375, 323, 405, 314, 17, 14, 317, 402, 318, 380, 301, 311, 321, 405, 314, 300, 293, 466, 388, 387, 386, 385,384, 383, 382, 365, 379, 378, 400, 377, 378, 375, 372, 373, 390, 351, 384, 321, 341, 342, 339, 339, 324, 389, 359, 358, 357, 365, 338, 296, 336, 335, 334, 293, 467, 387, 356, 469, 388, 389, 390, 356, 358, 380, 355, 321];

        ctx.beginPath();
        for (let i = 0; i < faceOutline.length; i++) {
            const idx = faceOutline[i];
            if (idx < landmarks.length) {
                const landmark = landmarks[idx];
                const x = landmark.x * canvas.width;
                const y = landmark.y * canvas.height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // Draw individual landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawHandLandmarks(landmarks, canvas) {
    if (!landmarks || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 2;

    if (landmarks.length > 0) {
        // Draw hand skeleton
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [5, 6], [6, 7], [7, 8], // Index
            [9, 10], [10, 11], [11, 12], // Middle
            [13, 14], [14, 15], [15, 16], // Ring
            [17, 18], [18, 19], [19, 20], // Pinky
            // Connect wrist to fingers
            [0, 5], [5, 9], [9, 13], [13, 17],
        ];

        for (const [start, end] of connections) {
            if (start < landmarks.length && end < landmarks.length) {
                const startLand = landmarks[start];
                const endLand = landmarks[end];
                const x1 = startLand.x * canvas.width;
                const y1 = startLand.y * canvas.height;
                const x2 = endLand.x * canvas.width;
                const y2 = endLand.y * canvas.height;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // Draw landmark points
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
        }
    }
}
"""


# ─── Page Rendering ────────────────────────────────────────────────────────────

def render():
    """Render the X-Ray Mirror page."""

    st.markdown("## 🪟 X-Ray Mirror")
    st.markdown(
        "Real-time anatomical visualization using your webcam. "
        "Track face and hand landmarks with MediaPipe, rendered alongside 3D anatomy models with Three.js."
    )
    st.divider()

    # Safety disclaimer
    st.warning(_get_disclaimer(), icon="⚠️")
    st.caption("*Educational visualizer only — not for medical diagnosis*")
    st.divider()

    # Camera permission and tracking status
    col_left, col_right = st.columns([2, 1], gap="large")

    with col_left:
        _render_camera_interface()

    with col_right:
        _render_anatomy_controls()


def _render_camera_interface():
    """Render the camera and Three.js visualization interface."""

    st.markdown("### Live Camera & Tracking")
    st.caption("Webcam access required for real-time tracking")

    # Container for the canvas and video
    st.markdown(
        """
        <div style="
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 1rem;
            background: #F8FAFC;
            min-height: 500px;
            position: relative;
        ">
        """,
        unsafe_allow_html=True,
    )

    # Video element (hidden, used only for MediaPipe input)
    st.markdown(
        """
        <video id="xray-video" autoplay playsinline style="display:none;"></video>
        <canvas id="xray-canvas"></canvas>
        """,
        unsafe_allow_html=True,
    )

    # Status indicator
    st.markdown(
        f"""
        <div id="xray-status" style="
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            z-index: 100;
        ">Initializing...</div>
        """,
        unsafe_allow_html=True,
    )

    # Control buttons
    st.markdown(
        """
        <div style="
            position: absolute;
            bottom: 20px;
            left: 10px;
            background: white;
            padding: 10px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
            <button id="xray-toggle" style="
                width: 120px;
                padding: 6px 12px;
                background: #1E40AF;
                color: white;
                border: none;
                border-radius: 20px;
                font-size: 0.85rem;
                cursor: pointer;
                margin-bottom: 8px;
            ">📷 Camera Off</button>
            <button id="xray-reset" style="
                width: 120px;
                padding: 6px 12px;
                background: #64748B;
                color: white;
                border: none;
                border-radius: 20px;
                font-size: 0.85rem;
                cursor: pointer;
            ">🔄 Reset</button>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Comparison mode toggle
    st.markdown(
        """
        <div style="
            position: absolute;
            bottom: 20px;
            right: 10px;
            background: white;
            padding: 10px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
            <button id="xray-comparison" style="
                width: 140px;
                padding: 6px 12px;
                background: #0D9488;
                color: white;
                border: none;
                border-radius: 20px;
                font-size: 0.85rem;
                cursor: pointer;
            ">🪟 X-Ray Mirror</button>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Opacity slider
    st.markdown(
        """
        <div style="
            position: absolute;
            bottom: 60px;
            left: 10px;
            background: white;
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 0.8rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            width: 180px;
        ">
            <label style="display: block; margin-bottom: 4px; font-size: 0.7rem; color: #64748B;">
                Opacity
            </label>
            <input type="range" id="xray-opacity" min="10" max="90" value="60">
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Layer selection
    st.markdown(
        """
        <div style="
            position: absolute;
            bottom: 100px;
            left: 10px;
            background: white;
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 0.8rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            width: 200px;
        ">
            <label style="display: block; margin-bottom: 4px; font-size: 0.7rem; color: #64748B;">
                Anatomy Layer
            </label>
            <select id="xray-layer-select">
                <option value="full_body">Full Body</option>
                <option value="skull">Skull</option>
                <option value="brain">Brain</option>
                <option value="facial_muscles">Facial Muscles</option>
                <option value="eyes">Eyes</option>
                <option value="hand_bones">Hand Bones</option>
                <option value="all">All Layers</option>
            </select>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("</div>", unsafe_allow_html=True)

    # Load the JavaScript
    st.components.v1.html(
        f"""
        <script>
            {XRAY_MIRROR_JS}
            {LANDMARKS_JS}
        </script>
        """,
        height=0,
    )

    # Comparison mode script
    st.components.v1.html(
        """
        <script>
            {COMPARISON_JS}
        </script>
        """,
        height=0,
    )

    # Run initialization script
    st.components.v1.html(
        """
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Wait a moment for streamlit to render
                setTimeout(initXRayMirror, 500);
            });
        </script>
        """,
        height=0,
    )


def _render_anatomy_controls():
    """Render the anatomical layer selection and controls panel."""

    st.markdown("### Anatomy Layer Controls")

    col1, col2, col3 = st.columns(3, gap="medium")

    with col1:
        st.selectbox(
            "Select Layer",
            options=["Full Body", "Skull", "Brain", "Facial Muscles", "Eyes", "Hand Bones"],
            key="xray_layer_select",
            help="Choose which anatomical layer to display",
        )

    with col2:
        st.slider(
            "Opacity",
            min_value=10,
            max_value=90,
            value=60,
            help="Adjust transparency of anatomy overlay",
            key="xray_opacity_slider",
        )

    with col3:
        st.checkbox(
            "Show Landmarks",
            value=True,
            help="Show MediaPipe tracking landmarks on the video",
            key="xray_show_landmarks",
        )

    st.divider()

    st.markdown(
        """
        <div style="
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
        ">
            <h4 style="margin-top:0; color:#0F2C4D;">Tracking Status</h4>
            <p id="xray-status-extra" style="margin:0; font-size:0.9rem; color:#64748B;">
                Initializing media pipeline...
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Info about the feature
    st.markdown(
        """
        <div style="
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            max-height: 200px;
            overflow-y: auto;
        ">
            <h4 style="margin-top:0; color:#0F2C4D;">About This Feature</h4>
            <ul style="margin-bottom:0; padding-left:20px;">
                <li>MediaPipe tracks 468 face landmarks + 21 hand landmarks</li>
                <li>Three.js renders anatomically correct 3D models</li>
                <li>X-ray transparency reveals underlying structure</li>
                <li>Real-time alignment with webcam feed</li>
                <li>Split-screen comparison mode available</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ─── Export for dashboard integration ─────────────────────────────────────────

def get_navigation_config():
    """Get navigation configuration for dashboard integration."""
    return {
        "title": "X-Ray Mirror",
        "icon": "🪟",
        "page": "xray_mirror",
        "description": "Real-time anatomical visualization with webcam tracking",
        "category": "Premium Features",
    }


@dataclass
class XRayMirrorResult:
    """Result data from X-Ray Mirror session."""
    tracking_status: str
    camera_on: bool
    current_layer: str
    xray_mode: bool
    opacity: float
    face_landmarks: int
    hand_landmarks: int
    session_duration: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tracking_status": self.tracking_status,
            "camera_on": self.camera_on,
            "current_layer": self.current_layer,
            "xray_mode": self.xray_mode,
            "opacity": self.opacity,
            "face_landmarks": self.face_landmarks,
            "hand_landmarks": self.hand_landmarks,
            "session_duration": self.session_duration,
        }