import seedrandom from 'seedrandom'
import SimplexNoise from 'simplex-noise'

export const mapParameters = {
  pdsMaxDistance: 4,
  width: 700,
  height: 700,
  seed: '1337', // new Date().getTime()
  exportPng: false,
  seaLevel: 0.2,
  elevation: {
    octavation: {
      iterations: 16,
      persistence: 0.5,
      frequencyMultiplier: 2,
      scale: 2,
      amplitude: 1
    },
    sculpting: 2,
    islandMask: {
      apply: true,
      margin: 5
    }
  },
  render: {
    shapeRendering: 'crispEdges', // auto, optimizeSpeed, crispEdges, geometricPrecision
    polygon: {
      useStepInsteadOfElevation: false,
      color: 'colorized' // greyscale, featureType, colorized
    },
    drawCoastline: true,
    drawTriangles: false
  }
}

seedrandom(mapParameters.seed, { global: true })

export const simplex = new SimplexNoise(Math.random)
