"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  Camera,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

type DisplayMode = "normal" | "xray" | "split" | "lens";
type CameraDevice = { deviceId: string; label: string };

interface ArLabel {
  text: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  color: string;
}

const LAYER_DEFS = [
  { id: "skull", label: "Skull", color: "#bfe3ff", defaultOn: true, model: "/models/skull.glb" },
  { id: "brain", label: "Brain (Cerebrum)", color: "#ff9fc0", defaultOn: true, model: "/models/brain.glb" },
  { id: "facial", label: "Facial Muscles", color: "#ff6b5e", defaultOn: false, model: "/models/facial.glb" },
  { id: "eyes", label: "Eyes / Orbits", color: "#fff3a8", defaultOn: true, model: "/models/eyes.glb" },
  { id: "hands", label: "Hand Bones", color: "#d9f0ff", defaultOn: false, model: "/models/hands.glb" },
];

// --- Fresnel X-Ray shader ---
const xrayVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const xrayFragmentShader = `
  uniform vec3 color;
  uniform float opacity;
  uniform float fresnelPower;
  uniform float glowIntensity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), fresnelPower);
    vec3 finalColor = color * (0.3 + fresnel * glowIntensity);
    float alpha = opacity * (0.15 + fresnel * 0.85);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// --- Solid anatomy shader ---
const solidFragmentShader = `
  uniform vec3 color;
  uniform float opacity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float diffuse = max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0) * 0.4 + 0.6;
    vec3 finalColor = color * diffuse;
    gl_FragColor = vec4(finalColor, opacity);
  }
`;

export default function XRMMirrorPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const anatomicalGroupRef = useRef<THREE.Group | null>(null);
  const meshGroupRefs = useRef<Record<string, THREE.Group>>({});
  const faceLandmarkerRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);
  const modelVertexCounts = useRef<Record<string, number>>({});

  // State kept in refs for the render loop (avoids stale closures)
  const displayModeRef = useRef<DisplayMode>("xray");
  const layersRef = useRef<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.defaultOn]))
  );
  const transparencyRef = useRef(70);
  const renderModeRef = useRef<"xray" | "solid">("xray");
  const lensPosRef = useRef({ x: 50, y: 50 });
  const lensSizeRef = useRef(60);

  // React state for UI
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("xray");
  const [renderMode, setRenderMode] = useState<"xray" | "solid">("xray");
  const [transparency, setTransparency] = useState(70);
  const [lensSize, setLensSize] = useState(60);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.defaultOn]))
  );
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [fps, setFps] = useState(0);
  const [faceLocked, setFaceLocked] = useState(false);
  const [handLocked, setHandLocked] = useState(false);
  const [resolution, setResolution] = useState("—");
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState("");

  // Sync React state -> refs
  useEffect(() => { displayModeRef.current = displayMode; }, [displayMode]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { transparencyRef.current = transparency; }, [transparency]);
  useEffect(() => { renderModeRef.current = renderMode; }, [renderMode]);
  useEffect(() => { lensPosRef.current = lensPos; }, [lensPos]);
  useEffect(() => { lensSizeRef.current = lensSize; }, [lensSize]);

  // Auth check
  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
    }
  }, [router]);

  // Suppress benign XNNPACK INFO logs
  useEffect(() => {
    const XNNPACK_MSG = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    const filter = (args: any[]) =>
      args.some((a) => typeof a === "string" && a.includes(XNNPACK_MSG));
    console.error = (...args: any[]) => { if (!filter(args)) originalError.apply(console, args); };
    console.warn = (...args: any[]) => { if (!filter(args)) originalWarn.apply(console, args); };
    console.log = (...args: any[]) => { if (!filter(args)) originalLog.apply(console, args); };
    return () => { console.error = originalError; console.warn = originalWarn; console.log = originalLog; };
  }, []);

  const handleLogout = () => { clearAuth(); router.push("/login"); };

  // ───── Load MediaPipe ─────
  const loadMediaPipe = useCallback(async () => {
    if (faceLandmarkerRef.current) return;
    setLoading(true);
    setError("");
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
    } catch (err) {
      console.error("MediaPipe load error:", err);
      setError("Could not load AR tracking models. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ───── Enumerate cameras ─────
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Camera enumeration error:", err);
    }
  }, [selectedCamera]);

  // ───── Material factories ─────
  const createXRayMaterial = useCallback((color: number, opacity: number) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        fresnelPower: { value: 2.5 },
        glowIntensity: { value: 1.8 },
      },
      vertexShader: xrayVertexShader,
      fragmentShader: xrayFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const createSolidMaterial = useCallback((color: number, opacity: number) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
      },
      vertexShader: xrayVertexShader,
      fragmentShader: solidFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
  }, []);

  // ───── Load a real GLB model (NO procedural fallback) ─────
  const loadModel = useCallback(async (id: string, path: string): Promise<THREE.Group | null> => {
    if (!gltfLoaderRef.current) gltfLoaderRef.current = new GLTFLoader();
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoaderRef.current!.load(path, resolve, undefined, reject);
      });
      const model = gltf.scene as THREE.Group;
      model.name = id;

      // Count vertices to verify real mesh
      let vertCount = 0;
      const layerDef = LAYER_DEFS.find((l) => l.id === id);
      const layerColor = layerDef ? new THREE.Color(layerDef.color) : new THREE.Color(0xffffff);

      model.traverse((child: any) => {
        if (child.isMesh) {
          const geo = child.geometry as THREE.BufferGeometry;
          vertCount += geo.attributes.position ? geo.attributes.position.count : 0;

          // Apply layer-specific X-Ray material
          child.material = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: layerColor },
              opacity: { value: 0.25 },
              fresnelPower: { value: 2.5 },
              glowIntensity: { value: 1.8 },
            },
            vertexShader: xrayVertexShader,
            fragmentShader: xrayFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      modelVertexCounts.current[id] = vertCount;
      console.log(`Loaded model "${id}" from ${path}: ${vertCount} vertices`);
      return model;
    } catch (err) {
      console.warn(`Model ${path} not found — no fallback.`);
      return null;
    }
  }, []);

  // ───── Draw AR labels on a 2D canvas overlay ─────
  const drawArLabels = useCallback((labels: ArLabel[]) => {
    const canvas = labelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to its display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const label of labels) {
      const ax = label.anchorX * canvas.width;
      const ay = label.anchorY * canvas.height;
      const lx = label.x * canvas.width;
      const ly = label.y * canvas.height;

      // Leader line
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = label.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Anchor dot
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fillStyle = label.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Glow
      ctx.shadowColor = label.color;
      ctx.shadowBlur = 8;

      // Label background
      ctx.font = "600 11px system-ui, sans-serif";
      const textWidth = ctx.measureText(label.text).width;
      const pad = 6;
      const bgX = lx - 2;
      const bgY = ly - 9;
      const bgW = textWidth + pad * 2;
      const bgH = 18;

      ctx.fillStyle = "rgba(10, 30, 55, 0.88)";
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, 4);
      ctx.fill();
      ctx.strokeStyle = label.color + "66";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label text
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label.text, lx + pad - 2, ly + 3);
    }
  }, []);

  // ───── Init Three.js scene ─────
  const initThree = useCallback(async () => {
    if (!threeContainerRef.current || rendererRef.current) return;

    const container = threeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    // NO background — fully transparent to show video behind
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);  // fully transparent
    renderer.domElement.style.background = "transparent";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x404040, 0.5));
    const p1 = new THREE.PointLight(0x14b8a6, 1, 10);
    p1.position.set(2, 2, 3);
    scene.add(p1);
    const p2 = new THREE.PointLight(0x3b82f6, 0.8, 10);
    p2.position.set(-2, -1, 2);
    scene.add(p2);

    // Anatomical group
    const group = new THREE.Group();
    anatomicalGroupRef.current = group;
    scene.add(group);

    // Load all layer models
    let anyLoaded = false;
    const loadedNames: string[] = [];
    for (const layer of LAYER_DEFS) {
      const model = await loadModel(layer.id, layer.model);
      if (model) {
        const verts = modelVertexCounts.current[layer.id] || 0;
        if (verts < 100) {
          console.warn(`Model ${layer.id} has only ${verts} verts — rejected as too simple.`);
          continue;
        }
        model.visible = layersRef.current[layer.id];
        meshGroupRefs.current[layer.id] = model;
        group.add(model);
        anyLoaded = true;
        loadedNames.push(`${layer.id}(${verts}v)`);
      }
    }

    if (anyLoaded) {
      setModelsLoaded(true);
      setModelError("");
      console.log(`Models loaded: ${loadedNames.join(", ")}`);
    } else {
      setModelsLoaded(false);
      setModelError(
        "No 3D anatomical models found in public/models/. " +
        "Run `python scripts/generate_models.py` or download BodyParts3D meshes " +
        "and place .glb files (skull.glb, brain.glb, facial.glb, eyes.glb, hands.glb) in public/models/."
      );
    }

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); };
  }, [loadModel]);

  // ───── Start camera ─────
  const startCamera = async () => {
    setError("");
    setLoading(true);
    try {
      await loadMediaPipe();
      await enumerateCameras();

      const constraints: MediaStreamConstraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await enumerateCameras();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setResolution(`${settings.width || "?"}×${settings.height || "?"}`);

        await initThree();
        startRenderLoop();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please allow camera permissions and try again.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setCameraOn(false);
    setFaceLocked(false);
    setHandLocked(false);
    lastTimestampRef.current = 0;
  };

  // ───── Render loop ─────
  const startRenderLoop = useCallback(() => {
    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const now = performance.now();
      if (lastTimeRef.current) {
        const delta = now - lastTimeRef.current;
        fpsFramesRef.current.push(delta);
        if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
        const avg = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
        setFps(Math.round(1000 / avg));
      }
      lastTimeRef.current = now;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;

      const timestamp = Math.max(now, lastTimestampRef.current + 1);
      lastTimestampRef.current = timestamp;

      const currentLayers = layersRef.current;
      const currentDisplayMode = displayModeRef.current;
      const currentTransparency = transparencyRef.current;
      const currentRenderMode = renderModeRef.current;

      const arLabels: ArLabel[] = [];

      // ───── Face tracking ─────
      let faceFound = false;
      if (faceLandmarkerRef.current) {
        try {
          const results = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          faceFound = !!(results.faceLandmarks && results.faceLandmarks.length > 0);
          setFaceLocked((prev) => (prev === faceFound ? prev : faceFound));
          if (faceFound) {
            const lm = results.faceLandmarks[0];

            // Build AR labels from landmark positions (mirrored X for scaleX(-1) video)
            if (currentLayers.skull && currentDisplayMode !== "normal") {
              const pt = lm[10]; // top of head
              arLabels.push({
                text: "Cranium / Skull",
                anchorX: 1 - pt.x, anchorY: pt.y,
                x: 1 - pt.x + 0.08, y: pt.y - 0.03,
                color: "#bfe3ff",
              });
            }
            if (currentLayers.brain && currentDisplayMode !== "normal") {
              const pt = lm[8]; // between eyes, slightly up
              arLabels.push({
                text: "Brain (Cerebrum)",
                anchorX: 1 - pt.x, anchorY: pt.y - 0.08,
                x: 1 - pt.x - 0.1, y: pt.y - 0.12,
                color: "#ff9fc0",
              });
            }
            if (currentLayers.eyes && currentDisplayMode !== "normal") {
              const ptL = lm[33]; // left eye inner
              arLabels.push({
                text: "Eyes / Orbits",
                anchorX: 1 - ptL.x, anchorY: ptL.y,
                x: 1 - ptL.x + 0.1, y: ptL.y + 0.01,
                color: "#fff3a8",
              });
            }
            if (currentLayers.facial && currentDisplayMode !== "normal") {
              const pt = lm[172]; // lower cheek
              arLabels.push({
                text: "Facial Muscles",
                anchorX: 1 - pt.x, anchorY: pt.y,
                x: 1 - pt.x - 0.1, y: pt.y + 0.03,
                color: "#ff6b5e",
              });
            }

            // Transform 3D group from face matrix
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const m = results.facialTransformationMatrixes[0].data;
              if (anatomicalGroupRef.current) {
                const group = anatomicalGroupRef.current;
                const tx = m[12] * 0.5;
                const ty = -m[13] * 0.5;
                const tz = m[14] * 0.3;

                group.position.x += (tx - group.position.x) * 0.15;
                group.position.y += (ty - group.position.y) * 0.15;
                group.position.z += (tz - group.position.z) * 0.15;

                const rotX = Math.atan2(m[9], m[10]);
                const rotY = Math.atan2(-m[8], Math.sqrt(m[9] * m[9] + m[10] * m[10]));
                const rotZ = Math.atan2(m[4], m[0]);

                group.rotation.x += (rotX - group.rotation.x) * 0.1;
                group.rotation.y += (rotY - group.rotation.y) * 0.1;
                group.rotation.z += (rotZ - group.rotation.z) * 0.1;
              }
            }
          }
        } catch (_) { /* silent */ }
      }

      // ───── Hand tracking ─────
      let handFound = false;
      if (handLandmarkerRef.current) {
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, timestamp);
          handFound = !!(results.landmarks && results.landmarks.length > 0);
          setHandLocked((prev) => (prev === handFound ? prev : handFound));
          if (handFound && currentLayers.hands) {
            const hand = results.landmarks[0];
            const handsGroup = meshGroupRefs.current.hands;
            if (handsGroup && hand.length >= 21) {
              const wrist = hand[0];
              handsGroup.position.x = (wrist.x - 0.5) * 2;
              handsGroup.position.y = -(wrist.y - 0.5) * 2;
              handsGroup.position.z = wrist.z * 2;

              if (currentDisplayMode !== "normal") {
                arLabels.push({
                  text: "Hand Bones (Metacarpals & Phalanges)",
                  anchorX: 1 - wrist.x, anchorY: wrist.y,
                  x: 1 - wrist.x + 0.06, y: wrist.y + 0.05,
                  color: "#d9f0ff",
                });
              }
            }

            // Track fingertip for lens mode
            if (currentDisplayMode === "lens" && hand.length >= 9) {
              const tip = hand[8]; // index fingertip
              lensPosRef.current = { x: (1 - tip.x) * 100, y: tip.y * 100 };
            }
          }
        } catch (_) { /* silent */ }
      }

      // ───── Update layer visibility ─────
      Object.entries(currentLayers).forEach(([id, visible]) => {
        const g = meshGroupRefs.current[id];
        if (g) g.visible = visible;
      });

      // ───── Update material properties ─────
      const opFactor = currentTransparency / 100;
      Object.values(meshGroupRefs.current).forEach((group) => {
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mat = child.material as THREE.ShaderMaterial;
            if (mat.uniforms) {
              if (mat.uniforms.opacity) mat.uniforms.opacity.value = opFactor * 0.6;
              if (currentRenderMode === "solid" && mat.fragmentShader !== solidFragmentShader) {
                mat.fragmentShader = solidFragmentShader;
                mat.blending = THREE.NormalBlending;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              } else if (currentRenderMode === "xray" && mat.fragmentShader !== xrayFragmentShader) {
                mat.fragmentShader = xrayFragmentShader;
                mat.blending = THREE.AdditiveBlending;
                mat.depthWrite = false;
                mat.needsUpdate = true;
              }
            }
          }
        });
      });

      // ───── Render 3D scene ─────
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const renderer = rendererRef.current;
        const container = threeContainerRef.current;

        if (currentDisplayMode === "normal") {
          // Hide 3D overlay entirely
          renderer.domElement.style.opacity = "0";
        } else if (currentDisplayMode === "split") {
          // Show 3D on the right half only
          renderer.domElement.style.opacity = "1";
          renderer.domElement.style.clipPath = "inset(0 0 0 50%)";
        } else if (currentDisplayMode === "lens") {
          // Show 3D only inside a circle at lens position
          const lp = lensPosRef.current;
          const ls = lensSizeRef.current;
          const radiusPx = ls * 3;
          renderer.domElement.style.opacity = "1";
          renderer.domElement.style.clipPath = `circle(${radiusPx}px at ${lp.x}% ${lp.y}%)`;
        } else {
          // xray: full overlay
          renderer.domElement.style.opacity = "1";
          renderer.domElement.style.clipPath = "none";
        }

        renderer.render(sceneRef.current, cameraRef.current);
      }

      // ───── Draw AR labels ─────
      if (currentDisplayMode !== "normal") {
        drawArLabels(arLabels);
      } else {
        // Clear labels in normal mode
        const canvas = labelCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    render();
  }, [drawArLabels]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      if (faceLandmarkerRef.current) { faceLandmarkerRef.current.close(); faceLandmarkerRef.current = null; }
      if (handLandmarkerRef.current) { handLandmarkerRef.current.close(); handLandmarkerRef.current = null; }
      if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
      if (sceneRef.current) { sceneRef.current.clear(); sceneRef.current = null; }
    };
  }, []);

  // Track mouse for lens mode fallback (when no hand detected)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (displayModeRef.current === "lens" && !handLocked) {
        const rect = threeContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setLensPos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
          });
        }
      }
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handLocked]);

  const toggleLayer = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ───── Glassmorphic HUD style ─────
  const glassStyle: React.CSSProperties = {
    background: "rgba(15, 44, 77, 0.75)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "16px",
    padding: "1rem",
    color: "white",
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      overflow: "hidden",
      zIndex: 0,
    }}>
      {/* ━━━ LAYER 1: Live Webcam Video ━━━ */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          transform: "scaleX(-1)",
          background: "#000",
        }}
      />

      {/* ━━━ LAYER 2: Three.js transparent overlay ━━━ */}
      <div
        ref={threeContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background: "transparent",
        }}
      />

      {/* ━━━ LAYER 3: Split mode divider line ━━━ */}
      {displayMode === "split" && cameraOn && (
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "2px",
          zIndex: 5,
          background: "rgba(20, 184, 166, 0.6)",
          boxShadow: "0 0 12px rgba(20, 184, 166, 0.5)",
        }}>
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(15, 44, 77, 0.85)",
            color: "white",
            fontSize: "0.65rem",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            border: "1px solid rgba(20, 184, 166, 0.4)",
          }}>
            LIVE ← | → X-RAY
          </div>
        </div>
      )}

      {/* ━━━ LAYER 3: Lens mode visual ring ━━━ */}
      {displayMode === "lens" && cameraOn && (
        <div style={{
          position: "absolute",
          left: `${lensPos.x}%`,
          top: `${lensPos.y}%`,
          transform: "translate(-50%, -50%)",
          width: `${lensSize * 6}px`,
          height: `${lensSize * 6}px`,
          borderRadius: "50%",
          border: "2px solid rgba(20, 184, 166, 0.5)",
          boxShadow: "0 0 20px rgba(20, 184, 166, 0.3), inset 0 0 20px rgba(20, 184, 166, 0.1)",
          zIndex: 5,
          pointerEvents: "none",
        }} />
      )}

      {/* ━━━ LAYER 4: AR Label Canvas ━━━ */}
      <canvas
        ref={labelCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 6,
          pointerEvents: "none",
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          fontSize: "1.2rem",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid rgba(20,184,166,0.3)",
              borderTopColor: "#14B8A6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }} />
            Loading AR tracking models...
          </div>
        </div>
      )}

      {/* Model Error Banner */}
      {modelError && (
        <div style={{
          position: "absolute",
          top: "5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(254, 249, 242, 0.95)",
          color: "#78350f",
          padding: "1rem 1.5rem",
          borderRadius: "10px",
          fontSize: "0.85rem",
          maxWidth: "90%",
          textAlign: "center",
          border: "1px solid #fed8b1",
        }}>
          <strong>⚠ 3D Models Not Found</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem" }}>{modelError}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{
          position: "absolute",
          top: "5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(220, 38, 38, 0.9)",
          color: "white",
          padding: "0.75rem 1.5rem",
          borderRadius: "10px",
          fontSize: "0.9rem",
          maxWidth: "90%",
          textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Camera Start Screen */}
      {!cameraOn && !loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          background: "linear-gradient(135deg, rgba(15,44,77,0.95), rgba(10,25,50,0.98))",
        }}>
          <Camera style={{ width: "64px", height: "64px", color: "rgba(255,255,255,0.5)" }} />
          <h2 style={{ color: "white", margin: 0, fontSize: "1.5rem", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            Start Camera for AR Experience
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, maxWidth: "400px", textAlign: "center" }}>
            Position yourself 2-3 feet from the camera. Allow camera permissions when prompted.
          </p>

          {cameras.length > 0 && (
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                fontSize: "0.9rem",
                maxWidth: "300px",
              }}
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId} style={{ background: "#0F2C4D" }}>
                  {cam.label}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={startCamera}
            style={{
              padding: "1rem 2rem",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #0D9488, #14B8A6)",
              color: "white",
              fontSize: "1.1rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 30px rgba(20, 184, 166, 0.4)",
            }}
          >
            <Camera style={{ width: "20px", height: "20px" }} />
            Start Camera
          </button>
        </div>
      )}

      {/* ━━━ Top HUD Bar ━━━ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "white",
              textDecoration: "none",
              fontSize: "0.9rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            ← Home
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
              X-Ray Mirror AR
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
              Real-time 3D anatomical visualization
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            ...glassStyle,
            padding: "0.5rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            fontSize: "0.75rem",
          }}>
            <span style={{ color: faceLocked ? "#4ade80" : "#f87171" }}>
              ● Face: {faceLocked ? "LOCKED" : "SEARCHING"}
            </span>
            <span style={{ color: handLocked ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
              ● Hand: {handLocked ? "LOCKED" : "—"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{fps} FPS</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{resolution}</span>
            {modelsLoaded && (
              <span style={{ color: "#4ade80" }}>● Models: OK</span>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ━━━ Right HUD Panel ━━━ */}
      {cameraOn && showControls && (
        <div style={{
          position: "absolute",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: "280px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "80vh",
          overflowY: "auto",
        }}>
          {/* Display Mode */}
          <div style={glassStyle}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              Display Mode
            </h3>
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {(["normal", "xray", "split", "lens"] as DisplayMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  style={{
                    flex: "1 1 45%",
                    padding: "0.5rem 0.25rem",
                    borderRadius: "8px",
                    border: "none",
                    background: displayMode === mode ? COLORS.teal : "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {mode === "normal" ? "Normal" : mode === "xray" ? "X-Ray" : mode === "split" ? "Split" : "Lens"}
                </button>
              ))}
            </div>
          </div>

          {/* Render Mode */}
          <div style={glassStyle}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              Render Mode
            </h3>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["xray", "solid"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRenderMode(mode)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "8px",
                    border: "none",
                    background: renderMode === mode ? COLORS.blue : "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {mode === "xray" ? "X-Ray" : "Solid"}
                </button>
              ))}
            </div>
          </div>

          {/* Transparency */}
          <div style={glassStyle}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              Transparency: {transparency}%
            </h3>
            <input
              type="range"
              min="10"
              max="100"
              value={transparency}
              onChange={(e) => setTransparency(Number(e.target.value))}
              style={{ width: "100%", accentColor: COLORS.teal }}
            />
          </div>

          {/* Lens Size (only in lens mode) */}
          {displayMode === "lens" && (
            <div style={glassStyle}>
              <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                Lens Size: {lensSize}%
              </h3>
              <input
                type="range"
                min="20"
                max="90"
                value={lensSize}
                onChange={(e) => setLensSize(Number(e.target.value))}
                style={{ width: "100%", accentColor: COLORS.teal }}
              />
            </div>
          )}

          {/* Anatomical Layers */}
          <div style={glassStyle}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              Anatomical Layers
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {LAYER_DEFS.map((layer) => (
                <label
                  key={layer.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={layers[layer.id]}
                    onChange={() => toggleLayer(layer.id)}
                    style={{ accentColor: layer.color }}
                  />
                  <span style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: layer.color,
                    display: "inline-block",
                  }} />
                  {layer.label}
                  {modelVertexCounts.current[layer.id] ? (
                    <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>
                      {modelVertexCounts.current[layer.id]}v
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          {/* Camera Selector */}
          {cameras.length > 1 && (
            <div style={glassStyle}>
              <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                Camera
              </h3>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  stopCamera();
                  setTimeout(startCamera, 100);
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.8rem",
                }}
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId} style={{ background: "#0F2C4D" }}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stop Camera */}
          <button
            onClick={stopCamera}
            style={{
              padding: "0.75rem",
              borderRadius: "12px",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            Stop Camera
          </button>
        </div>
      )}

      {/* Toggle Controls Button */}
      {cameraOn && (
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            right: showControls ? "290px" : "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 11,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(15, 44, 77, 0.7)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            transition: "right 0.3s ease",
          }}
        >
          {showControls ? "›" : "‹"}
        </button>
      )}

      {/* Bottom HUD */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: "0.75rem 1.5rem",
        background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
          ⚠️ <strong>EDUCATIONAL USE ONLY:</strong> Not a diagnostic medical device. {DISCLAIMER.substring(0, 80)}...
        </p>
        <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
          3D models: BodyParts3D (CC BY-SA 2.1 Japan) · SCANOVA v{APP_VERSION}
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
