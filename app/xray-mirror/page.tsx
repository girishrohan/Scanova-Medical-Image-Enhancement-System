"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FaceLandmarker, HandLandmarker, PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
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
  { id: "chest", label: "Ribcage / Chest", color: "#7fd1ff", defaultOn: true, model: "/models/chest.glb" },
  { id: "heart", label: "Heart", color: "#ff4d6d", defaultOn: true, model: "/models/heart.glb" },
  { id: "lungs", label: "Lungs", color: "#80ed99", defaultOn: true, model: "/models/lungs.glb" },
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const anatomicalGroupRef = useRef<THREE.Group | null>(null);
  const chestGroupRef = useRef<THREE.Group | null>(null);
  const handsGroupRef = useRef<THREE.Group | null>(null);
  const meshGroupRefs = useRef<Record<string, THREE.Group>>({});
  const faceLandmarkerRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);
  const isCancelledRef = useRef(false);

  // Refs for render loop (avoid stale closures)
  const displayModeRef = useRef<DisplayMode>("xray");
  const layersRef = useRef<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.defaultOn]))
  );
  const transparencyRef = useRef(70);
  const renderModeRef = useRef<"xray" | "solid">("xray");
  const lensPosRef = useRef({ x: 50, y: 50 });
  const lensSizeRef = useRef(60);

  // AR label state
  const [arLabels, setArLabels] = useState<ArLabel[]>([]);

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
  const [poseLocked, setPoseLocked] = useState(false);
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
      args.some((a) => {
        if (typeof a !== "string") return false;
        return a.includes(XNNPACK_MSG) || a.includes("AbortError");
      });

    console.error = (...args: any[]) => {
      if (filter(args)) return;
      originalError.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      if (filter(args)) return;
      originalWarn.apply(console, args);
    };
    console.log = (...args: any[]) => {
      if (filter(args)) return;
      originalLog.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Load MediaPipe (Face + Hand + Pose)
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
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } catch (err) {
      console.error("MediaPipe load error:", err);
      setError("Could not load AR tracking models. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Camera enumeration error:", err);
    }
  }, [selectedCamera]);

  // Create X-Ray material
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

  // Create Solid material
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

  // Load GLB model (NO procedural fallbacks)
  const loadModel = useCallback(async (id: string, path: string): Promise<THREE.Group | null> => {
    if (!gltfLoaderRef.current) {
      gltfLoaderRef.current = new GLTFLoader();
    }
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoaderRef.current!.load(path, resolve, undefined, reject);
      });
      const model = gltf.scene;
      model.name = id;
      // Normalize bounding box to unit width
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 1.0 / maxDim;
        model.scale.set(scale, scale, scale);
      }
      // Center the model
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(model.scale.x));
      // Apply X-Ray material to all meshes
      model.traverse((child: any) => {
        if (child.isMesh) {
          child.material = createXRayMaterial(0xffffff, 0.25);
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      return model;
    } catch (err) {
      console.warn(`Model ${path} not found.`);
      return null;
    }
  }, [createXRayMaterial]);

  // Initialize Three.js scene
  const initThree = useCallback(async () => {
    if (!threeContainerRef.current || rendererRef.current) return;

    const container = threeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x14b8a6, 1, 10);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x3b82f6, 0.8, 10);
    pointLight2.position.set(-2, -1, 2);
    scene.add(pointLight2);

    // Head anatomical group
    const headGroup = new THREE.Group();
    anatomicalGroupRef.current = headGroup;
    scene.add(headGroup);

    // Chest anatomical group
    const chestGroup = new THREE.Group();
    chestGroupRef.current = chestGroup;
    scene.add(chestGroup);

    // Hands anatomical group
    const handsGroup = new THREE.Group();
    handsGroupRef.current = handsGroup;
    scene.add(handsGroup);

    // Load models for each layer
    let anyLoaded = false;
    const modelVertexCounts: Record<string, number> = {};
    for (const layer of LAYER_DEFS) {
      const model = await loadModel(layer.id, layer.model);
      if (model) {
        model.visible = layers[layer.id];
        meshGroupRefs.current[layer.id] = model;
        // Assign to appropriate group
        if (layer.id === "chest" || layer.id === "heart" || layer.id === "lungs") {
          chestGroup.add(model);
        } else if (layer.id === "hands") {
          handsGroup.add(model);
        } else {
          headGroup.add(model);
        }
        anyLoaded = true;
        // Count vertices
        let vc = 0;
        model.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            vc += child.geometry.attributes.position?.count || 0;
          }
        });
        modelVertexCounts[layer.id] = vc;
      }
    }

    if (anyLoaded) {
      setModelsLoaded(true);
      setModelError("");
    } else {
      setModelsLoaded(false);
      setModelError(
        "No 3D anatomical models found in public/models/. " +
        "Download BodyParts3D meshes and place .glb files in public/models/."
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

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [layers, loadModel]);

  // Start camera
  const startCamera = async () => {
    isCancelledRef.current = false;
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
      if (videoRef.current && !isCancelledRef.current) {
        videoRef.current.srcObject = stream;
        // Guard against React Strict Mode double-mount
        if (videoRef.current.srcObject !== stream || isCancelledRef.current) return;
        // Wait for metadata if needed
        if (videoRef.current.readyState < 1) {
          await new Promise<void>((resolve, reject) => {
            const handler = () => resolve();
            videoRef.current!.addEventListener("loadedmetadata", handler, { once: true });
            // Timeout fallback
            setTimeout(() => {
              videoRef.current?.removeEventListener("loadedmetadata", handler);
              resolve();
            }, 3000);
          });
        }
        if (isCancelledRef.current || videoRef.current.srcObject !== stream) return;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // Ignore AbortError from unmount
          if ((playErr as Error)?.name !== "AbortError") {
            console.error("Video play error:", playErr);
          }
          return;
        }
        if (isCancelledRef.current) return;
        setCameraOn(true);

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setResolution(`${settings.width || "?"}×${settings.height || "?"}`);

        await initThree();
        startRenderLoop();
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Camera error:", err);
        setError("Could not access camera. Please allow camera permissions and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup function for unmount
  const cleanupCamera = useCallback(() => {
    isCancelledRef.current = true;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }
    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }
    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close();
      poseLandmarkerRef.current = null;
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (sceneRef.current) {
      sceneRef.current.clear();
      sceneRef.current = null;
    }
    setCameraOn(false);
    setFaceLocked(false);
    setHandLocked(false);
    setPoseLocked(false);
    lastTimestampRef.current = 0;
  }, []);

  const stopCamera = cleanupCamera;

  // Render loop with tracking
  const startRenderLoop = useCallback(() => {
    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const now = performance.now();
      if (lastTimeRef.current) {
        const delta = now - lastTimeRef.current;
        fpsFramesRef.current.push(delta);
        if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
        const avgDelta = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
        setFps(Math.round(1000 / avgDelta));
      }
      lastTimeRef.current = now;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;

      const timestamp = Math.max(now, lastTimestampRef.current + 1);
      lastTimestampRef.current = timestamp;

      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      if (!camera || !renderer || !scene) return;

      // Compute visible height at z=0 for scale mapping
      const fovRad = (camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(fovRad / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;

      // Face tracking
      if (faceLandmarkerRef.current) {
        try {
          const results = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          const faceFound = !!(results.faceLandmarks && results.faceLandmarks.length > 0);
          setFaceLocked((prev) => (prev === faceFound ? prev : faceFound));
          if (faceFound) {
            const landmarks = results.faceLandmarks[0];

            // Compute face width from cheekbone landmarks (234 -> 454)
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            const faceWidthNorm = Math.abs(rightCheek.x - leftCheek.x);
            // Map to world units
            const headWidthWorld = faceWidthNorm * visibleWidth * 1.15;

            // Head center from nose bridge (landmark 168) or midpoint of cheeks
            const centerX = (leftCheek.x + rightCheek.x) / 2;
            const centerY = (leftCheek.y + rightCheek.y) / 2;

            // Map to world coords (mirrored X)
            const worldX = (0.5 - centerX) * visibleWidth;
            const worldY = (0.5 - centerY) * visibleHeight;

            // 4x4 matrix for rotation
            let rotX = 0, rotY = 0, rotZ = 0;
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              rotX = Math.atan2(matrix[9], matrix[10]);
              rotY = Math.atan2(-matrix[8], Math.sqrt(matrix[9] * matrix[9] + matrix[10] * matrix[10]));
              rotZ = Math.atan2(matrix[4], matrix[0]);
            }

            // Update head group
            const headGroup = anatomicalGroupRef.current;
            if (headGroup) {
              headGroup.position.x += (worldX - headGroup.position.x) * 0.15;
              headGroup.position.y += (worldY - headGroup.position.y) * 0.15;
              headGroup.position.z += (0 - headGroup.position.z) * 0.15;
              headGroup.scale.setScalar(headWidthWorld);
              headGroup.rotation.x += (rotX - headGroup.rotation.x) * 0.1;
              headGroup.rotation.y += (rotY - headGroup.rotation.y) * 0.1;
              headGroup.rotation.z += (rotZ - headGroup.rotation.z) * 0.1;
            }

            // Update AR labels using 3D world projection
            if (!headGroup) { setArLabels([]); return; }
            headGroup.updateMatrixWorld(true);
            const newLabels: ArLabel[] = [];
            if (layersRef.current.skull) {
              const anchor = new THREE.Vector3(0, 0.3, 0);
              anchor.applyMatrix4(headGroup.matrixWorld);
              const projected = anchor.clone().project(camera);
              newLabels.push({
                text: "Cranium / Skull",
                x: (1 - projected.x) * 50 + 50,
                y: (1 - projected.y) * 50 + 50,
                anchorX: (1 - projected.x) * 50 + 50,
                anchorY: (1 - projected.y) * 50 + 50,
                color: "#bfe3ff",
              });
            }
            if (layersRef.current.brain) {
              const anchor = new THREE.Vector3(0, 0.1, 0);
              anchor.applyMatrix4(headGroup.matrixWorld);
              const projected = anchor.clone().project(camera);
              newLabels.push({
                text: "Brain (Cerebrum)",
                x: (1 - projected.x) * 50 + 50,
                y: (1 - projected.y) * 50 + 50 - 5,
                anchorX: (1 - projected.x) * 50 + 50,
                anchorY: (1 - projected.y) * 50 + 50,
                color: "#ff9fc0",
              });
            }
            if (layersRef.current.eyes) {
              const anchor = new THREE.Vector3(0.15, 0.05, 0.35);
              anchor.applyMatrix4(headGroup.matrixWorld);
              const projected = anchor.clone().project(camera);
              newLabels.push({
                text: "Eyes / Orbits",
                x: (1 - projected.x) * 50 + 50,
                y: (1 - projected.y) * 50 + 50,
                anchorX: (1 - projected.x) * 50 + 50,
                anchorY: (1 - projected.y) * 50 + 50,
                color: "#fff3a8",
              });
            }
            if (layersRef.current.facial) {
              const anchor = new THREE.Vector3(0, -0.15, 0.38);
              anchor.applyMatrix4(headGroup.matrixWorld);
              const projected = anchor.clone().project(camera);
              newLabels.push({
                text: "Facial Muscles",
                x: (1 - projected.x) * 50 + 50,
                y: (1 - projected.y) * 50 + 50,
                anchorX: (1 - projected.x) * 50 + 50,
                anchorY: (1 - projected.y) * 50 + 50,
                color: "#ff6b5e",
              });
            }
            setArLabels(newLabels);

          } else {
            setArLabels([]);
          }
        } catch (e) {
          // Silently handle detection errors
        }
      }

      // Hand tracking
      if (handLandmarkerRef.current) {
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, timestamp);
          const handFound = !!(results.landmarks && results.landmarks.length > 0);
          setHandLocked((prev) => (prev === handFound ? prev : handFound));
          if (handFound && layersRef.current.hands) {
            const hand = results.landmarks[0];
            const handsGroup = handsGroupRef.current;
            if (handsGroup && hand.length >= 21) {
              const wrist = hand[0];
              // Map wrist to world coords
              const worldX = (0.5 - wrist.x) * visibleWidth;
              const worldY = (0.5 - wrist.y) * visibleHeight;
              const worldZ = wrist.z * 2;

              handsGroup.position.x += (worldX - handsGroup.position.x) * 0.15;
              handsGroup.position.y += (worldY - handsGroup.position.y) * 0.15;
              handsGroup.position.z += (worldZ - handsGroup.position.z) * 0.15;

              // Scale based on hand span (wrist to middle finger tip)
              const middleTip = hand[12];
              const handSpan = Math.sqrt(
                Math.pow(middleTip.x - wrist.x, 2) +
                Math.pow(middleTip.y - wrist.y, 2)
              );
              const handWidthWorld = handSpan * visibleWidth * 0.8;
              handsGroup.scale.setScalar(Math.max(0.3, handWidthWorld));

              // Add hand bone label
              setArLabels((prev) => [
                ...prev,
                {
                  text: "Hand Bones (Metacarpals & Phalanges)",
                  x: (1 - wrist.x) * 100,
                  y: wrist.y * 100,
                  anchorX: (1 - wrist.x) * 100,
                  anchorY: wrist.y * 100,
                  color: "#d9f0ff",
                },
              ]);
            }
          }
        } catch (e) {
          // Silently handle
        }
      }

      // Pose tracking (upper body)
      if (poseLandmarkerRef.current) {
        try {
          const results = poseLandmarkerRef.current.detectForVideo(video, timestamp);
          const poseFound = !!(results.landmarks && results.landmarks.length > 0);
          setPoseLocked((prev) => (prev === poseFound ? prev : poseFound));
          if (poseFound) {
            const landmarks = results.landmarks[0];
            const chestGroup = chestGroupRef.current;
            if (chestGroup) {
              // Shoulder landmarks (11, 12)
              const leftShoulder = landmarks[11];
              const rightShoulder = landmarks[12];
              // Hip landmarks (23, 24) for torso
              const leftHip = landmarks[23];
              const rightHip = landmarks[24];

              // Compute chest center and width
              const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
              const chestCenterX = (leftShoulder.x + rightShoulder.x) / 2;
              const chestCenterY = (leftShoulder.y + rightShoulder.y) / 2;
              const torsoHeight = Math.abs(leftHip.y - leftShoulder.y);

              // Map to world coords
              const worldX = (0.5 - chestCenterX) * visibleWidth;
              const worldY = (0.5 - chestCenterY) * visibleHeight;
              const chestWidthWorld = shoulderWidth * visibleWidth * 1.2;

              chestGroup.position.x += (worldX - chestGroup.position.x) * 0.15;
              chestGroup.position.y += (worldY - chestGroup.position.y) * 0.15;
              chestGroup.position.z = -0.5;
              chestGroup.scale.setScalar(Math.max(0.5, chestWidthWorld));

              // Add chest organ labels
              if (layersRef.current.chest) {
                setArLabels((prev) => [
                  ...prev,
                  {
                    text: "Ribcage / Chest (Thoracic Cage)",
                    x: (1 - chestCenterX) * 100,
                    y: chestCenterY * 100,
                    anchorX: (1 - chestCenterX) * 100,
                    anchorY: chestCenterY * 100,
                    color: "#7fd1ff",
                  },
                ]);
              }
              if (layersRef.current.heart) {
                const heartX = chestCenterX;
                const heartY = chestCenterY + 0.05;
                setArLabels((prev) => [
                  ...prev,
                  {
                    text: "Heart",
                    x: (1 - heartX) * 100,
                    y: heartY * 100,
                    anchorX: (1 - heartX) * 100,
                    anchorY: heartY * 100,
                    color: "#ff4d6d",
                  },
                ]);
              }
              if (layersRef.current.lungs) {
                const lungX = chestCenterX;
                const lungY = chestCenterY + 0.02;
                setArLabels((prev) => [
                  ...prev,
                  {
                    text: "Lungs (Left & Right)",
                    x: (1 - lungX) * 100,
                    y: lungY * 100,
                    anchorX: (1 - lungX) * 100,
                    anchorY: lungY * 100,
                    color: "#80ed99",
                  },
                ]);
              }
            }
          }
        } catch (e) {
          // Silently handle
        }
      }

      // Update layer visibility
      Object.entries(layersRef.current).forEach(([id, visible]) => {
        const group = meshGroupRefs.current[id];
        if (group) group.visible = visible;
      });

      // Update material mode and transparency
      const opacityFactor = transparencyRef.current / 100;
      Object.values(meshGroupRefs.current).forEach((group) => {
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mat = child.material as THREE.ShaderMaterial;
            if (mat.uniforms) {
              if (mat.uniforms.opacity) {
                mat.uniforms.opacity.value = opacityFactor * 0.6;
              }
              if (renderModeRef.current === "solid" && mat.fragmentShader !== solidFragmentShader) {
                mat.fragmentShader = solidFragmentShader;
                mat.blending = THREE.NormalBlending;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              } else if (renderModeRef.current === "xray" && mat.fragmentShader !== xrayFragmentShader) {
                mat.fragmentShader = xrayFragmentShader;
                mat.blending = THREE.AdditiveBlending;
                mat.depthWrite = false;
                mat.needsUpdate = true;
              }
            }
          }
        });
      });

      // Update matrix world for all groups
      if (anatomicalGroupRef.current) anatomicalGroupRef.current.updateMatrixWorld(true);
      if (chestGroupRef.current) chestGroupRef.current.updateMatrixWorld(true);
      if (handsGroupRef.current) handsGroupRef.current.updateMatrixWorld(true);

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    render();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

  // Toggle layer
  const toggleLayer = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Glassmorphic HUD style
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
      background: "transparent",
      overflow: "hidden",
      zIndex: 0,
    }}>
      {/* Camera Feed - ALWAYS visible as base layer */}
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
          zIndex: 0,
          transform: "scaleX(-1)",
        }}
      />

      {/* Three.js Canvas Overlay - transparent background */}
      <div
        ref={threeContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: displayMode === "normal" ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* (Label canvas removed - using HTML labels instead) */}

      {/* Split mode mask */}
      {displayMode === "split" && cameraOn && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent 50%, rgba(0,0,0,0.0) 50%)",
          borderRight: "2px solid rgba(20, 184, 166, 0.5)",
        }} />
      )}

      {/* Lens mode radial mask */}
      {displayMode === "lens" && cameraOn && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          background: `radial-gradient(circle ${lensSize * 3}px at ${lensPos.x}% ${lensPos.y}%, transparent 0%, rgba(0,0,0,0.85) ${lensSize * 4}px)`,
        }} />
      )}

      {/* AR Labels Overlay */}
      {cameraOn && arLabels.length > 0 && displayMode !== "normal" && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 4,
          pointerEvents: "none",
        }}>
          {arLabels.map((label, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${label.anchorX}%`,
                top: `${label.anchorY}%`,
                transform: "translate(-50%, -120%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "white",
                background: "rgba(15, 44, 77, 0.85)",
                padding: "2px 8px",
                borderRadius: "4px",
                border: `1px solid ${label.color}40`,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}>
                {label.text}
              </span>
              <div style={{
                width: "1px",
                height: "12px",
                background: label.color,
              }} />
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: label.color,
                boxShadow: `0 0 6px ${label.color}`,
              }} />
            </div>
          ))}
        </div>
      )}

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
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem" }}>
            {modelError}
          </p>
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

      {/* Camera Start Button (when off) */}
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
          background: "rgba(0,0,0,0.3)",
        }}>
          <Camera style={{ width: "64px", height: "64px", color: "rgba(255,255,255,0.5)" }} />
          <h2 style={{ color: "white", margin: 0, fontSize: "1.5rem", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            Start Camera for AR Experience
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, maxWidth: "400px", textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
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

      {/* Top HUD Bar */}
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
            <span style={{ color: poseLocked ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
              ● Pose: {poseLocked ? "LOCKED" : "—"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>
              {fps} FPS
            </span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>
              {resolution}
            </span>
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

      {/* Right HUD Panel - Controls */}
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
                    textTransform: "capitalize",
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

      {/* Bottom HUD - Disclaimer & Attribution */}
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
        <p style={{
          margin: 0,
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.6)",
        }}>
          ⚠️ <strong>EDUCATIONAL USE ONLY:</strong> Not a diagnostic medical device. {DISCLAIMER.substring(0, 80)}...
        </p>
        <p style={{
          margin: 0,
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.4)",
        }}>
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