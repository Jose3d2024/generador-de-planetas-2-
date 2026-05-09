'use client';

import { Suspense, lazy, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';

const OptimizedPlanet = lazy(() =>
  import('./OptimizedPlanetWithLOD').then((m) => ({
    default: m.OptimizedPlanetScene,
  }))
);

interface ComparisonView {
  type: 'optimized' | 'original';
  quality: 'low' | 'medium' | 'high';
}

export function PlanetComparison() {
  const [view, setView] = useState<ComparisonView>({
    type: 'optimized',
    quality: 'medium',
  });

  return (
    <div className="w-full h-screen flex flex-col bg-gray-950">
      {/* Header con controles */}
      <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-4">🌍 Generador de Planetas - Optimizado</h1>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Modo:</label>
            <div className="flex gap-2">
              {(['optimized', 'original'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setView({ ...view, type: t })}
                  className={`px-4 py-2 rounded transition-colors ${
                    view.type === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {t === 'optimized' ? '⚡ Optimizado' : '📦 Original'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Calidad:</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setView({ ...view, quality: q })}
                  className={`px-4 py-2 rounded transition-colors ${
                    view.quality === q
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {q === 'low' && '🚀 Rápido'}
                  {q === 'medium' && '⚙️ Equilibrado'}
                  {q === 'high' && '✨ Alta'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="text-white text-center">
                <div className="text-xl mb-2">Cargando planeta...</div>
                <div className="text-sm text-gray-400">Inicializando WebWorker</div>
              </div>
            </div>
          }
        >
          {view.type === 'optimized' ? (
            <OptimizedPlanet quality={view.quality} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
              <p>Modo Original no implementado en esta demostración</p>
            </div>
          )}
        </Suspense>
      </div>

      {/* Footer con información */}
      <div className="p-4 bg-gray-900 border-t border-gray-700 text-white text-sm">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
          <div>
            <span className="text-green-400">✓</span> WebWorker Perlin Noise
          </div>
          <div>
            <span className="text-green-400">✓</span> Sistema LOD Dinámico
          </div>
          <div>
            <span className="text-green-400">✓</span> Sombreadores Personalizados
          </div>
          <div>
            <span className="text-green-400">✓</span> Atmósfera Procedural
          </div>
        </div>
      </div>
    </div>
  );
}
