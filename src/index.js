import { draw } from 'render/render'
import { build } from 'terrain/terrain'
import { mapParameters } from 'parameters'
import { saveSvgAsPng } from 'save-svg-as-png'
import { merge } from 'lodash'

export function doItToIt (parameters) {
  let originalParameters = merge({}, mapParameters)

  if (parameters !== undefined) {
    merge(mapParameters, parameters)
  }

  let world = { terrain: null }

  console.time('generate map')

  console.time('build')
  build(world)
  console.timeEnd('build')

  console.time('draw')
  draw(world)
  console.timeEnd('draw')

  console.timeEnd('generate map')

  if (mapParameters.exportPng) {
    saveSvgAsPng(document.getElementById('derp'), mapParameters.seed + '.png')
  }

  if (parameters !== undefined) {
    merge(mapParameters, originalParameters)
  }
}

doItToIt()

// require('expose-loader?ojo!index.js')