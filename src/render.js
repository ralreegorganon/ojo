import * as d3 from 'd3'
import {defaultMapParameters} from './parameters.js'

let color = d3.scaleLinear(d3.interpolateHcl)
  .domain([0, 0.15, 0.2, 0.4, 0.7, 0.95])
  .range([
    '#71ABD8', // -10000m dark blue
    '#D8F2FE', //     0m light-blue
    '#94BF8B', //     1m green
    '#EFEBC0', //   300m yellow
    '#AA8753', //  3000m brown
    '#FFFFFF']) // ~6000m white

let color2 = d3.scaleLinear(d3.interpolateHcl)
  .domain([0, 1])
  .range([
    '#000',
    '#FFFFFF'])

let color1 = d3.scaleQuantile(d3.interpolateHcl)
  .domain([0, 0.15, 0.2, 0.4, 0.7, 0.95])
  .range([
    '#71ABD8', // -10000m dark blue
    '#D8F2FE', //     0m light-blue
    '#94BF8B', //     1m green
    '#EFEBC0', //   300m yellow
    '#AA8753', //  3000m brown
    '#FFFFFF']) // ~6000m white

function drawPolygons (g, polygons) {
  polygons.map(function (i, d) {
    g.attr('fill', 'white')
    g.append('path')
      .attr('d', 'M' + i.join('L') + 'Z')
      .attr('id', d)
      .attr('fill', color(i.elevation))
  })
}

export function draw (polygons) {
  let svg = d3.select('svg')
  let g = svg.append('g')
  svg.attr('width', defaultMapParameters.width)
  svg.attr('height', defaultMapParameters.height)

  drawPolygons(g, polygons)

  svg.append('rect')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('width', defaultMapParameters.width)
    .attr('height', defaultMapParameters.height)
    .call(d3.zoom()
      .on('zoom', zoom))

  function zoom () {
    g.attr('transform', d3.event.transform)
  }
}
