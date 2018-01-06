import draw from 'render/render'
import build from 'terrain/terrain'
import { mapParameters } from 'parameters'
import { saveSvgAsPng } from 'save-svg-as-png'
import { merge } from 'lodash'

export default function doItToIt(parameters) {
  const originalParameters = merge({}, mapParameters)

  if (parameters !== undefined) {
    merge(mapParameters, parameters)
  }

  const world = { terrain: null }

  build(world)

  draw(world)

  if (mapParameters.exportPng) {
    saveSvgAsPng(document.getElementById('derp'), `${mapParameters.seed}.png`)
  }

  if (parameters !== undefined) {
    merge(mapParameters, originalParameters)
  }
}

console.profile()
doItToIt()
console.profileEnd()
// require('expose-loader?ojo!index.js')
