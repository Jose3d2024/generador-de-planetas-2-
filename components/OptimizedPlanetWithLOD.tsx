'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { LODSystem } from '@/lib/lod/lodSystem';
import { createPlanetMaterial, createAtmosphereMaterial } from '@/lib/shaders/planetShaders';
import { usePerlinNoise } from '@/lib/perlinNoiseManager';

interface OptimizedPlanetProps {
  radius?: number;
  quality?: 'low' | 'medium' | 'high';
  enableAtmosphere?: boolean;
  enableShaders?: boolean;
  autoRotate?: boolean;
}

function PlanetMeshWithLOD({
  radius = 1,
  quality = 'medium',
  enableAtmosphere = true,
  enableShaders = true,
  autoRotate = true,
}: OptimizedPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const getNoise = usePerlinNoise();

  // Configuración de LOD según calidad
  const lodConfigs = useMemo(() => {
    const configs = {
      low: [
        { distance: 0, detail: 16 },
        { distance: 20, detail: 8 },
        { distance: 50, detail: 4 },
      ],
      medium: [
        { distance: 0, detail: 32 },
        { distance: 15, detail: 16 },
        { distance: 30, detail: 8 },
        { distance: 60, detail: 4 },
      ],
      high: [
        { distance: 0, detail: 64 },
        { distance: 10, detail: 32 },
        { distance: 25, detail: 16 },
        { distance: 50, detail: 8 },
        { distance: 100, detail: 4 },
      ],
    };
    return configs[quality];
  }, [quality]);

  // Sistema LOD
  const lodSystem = useMemo(
    () => new LODSystem(radius, lodConfigs),
    [radius, lodConfigs]
  );

  // Crear material con sombreador personalizado
  const material = useMemo(() => {
    if (enableShaders) {
      return createPlanetMaterial({
        color1: '#1a4d7a', // Océano
        color2: '#4a7c3b', // Tierra
        color3: '#f0f0f0', // Montañas
        displacement: quality === 'high' ? 0.3 : 0.15,
        shininess: 30,
      });
    }
    return new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      shininess: 30,
    });
  }, [enableShaders, quality]);

  // Material de atmósfera
  const atmosphereMaterial = useMemo(() => {
    return createAtmosphereMaterial({
      color: '#87ceeb',
      density: 0.3,
    });
  }, []);

  // Frame loop: actualizar LOD, rotación, material
  useFrame(() => {
    if (!meshRef.current) return;

    // Calcular distancia a la cámara
    const distance = meshRef.current.position.distanceTo(camera.position);

    // Obtener geometría LOD apropiada
    const lodGeometry = lodSystem.getLODLevel(distance);
    if (meshRef.current.geometry !== lodGeometry) {
      meshRef.current.geometry?.dispose();
      meshRef.current.geometry = lodGeometry;
    }

    // Rotación
    if (autoRotate) {
      meshRef.current.rotation.x += 0.0001;
      meshRef.current.rotation.y += 0.0003;
    }

    // Actualizar material si es shader
    if (enableShaders && material instanceof THREE.ShaderMaterial) {
      (material.uniforms.uLightPosition as any).value = camera.position.clone().normalize().multiplyScalar(10);
    }

    // Rotar atmósfera
    if (atmosphereRef.current && enableAtmosphere) {
      atmosphereRef.current.rotation.y = meshRef.current.rotation.y;
    }
  });

  // Cleanup en unmount
  return (
    <>
      <mesh ref={meshRef} material={material}>
        {/* Geometría inicial, será reemplazada por LOD */}
        <icosahedronGeometry args={[radius, 32]} />
      </mesh>

      {/* Atmósfera */}
      {enableAtmosphere && (
        <mesh
          ref={atmosphereRef}
          scale={1.05}
          material={atmosphereMaterial}
        >
          <icosahedronGeometry args={[radius, 16]} />
        </mesh>
      )}
    </>
  );
}

export function OptimizedPlanetScene(props: OptimizedPlanetProps) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>(
    props.quality || 'medium'
  );
  const [stats, setStats] = useState({ fps: 0, lod: 0 });

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Controles */}
      <div className="p-4 bg-gray-900 text-white flex gap-4 items-center">
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`px-4 py-2 rounded text-sm ${
                quality === q ? 'bg-blue-600' : 'bg-gray-700'
              } hover:bg-blue-500 transition-colors`}
            >
              {q === 'low' && '⚡ Rápido'}
              {q === 'medium' && '⚙️ Equilibrado'}
              {q === 'high' && '✨ Alta'}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm font-mono">
          <span>FPS: {stats.fps}</span>
          <span className="ml-4">LOD: {stats.lod}</span>
        </div>
      </div>

      {/* Canvas 3D */}
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 3], fov: 75 }}
        dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
        performance={{ min: 0.5, max: 1 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={75} />

        {/* Iluminación */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        {/* Planeta con LOD */}
        <PlanetMeshWithLOD
          radius={1}
          quality={quality}
          enableAtmosphere={true}
          enableShaders={true}
          autoRotate={true}
        />

        <Preload all />
      </Canvas>
    </div>
  );
}
