/**
 * Sombreadores personalizados para renderizado de planetas
 * Implementa texturas procedurales, iluminación, y efectos visuales
 */

export const planetVertexShader = `
  uniform float uDisplacement;
  uniform sampler2D uNoiseTexture;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Obtener ruido de la textura
    float noise = texture2D(uNoiseTexture, uv).r;
    vDisplacement = noise;
    
    // Desplazar vértices basado en ruido
    vec3 displacedPosition = position + normal * (noise - 0.5) * uDisplacement;
    
    vPosition = displacedPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

export const planetFragmentShader = `
  uniform vec3 uColor1;           // Color de océanos
  uniform vec3 uColor2;           // Color de tierra
  uniform vec3 uColor3;           // Color de montañas
  uniform vec3 uLightPosition;    // Posición de la luz
  uniform float uShininess;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;
  
  // Función de ruido simple basada en hash
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }
  
  // Interpolación suave Hermite
  float smoothstep(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition);
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    // Iluminación Blinn-Phong
    float diffuse = max(dot(normal, lightDir), 0.0);
    float specular = pow(max(dot(normal, halfDir), 0.0), uShininess);
    
    // Combinar componentes de iluminación
    float lighting = 0.3 + diffuse * 0.7;  // Luz ambiental + difusa
    
    // Colorear según altura (desplazamiento)
    vec3 color;
    float height = vDisplacement;
    
    if (height < 0.4) {
      // Agua
      color = uColor1;
    } else if (height < 0.6) {
      // Tierra (interpolación entre agua y tierra)
      color = mix(uColor1, uColor2, (height - 0.4) / 0.2);
    } else if (height < 0.8) {
      // Tierra (interpolación entre tierra y montaña)
      color = mix(uColor2, uColor3, (height - 0.6) / 0.2);
    } else {
      // Montañas nevadas
      color = uColor3;
    }
    
    // Aplicar iluminación
    color *= lighting;
    
    // Añadir especular para océanos
    if (height < 0.4) {
      color += specular * 0.5;
    } else {
      color += specular * 0.1;
    }
    
    // Efecto de neblina atmosférica (fog)
    float fog = smoothstep(0.0, 100.0, length(vPosition));
    color = mix(color, vec3(0.1, 0.1, 0.15), fog);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Sombreador para atmósfera del planeta
 */
export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereDensity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    
    // Efecto de Fresnel para atmósfera
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    
    // Combinar atmósfera
    float alpha = fresnel * uAtmosphereDensity;
    vec3 color = mix(vec3(1.0), uAtmosphereColor, fresnel);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Sombreador para océanos con olas procedurales
 */
export const oceanVertexShader = `
  uniform float uTime;
  uniform float uWaveAmplitude;
  uniform float uWaveFrequency;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;
  
  float gerstner(vec4 wave, vec3 p) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 2.0 * 3.14159 / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, p.xy) - c * uTime);
    float a = steepness / k;
    
    return a * sin(f);
  }
  
  void main() {
    vec3 p = position;
    
    // Simular olas usando Gerstner waves
    vec4 wave1 = vec4(1.0, 0.0, 0.25, 60.0);
    vec4 wave2 = vec4(0.2, 0.4, 0.15, 31.0);
    vec4 wave3 = vec4(0.2, 0.6, 0.1, 18.0);
    
    p.z += gerstner(wave1, p);
    p.z += gerstner(wave2, p);
    p.z += gerstner(wave3, p);
    
    vHeight = p.z;
    vPosition = (modelViewMatrix * vec4(p, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * vec4(vPosition, 1.0);
  }
`;

export const oceanFragmentShader = `
  uniform vec3 uOceanColor;
  uniform vec3 uLightPosition;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition);
    vec3 viewDir = normalize(-vPosition);
    
    float diffuse = max(dot(normal, lightDir), 0.0);
    float specular = pow(max(dot(normal, normalize(lightDir + viewDir)), 0.0), 32.0);
    
    vec3 color = uOceanColor * (0.3 + diffuse * 0.7);
    color += specular * 0.8;
    
    // Variación de color basada en profundidad (altura)
    color = mix(color * 0.5, color, clamp(vHeight, 0.0, 1.0));
    
    gl_FragColor = vec4(color, 0.9);
  }
`;

/**
 * Materiales preconstruidos usando los sombreadores
 */
export function createPlanetMaterial(options: {
  color1?: THREE.Color | string;
  color2?: THREE.Color | string;
  color3?: THREE.Color | string;
  noiseTexture?: THREE.Texture;
  displacement?: number;
  shininess?: number;
} = {}): THREE.ShaderMaterial {
  const defaults = {
    color1: new THREE.Color(0x1a4d7a),  // Océano
    color2: new THREE.Color(0x4a7c3b),  // Tierra
    color3: new THREE.Color(0xf0f0f0),  // Montañas/Nieve
    displacement: 0.3,
    shininess: 30,
  };

  const c1 = typeof options.color1 === 'string' ? new THREE.Color(options.color1) : (options.color1 || defaults.color1);
  const c2 = typeof options.color2 === 'string' ? new THREE.Color(options.color2) : (options.color2 || defaults.color2);
  const c3 = typeof options.color3 === 'string' ? new THREE.Color(options.color3) : (options.color3 || defaults.color3);

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor1: { value: c1 },
      uColor2: { value: c2 },
      uColor3: { value: c3 },
      uDisplacement: { value: options.displacement ?? defaults.displacement },
      uLightPosition: { value: new THREE.Vector3(5, 5, 5) },
      uShininess: { value: options.shininess ?? defaults.shininess },
      uNoiseTexture: { value: options.noiseTexture || null },
    },
    vertexShader: planetVertexShader,
    fragmentShader: planetFragmentShader,
    side: THREE.FrontSide,
    wireframe: false,
  });
}

export function createAtmosphereMaterial(options: {
  color?: THREE.Color | string;
  density?: number;
} = {}): THREE.ShaderMaterial {
  const color = typeof options.color === 'string' ? new THREE.Color(options.color) : (options.color || new THREE.Color(0x87ceeb));

  return new THREE.ShaderMaterial({
    uniforms: {
      uAtmosphereColor: { value: color },
      uAtmosphereDensity: { value: options.density ?? 0.5 },
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

import * as THREE from 'three';
