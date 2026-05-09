'use client';

import { useCallback, useEffect, useRef } from 'react';

interface NoiseRequest {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  seed: number;
}

interface NoiseResponse {
  id: string;
  value: number;
  error?: string;
}

interface PendingRequest {
  resolve: (value: number) => void;
  reject: (error: Error) => void;
}

export class PerlinNoiseManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestId = 0;
  private isInitialized = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./workers/perlinNoiseWorker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (event: MessageEvent<NoiseResponse>) => {
          const { id, value, error } = event.data;
          const pending = this.pendingRequests.get(id);

          if (pending) {
            if (error) {
              pending.reject(new Error(error));
            } else {
              pending.resolve(value);
            }
            this.pendingRequests.delete(id);
          }
        };

        this.isInitialized = true;
      } catch (error) {
        console.warn('WebWorker no disponible, usando fallback');
        this.isInitialized = false;
      }
    }
  }

  async getNoise(
    x: number,
    y: number,
    z: number,
    scale: number = 1,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0,
    seed: number = 0
  ): Promise<number> {
    if (!this.isInitialized || !this.worker) {
      return this.fallbackPerlin(x, y, z, scale, octaves, persistence, lacunarity);
    }

    const id = `noise_${this.requestId++}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request: NoiseRequest = {
        id,
        x,
        y,
        z,
        scale,
        octaves,
        persistence,
        lacunarity,
        seed,
      };

      this.worker!.postMessage(request);

      // Timeout de 5 segundos
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Noise calculation timeout'));
        }
      }, 5000);
    });
  }

  // Fallback de Perlin Noise simple para cuando no hay WebWorker
  private fallbackPerlin(
    x: number,
    y: number,
    z: number,
    scale: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    // Implementación simplificada de ruido Simplex
    let result = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const nx = (x * frequency) / scale;
      const ny = (y * frequency) / scale;
      const nz = (z * frequency) / scale;

      // Ruido simple basado en hash
      const noiseVal = this.simpleNoise(nx, ny, nz);
      result += noiseVal * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return (result / maxValue + 1) / 2;
  }

  private simpleNoise(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);

    const hash = Math.sin(xi * 12.9898 + yi * 78.233 + zi * 45.164) * 43758.5453;
    return 2.0 * (hash - Math.floor(hash)) - 1.0;
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let instance: PerlinNoiseManager | null = null;

export function getNoiseManager(): PerlinNoiseManager {
  if (!instance) {
    instance = new PerlinNoiseManager();
  }
  return instance;
}

// Hook para usar en componentes
export function usePerlinNoise() {
  const managerRef = useRef<PerlinNoiseManager | null>(null);

  useEffect(() => {
    managerRef.current = getNoiseManager();
    return () => {
      // No terminar aquí porque es singleton
    };
  }, []);

  return useCallback(
    async (
      x: number,
      y: number,
      z: number,
      scale?: number,
      octaves?: number,
      persistence?: number,
      lacunarity?: number,
      seed?: number
    ) => {
      if (!managerRef.current) {
        throw new Error('Noise manager not initialized');
      }
      return managerRef.current.getNoise(
        x,
        y,
        z,
        scale,
        octaves,
        persistence,
        lacunarity,
        seed
      );
    },
    []
  );
}
