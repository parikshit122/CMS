import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function DriftingEmbers({ isMobile, lowFpsMode }) {
  const meshRef = useRef();

  // Cap nodes: 80 on desktop, 25 on mobile, 20 if low FPS detected
  const count = useMemo(() => {
    if (lowFpsMode) return 20;
    return isMobile ? 25 : 80;
  }, [isMobile, lowFpsMode]);

  // Generate random positions, velocities, and colors
  const [positions, velocities, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];
    
    const colorOptions = [
      new THREE.Color("#f97316"), // Ember Orange
      new THREE.Color("#e11d48"), // Rose Pink
      new THREE.Color("#fbbf24"), // Warm Gold
    ];

    for (let i = 0; i < count; i++) {
      // Start them scattered across the volume
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20 - 5; // Start slightly lower
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;

      // Upward drift logic mimicking sparks/embers
      vel.push({
        x: (Math.random() - 0.5) * 0.015,
        y: Math.random() * 0.02 + 0.01, // Always drifts upwards
        z: (Math.random() - 0.5) * 0.01,
      });

      // Assign one of the warm colors
      const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, vel, col];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Drifting ember movement
    const posAttr = meshRef.current.geometry.attributes.position;
    const array = posAttr.array;

    for (let i = 0; i < count; i++) {
      array[i * 3] += velocities[i].x;
      array[i * 3 + 1] += velocities[i].y;
      array[i * 3 + 2] += velocities[i].z;

      // When ember floats too high, reset to the bottom
      if (array[i * 3 + 1] > 15) {
        array[i * 3 + 1] = -15; // Reset to bottom
        array[i * 3] = (Math.random() - 0.5) * 30; // Random X
        array[i * 3 + 2] = (Math.random() - 0.5) * 15; // Random Z
      }
    }
    posAttr.needsUpdate = true;

    // Slow ambient rotation reacting slightly to cursor parallax
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    meshRef.current.rotation.x = state.mouse.y * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry key={count}>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function Scene3D() {
  const [isMobile, setIsMobile] = useState(false);
  const [lowFpsMode, setLowFpsMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // FPS Auto-Downgrade Monitor (< 40 FPS -> Low FPS mode)
    let frameCount = 0;
    let lastTime = performance.now();
    let animId;

    const checkFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (now - lastTime);
        if (fps < 40) {
          setLowFpsMode(true);
        }
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(checkFps);
    };

    animId = requestAnimationFrame(checkFps);

    return () => {
      window.removeEventListener("resize", checkMobile);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.5} />
      <DriftingEmbers isMobile={isMobile} lowFpsMode={lowFpsMode} />
    </Canvas>
  );
}
