'use client';

import * as THREE from 'three';

interface LODConfig {
  distance: number;
  detail: number; // número de segmentos
}

interface LODLevel {
  geometry: THREE.IcosahedronGeometry;
  distance: number;
}

/**
 * Sistema de LOD (Level of Detail) para optimizar rendimiento
 * Reduce la complejidad de geometría según la distancia a la cámara
 */
export class LODSystem {
  private lodLevels: LODLevel[] = [];
  private currentLODIndex = 0;
  private radius: number;

  constructor(
    radius: number = 1,
    lodConfigs: LODConfig[] = [
      { distance: 0, detail: 64 },     // Máximo detalle cerca
      { distance: 10, detail: 32 },    // Detalle medio
      { distance: 25, detail: 16 },    // Detalle bajo
      { distance: 50, detail: 8 },     // Muy bajo detalle
    ]
  ) {
    this.radius = radius;
    this.initializeLODs(lodConfigs);
  }

  private initializeLODs(configs: LODConfig[]) {
    // Ordenar por distancia
    const sorted = [...configs].sort((a, b) => a.distance - b.distance);

    this.lodLevels = sorted.map((config) => ({
      geometry: new THREE.IcosahedronGeometry(this.radius, config.detail),
      distance: config.distance,
    }));
  }

  /**
   * Obtener el nivel de detalle apropiado según la distancia
   */
  getLODLevel(distance: number): THREE.IcosahedronGeometry {
    let selectedIndex = 0;

    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (distance >= this.lodLevels[i].distance) {
        selectedIndex = i;
        break;
      }
    }

    this.currentLODIndex = selectedIndex;
    return this.lodLevels[selectedIndex].geometry;
  }

  /**
   * Obtener índice del nivel actual
   */
  getCurrentLODIndex(): number {
    return this.currentLODIndex;
  }

  /**
   * Obtener número total de LODs
   */
  getTotalLODs(): number {
    return this.lodLevels.length;
  }

  /**
   * Limpiar recursos
   */
  dispose() {
    this.lodLevels.forEach((level) => {
      level.geometry.dispose();
    });
    this.lodLevels = [];
  }
}

/**
 * Hook para usar LOD en componentes React Three Fiber
 */
export function useLOD(radius: number = 1) {
  const lodSystemRef = React.useRef<LODSystem | null>(null);

  React.useEffect(() => {
    lodSystemRef.current = new LODSystem(radius);
    return () => {
      lodSystemRef.current?.dispose();
    };
  }, [radius]);

  const getLODGeometry = React.useCallback((distance: number) => {
    if (!lodSystemRef.current) return null;
    return lodSystemRef.current.getLODLevel(distance);
  }, []);

  return { getLODGeometry, lodSystem: lodSystemRef.current };
}
