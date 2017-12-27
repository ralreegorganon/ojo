import { mapParameters, simplex } from 'parameters'

function octavation (x, y) {
  x /= mapParameters.width
  y /= mapParameters.height

  let iterations = mapParameters.elevation.octavation.iterations
  let persistence = mapParameters.elevation.octavation.persistence
  let scale = mapParameters.elevation.octavation.scale
  let amplitude = mapParameters.elevation.octavation.amplitude

  let frequency = scale
  let noise = 0

  for (let i = 0; i < iterations; i++) {
    noise += simplex.noise2D(frequency * x, frequency * y) * amplitude
    amplitude *= persistence
    frequency *= mapParameters.elevation.octavation.frequencyMultiplier
  }

  return noise
}

function islandMask (x, y) {
  let width = mapParameters.width
  let height = mapParameters.height

  let dx = Math.abs(x - width * 0.5)
  let dy = Math.abs(y - height * 0.5)
  let d = Math.max(dx, dy)

  let mw = width * 0.55 - mapParameters.elevation.islandMask.margin
  let delta = d / mw
  let g = delta * delta

  return g
}

export function setElevations (polygons) {
  let min = 0
  let max = 0
  polygons.map(function (p) {
    p.elevation = octavation(p.data[0], p.data[1])
    p.step = mapParameters.elevation.islandMask.apply ? islandMask(p.data[0], p.data[1]) : 0

    if (p.elevation < min) {
      min = p.elevation
    }
    if (p.elevation > max) {
      max = p.elevation
    }
  })

  polygons.map(function (p) {
    p.elevation = (p.elevation - min) / (max - min)
    p.elevation = Math.pow(p.elevation, mapParameters.elevation.sculpting)
    p.elevation *= Math.max(0, 1 - p.step)
  })
}
