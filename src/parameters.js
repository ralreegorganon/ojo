import seedrandom from 'seedrandom'
import SimplexNoise from 'simplex-noise'

export const mapParameters = {
  pdsMaxDistance: 4,
  width: 700,
  height: 700,
  // seed: 1514489481526,
  // seed: 1514632505452,
  // seed: 1514877216912,
  seed: '1337',
  // seed: new Date().getTime(),
  exportPng: false,
  seaLevel: 0.2,
  elevation: {
    octavation: {
      apply: true,
      iterations: 10,
      persistence: 0.5,
      lacunarity: 2,
      frequency: 2,
      standardRatio: 1,
      billowedRatio: 0,
      ridgedRatio: 0
    },
    sculpting: {
      apply: true,
      amount: 2
    },
    islandMask: {
      apply: true,
      margin: 5
    },
    plates: {
      apply: true,
      maxDistance: 125
    },
    normalize: {
      apply: true
    },
    step: {
      apply: true
    }
  },
  wind: {
    maxIterations: 500,
    sourceSet: 'mapEdge', // mapEdge, ocean, all
    northernPolarEasterlies: {
      startLatitude: 60,
      endLatitude: 90,
      angle: 270,
      velocity: 5,
      influence: 0.5
    },
    northernWesterlies: {
      startLatitude: 30,
      endLatitude: 60,
      angle: 80,
      velocity: 15,
      influence: 0.5
    },
    northernTradeWinds: {
      startLatitude: 0,
      endLatitude: 30,
      angle: 225,
      velocity: 10,
      influence: 1
    },
    southernTradeWinds: {
      startLatitude: -30,
      endLatitude: 0,
      angle: 315,
      velocity: 10,
      influence: 1
    },
    southernWesterlies: {
      startLatitude: -60,
      endLatitude: -30,
      angle: 100,
      velocity: 15,
      influence: 0.5
    },
    southernPolarEasterlies: {
      startLatitude: -90,
      endLatitude: -60,
      angle: 90,
      velocity: 5,
      influence: 0.5
    }
  },
  temperature: {
    globalModifier: 0.0 // 0.01 = 1C
  },
  moisture: {
    iterations: 10
  },
  erosion: {
    apply: false,
    riverFactor: 100,
    creepFactor: 100,
    maxErosionRate: 50,
    defaultErosionAmount: 0.1
  },
  render: {
    shapeRendering: 'crispEdges', // auto, optimizeSpeed, crispEdges, geometricPrecision
    drawCoastline: true,
    drawTriangles: false,
    elevation: {
      draw: true,
      color: 'colorized', // greyscale, featureType, colorized, greyscaleNoWater
      useStepInsteadOfElevation: false,
      drawDownhill: false
    },
    plates: {
      draw: false,
      drawForce: true
    },
    temperature: {
      draw: false,
      opacity: '1.0',
      color: 'linear' // band, linear
    },
    wind: {
      draw: false,
      drawWindNetwork: true,
      drawWindVectors: true,
      drawWindVelocity: true
    },
    pressure: {
      draw: false
    },
    moisture: {
      draw: false,
      drawAmount: false,
      type: 'moisture' // absoluteHumidity, relativeHumidity, moisture
    },
    biome: {
      draw: true
    },
    drawSeed: true
  }
}

seedrandom(mapParameters.seed, { global: true })

export const simplex = new SimplexNoise(Math.random)
