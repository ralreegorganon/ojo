import { temperatureInCelsius } from 'terrain/conversion'

/* eslint-disable object-curly-newline */

const biomes = [
  { name: 'polar desert', minT: 0, maxT: 1.5, minP: 0, maxP: 1600 },

  { name: 'subpolar dry tundra', minT: 1.5, maxT: 3, minP: 0, maxP: 12.5 },
  { name: 'subpolar moist tundra', minT: 1.5, maxT: 3, minP: 12.5, maxP: 25 },
  { name: 'subpolar wet tundra', minT: 1.5, maxT: 3, minP: 25, maxP: 50 },
  { name: 'subpolar rain tundra', minT: 1.5, maxT: 3, minP: 50, maxP: 1600 },

  { name: 'boreal desert', minT: 3, maxT: 6, minP: 0, maxP: 12.5 },
  { name: 'boreal dry scrub', minT: 3, maxT: 6, minP: 12.5, maxP: 25 },
  { name: 'boreal moist forest', minT: 3, maxT: 6, minP: 25, maxP: 50 },
  { name: 'boreal wet forest', minT: 3, maxT: 6, minP: 50, maxP: 100 },
  { name: 'boreal rain forest', minT: 3, maxT: 6, minP: 100, maxP: 1600 },

  { name: 'cool temperate desert', minT: 6, maxT: 12, minP: 0, maxP: 12.5 },
  { name: 'cool temperate desert scrub', minT: 6, maxT: 12, minP: 12.5, maxP: 25 },
  { name: 'cool temperate steppe', minT: 6, maxT: 12, minP: 25, maxP: 50 },
  { name: 'cool temperate moist forest', minT: 6, maxT: 12, minP: 50, maxP: 100 },
  { name: 'cool temperate wet forest', minT: 6, maxT: 12, minP: 100, maxP: 200 },
  { name: 'cool temperate rain forest', minT: 6, maxT: 12, minP: 200, maxP: 1600 },

  { name: 'warm temperate desert', minT: 12, maxT: 18, minP: 0, maxP: 12.5 },
  { name: 'warm temperate desert scrub', minT: 12, maxT: 18, minP: 12.5, maxP: 25 },
  { name: 'warm temperate thorn scrub', minT: 12, maxT: 18, minP: 25, maxP: 50 },
  { name: 'warm temperate dry forest', minT: 12, maxT: 18, minP: 50, maxP: 100 },
  { name: 'warm temperate moist forest', minT: 12, maxT: 18, minP: 100, maxP: 200 },
  { name: 'warm temperate wet forest', minT: 12, maxT: 18, minP: 200, maxP: 400 },
  { name: 'warm temperate rain forest', minT: 12, maxT: 18, minP: 400, maxP: 1600 },

  { name: 'subtropical desert', minT: 18, maxT: 24, minP: 0, maxP: 12.5 },
  { name: 'subtropical desert scrub', minT: 18, maxT: 24, minP: 12.5, maxP: 25 },
  { name: 'subtropical thorn woodland', minT: 18, maxT: 24, minP: 25, maxP: 50 },
  { name: 'subtropical dry forest', minT: 18, maxT: 24, minP: 50, maxP: 100 },
  { name: 'subtropical moist forest', minT: 18, maxT: 24, minP: 100, maxP: 200 },
  { name: 'subtropical wet forest', minT: 18, maxT: 24, minP: 200, maxP: 400 },
  { name: 'subtropical rain forest', minT: 18, maxT: 24, minP: 400, maxP: 1600 },

  { name: 'tropical desert', minT: 24, maxT: 30, minP: 0, maxP: 12.5 },
  { name: 'tropical desert scrub', minT: 24, maxT: 30, minP: 12.5, maxP: 25 },
  { name: 'tropical thorn woodland', minT: 24, maxT: 30, minP: 25, maxP: 50 },
  { name: 'tropical very dry forest', minT: 24, maxT: 30, minP: 50, maxP: 100 },
  { name: 'tropical dry forest', minT: 24, maxT: 30, minP: 100, maxP: 200 },
  { name: 'tropical moist forest', minT: 24, maxT: 30, minP: 200, maxP: 400 },
  { name: 'tropical wet forest', minT: 24, maxT: 30, minP: 400, maxP: 800 },
  { name: 'tropical rain forest', minT: 24, maxT: 30, minP: 800, maxP: 1600 }
]
/* eslint-enable object-curly-newline */

function lifezone(temperature, precipitation) {
  const t = Math.max(0, Math.min(30, temperature))
  const p = Math.max(0, Math.min(1600, precipitation))

  const biome = biomes.filter(b => t >= b.minT && t <= b.maxT && p >= b.minP && p <= b.maxP)

  return biome[0]
}

function baseline(polygons) {
  polygons.forEach((p) => {
    p.biome = lifezone(temperatureInCelsius(p.temperature), p.moisture)
  })
}

export default function setBiomes(terrain) {
  baseline(terrain.polygons)
}
