export interface AxisScale {
  min: number;
  max: number;
  ticks: number[];
}

/** L'axe part toujours de zéro : aucune troncature d'origine sans mention explicite (CA5.5). */
export function buildAxisScale(values: number[], tickCount = 4): AxisScale {
  const max = values.length > 0 ? Math.max(...values, 0) : 0;

  if (max === 0) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }

  const step = max / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * step * 100) / 100);

  return { min: 0, max, ticks };
}
