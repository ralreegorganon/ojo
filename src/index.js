import { draw } from 'render/render'
import { buildTerrain } from 'terrain/terrain'
import { mapParameters } from 'parameters'
import { saveSvgAsPng } from 'save-svg-as-png'

let world = { terrain: null }

console.time('generate map')
console.time('buildTerrain')
buildTerrain(world)
console.timeEnd('buildTerrain')

console.log(world)

console.time('draw')
draw(world)
console.timeEnd('draw')

console.timeEnd('generate map')

if (mapParameters.exportPng) {
  saveSvgAsPng(document.getElementById('derp'), mapParameters.seed + '.png')
}
