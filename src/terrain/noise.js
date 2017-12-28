import { mapParameters, simplex } from 'parameters'

function billowedNoise (x, y) {
  return Math.abs(simplex.noise2D(x, y))
}

function ridgedNoise (x, y) {
  return 1 - Math.abs(simplex.noise2D(x, y))
}

export function octavation (x, y, iterations, frequency, persistence, lacunarity, standardRatio, billowedRatio, ridgedRatio) {
  x /= mapParameters.width
  y /= mapParameters.height

  let amplitude = 1
  let noise = 0

  for (let i = 0; i < iterations; i++) {
    let sn = simplex.noise2D(frequency * x, frequency * y)
    let bn = billowedNoise(frequency * x, frequency * y)
    let rn = ridgedNoise(frequency * x, frequency * y)

    let n = sn * standardRatio + bn * billowedRatio + rn * ridgedRatio

    noise += n * amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  return noise
}
