import seedrandom from 'seedrandom'
import SimplexNoise from 'simplex-noise'

//let seed = new Date().getTime()
let seed = '1337'
seedrandom(seed, { global: true })

export const defaultMapParameters = {
  pdsMaxDistance: 4,
  width: 700,
  height: 700,
  shapeRendering: 'crispEdges', // auto, optimizeSpeed, crispEdges, geometricPrecision
  seed: seed
}

export const simplex = new SimplexNoise(Math.random)
