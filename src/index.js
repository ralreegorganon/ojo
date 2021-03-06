import draw from 'render/render'
import build from 'terrain/terrain'
import mapParameters from 'parameters'
import { merge } from 'lodash'
import seedrandom from 'seedrandom'
import SimplexNoise from 'simplex-noise'

export function doItToIt(parameters) {
  const originalParameters = merge({}, mapParameters)

  if (parameters !== undefined) {
    merge(mapParameters, parameters)
  }

  seedrandom(mapParameters.seed, { global: true })
  mapParameters.simplex = new SimplexNoise(Math.random)

  const world = { terrain: null }

  build(world)

  draw(world)

  if (parameters !== undefined) {
    merge(mapParameters, originalParameters)
  }
}

// console.profile()
doItToIt()
// console.profileEnd()
// require('expose-loader?ojo!index.js')
