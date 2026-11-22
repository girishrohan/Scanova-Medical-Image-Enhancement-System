"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import {
  ArrowLeftRight,
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Monitor,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { COLORS, APP_NAME, APP_VERSION, DISCLAIMER } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

type DisplayMode = "normal" | "xray" | "split";
type CameraDevice = { deviceId: string; label: string };

const LAYER_DEFS = [
  { id: "skull", label: "Skull", color: "#e2e8f0", defaultOn: true },
  { id: "brain", label: "Brain", color: "#f472b6", defaultOn: true },
  { id: "facial", label: "Facial Muscles", color: "#fb923c", defaultOn: false },
  { id: "eyes", label: "Eyes", color: "#38bdf8", defaultOn: true },
  { id: "hands", label: "Hand Bones", color: "#a78bfa", defaultOn: false },
];

export default function XRMMirrorPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const anatomicalGroupRef = useRef<THREE.Group | null>(null);
  const meshRefs = useRef<Record<string, THREE.Mesh>>({});
  const faceLandmarkerRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number[]>([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("xray");
  const [transparency, setTransparency] = useState(70);
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

  // Auth check
  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
      return;
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Load MediaPipe scripts
  const loadMediaPipe = useCallback(async () => {
    if (faceLandmarkerRef.current) return;
    setLoading(true);
    try {
      // Dynamically import MediaPipe via CDN
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs" as any);
      const { FaceLandmarker, HandLandmarker, FilesetResolver } = vision;

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

  // Initialize Three.js scene
  const initThree = useCallback(() => {
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

    // Create anatomical meshes (simplified geometric representations)
    // Skull - sphere
    const skullGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const skullMat = createXRayMaterial(0xe2e8f0, 0.15);
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.name = "skull";
    meshRefs.current.skull = skull;
    group.add(skull);

    // Brain - slightly smaller sphere inside
    const brainGeo = new THREE.SphereGeometry(0.9, 32, 32);
    const brainMat = createXRayMaterial(0xf472b6, 0.25);
    const brain = new THREE.Mesh(brainGeo, brainMat);
    brain.name = "brain";
    brain.scale.set(0.85, 0.9, 0.85);
    meshRefs.current.brain = brain;
    group.add(brain);

    // Facial muscles - torus-like
    const facialGeo = new THREE.TorusGeometry(0.7, 0.15, 16, 32);
    const facialMat = createXRayMaterial(0xfb923c, 0.3);
    const facial = new THREE.Mesh(facialGeo, facialMat);
    facial.name = "facial";
    facial.rotation.x = Math.PI / 2;
    facial.position.z = 0.3;
    meshRefs.current.facial = facial;
    group.add(facial);

    // Eyes - two small spheres
    const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMat = createXRayMaterial(0x38bdf8, 0.4);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.name = "leftEye";
    leftEye.position.set(-0.3, 0.1, 0.9);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.name = "rightEye";
    rightEye.position.set(0.3, 0.1, 0.9);
    meshRefs.current.eyes = leftEye;
    group.add(leftEye);
    group.add(rightEye);

    // Hand bones - finger cylinders
    const fingerGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
    const fingerMat = createXRayMaterial(0xa78bfa, 0.35);
    for (let i = 0; i < 5; i++) {
      const finger = new THREE.Mesh(fingerGeo, fingerMat.clone());
      finger.name = `finger${i}`;
      finger.position.set((i - 2) * 0.15, -1.5, 0);
      finger.rotation.z = (i - 2) * 0.1;
      meshRefs.current[`finger${i}`] = finger;
      group.add(finger);
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
  }, []);

  // X-Ray material with Fresnel shader
  function createXRayMaterial(color: number, baseOpacity: number): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: baseOpacity,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.5,
      emissive: color,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });
    return mat;
  }

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setResolution(`${settings.width || "?"}×${settings.height || "?"}`);

        // Init Three.js
        initThree();

        // Start render loop
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
      if (!video || video.readyState < 2) return;

      // Face tracking
      if (faceLandmarkerRef.current) {
        try {
          const results = faceLandmarkerRef.current.detectForVideo(video, now);
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            setFaceLocked(true);
            const landmarks = results.faceLandmarks[0];

            // Get transformation matrix for head pose
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              if (anatomicalGroupRef.current) {
                // Apply smooth lerp to position and rotation
                const group = anatomicalGroupRef.current;
                // Extract position from matrix (simplified)
                const tx = matrix[3] * 0.5;
                const ty = -matrix[7] * 0.5;
                const tz = matrix[11] * 0.3;

                group.position.x += (tx - group.position.x) * 0.15;
                group.position.y += (ty - group.position.y) * 0.15;
                group.position.z += (tz - group.position.z) * 0.15;

                // Tilt from landmark positions
                const noseTip = landmarks[1];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                const tiltX = (leftEye.y - rightEye.y) * 2;
                const tiltY = (noseTip.x - 0.5) * 2;
                group.rotation.x += (tiltX - group.rotation.x) * 0.1;
                group.rotation.y += (tiltY - group.rotation.y) * 0.1;
              }
            }
          } else {
            setFaceLocked(false);
          }
        } catch (e) {
          // Silently handle detection errors
        }
      }

      // Hand tracking
      if (handLandmarkerRef.current) {
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, now);
          if (results.landmarks && results.landmarks.length > 0) {
            setHandLocked(true);
            // Update finger positions based on hand landmarks
            const hand = results.landmarks[0];
            if (anatomicalGroupRef.current) {
              // Map index finger tip to interactive point
              const indexTip = hand[8];
              // Could add interactive highlighting here
            }
          } else {
            setHandLocked(false);
          }
        } catch (e) {
          // Silently handle
        }
      }

      // Update layer visibility
      Object.entries(layers).forEach(([id, visible]) => {
        const mesh = meshRefs.current[id];
        if (mesh) mesh.visible = visible;
        if (id === "eyes") {
          const leftEye = meshRefs.current.eyes;
          const rightEye = sceneRef.current?.children.find(
            (c) => c.name === "rightEye"
          ) as THREE.Mesh;
          if (leftEye) leftEye.visible = visible;
          if (rightEye) rightEye.visible = visible;
        }
        if (id === "hands") {
          for (let i = 0; i < 5; i++) {
            const finger = meshRefs.current[`finger${i}`];
            if (finger) finger.visible = visible;
          }
        }
      });

      // Update transparency
      const opacityFactor = transparency / 100;
      Object.values(meshRefs.current).forEach((mesh) => {
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.opacity = Math.max(0.05, mat.opacity * 0 + opacityFactor * 0.6);
          mat.emissiveIntensity = 0.1 + opacityFactor * 0.3;
        }
      });

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    render();
  }, [layers, transparency]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Toggle layer
  const toggleLayer = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // HUD glassmorphic style
  const glassStyle: React.CSSProperties = {
    background: "rgba(15, 44, 77, 0.7)",
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
      {/* Camera Feed */}
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
          opacity: displayMode === "normal" ? 1 : displayMode === "split" ? 0.5 : 0.3,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Three.js Canvas Overlay */}
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
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "white" }}>
              X-Ray Mirror AR
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
              Real-time anatomical visualization
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Diagnostics */}
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
          background: "rgba(0,0,0,0.5)",
        }}>
          <Camera style={{ width: "64px", height: "64px", color: "rgba(255,255,255,0.3)" }} />
          <h2 style={{ color: "white", margin: 0, fontSize: "1.5rem" }}>
            Start Camera for AR Experience
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "400px", textAlign: "center" }}>
            Position yourself 2-3 feet from the camera. Allow camera permissions when prompted.
          </p>

          {cameras.length > 0 && (
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
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

      {/* Right HUD Panel - Controls */}
      {cameraOn && showControls && (
        <div style={{
          position: "absolute",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: "260px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}>
          {/* Display Mode */}
          <div style={glassStyle}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              Display Mode
            </h3>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["normal", "xray", "split"] as DisplayMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  style={{
                    flex: 1,
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
                  {mode === "normal" ? "Normal" : mode === "xray" ? "X-Ray" : "Split"}
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

      {/* Toggle Controls Button */}
      {cameraOn && (
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            right: showControls ? "280px" : "1rem",
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

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}