import seedrandom from 'seedrandom'
import SimplexNoise from 'simplex-noise'

seedrandom('1', { global: true })

export const defaultMapParameters = {
  pdsMaxDistance: 4,
  width: 700,
  height: 700
}

export const simplex = new SimplexNoise(Math.random)
