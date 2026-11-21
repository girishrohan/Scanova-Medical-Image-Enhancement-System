"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  Activity, 
  Sliders, 
  AlertCircle,
  Eye,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import * as THREE from "three";
import { COLORS, APP_NAME, APP_VERSION } from "@/lib/config";
import { getAuth, clearAuth } from "@/lib/auth-context";

// Procedural 3D Anatomical Generators using Three.js
function createSkullMesh(): THREE.Group {
  const group = new THREE.Group();

  // Bone standard material with medical cyan-blue emission
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xcfeafe,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.8,
  });

  const boneWire = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });

  // 1. Cranial Vault
  const craniumGeo = new THREE.SphereGeometry(1.35, 24, 20);
  craniumGeo.scale(1.0, 1.15, 1.12);
  const craniumMesh = new THREE.Mesh(craniumGeo, boneMat);
  craniumMesh.position.set(0, 0.42, -0.1);
  const craniumWire = new THREE.Mesh(craniumGeo, boneWire);
  craniumWire.position.copy(craniumMesh.position);
  group.add(craniumMesh, craniumWire);

  // 2. Maxilla / Mid-face structure
  const maxillaGeo = new THREE.BoxGeometry(1.25, 0.85, 0.95);
  const maxillaMesh = new THREE.Mesh(maxillaGeo, boneMat);
  maxillaMesh.position.set(0, -0.38, 0.32);
  group.add(maxillaMesh);

  // 3. Orbits (Orbital sockets)
  const orbitMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.9,
  });
  const orbitGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.45, 16);
  orbitGeo.rotateX(Math.PI / 2);
  
  const leftOrbit = new THREE.Mesh(orbitGeo, orbitMat);
  leftOrbit.position.set(-0.46, 0.08, 0.82);
  const rightOrbit = leftOrbit.clone();
  rightOrbit.position.set(0.46, 0.08, 0.82);
  group.add(leftOrbit, rightOrbit);

  // 4. Mandible (Lower Jaw)
  const jawGeo = new THREE.TorusGeometry(0.68, 0.2, 12, 24, Math.PI);
  const jawMesh = new THREE.Mesh(jawGeo, boneMat);
  jawMesh.rotation.x = Math.PI / 2 + 0.32;
  jawMesh.position.set(0, -0.95, 0.22);
  group.add(jawMesh);

  // 5. Dentition (Teeth row)
  const teethGeo = new THREE.BoxGeometry(0.72, 0.14, 0.28);
  const teethMat = new THREE.MeshStandardMaterial({
    color: 0xf0fdfa,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.9,
  });
  const teethMesh = new THREE.Mesh(teethGeo, teethMat);
  teethMesh.position.set(0, -0.72, 0.72);
  group.add(teethMesh);

  // 6. Nasal Aperture
  const nasalGeo = new THREE.ConeGeometry(0.16, 0.38, 4);
  nasalGeo.rotateX(Math.PI);
  const nasalMesh = new THREE.Mesh(nasalGeo, orbitMat);
  nasalMesh.position.set(0, -0.2, 0.85);
  group.add(nasalMesh);

  return group;
}

function createBrainMesh(): THREE.Group {
  const group = new THREE.Group();

  const brainMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc, // Violet neural cortical glow
    emissive: 0x7e22ce,
    emissiveIntensity: 0.65,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.68,
  });

  const neuralWire = new THREE.MeshBasicMaterial({
    color: 0xf0abfc,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  // Left Cerebral Hemisphere
  const leftGeo = new THREE.SphereGeometry(0.82, 20, 16);
  leftGeo.scale(0.82, 0.98, 1.22);
  const leftCerebrum = new THREE.Mesh(leftGeo, brainMat);
  leftCerebrum.position.set(-0.52, 0.52, -0.06);
  const leftWire = new THREE.Mesh(leftGeo, neuralWire);
  leftWire.position.copy(leftCerebrum.position);
  group.add(leftCerebrum, leftWire);

  // Right Cerebral Hemisphere
  const rightGeo = new THREE.SphereGeometry(0.82, 20, 16);
  rightGeo.scale(0.82, 0.98, 1.22);
  const rightCerebrum = new THREE.Mesh(rightGeo, brainMat);
  rightCerebrum.position.set(0.52, 0.52, -0.06);
  const rightWire = new THREE.Mesh(rightGeo, neuralWire);
  rightWire.position.copy(rightCerebrum.position);
  group.add(rightCerebrum, rightWire);

  // Cerebellum
  const cerebGeo = new THREE.SphereGeometry(0.52, 16, 12);
  cerebGeo.scale(1.25, 0.65, 0.85);
  const cerebellum = new THREE.Mesh(cerebGeo, brainMat);
  cerebellum.position.set(0, -0.18, -0.58);
  group.add(cerebellum);

  // Brainstem
  const stemGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.85, 12);
  const brainstem = new THREE.Mesh(stemGeo, brainMat);
  brainstem.position.set(0, -0.62, -0.28);
  group.add(brainstem);

  return group;
}

function createFacialMusclesMesh(): THREE.Group {
  const group = new THREE.Group();

  const muscleMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0x9f1239,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.52,
    roughness: 0.4,
  });

  // Masseter (Jaw closing muscles)
  const masseterGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.78, 8);
  const leftMasseter = new THREE.Mesh(masseterGeo, muscleMat);
  leftMasseter.position.set(-0.95, -0.58, 0.22);
  leftMasseter.rotation.z = -0.22;
  const rightMasseter = leftMasseter.clone();
  rightMasseter.position.set(0.95, -0.58, 0.22);
  rightMasseter.rotation.z = 0.22;
  group.add(leftMasseter, rightMasseter);

  // Temporalis muscles
  const tempGeo = new THREE.BoxGeometry(0.28, 0.75, 0.85);
  const leftTemp = new THREE.Mesh(tempGeo, muscleMat);
  leftTemp.position.set(-1.18, 0.5, 0.0);
  const rightTemp = leftTemp.clone();
  rightTemp.position.set(1.18, 0.5, 0.0);
  group.add(leftTemp, rightTemp);

  // Orbicularis oris (Perioral muscular ring)
  const mouthGeo = new THREE.TorusGeometry(0.32, 0.07, 8, 16);
  const mouthMuscle = new THREE.Mesh(mouthGeo, muscleMat);
  mouthMuscle.position.set(0, -0.72, 0.86);
  group.add(mouthMuscle);

  // Frontalis (Forehead muscular sheet)
  const frontGeo = new THREE.BoxGeometry(1.5, 0.4, 0.18);
  const frontalis = new THREE.Mesh(frontGeo, muscleMat);
  frontalis.position.set(0, 0.94, 0.84);
  group.add(frontalis);

  return group;
}

function createEyesMesh(): THREE.Group {
  const group = new THREE.Group();

  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.85,
    roughness: 0.2,
  });

  const pupilMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
  });

  const opticMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.75,
  });

  const eyeGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const pupilGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
  pupilGeo.rotateX(Math.PI / 2);

  const leftEye = new THREE.Mesh(eyeGeo, scleraMat);
  leftEye.position.set(-0.46, 0.08, 0.76);
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.46, 0.08, 0.96);

  const rightEye = new THREE.Mesh(eyeGeo, scleraMat);
  rightEye.position.set(0.46, 0.08, 0.76);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.46, 0.08, 0.96);

  // Optic nerve tracts running posterior
  const leftOpticGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 8);
  leftOpticGeo.rotateX(Math.PI / 2 - 0.2);
  leftOpticGeo.rotateY(0.2);
  const leftOptic = new THREE.Mesh(leftOpticGeo, opticMat);
  leftOptic.position.set(-0.32, 0.02, 0.38);

  const rightOpticGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 8);
  rightOpticGeo.rotateX(Math.PI / 2 - 0.2);
  rightOpticGeo.rotateY(-0.2);
  const rightOptic = new THREE.Mesh(rightOpticGeo, opticMat);
  rightOptic.position.set(0.32, 0.02, 0.38);

  group.add(leftEye, leftPupil, rightEye, rightPupil, leftOptic, rightOptic);
  return group;
}

function createHandBonesMesh(): THREE.Group {
  const group = new THREE.Group();

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
  });

  group.position.set(1.9, -0.9, 0.2);
  group.scale.set(0.68, 0.68, 0.68);
  group.rotation.z = -0.15;

  // Carpal cluster (wrist)
  const wristGeo = new THREE.BoxGeometry(0.62, 0.38, 0.22);
  const wrist = new THREE.Mesh(wristGeo, boneMat);
  group.add(wrist);

  // Forearm bones (Radius & Ulna)
  const armGeo = new THREE.CylinderGeometry(0.075, 0.075, 1.35, 8);
  const radius = new THREE.Mesh(armGeo, boneMat);
  radius.position.set(-0.15, -0.85, 0);
  const ulna = new THREE.Mesh(armGeo, boneMat);
  ulna.position.set(0.15, -0.85, 0);
  group.add(radius, ulna);

  // 5 Digits (Metacarpals & Phalanges)
  const fingerAngles = [-0.34, -0.12, 0.04, 0.2, 0.42];
  const fingerLengths = [0.62, 0.88, 0.98, 0.9, 0.72];

  fingerAngles.forEach((angle, i) => {
    const fingerGroup = new THREE.Group();
    const len = fingerLengths[i];

    const meta = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), boneMat);
    meta.position.y = 0.24;
    fingerGroup.add(meta);

    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len * 0.38, 8), boneMat);
    p1.position.y = 0.62;
    fingerGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len * 0.3, 8), boneMat);
    p2.position.y = 0.62 + len * 0.32;
    fingerGroup.add(p2);

    fingerGroup.rotation.z = angle;
    fingerGroup.position.set((i - 2) * 0.15, 0.2, 0);
    group.add(fingerGroup);
  });

  return group;
}

export default function XRMMirrorPage() {
  const router = useRouter();

  // Refs for Media & 3D Elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const anatomyRootRef = useRef<THREE.Group | null>(null);
  const handGroupRef = useRef<THREE.Group | null>(null);
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const groupsRef = useRef<{
    skull?: THREE.Group;
    brain?: THREE.Group;
    facialMuscles?: THREE.Group;
    eyes?: THREE.Group;
    handBones?: THREE.Group;
  }>({});

  // State Management
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [displayMode, setDisplayMode] = useState<"normal" | "xray">("xray");
  const [error, setError] = useState("");
  const [transparency, setTransparency] = useState(75);

  const [selectedLayers, setSelectedLayers] = useState({
    skull: true,
    brain: true,
    facialMuscles: false,
    eyes: true,
    handBones: false,
  });

  // Authentication check
  useEffect(() => {
    const auth = getAuth();
    if (!auth?.authenticated) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    stopCamera();
    clearAuth();
    router.push("/login");
  };

  // Safe camera stop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setStreamReady(false);
  }, []);

  // Safe camera start with resilient fallback
  const startCamera = useCallback(async (mode: "user" | "environment" = facingMode) => {
    setError("");
    try {
      // Clean previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback for desktop webcams where facingMode or ideal dimensions may overconstrain
        console.warn("Retrying with simple video constraint due to:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play()
            .then(() => {
              setIsCameraActive(true);
              setStreamReady(true);
            })
            .catch((playErr) => {
              console.warn("Video play error (handled):", playErr);
              setIsCameraActive(true);
              setStreamReady(true);
            });
        };
      }
    } catch (err: any) {
      console.error("Camera acquisition error:", err);
      setError("Could not access camera. Please allow camera permissions in your browser.");
      setIsCameraActive(false);
      setStreamReady(false);
    }
  }, [facingMode]);

  // Flip camera between front/back
  const toggleFacingMode = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (isCameraActive) {
      await startCamera(nextMode);
    }
  };

  // Initialize Three.js Scene once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    cameraRef.current = camera;

    // 3. Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x0f2c4d, 1.4);
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    keyLight.position.set(2.5, 4, 3);
    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    fillLight.position.set(-2.5, -2, 2.5);
    const rimLight = new THREE.DirectionalLight(0x22d3ee, 2.0);
    rimLight.position.set(0, -3, -2);
    scene.add(ambientLight, keyLight, fillLight, rimLight);

    // 5. Anatomical Meshes
    const anatomyRoot = new THREE.Group();
    anatomyRoot.position.set(0, 0.28, 0);
    anatomyRootRef.current = anatomyRoot;

    const skull = createSkullMesh();
    const brain = createBrainMesh();
    const facialMuscles = createFacialMusclesMesh();
    const eyes = createEyesMesh();
    const handBones = createHandBonesMesh();
    handGroupRef.current = handBones;

    anatomyRoot.add(skull, brain, facialMuscles, eyes);
    scene.add(anatomyRoot, handBones);

    groupsRef.current = {
      skull,
      brain,
      facialMuscles,
      eyes,
      handBones,
    };

    // Initial visibility sync
    skull.visible = selectedLayers.skull;
    brain.visible = selectedLayers.brain;
    facialMuscles.visible = selectedLayers.facialMuscles;
    eyes.visible = selectedLayers.eyes;
    handBones.visible = selectedLayers.handBones;

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Interactive animation render loop
    const clock = new THREE.Clock();
    let curRotX = 0;
    let curRotY = 0;

    const renderLoop = () => {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      const elapsed = clock.getElapsedTime();

      if (anatomyRootRef.current) {
        // Subtle physiologic breathing pulsation
        anatomyRootRef.current.position.y = 0.28 + Math.sin(elapsed * 1.6) * 0.035;

        // Smooth damping toward mouse / target orientation
        curRotY += (targetRotationRef.current.y - curRotY) * 0.08;
        curRotX += (targetRotationRef.current.x - curRotX) * 0.08;
        anatomyRootRef.current.rotation.y = curRotY + Math.sin(elapsed * 0.8) * 0.02;
        anatomyRootRef.current.rotation.x = curRotX;
      }

      if (handGroupRef.current) {
        handGroupRef.current.position.y = -0.9 + Math.sin(elapsed * 1.4 + 1.2) * 0.03;
      }

      renderer.render(scene, camera);
    };
    renderLoop();

    // 8. Cleanup on component unmount
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      resizeObserver.disconnect();

      // Dispose Three.js objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Update layer visibility when state changes
  useEffect(() => {
    if (groupsRef.current.skull) groupsRef.current.skull.visible = selectedLayers.skull;
    if (groupsRef.current.brain) groupsRef.current.brain.visible = selectedLayers.brain;
    if (groupsRef.current.facialMuscles) groupsRef.current.facialMuscles.visible = selectedLayers.facialMuscles;
    if (groupsRef.current.eyes) groupsRef.current.eyes.visible = selectedLayers.eyes;
    if (groupsRef.current.handBones) groupsRef.current.handBones.visible = selectedLayers.handBones;
  }, [selectedLayers]);

  // Clean up camera stream when leaving the page
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Interactive mouse orientation tracking over video container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    targetRotationRef.current = {
      x: -y * 0.22,
      y: (facingMode === "user" ? -x : x) * 0.35,
    };
  };

  const handleMouseLeave = () => {
    targetRotationRef.current = { x: 0, y: 0 };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.background,
      padding: "1.25rem 2rem 2.5rem",
      color: COLORS.text,
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
        
        {/* Top Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Link
                href="/dashboard"
                onClick={stopCamera}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: COLORS.muted,
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} />
                Dashboard
              </Link>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span style={{ fontSize: "0.85rem", color: COLORS.teal, fontWeight: 600 }}>
                X-Ray Mirror AR
              </span>
            </div>
            <h1 style={{
              color: COLORS.navy,
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}>
              X-Ray Mirror
            </h1>
            <p style={{
              color: COLORS.muted,
              margin: "0.25rem 0 0 0",
              fontSize: "0.9rem",
            }}>
              Real-time anatomical visualization and radiographic mirror view
            </p>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "white",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              fontSize: "0.82rem",
              color: COLORS.muted,
            }}>
              <ShieldCheck style={{ color: COLORS.teal, width: "16px", height: "16px" }} />
              <span>Educational Visualization</span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                color: COLORS.muted,
                cursor: "pointer",
                padding: "0.5rem 0.85rem",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Error notification banner if camera permission fails */}
        {error && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: COLORS.error,
            fontSize: "0.9rem",
          }}>
            <AlertCircle style={{ width: "20px", height: "20px", flexShrink: 0 }} />
            <div>
              <strong>Camera Access Notice:</strong> {error}
            </div>
          </div>
        )}

        {/* Main Grid View */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}>

          {/* Left Column: Video & 3D AR Layer Container */}
          <div>
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 10",
                minHeight: "460px",
                maxHeight: "680px",
                background: "#090d16",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #1e293b",
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.2)",
              }}
            >
              {/* Webcam Video Stream Element */}
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
                  // Flip horizontally when using user-facing camera for natural mirror feel
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                  // Radiographic X-ray color inversion and cyan edge tinting when in X-ray mode
                  filter: displayMode === "xray" 
                    ? "invert(85%) hue-rotate(185deg) contrast(150%) brightness(105%) saturate(30%)"
                    : "none",
                  transition: "filter 0.3s ease",
                  zIndex: 1,
                  display: isCameraActive ? "block" : "none",
                }}
              />

              {/* Three.js 3D WebGL Canvas Overlay */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                  display: isCameraActive && displayMode === "xray" ? "block" : "none",
                  opacity: transparency / 100,
                  // Match video mirror transformation
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                  transition: "opacity 0.15s ease",
                }}
              />

              {/* Live Overlay Badge & HUD Indicator */}
              {isCameraActive && (
                <div style={{
                  position: "absolute",
                  top: "14px",
                  left: "14px",
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(8px)",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: displayMode === "xray" ? "#22d3ee" : "#22c55e",
                    boxShadow: displayMode === "xray" ? "0 0 10px #22d3ee" : "0 0 8px #22c55e",
                  }} />
                  <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em" }}>
                    {displayMode === "xray" ? "X-RAY AR ACTIVE" : "LIVE CAMERA"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    · {facingMode === "user" ? "Front" : "Rear"}
                  </span>
                </div>
              )}

              {/* Camera Inactive Placeholder */}
              {!isCameraActive && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  background: "#090d16",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  padding: "2rem",
                  textAlign: "center",
                  gap: "1.25rem",
                }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "rgba(13, 148, 136, 0.12)",
                    border: "1px solid rgba(13, 148, 136, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Camera style={{ width: "36px", height: "36px", color: COLORS.teal }} />
                  </div>
                  <div>
                    <h3 style={{ color: "white", margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 700 }}>
                      Camera feed will appear here
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b", maxWidth: "380px" }}>
                      Click <strong>Start Camera</strong> in the control panel to initialize the live anatomical visualization mirror.
                    </p>
                  </div>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}>
                    <ShieldCheck style={{ width: "15px", height: "15px", color: COLORS.teal }} />
                    Position yourself 2–3 feet from camera for optimal alignment
                  </div>
                </div>
              )}
            </div>

            {/* Display Mode Switcher */}
            <div style={{
              background: "white",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              border: "1px solid #e2e8f0",
              marginTop: "1rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}>
                <h3 style={{
                  color: COLORS.navy,
                  margin: 0,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <Activity style={{ width: "16px", height: "16px", color: COLORS.teal }} />
                  Display Mode
                </h3>
                <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>
                  Toggle between raw camera and radiographic visualization
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setDisplayMode("normal")}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: displayMode === "normal" ? `2px solid ${COLORS.navy}` : "1px solid #e2e8f0",
                    background: displayMode === "normal" ? COLORS.navy : "#f8fafc",
                    color: displayMode === "normal" ? "white" : COLORS.muted,
                    fontWeight: displayMode === "normal" ? 600 : 500,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Camera style={{ width: "16px", height: "16px" }} />
                  Normal Camera
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode("xray")}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: displayMode === "xray" ? `2px solid ${COLORS.blue}` : "1px solid #e2e8f0",
                    background: displayMode === "xray" ? COLORS.blue : "#f8fafc",
                    color: displayMode === "xray" ? "white" : COLORS.muted,
                    fontWeight: displayMode === "xray" ? 600 : 500,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Sparkles style={{ width: "16px", height: "16px" }} />
                  X-Ray Mode
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Controls & Anatomical Layer Configuration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Primary Action Card: Start / Stop & Camera Switch */}
            <div style={{
              background: "white",
              borderRadius: "14px",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <h3 style={{
                color: COLORS.navy,
                margin: "0 0 0.85rem 0",
                fontSize: "1rem",
                fontWeight: 700,
              }}>
                Camera Controls
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : () => startCamera(facingMode)}
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    borderRadius: "10px",
                    border: "none",
                    background: isCameraActive ? COLORS.error : COLORS.teal,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff style={{ width: "18px", height: "18px" }} />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera style={{ width: "18px", height: "18px" }} />
                      Start Camera
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleFacingMode}
                  disabled={!isCameraActive}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: isCameraActive ? "#f8fafc" : "#f1f5f9",
                    color: isCameraActive ? COLORS.navy : COLORS.muted,
                    cursor: isCameraActive ? "pointer" : "not-allowed",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    opacity: isCameraActive ? 1 : 0.6,
                  }}
                >
                  <RefreshCw style={{ width: "14px", height: "14px" }} />
                  Flip Camera ({facingMode === "user" ? "Front" : "Rear"})
                </button>
              </div>
            </div>

            {/* Anatomical Layers Configuration */}
            <div style={{
              background: "white",
              borderRadius: "14px",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.85rem",
              }}>
                <h3 style={{
                  color: COLORS.navy,
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <Layers style={{ width: "16px", height: "16px", color: COLORS.teal }} />
                  Anatomical Layers
                </h3>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                  3D AR Overlays
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { key: "skull", label: "Skull & Cranium", color: "#38bdf8", desc: "Frontal bone, maxilla & mandible" },
                  { key: "brain", label: "Brain & Hemispheres", color: "#c084fc", desc: "Cerebrum, cerebellum & stem" },
                  { key: "facialMuscles", label: "Facial Muscles", color: "#f43f5e", desc: "Masseter & temporalis tissue" },
                  { key: "eyes", label: "Eyes & Optic Pathway", color: "#22d3ee", desc: "Ocular globes & optic nerves" },
                  { key: "handBones", label: "Hand Bones", color: "#bae6fd", desc: "Carpals, metacarpals & phalanges" },
                ].map(({ key, label, color, desc }) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 0.75rem",
                      background: selectedLayers[key as keyof typeof selectedLayers] ? "#f0fdfa" : "#f8fafc",
                      borderRadius: "8px",
                      border: selectedLayers[key as keyof typeof selectedLayers] ? "1px solid #ccfbf1" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        checked={selectedLayers[key as keyof typeof selectedLayers]}
                        onChange={(e) => {
                          setSelectedLayers((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }));
                        }}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: COLORS.teal,
                          cursor: "pointer",
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: COLORS.text }}>
                          {label}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: COLORS.muted }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                    }} />
                  </label>
                ))}
              </div>
            </div>

            {/* Transparency / Opacity Slider */}
            <div style={{
              background: "white",
              borderRadius: "14px",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}>
                <h3 style={{
                  color: COLORS.navy,
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <Sliders style={{ width: "16px", height: "16px", color: COLORS.teal }} />
                  Transparency
                </h3>
                <span style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: COLORS.blue,
                  background: "#eff6ff",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}>
                  {transparency}%
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                value={transparency}
                onChange={(e) => setTransparency(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: COLORS.teal,
                  cursor: "pointer",
                }}
              />
              <p style={{ fontSize: "0.8rem", color: COLORS.muted, margin: "0.5rem 0 0 0" }}>
                Controls opacity blend of the 3D anatomical overlay
              </p>
            </div>

            {/* Navigation back to dashboard */}
            <Link
              href="/dashboard"
              onClick={stopCamera}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "0.8rem",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "white",
                textDecoration: "none",
                color: COLORS.blue,
                fontWeight: 600,
                fontSize: "0.9rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeft style={{ width: "16px", height: "16px" }} />
              Back to Dashboard
            </Link>

          </div>
        </div>

        {/* Medical & Educational Disclaimer Notice */}
        <div style={{
          marginTop: "2rem",
          background: "#fef9f2",
          border: "1px solid #fed8b1",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
        }}>
          <p style={{
            color: COLORS.text,
            fontSize: "0.85rem",
            margin: 0,
            lineHeight: 1.6,
          }}>
            ⚠️ <strong>Educational Use Only</strong> — The X-Ray Mirror is an interactive anatomical visualization feature created for educational and demonstration purposes. Real-time webcam tracking cannot diagnose medical conditions, detect bone fractures, or identify internal abnormalities.
          </p>
        </div>

      </div>
    </div>
  );
}
