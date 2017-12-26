import {draw} from './render.js'
import {buildTerrain} from './terrain.js'
import {saveSvgAsPng} from 'save-svg-as-png'
import { defaultMapParameters } from './parameters.js'

let world = {terrain: null}

console.time('generate map')
console.time('buildTerrain')
buildTerrain(world)
console.timeEnd('buildTerrain')

console.log(world)

console.time('draw')
draw(world)
console.timeEnd('draw')

console.timeEnd('generate map')
// saveSvgAsPng(document.getElementById('derp'), defaultMapParameters.seed + '.png')