// WebWorker para cálculos de Perlin Noise
// Implementación de Perlin Noise mejorada con worker thread

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

// Implementación de Perlin Noise clásica
class PerlinNoiseGenerator {
  private permutation: number[];
  private p: number[];
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
    this.permutation = this.generatePermutation(seed);
    this.p = [...this.permutation, ...this.permutation];
  }

  private generatePermutation(seed: number): number[] {
    const perm = Array.from({ length: 256 }, (_, i) => i);
    // Fisher-Yates shuffle con seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(((seed * (i + 1)) % 256 + 256) % 256);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 8 ? y : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  perlin(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const aaa = this.p[this.p[this.p[xi] + yi] + zi];
    const aba = this.p[this.p[this.p[xi] + (yi + 1)] + zi];
    const aab = this.p[this.p[this.p[xi] + yi] + (zi + 1)];
    const abb = this.p[this.p[this.p[xi] + (yi + 1)] + (zi + 1)];
    const baa = this.p[this.p[this.p[(xi + 1)] + yi] + zi];
    const bba = this.p[this.p[this.p[(xi + 1)] + (yi + 1)] + zi];
    const bab = this.p[this.p[this.p[(xi + 1)] + yi] + (zi + 1)];
    const bbb = this.p[this.p[this.p[(xi + 1)] + (yi + 1)] + (zi + 1)];

    let x1 = this.lerp(
      u,
      this.grad(aaa, xf, yf, zf),
      this.grad(baa, xf - 1, yf, zf)
    );
    let x2 = this.lerp(
      u,
      this.grad(aba, xf, yf - 1, zf),
      this.grad(bba, xf - 1, yf - 1, zf)
    );
    let y1 = this.lerp(v, x1, x2);

    x1 = this.lerp(
      u,
      this.grad(aab, xf, yf, zf - 1),
      this.grad(bab, xf - 1, yf, zf - 1)
    );
    x2 = this.lerp(
      u,
      this.grad(abb, xf, yf - 1, zf - 1),
      this.grad(bbb, xf - 1, yf - 1, zf - 1)
    );
    let y2 = this.lerp(v, x1, x2);

    return this.lerp(w, y1, y2);
  }

  // Fractal Brownian Motion (fBm) - ruido multicapa
  fbm(
    x: number,
    y: number,
    z: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let result = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      result += this.perlin(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return result / maxValue;
  }
}

let noiseGen: PerlinNoiseGenerator | null = null;

// Listener para mensajes del main thread
self.onmessage = (event: MessageEvent<NoiseRequest>) => {
  const { id, x, y, z, scale, octaves, persistence, lacunarity, seed } = event.data;

  try {
    // Crear nuevo generador si el seed cambió
    if (!noiseGen || noiseGen['seed'] !== seed) {
      noiseGen = new PerlinNoiseGenerator(seed);
    }

    // Calcular ruido
    const value = noiseGen.fbm(
      x / scale,
      y / scale,
      z / scale,
      octaves,
      persistence,
      lacunarity
    );

    // Normalizar a rango [0, 1]
    const normalized = (value + 1) / 2;

    const response: NoiseResponse = {
      id,
      value: Math.max(0, Math.min(1, normalized)),
    };

    self.postMessage(response);
  } catch (error) {
    const response: NoiseResponse = {
      id,
      value: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};
