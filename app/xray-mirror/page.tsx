"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  ArrowLeftRight,
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

type DisplayMode = "normal" | "xray" | "split" | "lens";
type CameraDevice = { deviceId: string; label: string };

const LAYER_DEFS = [
  { id: "skull", label: "Skull", color: "#bfe3ff", defaultOn: true, model: "/models/skull.glb" },
  { id: "brain", label: "Brain (Cerebrum)", color: "#ff9fc0", defaultOn: true, model: "/models/brain.glb" },
  { id: "facial", label: "Facial Muscles", color: "#ff6b5e", defaultOn: false, model: "/models/facial.glb" },
  { id: "eyes", label: "Eyes / Orbits", color: "#fff3a8", defaultOn: true, model: "/models/eyes.glb" },
  { id: "hands", label: "Hand Bones", color: "#d9f0ff", defaultOn: false, model: "/models/hands.glb" },
];

// Fresnel X-Ray shader
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

// Solid anatomy shader
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
  const meshGroupRefs = useRef<Record<string, THREE.Group>>({});
  const faceLandmarkerRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);

  // AR label overlay state
  const [arLabels, setArLabels] = useState<{ text: string; x: number; y: number; color: string }[]>([]);

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

  // Auth check
  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  // Suppress benign MediaPipe/Emscripten XNNPACK INFO logs
  useEffect(() => {
    const XNNPACK_MSG = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    const filter = (args: any[]) =>
      args.some((a) => typeof a === "string" && a.includes(XNNPACK_MSG));

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

  // Load MediaPipe
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

    // Anatomical group
    const group = new THREE.Group();
    anatomicalGroupRef.current = group;
    scene.add(group);

    // Load models for each layer
    let anyLoaded = false;
    for (const layer of LAYER_DEFS) {
      const model = await loadModel(layer.id, layer.model);
      if (model) {
        model.visible = layers[layer.id];
        meshGroupRefs.current[layer.id] = model;
        group.add(model);
        anyLoaded = true;
      }
    }

    if (anyLoaded) {
      setModelsLoaded(true);
      setModelError("");
    } else {
      setModelsLoaded(false);
      setModelError(
        "No 3D anatomical models found in public/models/. " +
        "Download BodyParts3D meshes from https://github.com/MasterOfVFX2070/xray-mirror " +
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

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [layers, loadModel]);

  // Start camera
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
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setCameraOn(false);
    setFaceLocked(false);
    setHandLocked(false);
    lastTimestampRef.current = 0;
  };

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

      // Face tracking
      if (faceLandmarkerRef.current) {
        try {
          const results = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          const faceFound = !!(results.faceLandmarks && results.faceLandmarks.length > 0);
          setFaceLocked((prev) => (prev === faceFound ? prev : faceFound));
          if (faceFound) {
            const landmarks = results.faceLandmarks[0];

            // Project landmarks to 2D for AR labels
            const newLabels: { text: string; x: number; y: number; color: string }[] = [];
            if (layers.skull) {
              const pt = landmarks[10]; // top of head
              newLabels.push({ text: "Cranium / Skull", x: pt.x * 100, y: pt.y * 100, color: "#bfe3ff" });
            }
            if (layers.brain) {
              const pt = landmarks[1]; // nose tip (approx center)
              newLabels.push({ text: "Brain (Cerebrum)", x: pt.x * 100, y: (pt.y - 0.05) * 100, color: "#ff9fc0" });
            }
            if (layers.eyes) {
              const pt = landmarks[33]; // left eye
              newLabels.push({ text: "Eyes / Orbits", x: pt.x * 100, y: pt.y * 100, color: "#fff3a8" });
            }
            if (layers.facial) {
              const pt = landmarks[0]; // chin
              newLabels.push({ text: "Facial Muscles", x: pt.x * 100, y: pt.y * 100, color: "#ff6b5e" });
            }
            setArLabels(newLabels);

            // 4x4 matrix transform
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              if (anatomicalGroupRef.current) {
                const group = anatomicalGroupRef.current;
                const tx = matrix[12] * 0.5;
                const ty = -matrix[13] * 0.5;
                const tz = matrix[14] * 0.3;

                group.position.x += (tx - group.position.x) * 0.15;
                group.position.y += (ty - group.position.y) * 0.15;
                group.position.z += (tz - group.position.z) * 0.15;

                const rotX = Math.atan2(matrix[9], matrix[10]);
                const rotY = Math.atan2(-matrix[8], Math.sqrt(matrix[9] * matrix[9] + matrix[10] * matrix[10]));
                const rotZ = Math.atan2(matrix[4], matrix[0]);

                group.rotation.x += (rotX - group.rotation.x) * 0.1;
                group.rotation.y += (rotY - group.rotation.y) * 0.1;
                group.rotation.z += (rotZ - group.rotation.z) * 0.1;
              }
            }
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
          if (handFound && layers.hands) {
            const hand = results.landmarks[0];
            const handsGroup = meshGroupRefs.current.hands;
            if (handsGroup && hand.length >= 21) {
              const wrist = hand[0];
              handsGroup.position.x = (wrist.x - 0.5) * 2;
              handsGroup.position.y = -(wrist.y - 0.5) * 2;
              handsGroup.position.z = wrist.z * 2;

              // Add hand bone label
              setArLabels((prev) => [
                ...prev,
                { text: "Hand Bones (Metacarpals & Phalanges)", x: wrist.x * 100, y: wrist.y * 100, color: "#d9f0ff" },
              ]);
            }
          }
        } catch (e) {
          // Silently handle
        }
      }

      // Update layer visibility
      Object.entries(layers).forEach(([id, visible]) => {
        const group = meshGroupRefs.current[id];
        if (group) group.visible = visible;
      });

      // Update material mode and transparency
      const opacityFactor = transparency / 100;
      Object.values(meshGroupRefs.current).forEach((group) => {
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mat = child.material as THREE.ShaderMaterial;
            if (mat.uniforms) {
              if (mat.uniforms.opacity) {
                mat.uniforms.opacity.value = opacityFactor * 0.6;
              }
              if (renderMode === "solid" && mat.fragmentShader !== solidFragmentShader) {
                mat.fragmentShader = solidFragmentShader;
                mat.blending = THREE.NormalBlending;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              } else if (renderMode === "xray" && mat.fragmentShader !== xrayFragmentShader) {
                mat.fragmentShader = xrayFragmentShader;
                mat.blending = THREE.AdditiveBlending;
                mat.depthWrite = false;
                mat.needsUpdate = true;
              }
            }
          }
        });
      });

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    render();
  }, [layers, transparency, renderMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, []);

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
          zIndex: 1,
          transform: "scaleX(-1)",
        }}
      />

      {/* Three.js Canvas Overlay - transparent background */}
      <div
        ref={threeContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          opacity: displayMode === "normal" ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

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
                left: `${100 - label.x}%`,
                top: `${label.y}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: label.color,
                boxShadow: `0 0 8px ${label.color}`,
                flexShrink: 0,
              }} />
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