import React, { useMemo } from 'react';

// --- COMPONENTE OriginalStats: Función novedosa (Estadísticas de Nivel) ---
const OriginalStats = ({ digimons }) => {
  // 1. Calcular la distribución de niveles
  const levelCounts = useMemo(() => {
    return digimons.reduce((acc, digimon) => {
      const level = digimon.level || 'Desconocido';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
  }, [digimons]);

  // 2. Determinar el total y el nivel con más Digimon (para la barra de progreso)
  const totalDigimons = digimons.length;
  // Ordenar por cantidad descendente
  const levels = Object.entries(levelCounts).sort(([, a], [, b]) => b - a);
  const maxCount = levels.length > 0 ? levels[0][1] : 1;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-8 border-b pb-2">Original: Distribución de Digimon por Nivel</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-2xl">
        <p className="text-lg text-gray-600 mb-4">
          Análisis de la colección completa: **{totalDigimons}** Digimon encontrados.
        </p>

        <div className="space-y-4">
          {levels.map(([level, count]) => {
            const percentage = ((count / maxCount) * 100).toFixed(1);
            const overallPercentage = ((count / totalDigimons) * 100).toFixed(1);

            return (
              <div key={level} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-indigo-600">{level}</span>
                  <span className="text-sm text-gray-700">{count} Digimon ({overallPercentage}%)</span>
                </div>
                {/* Barra de Progreso relativa al nivel más común */}
                <div className="w-full bg-indigo-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                    aria-valuenow={count}
                    aria-valuemin="0"
                    aria-valuemax={maxCount}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OriginalStats;
